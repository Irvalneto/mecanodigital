import { test } from "node:test";
import assert from "node:assert/strict";
import { createBot, toMessages } from "../src/bot.js";
import { openStore } from "../src/store.js";

const LEAD = "5511987654321";
const OWNER = "5511911111111";
const silent = { info() {}, warn() {}, error() {} };

async function setup({ replies = [], ...options } = {}) {
  const store = await openStore(null);
  const sent = [];
  const notified = [];
  const agentCalls = [];
  const whatsapp = {
    async sendText(to, text) {
      sent.push({ to, text });
    },
    async markRead() {},
  };
  const agent = {
    async reply(args) {
      agentCalls.push(args);
      const next = replies.shift() ?? { text: "ok", refused: false };
      if (typeof next === "function") return next(args);
      if (next instanceof Error) throw next;
      return next;
    },
  };
  const bot = createBot({
    store,
    agent,
    whatsapp,
    notify: async (event) => notified.push(event),
    ownerWhatsapp: OWNER,
    debounceMs: 5,
    logger: silent,
    ...options,
  });
  let n = 0;
  const receive = (text, from = LEAD) =>
    bot.handleIncoming({ id: `m${++n}`, from, name: "Ana", timestamp: Date.now(), type: "text", text });
  return { bot, store, sent, notified, agentCalls, receive };
}

test("responde o lead e guarda o histórico", async () => {
  const { bot, store, sent, receive } = await setup({ replies: [{ text: "Olá, **Ana**!", refused: false }] });
  await receive("Oi, quero um site");
  await bot.drain();

  assert.deepEqual(sent, [{ to: LEAD, text: "Olá, *Ana*!" }]);
  assert.deepEqual(
    store.get(LEAD).history.map((h) => [h.role, h.text]),
    [
      ["user", "Oi, quero um site"],
      ["assistant", "Olá, *Ana*!"],
    ],
  );
});

test("agrupa mensagens seguidas em uma única resposta", async () => {
  const { bot, sent, agentCalls, receive } = await setup({ debounceMs: 50 });
  await receive("Oi");
  await receive("tudo bem?");
  await receive("preciso de uma automação");
  await bot.drain();

  assert.equal(agentCalls.length, 1);
  assert.deepEqual(
    agentCalls[0].messages.map((m) => m.content),
    ["Oi", "tudo bem?", "preciso de uma automação"],
  );
  assert.equal(sent.length, 1);
});

test("ignora mensagens repetidas pela Meta", async () => {
  const { bot, store, agentCalls } = await setup();
  const msg = { id: "dup", from: LEAD, name: "Ana", timestamp: Date.now(), type: "text", text: "Oi" };
  await bot.handleIncoming(msg);
  await bot.handleIncoming({ ...msg });
  await bot.drain();

  assert.equal(store.get(LEAD).history.filter((h) => h.role === "user").length, 1);
  assert.equal(agentCalls.length, 1);
});

test("registrar_lead salva os dados e avisa a equipe (novo e atualização)", async () => {
  const dados = { nome: "Ana", servico: "automacao", resumo: "Integrar planilha e CRM" };
  const { bot, store, notified, receive } = await setup({
    replies: [
      async ({ runTool }) => {
        assert.equal(await runTool("registrar_lead", dados), "Lead registrado e equipe avisada.");
        return { text: "Registrado!", refused: false };
      },
      async ({ runTool, context }) => {
        assert.match(context, /Lead já registrado/);
        await runTool("registrar_lead", { ...dados, prazo: "30 dias" });
        return { text: "Atualizado!", refused: false };
      },
    ],
  });
  await receive("Sou a Ana, quero integrar minha planilha com o CRM");
  await bot.drain();
  await receive("Preciso em 30 dias");
  await bot.drain();

  assert.deepEqual(store.get(LEAD).lead.dados, { ...dados, prazo: "30 dias" });
  assert.deepEqual(
    notified.map((e) => e.type),
    ["novo_lead", "lead_atualizado"],
  );
});

test("chamar_humano registra o pedido e avisa a equipe", async () => {
  const { bot, store, notified, receive } = await setup({
    replies: [
      async ({ runTool }) => {
        await runTool("chamar_humano", { motivo: "quer falar com uma pessoa" });
        return { text: "Já chamei a equipe!", refused: false };
      },
    ],
  });
  await receive("quero falar com uma pessoa");
  await bot.drain();

  assert.equal(store.get(LEAD).humanRequest.motivo, "quer falar com uma pessoa");
  assert.equal(notified[0].type, "humano_solicitado");
});

test("dono pausa e retoma o bot para um contato (aceita número sem o 9)", async () => {
  const { bot, sent, agentCalls, receive } = await setup();
  await receive("Oi");
  await bot.drain();
  sent.length = 0;

  await receive("/pausar 551187654321", OWNER);
  assert.match(sent.at(-1).text, /Bot pausado/);
  await receive("Alguém aí?");
  await bot.drain();
  assert.equal(agentCalls.length, 1, "não responde enquanto pausado");

  await receive("/retomar 5511987654321", OWNER);
  assert.match(sent.at(-1).text, /voltou a responder/);
  await receive("E agora?");
  await bot.drain();
  assert.equal(agentCalls.length, 2);
  assert.deepEqual(
    agentCalls[1].messages.map((m) => m.content),
    ["Oi", "ok", "Alguém aí?", "E agora?"],
  );
});

test("dono lista leads; mensagens sem / do dono seguem para o bot", async () => {
  const { bot, sent, agentCalls, receive } = await setup({
    replies: [
      async ({ runTool }) => {
        await runTool("registrar_lead", { nome: "Ana", servico: "site", resumo: "LP" });
        return { text: "ok", refused: false };
      },
    ],
  });
  await receive("Quero uma landing page");
  await bot.drain();

  await receive("/leads", OWNER);
  assert.match(sent.at(-1).text, /Ana — site/);
  assert.match(sent.at(-1).text, /wa\.me\/5511987654321/);

  await receive("/qualquer", OWNER);
  assert.match(sent.at(-1).text, /Comandos do bot/);

  await receive("Oi, estou testando", OWNER);
  await bot.drain();
  assert.equal(agentCalls.length, 2);
  assert.equal(sent.at(-1).to, OWNER);
});

test("mensagem que chega durante a geração ganha resposta própria", async () => {
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  const { bot, store, agentCalls, receive } = await setup({
    replies: [
      async () => {
        await gate;
        return { text: "resposta 1", refused: false };
      },
      { text: "resposta 2", refused: false },
    ],
  });
  await receive("primeira");
  await new Promise((r) => setTimeout(r, 20)); // deixa o agrupamento disparar
  await receive("segunda");
  release();
  await bot.drain();

  assert.equal(agentCalls.length, 2);
  assert.deepEqual(
    store.get(LEAD).history.map((h) => h.text),
    ["primeira", "resposta 1", "segunda", "resposta 2"],
  );
});

test("histórico longo cortado durante a geração não desalinha a resposta", async () => {
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  const { bot, store, receive } = await setup({
    replies: [
      async () => {
        await gate;
        return { text: "resposta A", refused: false };
      },
      { text: "resposta B", refused: false },
    ],
  });
  const contact = store.getOrCreate(LEAD, "Ana");
  for (let i = 0; i < 199; i++) contact.history.push({ role: i % 2 ? "assistant" : "user", text: `antiga ${i}`, at: "" });
  await receive("pergunta A"); // 200 entradas
  await new Promise((r) => setTimeout(r, 20));
  await receive("pergunta B"); // salva e corta o histórico para 200 durante a geração
  release();
  await bot.drain();

  const texts = store.get(LEAD).history.map((h) => h.text);
  assert.deepEqual(texts.slice(-4), ["pergunta A", "resposta A", "pergunta B", "resposta B"]);
});

test("mensagens vazias são ignoradas", async () => {
  const { bot, store, agentCalls } = await setup();
  await bot.handleIncoming({ id: "v1", from: LEAD, name: "Ana", timestamp: Date.now(), type: "interactive", text: "" });
  await bot.drain();
  assert.equal(store.get(LEAD), null);
  assert.equal(agentCalls.length, 0);
});

test("registrar_lead repetido sem mudanças não avisa de novo", async () => {
  const dados = { nome: "Ana", servico: "site", resumo: "LP" };
  const { bot, notified, receive } = await setup({
    replies: [
      async ({ runTool }) => {
        await runTool("registrar_lead", dados);
        assert.match(await runTool("registrar_lead", { ...dados }), /Nada mudou/);
        await runTool("registrar_lead", { nome: "Ana", servico: "site", resumo: "LP", prazo: "maio" });
        return { text: "ok", refused: false };
      },
    ],
  });
  await receive("Quero uma LP");
  await bot.drain();
  assert.deepEqual(
    notified.map((e) => e.type),
    ["novo_lead", "lead_atualizado"],
  );
});

test("erro na IA: pede desculpas ao lead e avisa a equipe", async () => {
  const { bot, sent, notified, receive } = await setup({ replies: [new Error("API fora do ar")] });
  await receive("Oi");
  await bot.drain();

  assert.match(sent[0].text, /instabilidade/);
  assert.equal(notified[0].type, "erro");
});

test("recusa do modelo vira pedido de atendimento humano", async () => {
  const { bot, sent, notified, store, receive } = await setup({ replies: [{ text: "", refused: true }] });
  await receive("Oi");
  await bot.drain();

  assert.match(sent[0].text, /equipe/);
  assert.equal(notified[0].type, "humano_solicitado");
  assert.ok(store.get(LEAD).humanRequest);
});

test("limite de respostas por hora protege contra abuso", async () => {
  const { bot, sent, notified, receive } = await setup({ maxRepliesPerHour: 2 });
  for (const text of ["1", "2", "3", "4"]) {
    await receive(text);
    await bot.drain();
  }
  assert.equal(sent.length, 2);
  assert.deepEqual(
    notified.map((e) => e.type),
    ["limite_atingido"],
  );
});

test("toMessages corta o histórico e sempre começa pelo lead", () => {
  const history = [
    { role: "user", text: "a" },
    { role: "assistant", text: "b" },
    { role: "user", text: "c" },
    { role: "assistant", text: "d" },
    { role: "user", text: "e" },
  ];
  assert.deepEqual(
    toMessages(history, 4).map((m) => m.content),
    ["c", "d", "e"],
  );
  assert.deepEqual(toMessages([{ role: "assistant", text: "x" }], 10), []);
});
