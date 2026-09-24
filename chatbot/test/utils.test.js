import { test } from "node:test";
import assert from "node:assert/strict";
import { samePhone } from "../src/phone.js";
import { toWhatsApp, splitMessage } from "../src/format.js";
import { buildContext } from "../src/prompt.js";

test("samePhone aceita celular brasileiro com e sem o 9º dígito", () => {
  assert.ok(samePhone("5511987654321", "551187654321"));
  assert.ok(samePhone("+55 (11) 98765-4321", "5511987654321"));
  assert.ok(!samePhone("5511987654321", "5511987654322"));
  assert.ok(!samePhone("", "5511987654321"));
});

test("toWhatsApp converte markdown para a formatação do WhatsApp", () => {
  assert.equal(toWhatsApp("**Diagnóstico** gratuito"), "*Diagnóstico* gratuito");
  assert.equal(toWhatsApp("## Serviços\n\n\n\nsite"), "*Serviços*\n\nsite");
  assert.equal(toWhatsApp("veja [o site](https://mecano.dev)"), "veja o site: https://mecano.dev");
});

test("splitMessage respeita o limite e prefere quebrar em parágrafos", () => {
  assert.deepEqual(splitMessage("curta"), ["curta"]);
  const parts = splitMessage(`${"a".repeat(30)}\n\n${"b".repeat(30)}`, 40);
  assert.deepEqual(parts, ["a".repeat(30), "b".repeat(30)]);
  assert.ok(splitMessage("x".repeat(100), 40).every((p) => p.length <= 40));
});

test("buildContext descreve estado do lead e horário local", () => {
  const contact = {
    name: "Ana",
    lead: { dados: { nome: "Ana", servico: "site", resumo: "landing page" } },
    humanRequest: null,
  };
  const context = buildContext(contact, { now: new Date("2026-09-24T20:30:00Z"), timezone: "America/Sao_Paulo" });
  assert.match(context, /17:30/);
  assert.match(context, /Lead já registrado/);
  assert.match(context, /Equipe ainda não foi chamada/);
});
