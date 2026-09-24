import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createWhatsAppClient, parseWebhook, verifySignature, WhatsAppError } from "../src/whatsapp.js";

const webhook = (messages, contacts = [{ wa_id: "5511987654321", profile: { name: "Ana" } }]) => ({
  object: "whatsapp_business_account",
  entry: [{ changes: [{ field: "messages", value: { contacts, messages } }] }],
});

test("verifySignature valida o HMAC do App Secret", () => {
  const body = Buffer.from('{"a":1}');
  const sig = "sha256=" + crypto.createHmac("sha256", "segredo").update(body).digest("hex");
  assert.ok(verifySignature(body, sig, "segredo"));
  assert.ok(!verifySignature(body, sig, "outro"));
  assert.ok(!verifySignature(body, "sha256=abc", "segredo"));
  assert.ok(!verifySignature(body, undefined, "segredo"));
});

test("parseWebhook normaliza texto e mídias e ignora reações e status", () => {
  const body = webhook([
    { id: "m1", from: "5511987654321", timestamp: "1790000000", type: "text", text: { body: "Oi, quero um site" } },
    { id: "m2", from: "5511987654321", timestamp: "1790000001", type: "audio", audio: { id: "x" } },
    { id: "m3", from: "5511987654321", timestamp: "1790000002", type: "image", image: { caption: "meu logo" } },
    { id: "m4", from: "5511987654321", timestamp: "1790000003", type: "reaction", reaction: { emoji: "👍" } },
    {
      id: "m5",
      from: "5511987654321",
      timestamp: "1790000004",
      type: "interactive",
      interactive: { type: "button_reply", button_reply: { id: "b1", title: "Automação" } },
    },
  ]);
  body.entry[0].changes.push({ field: "messages", value: { statuses: [{ id: "s1", status: "read" }] } });

  const msgs = parseWebhook(body);
  assert.deepEqual(
    msgs.map((m) => [m.id, m.text]),
    [
      ["m1", "Oi, quero um site"],
      ["m2", "[enviou um áudio]"],
      ["m3", "[enviou uma imagem]\nmeu logo"],
      ["m5", "Automação"],
    ],
  );
  assert.equal(msgs[0].name, "Ana");
  assert.equal(msgs[0].timestamp, 1790000000 * 1000);
});

test("parseWebhook anota leads que chegam por anúncio", () => {
  const [msg] = parseWebhook(
    webhook([
      {
        id: "m1",
        from: "5511987654321",
        timestamp: "1790000000",
        type: "text",
        text: { body: "Quero saber mais" },
        referral: { headline: "Automatize seu WhatsApp" },
      },
    ]),
  );
  assert.equal(msg.text, '[chegou por um anúncio: "Automatize seu WhatsApp"]\nQuero saber mais');
});

test("parseWebhook ignora payloads que não são do WhatsApp", () => {
  assert.deepEqual(parseWebhook({ object: "page" }), []);
  assert.deepEqual(parseWebhook(null), []);
});

test("cliente envia texto e marca como lida no formato da Cloud API", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] }), { status: 200 });
  };
  const client = createWhatsAppClient({ token: "tok", phoneNumberId: "123", apiVersion: "v23.0", fetchImpl });

  await client.sendText("5511987654321", "Olá!");
  await client.markRead("wamid.in", { typing: true });

  assert.equal(calls[0].url, "https://graph.facebook.com/v23.0/123/messages");
  assert.equal(calls[0].init.headers.Authorization, "Bearer tok");
  assert.deepEqual(calls[0].body, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: "5511987654321",
    type: "text",
    text: { body: "Olá!", preview_url: true },
  });
  assert.deepEqual(calls[1].body, {
    messaging_product: "whatsapp",
    status: "read",
    message_id: "wamid.in",
    typing_indicator: { type: "text" },
  });
});

test("cliente expõe o código de erro da Meta", async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({ error: { code: 131047, message: "Re-engagement message" } }), { status: 400 });
  const client = createWhatsAppClient({ token: "tok", phoneNumberId: "123", fetchImpl });
  await assert.rejects(client.sendText("55", "oi"), (err) => err instanceof WhatsAppError && err.code === 131047);
});
