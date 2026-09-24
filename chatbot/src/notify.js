// Avisa a equipe sobre leads novos e pedidos de atendimento humano:
// por WhatsApp (para o número do dono) e/ou por webhook (n8n, Make, Zapier, planilha...).

import { OUTSIDE_24H_WINDOW } from "./whatsapp.js";

const SERVICO_LABEL = {
  site: "Site / landing page",
  automacao: "Automação",
  aplicativo: "Aplicativo",
  saas: "SaaS / micro-SaaS",
  outro: "Ainda não definido",
};

const TITULOS = {
  novo_lead: "🔔 *Novo lead*",
  lead_atualizado: "✏️ *Lead atualizado*",
  humano_solicitado: "🙋 *Lead pediu atendimento*",
  limite_atingido: "⚠️ *Bot pausou respostas por excesso de mensagens*",
  erro: "⚠️ *Bot não conseguiu responder*",
};

export function formatNotification({ type, contact, motivo }) {
  const dados = contact.lead?.dados ?? {};
  const lines = [
    `${TITULOS[type] ?? type} — ${dados.nome || contact.name || "sem nome"}`,
    `📱 https://wa.me/${contact.waId}`,
  ];
  if (motivo) lines.push(`Motivo: ${motivo}`);
  if (dados.servico) lines.push(`Serviço: ${SERVICO_LABEL[dados.servico] ?? dados.servico}`);
  if (dados.resumo) lines.push(`Resumo: ${dados.resumo}`);
  for (const [key, label] of [
    ["empresa", "Empresa"],
    ["prazo", "Prazo"],
    ["orcamento", "Orçamento"],
    ["email", "E-mail"],
    ["melhor_horario", "Melhor horário"],
    ["temperatura", "Temperatura"],
  ]) {
    if (dados[key]) lines.push(`${label}: ${dados[key]}`);
  }
  return lines.join("\n");
}

export function createNotifier({ whatsapp, ownerWhatsapp, webhookUrl, fetchImpl = fetch, logger = console }) {
  return async function notify(event) {
    const text = formatNotification(event);
    logger.info(`[aviso] ${text.replace(/\n/g, " | ")}`);

    const jobs = [];
    if (whatsapp && ownerWhatsapp) {
      jobs.push(whatsapp.sendText(ownerWhatsapp, text));
    }
    if (webhookUrl) {
      const payload = {
        evento: event.type,
        motivo: event.motivo ?? null,
        whatsapp: event.contact.waId,
        nome_perfil: event.contact.name,
        lead: event.contact.lead?.dados ?? null,
        pausado: event.contact.paused,
        data: new Date().toISOString(),
      };
      jobs.push(
        fetchImpl(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).then((res) => {
          if (!res.ok) throw new Error(`webhook de leads respondeu ${res.status}`);
        }),
      );
    }

    for (const result of await Promise.allSettled(jobs)) {
      if (result.status === "fulfilled") continue;
      const err = result.reason;
      logger.warn(`[aviso] falhou: ${err?.message ?? err}`);
      if (err?.code === OUTSIDE_24H_WINDOW) {
        logger.warn(
          "[aviso] A Meta só entrega mensagens ao seu número se você falou com o bot nas últimas 24h. " +
            "Mande qualquer mensagem (ex. /leads) do seu WhatsApp para o número do bot para reabrir a janela.",
        );
      }
    }
  };
}
