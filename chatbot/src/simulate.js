// Converse com o bot pelo terminal, sem WhatsApp: `npm run simular`.
// Só precisa da ANTHROPIC_API_KEY. Ótimo para ajustar o empresa.js antes de ir ao ar.

import readline from "node:readline/promises";
import { config } from "./config.js";
import { createAgent } from "./agent.js";
import { createBot } from "./bot.js";
import { formatNotification } from "./notify.js";
import { buildSystemPrompt } from "./prompt.js";
import { openStore } from "./store.js";

if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.error("Defina ANTHROPIC_API_KEY no .env para usar o simulador.");
  process.exit(1);
}

const LEAD = "5511900000000";
const OWNER = "5511911111111";
const quiet = { info() {}, warn: console.warn, error: console.error };

const whatsapp = {
  async sendText(to, text) {
    const who = to === OWNER ? "bot → você (dono)" : "bot";
    console.log(`\n\x1b[32m${who}:\x1b[0m ${text}\n`);
  },
  async markRead() {},
};

const bot = createBot({
  store: await openStore(null),
  agent: createAgent({ ...config.claude, systemPrompt: buildSystemPrompt() }),
  whatsapp,
  notify: async (event) => console.log(`\n\x1b[33m[aviso para a equipe]\x1b[0m\n${formatNotification(event)}`),
  ownerWhatsapp: OWNER,
  debounceMs: 0,
  timezone: config.timezone,
  logger: quiet,
});

console.log(
  "Simulador do bot da Mecano. Escreva como se fosse um lead.\n" +
    'Comandos do dono: comece com "dono:" (ex. dono: /leads). Para sair: /sair\n',
);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let n = 0;
for (;;) {
  const line = (await rl.question("\x1b[36mvocê:\x1b[0m ")).trim();
  if (!line) continue;
  if (line === "/sair") break;
  const asOwner = line.startsWith("dono:");
  await bot.handleIncoming({
    id: `sim-${++n}`,
    from: asOwner ? OWNER : LEAD,
    name: asOwner ? "Dono" : "Lead de teste",
    timestamp: Date.now(),
    type: "text",
    text: asOwner ? line.slice("dono:".length).trim() : line,
  });
  await bot.drain();
}
rl.close();
