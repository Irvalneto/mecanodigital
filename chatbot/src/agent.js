// Conversa com o Claude: gera a resposta do bot e executa as ferramentas
// (registrar lead / chamar humano) que o modelo decidir usar.

import Anthropic from "@anthropic-ai/sdk";

export const SERVICOS = ["site", "automacao", "aplicativo", "saas", "outro"];

export const TOOLS = [
  {
    name: "registrar_lead",
    description:
      "Registra (ou atualiza) o lead e avisa a equipe da Mecano. Use assim que souber o nome, o tipo de serviço e um resumo do que a pessoa precisa. Em atualizações, envie todos os dados conhecidos, não só os novos.",
    input_schema: {
      type: "object",
      properties: {
        nome: { type: "string", description: "Nome da pessoa." },
        servico: {
          type: "string",
          enum: SERVICOS,
          description: "Serviço que mais se encaixa. Use 'outro' se ainda não estiver claro.",
        },
        resumo: {
          type: "string",
          description: "Resumo objetivo do problema/projeto, com os detalhes que a pessoa contou.",
        },
        empresa: { type: "string", description: "Empresa e/ou segmento, se informado." },
        prazo: { type: "string", description: "Para quando precisa, se informado." },
        orcamento: { type: "string", description: "Faixa de investimento, se informada." },
        email: { type: "string", description: "E-mail, se informado." },
        melhor_horario: { type: "string", description: "Melhor horário para contato, se informado." },
        temperatura: {
          type: "string",
          enum: ["quente", "morno", "frio"],
          description:
            "Quão pronto para fechar o lead parece: quente (necessidade clara e urgente), morno (interesse real, sem pressa), frio (só pesquisando).",
        },
      },
      required: ["nome", "servico", "resumo"],
      additionalProperties: false,
    },
  },
  {
    name: "chamar_humano",
    description:
      "Avisa a equipe da Mecano que esta conversa precisa de uma pessoa (pedido explícito, reclamação, cliente atual, negociação ou algo que você não consegue resolver).",
    input_schema: {
      type: "object",
      properties: {
        motivo: { type: "string", description: "Por que a equipe precisa entrar, em uma frase." },
      },
      required: ["motivo"],
      additionalProperties: false,
    },
  },
];

// O loop é manual (e não client.beta.messages.toolRunner) porque as ferramentas
// dependem do contato da conversa e o resultado de cada rodada precisa ser inspecionado.
export function validateToolInput(name, input) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) return `Ferramenta desconhecida: ${name}`;
  if (typeof input !== "object" || input === null) return "Entrada inválida.";
  const { properties, required } = tool.input_schema;
  for (const key of required) {
    if (typeof input[key] !== "string" || !input[key].trim()) return `Campo obrigatório ausente: ${key}`;
  }
  for (const [key, value] of Object.entries(input)) {
    const prop = properties[key];
    if (!prop) return `Campo não permitido: ${key}`;
    if (typeof value !== "string") return `Campo ${key} deve ser texto.`;
    if (prop.enum && !prop.enum.includes(value)) return `Valor inválido para ${key}: ${value}`;
  }
  return null;
}

// Depois de um fallback no meio da resposta, só o que vem após o último bloco
// "fallback" (mais os textos anteriores) pode ser reenviado ao modelo.
function echoableContent(content) {
  const last = content.findLastIndex((block) => block.type === "fallback");
  if (last < 0) return content;
  return content.filter((block, i) => i > last || block.type === "text");
}

const textOf = (content) =>
  content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

export function createAgent({
  client = new Anthropic({ timeout: 90_000, maxRetries: 2 }),
  model = "claude-opus-5",
  effort = "low",
  fallback = true,
  systemPrompt,
  maxToolRounds = 4,
}) {
  async function reply({ messages, context, runTool }) {
    const convo = [...messages];
    let lastText = "";

    for (let round = 0; round <= maxToolRounds; round++) {
      const response = await client.beta.messages.create({
        model,
        max_tokens: 16000,
        system: [
          { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
          { type: "text", text: context },
        ],
        tools: TOOLS,
        messages: convo,
        output_config: { effort },
        // Se o classificador de segurança recusar, a própria API refaz o pedido
        // no modelo reserva recomendado, em vez de devolver uma recusa ao lead.
        ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
      });

      if (response.stop_reason === "refusal") return { text: "", refused: true };

      const content = echoableContent(response.content);
      lastText = textOf(content) || lastText;
      const toolUses = content.filter((block) => block.type === "tool_use");

      if (response.stop_reason === "pause_turn") {
        convo.push({ role: "assistant", content });
        continue;
      }
      if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
        return { text: textOf(content) || lastText, refused: false };
      }

      convo.push({ role: "assistant", content });
      const results = await Promise.all(
        toolUses.map(async (block) => {
          const problem = validateToolInput(block.name, block.input);
          if (problem) return { type: "tool_result", tool_use_id: block.id, content: problem, is_error: true };
          try {
            const result = await runTool(block.name, block.input);
            return { type: "tool_result", tool_use_id: block.id, content: result };
          } catch (err) {
            return { type: "tool_result", tool_use_id: block.id, content: `Erro: ${err.message}`, is_error: true };
          }
        }),
      );
      convo.push({ role: "user", content: results });
    }

    return { text: lastText, refused: false };
  }

  return { reply };
}
