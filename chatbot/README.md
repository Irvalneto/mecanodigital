# Chatbot de WhatsApp da Mecano

Bot que responde os leads da Mecano no WhatsApp 24h por dia. Ele tira dúvidas sobre os
serviços, entende o que a pessoa precisa, registra o lead e avisa você na hora, com
um link para continuar a conversa.

- **IA:** Claude (Anthropic) conversa em português, no tom da Mecano, e só afirma o que está em [`src/empresa.js`](src/empresa.js).
- **WhatsApp:** API oficial da Meta (WhatsApp Cloud API), sem risco de banimento como nas soluções não oficiais.
- **Sem banco de dados:** conversas e leads ficam num arquivo JSON (`data/conversas.json`).
- **Única dependência:** o SDK da Anthropic. Node.js 20.12 ou mais novo.

## Como o bot atende

1. O lead manda mensagem. O bot espera uns segundos para juntar mensagens picadas ("oi" / "tudo bem?" / "queria um site") e responde tudo de uma vez, mostrando "digitando...".
2. Ele conversa, uma pergunta por vez, para descobrir nome, problema, serviço, prazo e, se couber, empresa e orçamento.
3. Com nome, serviço e resumo em mãos, **registra o lead** e você recebe no seu WhatsApp:
   ```
   🔔 Novo lead — Ana Souza
   📱 https://wa.me/5511987654321
   Serviço: Automação
   Resumo: Quer integrar o formulário do site com a planilha e o CRM
   Prazo: próximo mês
   Temperatura: quente
   ```
4. O bot oferece o **diagnóstico gratuito** e avisa que a equipe retorna em até 1 dia útil.
5. Se o lead pedir para falar com uma pessoa, reclamar ou sair do que o bot sabe, ele **chama você**.

Áudios, imagens e documentos: o bot ainda não consegue ouvir nem ver, então pede com
educação para a pessoa escrever. Leads que chegam por anúncio de clique para WhatsApp
são identificados com o título do anúncio.

## 1. Teste no terminal (5 minutos)

Dá para conversar com o bot antes de configurar qualquer coisa na Meta:

```bash
cd chatbot
npm install
cp .env.example .env      # preencha só ANTHROPIC_API_KEY
npm run simular
```

Escreva como se fosse um lead. Os avisos que iriam para você aparecem em amarelo.
Comandos do dono: `dono: /leads`.

## 2. Ensine o bot sobre a Mecano

Edite [`src/empresa.js`](src/empresa.js). Já vem com o conteúdo do site; preencha os
`[INSERIR: ...]` (seu nome, horário de atendimento, site, e-mail, perguntas frequentes).
Enquanto um campo estiver como `[INSERIR]`, o bot não fala dele e diz que a equipe confirma.

O jeito de conversar (tom, o que perguntar, quando chamar você) está em
[`src/prompt.js`](src/prompt.js).

Sobre preço: por padrão o bot **não informa valores**, só explica que o valor sai na
proposta depois do diagnóstico. Se quiser que ele cite faixas, escreva-as em `empresa.js`.

## 3. Configure o WhatsApp na Meta

1. Em [developers.facebook.com](https://developers.facebook.com), crie um app do tipo **Empresa** e adicione o produto **WhatsApp**.
2. Em **WhatsApp → Configuração da API** você já pode testar com o número de teste da Meta. Para produção, adicione o número da empresa.
   - O número conectado à API não fica ativo no app WhatsApp comum. Use um número dedicado ao atendimento (ou veja com a Meta/um parceiro a opção de coexistência com o app WhatsApp Business).
3. Copie a **Identificação do número de telefone** para `WHATSAPP_PHONE_NUMBER_ID`.
4. Crie um **token permanente**: Business Manager → Configurações → Usuários do sistema → adicionar usuário (admin) → Gerar token, com as permissões `whatsapp_business_messaging` e `whatsapp_business_management`. Coloque em `WHATSAPP_TOKEN`. (O token temporário da tela de teste expira em 24h.)
5. Em **Configurações do app → Básico**, copie a **Chave secreta do aplicativo** para `WHATSAPP_APP_SECRET`.
6. Invente uma senha para `WHATSAPP_VERIFY_TOKEN`.
7. Coloque seu WhatsApp pessoal em `OWNER_WHATSAPP` (ex. `5511999999999`).

## 4. Coloque no ar

O bot precisa de um endereço HTTPS público e de uma pasta que não se apague entre deploys
(é onde ficam as conversas).

- **Railway, Render ou Fly.io:** apontar para a pasta `chatbot/` (tem `Dockerfile`), cadastrar as variáveis do `.env` no painel e montar um volume em `/app/data`.
- **VPS:** `npm ci --omit=dev && npm start` atrás de um proxy com HTTPS (Caddy/Nginx), rodando com pm2 ou systemd.
- **Só para testar do seu computador:** `npm start` e, em outro terminal, `npx cloudflared tunnel --url http://localhost:3000` (ou ngrok) para ganhar uma URL HTTPS temporária.

Depois, na Meta, em **WhatsApp → Configuração → Webhook**:

- URL de callback: `https://SEU-ENDERECO/webhook`
- Token de verificação: o mesmo `WHATSAPP_VERIFY_TOKEN`
- Clique em **Verificar e salvar** e, em campos do webhook, assine **messages**.

Mande um "oi" de outro celular para o número do bot. Pronto.

## Seus comandos (do `OWNER_WHATSAPP` para o número do bot)

| Comando | O que faz |
|---|---|
| `/leads` | Lista os últimos 10 leads com link para chamar cada um |
| `/pausar 5511999999999` | O bot para de responder esse contato, para você assumir |
| `/retomar 5511999999999` | O bot volta a responder |
| `/ajuda` | Mostra os comandos |

Mensagens suas que não começam com `/` são tratadas como de um lead, para você testar o bot do próprio celular.

**Importante sobre os avisos no seu WhatsApp:** a Meta só deixa o bot mandar mensagem livre
para quem falou com ele nas últimas 24h. Se os avisos pararem de chegar, mande qualquer
comando (ex. `/leads`) para o número do bot e a janela reabre. Para não depender disso,
use também o `LEAD_WEBHOOK_URL`.

## Receber os leads em outro sistema (opcional)

Com `LEAD_WEBHOOK_URL` preenchido, cada evento é enviado por POST em JSON. Serve para
jogar os leads numa planilha, CRM, Slack ou e-mail via n8n, Make, Zapier ou Google Apps Script:

```json
{
  "evento": "novo_lead",
  "motivo": null,
  "whatsapp": "5511987654321",
  "nome_perfil": "Ana",
  "lead": {
    "nome": "Ana Souza",
    "servico": "automacao",
    "resumo": "Quer integrar o formulário do site com a planilha e o CRM",
    "prazo": "próximo mês",
    "temperatura": "quente"
  },
  "pausado": false,
  "data": "2026-09-24T20:30:00.000Z"
}
```

Eventos: `novo_lead`, `lead_atualizado`, `humano_solicitado`, `limite_atingido`, `erro`.

## Custos

- **WhatsApp:** respostas a quem mandou mensagem primeiro (dentro de 24h) não são cobradas pela Meta; só mensagens de template iniciadas pela empresa são. Confira a tabela atual da Meta.
- **Claude:** cobrado por uso na conta da Anthropic. Com `claude-opus-5` e esforço `low`, cada resposta curta custa centavos de dólar; acompanhe no painel da Anthropic nas primeiras semanas. `CLAUDE_MODEL=claude-sonnet-5` sai mais barato, se a qualidade atender.
- `MAX_REPLIES_PER_HOUR` (padrão 30) limita as respostas por contato, contra spam e contas surpresa.

## Estrutura

```
src/
  empresa.js    informações da empresa (edite aqui)
  prompt.js     instruções e tom do bot
  agent.js      conversa com o Claude e ferramentas (registrar lead, chamar humano)
  bot.js        fila por contato, agrupamento de mensagens, comandos do dono
  whatsapp.js   WhatsApp Cloud API: webhook, assinatura, envio
  notify.js     avisos por WhatsApp e webhook
  store.js      conversas e leads em data/conversas.json
  app.js        servidor HTTP (/webhook e /health)
  server.js     inicialização (npm start)
  simulate.js   simulador no terminal (npm run simular)
test/           testes (npm test), sem chamar APIs reais
```

## Limitações conhecidas

- Não entende áudio nem imagem (pede para a pessoa escrever).
- O arquivo JSON serve para uma única instância do servidor. Se um dia precisar escalar para várias, troque o `store.js` por um banco.
- Não há painel web: você acompanha pelos avisos, por `/leads` e pelo `data/conversas.json`.
