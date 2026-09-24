import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer } from "../src/app.js";
import { openStore } from "../src/store.js";

const silent = { info() {}, warn() {}, error() {} };

async function start(options) {
  const received = [];
  const bot = { handleIncoming: async (msg) => received.push(msg) };
  const server = createServer({ bot, logger: silent, ...options });
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, received, close: () => new Promise((resolve) => server.close(resolve)) };
}

const payload = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          field: "messages",
          value: {
            contacts: [{ wa_id: "5511987654321", profile: { name: "Ana" } }],
            messages: [{ id: "m1", from: "5511987654321", timestamp: "1790000000", type: "text", text: { body: "Oi" } }],
          },
        },
      ],
    },
  ],
});
const sign = (body, secret) => "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");

test("verificação do webhook devolve o challenge só com o token certo", async () => {
  const { base, close } = await start({ verifyToken: "meu-token", appSecret: "s" });
  try {
    const ok = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=meu-token&hub.challenge=123`);
    assert.equal(ok.status, 200);
    assert.equal(await ok.text(), "123");

    const bad = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=123`);
    assert.equal(bad.status, 403);
  } finally {
    await close();
  }
});

test("POST com assinatura válida entrega a mensagem ao bot", async () => {
  const { base, received, close } = await start({ verifyToken: "t", appSecret: "segredo" });
  try {
    const res = await fetch(`${base}/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Hub-Signature-256": sign(payload, "segredo") },
      body: payload,
    });
    assert.equal(res.status, 200);
    assert.deepEqual(
      received.map((m) => [m.from, m.name, m.text]),
      [["5511987654321", "Ana", "Oi"]],
    );
  } finally {
    await close();
  }
});

test("POST com assinatura inválida é recusado", async () => {
  const { base, received, close } = await start({ verifyToken: "t", appSecret: "segredo" });
  try {
    const res = await fetch(`${base}/webhook`, {
      method: "POST",
      headers: { "X-Hub-Signature-256": sign(payload, "outro") },
      body: payload,
    });
    assert.equal(res.status, 401);
    assert.equal(received.length, 0);
  } finally {
    await close();
  }
});

test("health check e rotas desconhecidas", async () => {
  const { base, close } = await start({ verifyToken: "t" });
  try {
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal((await fetch(`${base}/outra`)).status, 404);
  } finally {
    await close();
  }
});

test("store persiste conversas no disco", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mecano-bot-"));
  try {
    const store = await openStore(dir);
    const contact = store.getOrCreate("5511987654321", "Ana");
    contact.history.push({ role: "user", text: "Oi", at: new Date().toISOString() });
    await store.save();

    const reopened = await openStore(dir);
    assert.equal(reopened.get("5511987654321").name, "Ana");
    assert.equal(reopened.get("5511987654321").history[0].text, "Oi");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
