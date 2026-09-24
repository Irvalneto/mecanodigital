// Utilitários de número de telefone (formato wa_id: só dígitos, com DDI).

export function digits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

// Celulares brasileiros às vezes chegam no webhook sem o 9º dígito
// (55 + DDD + 8 dígitos). Gera as duas formas para comparar números.
function brVariants(value) {
  const d = digits(value);
  const variants = new Set([d]);
  if (d.startsWith("55")) {
    if (d.length === 13 && d[4] === "9") variants.add(d.slice(0, 4) + d.slice(5));
    if (d.length === 12 && /[6-9]/.test(d[4])) variants.add(d.slice(0, 4) + "9" + d.slice(4));
  }
  return variants;
}

export function samePhone(a, b) {
  if (!digits(a) || !digits(b)) return false;
  const left = brVariants(a);
  return [...brVariants(b)].some((v) => left.has(v));
}
