// Integração com a WhatsApp Cloud API (oficial da Meta).
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

import crypto from "node:crypto";

export class WhatsAppError extends Error {
  constructor(status, body) {
    let code = null;
    let message = body;
    try {
      const parsed = JSON.parse(body);
      code = parsed?.error?.code ?? null;
      message = parsed?.error?.message ?? body;
    } catch {
      // corpo não era JSON; mantém o texto cru
    }
    super(`WhatsApp API ${status}${code ? ` (código ${code})` : ""}: ${message}`);
    this.status = status;
    this.code = code;
  }
}

// Código de erro quando a última mensagem da pessoa foi há mais de 24h:
// fora dessa janela a Meta só aceita mensagens de template.
export const OUTSIDE_24H_WINDOW = 131047;

/* --- Assinatura do webhook (X-Hub-Signature-256 = HMAC-SHA256 do corpo com o App Secret) --- */
export function verifySignature(rawBody, header, appSecret) {
  if (typeof header !== "string" || !header.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest();
  const received = Buffer.from(header.slice("sha256=".length), "hex");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

/* --- Webhook -> lista de mensagens normalizadas ---
   Ignora atualizações de status (enviado/entregue/lido), reações e eventos de sistema. */
export function parseWebhook(body) {
  const messages = [];
  if (body?.object !== "whatsapp_business_account") return messages;

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value ?? {};
      const names = new Map((value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name ?? ""]));

      for (const msg of value.messages ?? []) {
        let text = describeMessage(msg);
        if (text === null) continue;
        if (msg.referral) {
          const ad = msg.referral.headline || msg.referral.body || msg.referral.source_url || "";
          text = `[chegou por um anúncio${ad ? `: "${ad}"` : ""}]\n${text}`.trim();
        }
        messages.push({
          id: msg.id,
          from: msg.from,
          name: names.get(msg.from) ?? "",
          timestamp: Number(msg.timestamp) * 1000 || Date.now(),
          type: msg.type,
          text,
        });
      }
    }
  }
  return messages;
}

// Mídias viram uma descrição entre colchetes para o modelo saber o que chegou.
function describeMessage(msg) {
  const withCaption = (label, caption) => (caption ? `${label}\n${caption}` : label);

  switch (msg.type) {
    case "text":
      return msg.text?.body ?? "";
    case "button":
      return msg.button?.text ?? "";
    case "interactive":
      return msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? "";
    case "image":
      return withCaption("[enviou uma imagem]", msg.image?.caption);
    case "video":
      return withCaption("[enviou um vídeo]", msg.video?.caption);
    case "document": {
      const name = msg.document?.filename;
      return withCaption(`[enviou um documento${name ? `: ${name}` : ""}]`, msg.document?.caption);
    }
    case "audio":
      return "[enviou um áudio]";
    case "sticker":
      return "[enviou uma figurinha]";
    case "location":
      return "[enviou uma localização]";
    case "contacts":
      return "[enviou um contato]";
    case "unsupported":
      return "[enviou um tipo de mensagem que não conseguimos abrir]";
    default:
      return null; // reaction, system, request_welcome etc.
  }
}

/* --- Cliente de envio --- */
export function createWhatsAppClient({ token, phoneNumberId, apiVersion = "v23.0", fetchImpl = fetch }) {
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  async function post(payload) {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    });
    if (!res.ok) throw new WhatsAppError(res.status, await res.text().catch(() => ""));
    return res.json();
  }

  return {
    sendText(to, body) {
      return post({ recipient_type: "individual", to, type: "text", text: { body, preview_url: true } });
    },
    // Marca como lida e, opcionalmente, mostra "digitando..." até a resposta sair (máx. 25s).
    markRead(messageId, { typing = false } = {}) {
      return post({
        status: "read",
        message_id: messageId,
        ...(typing ? { typing_indicator: { type: "text" } } : {}),
      });
    },
  };
}
