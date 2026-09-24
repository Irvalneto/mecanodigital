// Ajusta o texto do modelo para o WhatsApp, que usa *negrito*, _itálico_
// e não renderiza markdown de títulos nem links no formato [texto](url).

export const WHATSAPP_TEXT_LIMIT = 4096;

export function toWhatsApp(text) {
  return String(text ?? "")
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/__(.+?)__/g, "_$1_")
    .replace(/^#{1,6}\s+(.+)$/gm, "*$1*")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1: $2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Quebra textos acima do limite do WhatsApp, preferindo parágrafo > linha > espaço.
export function splitMessage(text, limit = WHATSAPP_TEXT_LIMIT) {
  const parts = [];
  let rest = String(text ?? "").trim();
  while (rest.length > limit) {
    let cut = rest.lastIndexOf("\n\n", limit);
    if (cut <= 0) cut = rest.lastIndexOf("\n", limit);
    if (cut <= 0) cut = rest.lastIndexOf(" ", limit);
    if (cut <= 0) cut = limit;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}
