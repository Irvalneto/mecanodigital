// Configuração via variáveis de ambiente (arquivo .env na pasta chatbot/).

import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  process.loadEnvFile(path.join(root, ".env"));
} catch {
  // sem .env: usa só as variáveis do ambiente (ex. painel da hospedagem)
}

const env = process.env;
const int = (value, fallback) => {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  port: int(env.PORT, 3000),
  dataDir: path.resolve(root, env.DATA_DIR || "data"),
  whatsapp: {
    token: env.WHATSAPP_TOKEN || "",
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || "",
    verifyToken: env.WHATSAPP_VERIFY_TOKEN || "",
    appSecret: env.WHATSAPP_APP_SECRET || "",
    apiVersion: env.WHATSAPP_API_VERSION || "v23.0",
  },
  claude: {
    model: env.CLAUDE_MODEL || "claude-opus-5",
    effort: env.CLAUDE_EFFORT || "low",
    fallback: env.CLAUDE_FALLBACK !== "off",
  },
  ownerWhatsapp: env.OWNER_WHATSAPP || "",
  leadWebhookUrl: env.LEAD_WEBHOOK_URL || "",
  debounceMs: int(env.DEBOUNCE_MS, 4000),
  maxRepliesPerHour: int(env.MAX_REPLIES_PER_HOUR, 30),
  historyLimit: int(env.HISTORY_LIMIT, 40),
  timezone: env.TIMEZONE || "America/Sao_Paulo",
};
