import { test } from "node:test";
import assert from "node:assert/strict";
import { createAgent, validateToolInput } from "../src/agent.js";

function fakeClient(responses) {
  const requests = [];
  return {
    requests,
    beta: {
      messages: {
        async create(params) {
          requests.push(structuredClone(params));
          const next = responses.shift();
          if (next instanceof Error) throw next;
          return next;
        },
      },
    },
  };
}

const text = (t) => ({ type: "text", text: t });
const toolUse = (id, name, input) => ({ type: "tool_use", id, name, input });

test("executa a ferramenta e devolve a resposta final", async () => {
  const client = fakeClient([
    {
      stop_reason: "tool_use",
      content: [toolUse("t1", "registrar_lead", { nome: "Ana", servico: "site", resumo: "Landing page" })],
    },
    { stop_reason: "end_turn", content: [text("Anotado, Ana! A equipe te chama em até 1 dia útil.")] },
  ]);
  const calls = [];
  const agent = createAgent({ client, systemPrompt: "SISTEMA" });

  const result = await agent.reply({
    messages: [{ role: "user", content: "Sou a Ana e quero uma landing page" }],
    context: "CONTEXTO",
    runTool: async (name, input) => {
      calls.push([name, input]);
      return "ok";
    },
  });

  assert.equal(result.text, "Anotado, Ana! A equipe te chama em até 1 dia útil.");
  assert.deepEqual(calls, [["registrar_lead", { nome: "Ana", servico: "site", resumo: "Landing page" }]]);

  const [first, second] = client.requests;
  assert.equal(first.model, "claude-opus-5");
  assert.deepEqual(first.output_config, { effort: "low" });
  assert.equal(first.fallbacks, "default");
  assert.deepEqual(first.betas, ["server-side-fallback-2026-07-01"]);
  assert.equal(first.system[0].text, "SISTEMA");
  assert.deepEqual(first.system[0].cache_control, { type: "ephemeral" });
  assert.equal(first.system[1].text, "CONTEXTO");
  assert.deepEqual(
    first.tools.map((t) => t.name),
    ["registrar_lead", "chamar_humano"],
  );
  assert.equal(second.messages.length, 3);
  assert.deepEqual(second.messages[2].content, [{ type: "tool_result", tool_use_id: "t1", content: "ok" }]);
});

test("entrada inválida volta ao modelo como erro, sem executar a ferramenta", async () => {
  const client = fakeClient([
    { stop_reason: "tool_use", content: [toolUse("t1", "registrar_lead", { nome: "Ana", servico: "foguete" })] },
    { stop_reason: "end_turn", content: [text("Me conta mais sobre o projeto?")] },
  ]);
  let ran = false;
  const agent = createAgent({ client, systemPrompt: "S" });
  await agent.reply({ messages: [{ role: "user", content: "oi" }], context: "C", runTool: async () => (ran = true) });

  assert.equal(ran, false);
  const toolResult = client.requests[1].messages[2].content[0];
  assert.equal(toolResult.is_error, true);
  assert.match(toolResult.content, /resumo/);
});

test("validateToolInput checa obrigatórios, enum e campos extras", () => {
  assert.equal(validateToolInput("chamar_humano", { motivo: "pediu humano" }), null);
  assert.match(validateToolInput("chamar_humano", {}), /motivo/);
  assert.match(validateToolInput("registrar_lead", { nome: "A", servico: "x", resumo: "r" }), /servico/);
  assert.match(validateToolInput("registrar_lead", { nome: "A", servico: "site", resumo: "r", cpf: "1" }), /cpf/);
  assert.match(validateToolInput("inexistente", {}), /desconhecida/);
});

test("recusa é sinalizada para o bot tratar", async () => {
  const client = fakeClient([{ stop_reason: "refusal", content: [] }]);
  const agent = createAgent({ client, systemPrompt: "S" });
  const result = await agent.reply({ messages: [{ role: "user", content: "oi" }], context: "C", runTool: async () => "" });
  assert.deepEqual(result, { text: "", refused: true });
});

test("sem fallback, não envia o beta nem o parâmetro", async () => {
  const client = fakeClient([{ stop_reason: "end_turn", content: [text("oi")] }]);
  const agent = createAgent({ client, systemPrompt: "S", fallback: false, model: "claude-sonnet-5", effort: "medium" });
  await agent.reply({ messages: [{ role: "user", content: "oi" }], context: "C", runTool: async () => "" });
  assert.equal(client.requests[0].fallbacks, undefined);
  assert.equal(client.requests[0].betas, undefined);
  assert.equal(client.requests[0].model, "claude-sonnet-5");
});

test("após fallback no meio da resposta, só reenvia o que é permitido", async () => {
  const client = fakeClient([
    {
      stop_reason: "tool_use",
      content: [
        { type: "thinking", thinking: "", signature: "x" },
        text("parcial"),
        { type: "fallback", from: { model: "claude-opus-5" }, to: { model: "claude-opus-4-8" } },
        toolUse("t1", "chamar_humano", { motivo: "pediu humano" }),
      ],
    },
    { stop_reason: "end_turn", content: [text("Já chamei a equipe!")] },
  ]);
  const agent = createAgent({ client, systemPrompt: "S" });
  const result = await agent.reply({ messages: [{ role: "user", content: "humano" }], context: "C", runTool: async () => "ok" });

  assert.equal(result.text, "Já chamei a equipe!");
  assert.deepEqual(
    client.requests[1].messages[1].content.map((b) => b.type),
    ["text", "tool_use"],
  );
});
