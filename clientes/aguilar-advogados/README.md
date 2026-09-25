# Aguilar Advogados Associados — redesign

Redesign da landing page de https://aguilaradvogadosassociados.com.br/ (hoje em WordPress/Elementor).
Site estático, sem build: HTML, CSS e JS puros.

```
index.html        página única (seções: hero, seus direitos, escritório, razões, avaliações, dúvidas, contato)
css/styles.css    tokens de marca, layout e movimento
js/main.js        header, menu mobile, acordeões, revelação ao rolar, WhatsApp flutuante
favicon.svg       monograma dourado sobre vinho
img/              fotos em WebP responsivo (480–1200px), ícones e imagem de compartilhamento (og-image.jpg)
```

Para ver localmente: `python3 -m http.server` dentro desta pasta e abrir http://localhost:8000.

## O que mudou em relação ao site atual

- **Hero sem vídeo do YouTube.** O fundo atual é um embed do YouTube que exibe o título "Fundo LP modelo 07 · Agência Mega", o botão de compartilhar e o logo do YouTube. No lugar entrou a foto real do advogado.
- **Logo vetorizado.** O original era um PNG de 350px. Agora monograma e nome são SVG, nítidos em qualquer tela.
- **Tipografia e paleta únicas.** Antes eram seis famílias de fonte (Roboto, Roboto Slab, Montserrat, Cinzel, Poppins e Inter). Agora são duas: Newsreader nos títulos e Instrument Sans no texto. As cores saíram da própria marca: vinho, dourado, carvão e marfim.
- **"Veja se o seu caso se encaixa".** Os requisitos de cada tipo de caso viraram um checklist em acordeão. O botão de cada caso abre o WhatsApp com uma mensagem pronta sobre aquele caso.
- **Razões #1 #2 #3.** As imagens rasterizadas deram lugar a numerais tipográficos.
- **Avaliações.** O widget de terceiros (Trustindex) foi substituído por HTML estático, sem script externo.
- **Dúvidas frequentes.** Seção nova, escrita com base no conteúdo do site atual e na regra de prescrição (CF, art. 7º, XXIX).
- **WhatsApp flutuante.** Aparece depois do hero, some na seção de contato e vira uma barra inteira no mobile.
- **SEO.** Title e description, Open Graph com imagem própria e JSON-LD `LegalService`.
- **Acessibilidade.** Skip link, landmarks, foco visível, ARIA nos acordeões e contraste AA. A auditoria do axe-core passou sem violações em desktop e mobile.
- **Movimento.** Curvas ease-out curtas, hover apenas em dispositivos com mouse e respeito a `prefers-reduced-motion`. Sem JS, o conteúdo continua visível.

## Validar com o cliente antes de publicar

- Nome e OAB individual do advogado das fotos (hoje o site não nomeia ninguém).
- Seção "Dúvidas": textos novos, revisar redação.
- Avaliações: reproduzidas do widget atual; só a pontuação foi ajustada.
- Links: Instagram inferido do @ exibido no site; o Google Maps usa busca por endereço.
