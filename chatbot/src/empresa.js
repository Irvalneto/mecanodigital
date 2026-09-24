// ======================================================================
//  Informações da empresa que o bot usa para responder os leads.
//  EDITE ESTE ARQUIVO: é aqui que você ensina o bot sobre a Mecano.
//  O bot só afirma o que estiver escrito aqui. Trechos marcados com
//  [INSERIR: ...] são ignorados por ele até você preencher.
// ======================================================================

export const EMPRESA = `
# Mecano Soluções Digitais

A Mecano projeta e constrói produtos digitais sob medida (sites, automações,
aplicativos e SaaS), sem gambiarra, sem enrolação, com escopo e prazo fechados
antes de começar. Lema: "Sites, apps e automações que funcionam no primeiro deploy."

Engenharia de produto, não fábrica de sites: agências entregam design bonito que não
funciona direito em produção e freelancers isolados não sustentam prazo em projetos
maiores. A Mecano fica no meio: processo estruturado, com quem escreve o código.

- Site: [INSERIR: endereço do site]
- E-mail: [INSERIR: e-mail]
- Cidade/UF: [INSERIR: cidade/UF]
- Horário de atendimento humano: [INSERIR: ex. segunda a sexta, 9h às 18h]
- Quem atende os leads: [INSERIR: seu nome]
- Prazo de retorno: a equipe retorna em até 1 dia útil.

## Serviços

1. Sites institucionais e landing pages: presença digital que gera contato qualificado,
   não só um cartão de visita online. Inclui design responsivo mobile-first testado em
   telas reais, textos orientados a conversão, SEO técnico básico (metadados, sitemap,
   performance), formulário de contato funcional com validação, página 404
   personalizada e checklist de QA antes do lançamento.

2. Automações: para quem perde horas por semana copiando dados entre planilha,
   formulário, CRM e WhatsApp manualmente. Inclui mapeamento do processo atual e dos
   pontos de retrabalho, integração entre as ferramentas que o cliente já usa,
   notificações e alertas automáticos (e-mail, WhatsApp, Slack) e documentação do fluxo.

3. Aplicativos: apps web e/ou mobile para um processo interno ou um produto usado pelo
   cliente final. Inclui levantamento de requisitos e fluxo de usuário antes de codar,
   interface com estados de carregamento, vazio e erro tratados, autenticação e
   controle de acesso quando necessário, entrega com código-fonte e documentação de deploy.

4. SaaS e micro-SaaS: do MVP validável ao primeiro cliente pagante, com arquitetura que
   aguenta crescer sem reescrever tudo. Inclui definição do MVP, cobrança e assinatura
   (quando aplicável), painel de administração com métricas básicas e plano técnico
   para as próximas etapas.

Se o caso do cliente mistura mais de um serviço, o diagnóstico inicial resolve isso.

## Como funciona (4 etapas)

1. Diagnóstico (gratuito): entendemos o problema real antes de falar em tela ou tecnologia.
2. Proposta: escopo, prazo e valor fechados por escrito, sem "depois a gente vê".
3. Construção: o cliente acompanha o andamento; nada é entregue só no fim.
4. Entrega: código, acessos e documentação nas mãos do cliente, sem dependência da Mecano.

## Diferenciais

- Sem lock-in: o código-fonte é do cliente. Se quiser trocar de fornecedor, leva tudo.
- Escopo fechado antes de começar: o cliente sabe o que vai receber e quando, antes de pagar.
- Comunicação técnica direta: o cliente fala com quem constrói o projeto.
- Feito para o celular: testado em telas reais, não só no navegador do desktop.
- Tecnologia na medida: HTML, CSS e JS quando basta; framework só quando o projeto pede.

## Preços e prazos

Não existe tabela de preços: valor e prazo dependem do escopo e são fechados por
escrito na proposta, depois do diagnóstico gratuito. Não informe valores nem
estimativas de preço ou prazo.
[INSERIR: se quiser, coloque aqui faixas de investimento que o bot pode citar, ex. "landing pages a partir de R$ X"]

## Perguntas frequentes

[INSERIR: perguntas e respostas que seus leads costumam fazer]
`.trim();
