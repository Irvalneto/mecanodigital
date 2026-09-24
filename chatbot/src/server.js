// Ponto de entrada em produção: `npm start`.

import { config } from "./config.js";
import { createServer } from "./app.js";
import { createAgent } from "./agent.js";
import { createBot } from "./bot.js";
import { createNotifier } from "./notify.js";
import { buildSystemPrompt } from "./prompt.js";
import { openStore } from "./store.js";
import { createWhatsAppClient } from "./whatsapp.js";

const missing = [
  ["WHATSAPP_TOKEN", config.whatsapp.token],
  ["WHATSAPP_PHONE_NUMBER_ID", config.whatsapp.phoneNumberId],
  ["WHATSAPP_VERIFY_TOKEN", config.whatsapp.verifyToken],
  ["ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length) {
  console.error(`Faltam variáveis de ambiente: ${missing.join(", ")}. Veja o .env.example.`);
  process.exit(1);
}
if (!config.whatsapp.appSecret) {
  console.warn("WHATSAPP_APP_SECRET não definido: o webhook aceitará requisições sem checar a assinatura da Meta.");
}

const store = await openStore(config.dataDir);
const whatsapp = createWhatsAppClient(config.whatsapp);
const agent = createAgent({ ...config.claude, systemPrompt: buildSystemPrompt() });
const notify = createNotifier({
  whatsapp,
  ownerWhatsapp: config.ownerWhatsapp,
  webhookUrl: config.leadWebhookUrl,
});
const bot = createBot({
  store,
  agent,
  whatsapp,
  notify,
  ownerWhatsapp: config.ownerWhatsapp,
  debounceMs: config.debounceMs,
  maxRepliesPerHour: config.maxRepliesPerHour,
  historyLimit: config.historyLimit,
  timezone: config.timezone,
});

const server = createServer({
  bot,
  verifyToken: config.whatsapp.verifyToken,
  appSecret: config.whatsapp.appSecret,
});

server.listen(config.port, () => {
  console.log(`Bot da Mecano ouvindo na porta ${config.port} (webhook em /webhook, modelo ${config.claude.model})`);
});

async function shutdown() {
  console.log("Encerrando: respondendo mensagens pendentes...");
  server.close();
  await bot.drain();
  await store.save();
  process.exit(0);
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
