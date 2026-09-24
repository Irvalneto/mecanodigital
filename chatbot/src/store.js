// Armazenamento das conversas e leads em um arquivo JSON.
// Suficiente para o volume de uma empresa pequena; sem banco de dados para manter.
// Com dir = null, fica só em memória (simulador e testes).

import fs from "node:fs/promises";
import path from "node:path";

const MAX_STORED_HISTORY = 200;

export async function openStore(dir) {
  const file = dir ? path.join(dir, "conversas.json") : null;
  let data = { contacts: {} };

  if (file) {
    await fs.mkdir(dir, { recursive: true });
    try {
      data = JSON.parse(await fs.readFile(file, "utf8"));
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  }

  // Gravações em fila: grava num temporário e renomeia, para nunca deixar o arquivo pela metade.
  let writing = Promise.resolve();
  function save() {
    for (const contact of Object.values(data.contacts)) {
      if (contact.history.length > MAX_STORED_HISTORY) {
        contact.history = contact.history.slice(-MAX_STORED_HISTORY);
      }
    }
    if (!file) return Promise.resolve();
    const snapshot = JSON.stringify(data, null, 2);
    writing = writing
      .catch(() => {})
      .then(async () => {
        const tmp = `${file}.tmp`;
        await fs.writeFile(tmp, snapshot);
        await fs.rename(tmp, file);
      });
    return writing;
  }

  return {
    get(waId) {
      return data.contacts[waId] ?? null;
    },
    getOrCreate(waId, name = "") {
      let contact = data.contacts[waId];
      if (!contact) {
        const now = new Date().toISOString();
        contact = data.contacts[waId] = {
          waId,
          name,
          createdAt: now,
          updatedAt: now,
          history: [],
          lead: null,
          humanRequest: null,
          paused: false,
          replyTimes: [],
          limitNotifiedAt: 0,
        };
      }
      if (name) contact.name = name;
      return contact;
    },
    all() {
      return Object.values(data.contacts);
    },
    save,
  };
}
