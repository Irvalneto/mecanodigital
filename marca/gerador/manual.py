"""Monta marca/manual.html (manual de marca) a partir dos SVGs gerados."""
import os
import re
import sys

from gen import SYMBOL_D

M = sys.argv[1]
SVG = os.path.join(M, "logo", "svg")


def inline(name, cls=""):
    s = open(os.path.join(SVG, name), encoding="utf-8").read().strip()
    s = re.sub(r'\s(width|height)="[^"]*"', "", s, count=2)
    s = s.replace('role="img"', f'role="img" class="{cls}"' if cls else 'role="img"')
    return s


def sym(color, cls="sym"):
    return (f'<svg class="{cls}" viewBox="6.89 3 50.22 58" aria-hidden="true">'
            f'<path fill="{color}" fill-rule="evenodd" d="{SYMBOL_D}"/></svg>')


H = inline("mecano-horizontal-cor-fundo-claro.svg")
H_DARK = inline("mecano-horizontal-cor-fundo-escuro.svg")
H_SHORT = inline("mecano-horizontal-curta-cor-fundo-claro.svg")
V_DARK = inline("mecano-vertical-cor-fundo-escuro.svg")

variants = [
    ("Cor · fundo claro", "mecano-horizontal-cor-fundo-claro.svg", "#F4F2EC", "Padrão em fundos claros."),
    ("Cor · fundo escuro", "mecano-horizontal-cor-fundo-escuro.svg", "#0E0D0B", "Padrão em fundos escuros e no site."),
    ("Mono grafite", "mecano-horizontal-mono-grafite.svg", "#FFFFFF", "Impressão em uma cor, carimbo, documentos."),
    ("Mono papel", "mecano-horizontal-mono-papel.svg", "#0E0D0B", "Gravação, fotos escuras, vídeo."),
    ("Sobre solda", "mecano-horizontal-mono-solda.svg", "#FF5A1F", "Única forma de usar a marca sobre laranja."),
]

colors = [
    ("Solda", "#FF5A1F", "255 90 31", "C0 M79 Y90 K0", "Pantone 1655 C (aprox.)",
     "Símbolo, botões, destaques. Como texto, só sobre grafite (6,2:1)."),
    ("Grafite", "#0E0D0B", "14 13 11", "C60 M50 Y50 K100", "Preto rico",
     "Fundos escuros, texto principal (17,8:1 sobre papel)."),
    ("Papel", "#F4F2EC", "244 242 236", "C0 M1 Y3 K4", "—",
     "Fundo claro padrão; texto sobre grafite."),
    ("Aço", "#A29C90", "162 156 144", "C0 M4 Y11 K36", "—",
     "Texto secundário e descritor em fundo escuro (7,1:1)."),
    ("Solda texto", "#B93A0B", "185 58 11", "C0 M69 Y94 K27", "—",
     "Laranja para texto pequeno sobre papel (5,1:1)."),
]

donts = [
    ("Distorcer", f'<div style="transform:scaleX(1.35);transform-origin:center">{H_SHORT}</div>'),
    ("Girar", f'<div style="transform:rotate(-12deg)">{H_SHORT}</div>'),
    ("Trocar as cores", f'<div style="filter:hue-rotate(170deg)">{H_SHORT}</div>'),
    ("Aplicar sombra ou brilho", f'<div style="filter:drop-shadow(0 6px 6px rgba(255,90,31,.8))">{H_SHORT}</div>'),
    ("Símbolo laranja sobre laranja", f'<div class="on-solda">{inline("mecano-horizontal-curta-cor-fundo-claro.svg")}</div>'),
    ("Reescrever o nome em outra fonte",
     f'<div class="fake">{sym("#FF5A1F", "fake-sym")}<span>Mecano</span></div>'),
]

apps = [
    ("Cartão de visita · frente", "aplicacoes/png/cartao-visita-frente.png", "90 × 50 mm, sangria de 2 mm"),
    ("Cartão de visita · verso", "aplicacoes/png/cartao-visita-verso.png", "Dados editáveis no SVG"),
    ("Post · manifesto", "aplicacoes/png/post-manifesto.png", "1080 × 1080"),
    ("Post · chamada", "aplicacoes/png/post-chamada.png", "1080 × 1080"),
    ("Avatar · solda", "aplicacoes/png/avatar-solda.png", "Seguro para recorte circular"),
    ("Avatar · grafite", "aplicacoes/png/avatar-grafite.png", "Seguro para recorte circular"),
]

variant_html = "".join(
    f'<figure class="var"><div class="stage" style="background:{bg}">{inline(f)}</div>'
    f'<figcaption><b>{t}</b><span>{d}</span></figcaption></figure>' for t, f, bg, d in variants)
color_html = "".join(
    f'<li class="color"><i style="background:{hx}"></i><div><b>{n}</b>'
    f'<dl><dt>HEX</dt><dd>{hx}</dd><dt>RGB</dt><dd>{rgb}</dd><dt>CMYK</dt><dd>{cmyk}</dd><dt>Pantone</dt><dd>{pms}</dd></dl>'
    f'<p>{use}</p></div></li>' for n, hx, rgb, cmyk, pms, use in colors)
dont_html = "".join(
    f'<figure class="dont"><div class="stage">{art}</div><figcaption><span aria-hidden="true">✕</span> {t}</figcaption></figure>'
    for t, art in donts)
app_html = "".join(
    f'<figure class="app"><img src="{src}" alt="{t}"><figcaption><b>{t}</b><span>{d}</span></figcaption></figure>'
    for t, src, d in apps)

email_sig = open(os.path.join(M, "aplicacoes", "assinatura-email.html"), encoding="utf-8").read()
email_sig = re.sub(r"<!--.*?-->", "", email_sig, flags=re.S).replace(
    "[INSERIR: URL pública]/marca/logo/png/mecano-simbolo-solda-128.png", "logo/png/mecano-simbolo-solda-128.png")

html = f"""<meta charset="utf-8">
<title>Manual de marca Mecano</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,400..800&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
  :root {{
    --solda: #FF5A1F; --grafite: #0E0D0B; --papel: #F4F2EC; --aco: #A29C90; --solda-texto: #B93A0B;
    --bg: #F4F2EC; --panel: #FBFAF6; --ink: #0E0D0B; --muted: #6B655B; --line: #E2DDD2; --accent-text: #B93A0B;
    --ui: "Archivo", "Helvetica Neue", Arial, sans-serif;
    --mono: "JetBrains Mono", ui-monospace, Consolas, monospace;
    color-scheme: light;
  }}
  @media (prefers-color-scheme: dark) {{
    :root:not([data-theme="light"]) {{ --bg: #0E0D0B; --panel: #181613; --ink: #F4F2EC; --muted: #A29C90; --line: #2C2924; --accent-text: #FF5A1F; color-scheme: dark; }}
  }}
  :root[data-theme="dark"] {{ --bg: #0E0D0B; --panel: #181613; --ink: #F4F2EC; --muted: #A29C90; --line: #2C2924; --accent-text: #FF5A1F; color-scheme: dark; }}

  * {{ box-sizing: border-box; }}
  body {{ margin: 0; background: var(--bg); color: var(--ink); font: 400 16px/1.6 var(--ui); padding-inline: clamp(16px, 4vw, 56px); padding-block: 0 80px; -webkit-font-smoothing: antialiased; }}
  .wrap {{ max-width: 1180px; margin-inline: auto; }}
  h1, h2, h3 {{ font-stretch: 118%; font-weight: 800; letter-spacing: -.035em; line-height: 1; margin: 0; text-wrap: balance; }}
  h2 {{ font-size: clamp(1.9rem, 1.3rem + 2.4vw, 3rem); }}
  h3 {{ font-size: 1.25rem; letter-spacing: -.015em; font-stretch: 110%; }}
  p {{ margin: 0; max-width: 64ch; text-wrap: pretty; }}
  .label {{ font: 500 12px/1.3 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }}
  svg {{ display: block; }}

  /* capa */
  .cover {{ margin-inline: calc(clamp(16px, 4vw, 56px) * -1); padding: clamp(28px, 5vw, 64px) clamp(16px, 4vw, 56px); background: var(--grafite); color: var(--papel); position: relative; overflow: hidden; isolation: isolate; }}
  .cover::before {{ content: ""; position: absolute; inset: 0; z-index: -1; background-image: linear-gradient(to right, rgb(244 242 236 / .05) 1px, transparent 1px), linear-gradient(to bottom, rgb(244 242 236 / .05) 1px, transparent 1px); background-size: 56px 56px; }}
  .cover-in {{ max-width: 1180px; margin-inline: auto; display: grid; gap: clamp(40px, 7vw, 96px); }}
  .cover-top {{ display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }}
  .cover-top .label {{ color: var(--aco); }}
  .cover-main {{ display: grid; gap: 40px; align-items: end; }}
  @media (min-width: 860px) {{ .cover-main {{ grid-template-columns: 1.2fr 1fr; }} }}
  .cover h1 {{ font-size: clamp(2.6rem, 1.4rem + 4.6vw, 5.2rem); font-stretch: 125%; line-height: .92; }}
  .cover h1 em {{ font-style: normal; color: var(--solda); }}
  .cover p {{ color: var(--aco); margin-top: 20px; font-size: 1.125rem; }}
  .cover .big {{ width: min(100%, 360px); justify-self: end; }}

  nav.toc {{ display: flex; flex-wrap: wrap; gap: 8px; padding-block: 28px; border-bottom: 1px solid var(--line); }}
  nav.toc a {{ font: 500 12.5px/1 var(--mono); color: var(--ink); text-decoration: none; border: 1px solid var(--line); border-radius: 999px; padding: 11px 14px; }}
  nav.toc a:hover {{ border-color: var(--ink); }}
  a:focus-visible {{ outline: 2px solid var(--solda); outline-offset: 3px; border-radius: 4px; }}

  section {{ padding-block: clamp(56px, 7vw, 96px); border-bottom: 1px solid var(--line); display: grid; gap: 36px; }}
  .head {{ display: grid; gap: 16px; }}
  @media (min-width: 860px) {{ .head {{ grid-template-columns: 1fr 1.2fr; align-items: end; gap: 56px; }} }}
  .head p {{ color: var(--muted); }}
  .head .n {{ display: block; margin-bottom: 14px; color: var(--accent-text); }}

  /* conceito */
  .concept {{ display: grid; gap: 12px; }}
  @media (min-width: 860px) {{ .concept {{ grid-template-columns: repeat(3, 1fr); }} }}
  .concept article {{ background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 24px; display: grid; gap: 10px; align-content: start; }}
  .concept article p {{ color: var(--muted); font-size: 15px; }}

  /* assinaturas */
  .lockups {{ display: grid; gap: 12px; }}
  @media (min-width: 860px) {{ .lockups {{ grid-template-columns: 1.4fr 1fr; }} }}
  .tile {{ border-radius: 16px; padding: clamp(28px, 5vw, 56px); display: grid; place-items: center; min-height: 220px; position: relative; }}
  .tile .label {{ position: absolute; left: 18px; top: 16px; }}
  .tile.light {{ background: var(--papel); border: 1px solid var(--line); }}
  .tile.light .label {{ color: #6B655B; }}
  .tile.dark {{ background: var(--grafite); }}
  .tile.dark .label {{ color: var(--aco); }}
  .tile svg {{ width: 100%; max-width: 420px; height: auto; }}
  .tile.sm svg {{ max-width: 300px; }}
  .tile .sym {{ width: 120px; }}
  .tile.v svg {{ max-width: 230px; }}
  .stack {{ display: grid; gap: 12px; }}

  /* proteção */
  .protect {{ display: grid; gap: 12px; }}
  .protect > *, .lockups > *, .head > * {{ min-width: 0; }}
  @media (min-width: 860px) {{ .protect {{ grid-template-columns: 1.4fr 1fr; }} }}
  .clear {{ background: var(--papel); border: 1px solid var(--line); border-radius: 16px; padding: clamp(16px, 4vw, 40px); display: grid; place-items: center; }}
  .clear-box {{ position: relative; padding: clamp(22px, 4vw, 34px); max-width: 100%; outline: 1px dashed #B93A0B; background: repeating-linear-gradient(-45deg, transparent 0 6px, rgb(185 58 11 / .09) 6px 7px); }}
  .clear-box > svg {{ width: min(100%, 360px); height: auto; background: var(--papel); outline: 1px solid rgb(185 58 11 / .35); }}
  .clear-box .x {{ position: absolute; font: 500 12px/1 var(--mono); color: #B93A0B; }}
  .clear-box .x.t {{ top: 11px; left: 50%; transform: translateX(-50%); }}
  .clear-box .x.l {{ left: 12px; top: 50%; transform: translateY(-50%); }}
  .rules {{ background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 24px; display: grid; gap: 20px; align-content: start; }}
  .rules dl {{ margin: 0; display: grid; gap: 14px; }}
  .rules dt {{ font-weight: 600; }}
  .rules dd {{ margin: 2px 0 0; color: var(--muted); font-size: 15px; }}
  .min {{ display: flex; align-items: end; gap: 28px; flex-wrap: wrap; padding-top: 18px; border-top: 1px solid var(--line); }}
  .min figure {{ margin: 0; display: grid; gap: 8px; justify-items: start; }}
  .min figcaption {{ font: 400 11.5px/1 var(--mono); color: var(--muted); }}

  /* versões */
  .variants {{ display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 190px), 1fr)); }}
  .var {{ margin: 0; display: grid; gap: 10px; }}
  .var .stage {{ border-radius: 14px; border: 1px solid var(--line); aspect-ratio: 16 / 9; display: grid; place-items: center; padding: 26px; }}
  .var .stage svg {{ width: 100%; height: auto; max-height: 100%; }}
  .var figcaption, .app figcaption {{ display: grid; gap: 2px; font-size: 14px; }}
  .var figcaption span, .app figcaption span {{ color: var(--muted); font-size: 13.5px; }}

  /* cores */
  .colors {{ list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr)); }}
  .color {{ background: var(--panel); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; display: grid; grid-template-rows: auto 1fr; }}
  .color i {{ display: block; height: 120px; border-bottom: 1px solid var(--line); }}
  .color > div {{ padding: 18px; display: grid; gap: 12px; align-content: start; }}
  .color b {{ font-size: 1.05rem; }}
  .color dl {{ margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 3px 12px; font: 400 12.5px/1.5 var(--mono); }}
  .color dt {{ color: var(--muted); }}
  .color dd {{ margin: 0; font-variant-numeric: tabular-nums; }}
  .color p {{ font-size: 13.5px; color: var(--muted); }}
  .ratio {{ display: flex; gap: 6px; height: 28px; border-radius: 8px; overflow: hidden; }}
  .ratio span {{ display: grid; place-items: center; font: 500 11px/1 var(--mono); }}

  /* tipografia */
  .type {{ display: grid; gap: 12px; }}
  .spec {{ background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: clamp(20px, 3vw, 32px); display: grid; gap: 16px; }}
  @media (min-width: 860px) {{ .spec {{ grid-template-columns: 240px 1fr; align-items: center; gap: 40px; }} }}
  .spec .meta {{ display: grid; gap: 6px; }}
  .spec .meta p {{ font-size: 14px; color: var(--muted); }}
  .sample-a {{ font-stretch: 125%; font-weight: 800; font-size: clamp(2.4rem, 1.4rem + 4vw, 4.6rem); line-height: .95; letter-spacing: -.04em; overflow-wrap: anywhere; }}
  .sample-b {{ font-size: 1.125rem; line-height: 1.6; max-width: 58ch; }}
  .sample-c {{ font: 500 14px/1.7 var(--mono); letter-spacing: .12em; text-transform: uppercase; overflow-wrap: anywhere; }}

  /* não faça */
  .donts {{ display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); }}
  @media (min-width: 860px) {{ .donts {{ grid-template-columns: repeat(3, 1fr); }} }}
  .dont {{ margin: 0; display: grid; gap: 10px; }}
  .dont .stage {{ background: var(--papel); border: 1px solid var(--line); border-radius: 14px; aspect-ratio: 16 / 9; display: grid; place-items: center; overflow: hidden; padding: 30px; }}
  .dont .stage svg {{ width: 170px; height: auto; }}
  .dont .on-solda svg {{ width: 150px; }}
  .dont figcaption {{ font-size: 14px; font-weight: 600; }}
  .dont figcaption span {{ color: #D92D20; margin-right: 4px; }}
  .on-solda {{ background: var(--solda); padding: 18px 22px; border-radius: 8px; }}
  .fake {{ display: flex; align-items: center; gap: 10px; font: italic 600 34px/1 Georgia, serif; color: var(--grafite); }}
  .dont .stage svg.fake-sym {{ width: 34px; }}

  /* aplicações */
  .apps {{ display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); }}
  .app {{ margin: 0; display: grid; gap: 10px; align-content: start; }}
  .app img {{ width: 100%; height: auto; border-radius: 12px; border: 1px solid var(--line); background: #777; }}
  .sig {{ background: #fff; color: #0E0D0B; border-radius: 14px; border: 1px solid var(--line); padding: 28px; overflow-x: auto; }}

  /* arquivos */
  .files {{ background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 24px; overflow-x: auto; }}
  .files pre {{ margin: 0; font: 400 13px/1.75 var(--mono); }}
  .files pre b {{ color: var(--accent-text); font-weight: 500; }}
  footer.end {{ padding-top: 40px; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; color: var(--muted); font-size: 14px; }}
</style>

<header class="cover">
  <div class="cover-in">
    <div class="cover-top"><span class="label">Mecano Soluções Digitais</span><span class="label">Manual de marca · v1 · 2026</span></div>
    <div class="cover-main">
      <div>
        <h1>A peça que <em>prende tudo</em> no lugar.</h1>
        <p>Como usar a marca Mecano: assinaturas, cores, tipografia e aplicações.</p>
      </div>
      {sym("#FF5A1F", "big")}
    </div>
  </div>
</header>

<div class="wrap">
  <nav class="toc" aria-label="Seções">
    <a href="#conceito">Conceito</a><a href="#assinaturas">Assinaturas</a><a href="#protecao">Proteção e tamanho</a>
    <a href="#versoes">Versões de cor</a><a href="#cores">Cores</a><a href="#tipografia">Tipografia</a>
    <a href="#nao-faca">Não faça</a><a href="#aplicacoes">Aplicações</a><a href="#arquivos">Arquivos</a>
  </nav>

  <section id="conceito" aria-labelledby="h-conceito">
    <div class="head">
      <div><span class="label n">01 · Conceito</span><h2 id="h-conceito">Uma porca, um M, uma cor</h2></div>
      <p>A Mecano entrega produto digital que funciona em produção. O símbolo usa a peça mais simples de uma montagem mecânica, a porca sextavada, que só faz sentido quando tudo em volta está bem apertado.</p>
    </div>
    <div class="concept">
      <article><h3>Sextavado</h3><p>A forma de porca: precisão, montagem, estrutura. Cantos levemente arredondados, como peça usinada, para não ficar agressivo em tamanhos grandes.</p></article>
      <article><h3>O mesmo M</h3><p>O M vazado é a mesma letra da palavra MECANO, na Archivo Expanded 800. Símbolo e nome falam a mesma língua e se reconhecem separados.</p></article>
      <article><h3>Laranja-solda</h3><p>A cor do metal no ponto de solda. É a única cor de ação da marca: se tudo é laranja, nada é laranja. O resto é grafite e papel.</p></article>
    </div>
  </section>

  <section id="assinaturas" aria-labelledby="h-assinaturas">
    <div class="head">
      <div><span class="label n">02 · Assinaturas</span><h2 id="h-assinaturas">Quatro formas, uma marca</h2></div>
      <p>A horizontal com descritor é a principal. A curta serve para espaços estreitos, como o topo do site. A vertical, para formatos quadrados. O símbolo sozinho, para perfil, ícone e favicon, quando o nome já aparece por perto.</p>
    </div>
    <div class="lockups">
      <div class="tile light"><span class="label">Principal · horizontal</span>{H}</div>
      <div class="stack">
        <div class="tile light sm"><span class="label">Horizontal curta</span>{H_SHORT}</div>
        <div class="lockups" style="grid-template-columns:1fr 1fr">
          <div class="tile dark v"><span class="label">Vertical</span>{V_DARK}</div>
          <div class="tile dark"><span class="label">Símbolo</span>{sym("#FF5A1F")}</div>
        </div>
      </div>
    </div>
  </section>

  <section id="protecao" aria-labelledby="h-protecao">
    <div class="head">
      <div><span class="label n">03 · Proteção e tamanho</span><h2 id="h-protecao">Espaço para respirar</h2></div>
      <p>Em volta da marca, deixe livre no mínimo <b>x</b>, a metade da altura do símbolo. Nenhum texto, borda ou imagem entra nessa área.</p>
    </div>
    <div class="protect">
      <div class="clear"><div class="clear-box"><span class="x t">x</span><span class="x l">x</span>{H}</div></div>
      <div class="rules">
        <dl>
          <div><dt>Área de proteção</dt><dd>x = ½ da altura do símbolo, nos quatro lados.</dd></div>
          <div><dt>Horizontal com descritor</dt><dd>Mínimo de 140 px de largura na tela ou 35 mm impressa. Abaixo disso, use a curta.</dd></div>
          <div><dt>Horizontal curta</dt><dd>Mínimo de 96 px ou 24 mm.</dd></div>
          <div><dt>Símbolo</dt><dd>Mínimo de 16 px ou 5 mm. Funciona como favicon.</dd></div>
        </dl>
        <div class="min">
          <figure><div style="width:140px">{H}</div><figcaption>140 px</figcaption></figure>
          <figure><div style="width:96px">{H_SHORT}</div><figcaption>96 px</figcaption></figure>
          <figure>{sym("#FF5A1F", "s16")}<figcaption>16 px</figcaption></figure>
        </div>
      </div>
    </div>
  </section>

  <section id="versoes" aria-labelledby="h-versoes">
    <div class="head">
      <div><span class="label n">04 · Versões de cor</span><h2 id="h-versoes">Cor quando dá, uma cor quando precisa</h2></div>
      <p>O M do símbolo é vazado: ele sempre mostra o fundo. Por isso a marca funciona em qualquer uma das versões abaixo sem arquivo extra.</p>
    </div>
    <div class="variants">{variant_html}</div>
  </section>

  <section id="cores" aria-labelledby="h-cores">
    <div class="head">
      <div><span class="label n">05 · Cores</span><h2 id="h-cores">Grafite e papel carregam; a solda assina</h2></div>
      <p>Proporção de uso aproximada: muito grafite e papel, pouco aço, um toque de solda. Os contrastes indicados seguem a WCAG AA para texto. CMYK e Pantone são referências: confirme a prova com a gráfica.</p>
    </div>
    <div class="ratio" aria-label="Proporção de uso">
      <span style="flex:45;background:var(--grafite);color:var(--aco)">45%</span>
      <span style="flex:35;background:var(--papel);color:#6B655B;border:1px solid var(--line)">35%</span>
      <span style="flex:12;background:var(--aco);color:var(--grafite)">12%</span>
      <span style="flex:8;background:var(--solda);color:var(--grafite)">8%</span>
    </div>
    <ul class="colors">{color_html}</ul>
  </section>

  <section id="tipografia" aria-labelledby="h-tipografia">
    <div class="head">
      <div><span class="label n">06 · Tipografia</span><h2 id="h-tipografia">Uma família larga, uma mono técnica</h2></div>
      <p>As duas são gratuitas no Google Fonts. A Archivo tem eixo de largura: expandida na marca e nos títulos, normal no texto corrido.</p>
    </div>
    <div class="type">
      <div class="spec"><div class="meta"><span class="label">Marca e títulos</span><b>Archivo Expanded 800</b><p>Largura 112–125%, espaçamento −3 a −4%.</p></div><div class="sample-a">Funciona no primeiro deploy.</div></div>
      <div class="spec"><div class="meta"><span class="label">Texto</span><b>Archivo 400 / 600</b><p>Largura 100%, 16–21 px, entrelinha 1,6.</p></div><p class="sample-b">A Mecano projeta e constrói produtos digitais sob medida, com escopo e prazo fechados antes de começar. Você fala direto com quem escreve o código.</p></div>
      <div class="spec"><div class="meta"><span class="label">Rótulos e dados</span><b>JetBrains Mono 500</b><p>Caixa alta, espaçamento +10 a +16%.</p></div><p class="sample-c">Soluções Digitais · 01 / 04 · Escopo fechado</p></div>
    </div>
  </section>

  <section id="nao-faca" aria-labelledby="h-nao-faca">
    <div class="head">
      <div><span class="label n">07 · Não faça</span><h2 id="h-nao-faca">Erros que enfraquecem a marca</h2></div>
      <p>Use sempre os arquivos originais. Se um formato não funcionar com nenhuma das versões oficiais, peça uma nova em vez de adaptar.</p>
    </div>
    <div class="donts">{dont_html}</div>
  </section>

  <section id="aplicacoes" aria-labelledby="h-aplicacoes">
    <div class="head">
      <div><span class="label n">08 · Aplicações</span><h2 id="h-aplicacoes">A marca no dia a dia</h2></div>
      <p>Cartão, posts e perfis seguem as mesmas regras: fundo grafite ou papel, a solda em um ponto só, rótulos em mono. Os campos [INSERIR] ficam editáveis no SVG do verso do cartão e na assinatura de e-mail.</p>
    </div>
    <div class="apps">{app_html}</div>
    <div><span class="label" style="display:block;margin-bottom:10px">Assinatura de e-mail</span><div class="sig">{email_sig}</div></div>
  </section>

  <section id="arquivos" aria-labelledby="h-arquivos" style="border-bottom:0">
    <div class="head">
      <div><span class="label n">09 · Arquivos</span><h2 id="h-arquivos">Onde estão os originais</h2></div>
      <p>Todos os arquivos estão no repositório do site, na pasta <b>marca/</b>. SVG para web e gráfica (texto já convertido em curvas), PNG com fundo transparente para uso rápido.</p>
    </div>
    <div class="files"><pre><b>marca/</b>
├── manual.html                  este manual
├── logo/
│   ├── svg/   horizontal · horizontal-curta · vertical  ×  cor-fundo-claro · cor-fundo-escuro · mono-grafite · mono-papel · mono-solda
│   │          simbolo-solda · simbolo-grafite · simbolo-papel · icone-app · avatar-solda · avatar-grafite
│   └── png/   as mesmas versões; símbolo em 128 · 512 · 1024 px; ícone de app em 180 · 192 · 512 px
└── aplicacoes/
    ├── cartao-visita-frente.svg · cartao-visita-verso.svg      90 × 50 mm + 2 mm de sangria
    ├── post-manifesto.svg · post-chamada.svg                   1080 × 1080
    ├── avatar-solda.svg · avatar-grafite.svg                   1080 × 1080
    ├── assinatura-email.html
    └── png/   todas as aplicações em PNG</pre></div>
  </section>

  <footer class="end"><span>Mecano Soluções Digitais · Manual de marca v1</span><span>Grafite #0E0D0B · Papel #F4F2EC · Solda #FF5A1F</span></footer>
</div>
<style>.s16 {{ width: 14px; }}</style>
"""
with open(os.path.join(M, "manual.html"), "w", encoding="utf-8") as f:
    f.write(html)
print("manual ok", len(html))
