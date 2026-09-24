// Servidor HTTP do webhook (sem framework: node:http já basta para 3 rotas).

import http from "node:http";
import { parseWebhook, verifySignature } from "./whatsapp.js";

const MAX_BODY = 1_000_000;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("corpo grande demais"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(body);
}

export function createServer({ bot, verifyToken, appSecret, logger = console }) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (req.method === "GET" && url.pathname === "/health") return send(res, 200, "ok");
    if (url.pathname !== "/webhook") return send(res, 404, "not found");

    // Verificação feita pela Meta ao cadastrar a URL do webhook.
    if (req.method === "GET") {
      const ok =
        url.searchParams.get("hub.mode") === "subscribe" &&
        verifyToken &&
        url.searchParams.get("hub.verify_token") === verifyToken;
      return ok ? send(res, 200, url.searchParams.get("hub.challenge") ?? "") : send(res, 403, "forbidden");
    }

    if (req.method !== "POST") return send(res, 405, "method not allowed");

    let raw;
    try {
      raw = await readBody(req);
    } catch {
      return send(res, 413, "payload too large");
    }
    if (appSecret && !verifySignature(raw, req.headers["x-hub-signature-256"], appSecret)) {
      logger.warn("[webhook] assinatura inválida; requisição ignorada");
      return send(res, 401, "invalid signature");
    }

    let body;
    try {
      body = JSON.parse(raw.toString("utf8"));
    } catch {
      return send(res, 400, "invalid json");
    }

    // Responde 200 na hora: a Meta reenvia o evento se a resposta demorar.
    send(res, 200, "ok");
    for (const msg of parseWebhook(body)) {
      bot.handleIncoming(msg).catch((err) => logger.error("[webhook] erro ao processar mensagem:", err));
    }
  });
}
