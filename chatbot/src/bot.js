// Orquestração: recebe mensagens do webhook, agrupa mensagens seguidas,
// gera a resposta com o agente e atende os comandos do dono do número.

import { buildContext } from "./prompt.js";
import { toWhatsApp, splitMessage } from "./format.js";
import { samePhone } from "./phone.js";

const HOUR = 60 * 60 * 1000;

const MSG_ERRO =
  "Desculpe, tive uma instabilidade aqui e não consegui responder agora. Já avisei a equipe, e alguém fala com você em breve.";
const MSG_RECUSA = "Vou pedir para alguém da nossa equipe falar com você sobre isso, tudo bem?";
const MSG_VAZIA = "Anotado! Alguém da nossa equipe fala com você em até 1 dia útil.";

const AJUDA = [
  "*Comandos do bot*",
  "/leads — últimos leads registrados",
  "/pausar 5511999999999 — o bot para de responder esse contato (você assume)",
  "/retomar 5511999999999 — o bot volta a responder",
  "/ajuda — esta lista",
].join("\n");

export function createBot({
  store,
  agent,
  whatsapp,
  notify = async () => {},
  ownerWhatsapp = "",
  debounceMs = 4000,
  maxRepliesPerHour = 30,
  historyLimit = 40,
  timezone = "America/Sao_Paulo",
  logger = console,
  now = () => Date.now(),
}) {
  const seen = new Set(); // ids já processados (a Meta pode reenviar o mesmo evento)
  const timers = new Map(); // waId -> timeout do agrupamento
  const queues = new Map(); // waId -> promessa da resposta em andamento
  const lastInbound = new Map(); // waId -> id da última mensagem recebida

  function remember(id) {
    seen.add(id);
    if (seen.size > 5000) seen.delete(seen.values().next().value);
  }

  async function handleIncoming(msg) {
    if (!msg?.id || seen.has(msg.id) || !msg.text?.trim()) return;
    remember(msg.id);

    // Mensagens do dono começando com "/" são comandos; o resto segue como
    // conversa normal, para ele poder testar o bot do próprio celular.
    if (ownerWhatsapp && samePhone(msg.from, ownerWhatsapp) && msg.text.trim().startsWith("/")) {
      await handleOwner(msg);
      return;
    }

    const contact = store.getOrCreate(msg.from, msg.name);
    contact.history.push({ role: "user", text: msg.text, at: new Date(msg.timestamp ?? now()).toISOString() });
    contact.updatedAt = new Date(now()).toISOString();
    await store.save();

    if (contact.paused) return; // o dono assumiu esta conversa
    lastInbound.set(msg.from, msg.id);
    schedule(msg.from);
  }

  // Pessoas costumam mandar várias mensagens curtas em sequência: espera um
  // pouco de silêncio antes de responder, para responder tudo de uma vez.
  function schedule(waId) {
    clearTimeout(timers.get(waId));
    timers.set(
      waId,
      setTimeout(() => {
        timers.delete(waId);
        enqueue(waId);
      }, debounceMs),
    );
  }

  function enqueue(waId) {
    const previous = queues.get(waId) ?? Promise.resolve();
    const next = previous
      .then(() => respond(waId))
      .catch((err) => logger.error(`[bot] erro ao responder ${waId}:`, err))
      .finally(() => {
        if (queues.get(waId) === next) queues.delete(waId);
      });
    queues.set(waId, next);
    return next;
  }

  async function respond(waId) {
    const contact = store.get(waId);
    if (!contact || contact.paused) return;

    const seenHistory = contact.history.slice();
    const lastSeen = seenHistory.at(-1);
    if (lastSeen?.role !== "user") return; // nada novo para responder

    if (overLimit(contact)) {
      if (now() - contact.limitNotifiedAt > HOUR) {
        contact.limitNotifiedAt = now();
        await store.save();
        await notify({ type: "limite_atingido", contact });
      }
      logger.warn(`[bot] limite de ${maxRepliesPerHour} respostas/hora atingido para ${waId}`);
      return;
    }

    const inboundId = lastInbound.get(waId);
    if (inboundId) whatsapp.markRead(inboundId, { typing: true }).catch(() => {});

    let text;
    try {
      const result = await agent.reply({
        messages: toMessages(seenHistory, historyLimit),
        context: buildContext(contact, { now: new Date(now()), timezone }),
        runTool: (name, input) => runTool(contact, name, input),
      });
      if (result.refused) {
        text = MSG_RECUSA;
        await requestHuman(contact, "o assistente não pôde responder a última mensagem");
      } else {
        text = result.text || MSG_VAZIA;
      }
    } catch (err) {
      logger.error(`[bot] falha ao gerar resposta para ${waId}:`, err);
      text = MSG_ERRO;
      await notify({ type: "erro", contact, motivo: err.message });
    }

    if (store.get(waId)?.paused) return; // o dono assumiu enquanto a resposta era gerada

    const formatted = toWhatsApp(text);
    for (const part of splitMessage(formatted)) {
      await whatsapp.sendText(waId, part);
    }
    // Insere logo após as mensagens que o modelo viu; o que chegou durante a
    // geração fica depois e ganha a própria resposta.
    const position = contact.history.indexOf(lastSeen) + 1 || contact.history.length;
    contact.history.splice(position, 0, { role: "assistant", text: formatted, at: new Date(now()).toISOString() });
    contact.replyTimes.push(now());
    contact.updatedAt = new Date(now()).toISOString();
    await store.save();
  }

  function overLimit(contact) {
    contact.replyTimes = contact.replyTimes.filter((t) => now() - t < HOUR);
    return contact.replyTimes.length >= maxRepliesPerHour;
  }

  async function runTool(contact, name, input) {
    if (name === "registrar_lead") {
      const isNew = !contact.lead;
      const dados = { ...contact.lead?.dados, ...input };
      if (!isNew && JSON.stringify(dados) === JSON.stringify(contact.lead.dados)) {
        return "Nada mudou; o lead já estava registrado com esses dados.";
      }
      const at = new Date(now()).toISOString();
      contact.lead = { dados, createdAt: contact.lead?.createdAt ?? at, updatedAt: at };
      await store.save();
      await notify({ type: isNew ? "novo_lead" : "lead_atualizado", contact });
      return isNew ? "Lead registrado e equipe avisada." : "Dados do lead atualizados.";
    }
    if (name === "chamar_humano") {
      await requestHuman(contact, input.motivo);
      return "Equipe avisada. Diga ao lead que alguém da equipe vai falar com ele.";
    }
    throw new Error(`ferramenta desconhecida: ${name}`);
  }

  async function requestHuman(contact, motivo) {
    contact.humanRequest = { motivo, at: new Date(now()).toISOString() };
    await store.save();
    await notify({ type: "humano_solicitado", contact, motivo });
  }

  /* --- Comandos enviados pelo dono (OWNER_WHATSAPP) para o número do bot --- */
  async function handleOwner(msg) {
    const [command, ...args] = msg.text.trim().split(/\s+/);
    const reply = (text) => whatsapp.sendText(msg.from, text);
    const findContact = (number) => store.all().find((c) => samePhone(c.waId, number));

    switch (command.toLowerCase()) {
      case "/leads": {
        const leads = store
          .all()
          .filter((c) => c.lead)
          .sort((a, b) => b.lead.updatedAt.localeCompare(a.lead.updatedAt))
          .slice(0, 10);
        if (!leads.length) return reply("Nenhum lead registrado ainda.");
        const lines = leads.map(
          (c) =>
            `• ${c.lead.dados.nome} — ${c.lead.dados.servico}${c.paused ? " (pausado)" : ""}\n  https://wa.me/${c.waId}`,
        );
        return reply(`*Últimos leads*\n${lines.join("\n")}`);
      }
      case "/pausar":
      case "/retomar": {
        const contact = args[0] && findContact(args[0]);
        if (!contact) return reply(`Não encontrei conversa com esse número. Use: ${command} 5511999999999`);
        contact.paused = command.toLowerCase() === "/pausar";
        if (contact.paused) {
          clearTimeout(timers.get(contact.waId));
          timers.delete(contact.waId);
        }
        await store.save();
        return reply(
          contact.paused
            ? `Bot pausado para ${contact.name || contact.waId}. Fale com a pessoa pelo seu WhatsApp: https://wa.me/${contact.waId}`
            : `Bot voltou a responder ${contact.name || contact.waId}.`,
        );
      }
      default:
        return reply(AJUDA);
    }
  }

  // Responde na hora tudo o que está aguardando o agrupamento (testes, simulador, desligamento).
  async function drain() {
    for (const [waId, timer] of timers) {
      clearTimeout(timer);
      timers.delete(waId);
      enqueue(waId);
    }
    while (queues.size) await Promise.all([...queues.values()]);
    if (timers.size) await drain();
  }

  return { handleIncoming, drain };
}

// Histórico salvo -> mensagens da API (só texto; começa sempre com o lead).
export function toMessages(history, limit) {
  const recent = history.slice(-limit);
  const firstUser = recent.findIndex((entry) => entry.role === "user");
  if (firstUser < 0) return [];
  return recent.slice(firstUser).map((entry) => ({ role: entry.role, content: entry.text }));
}
