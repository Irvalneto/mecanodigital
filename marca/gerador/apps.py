"""Aplicações da marca Mecano: cartão de visita, posts, avatares, assinatura de e-mail."""
import os
import sys

from gen import (ACO, ARCHIVO, DESC, DESC_TRACK, GRAFITE, MONO, PAPEL, SOLDA, WORD, WORD_TRACK,
                 _desc_cap, horizontal, symbol, write)

OUT = sys.argv[1]
APPS = os.path.join(OUT, "aplicacoes")

FONT_CSS = ("@import url('https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,400..800"
            "&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap');")


def grid(w, h, step, color, opacity):
    lines = [f'<path d="M{x} 0V{h}" />' for x in range(0, int(w) + 1, step)]
    lines += [f'<path d="M0 {y}H{w}" />' for y in range(0, int(h) + 1, step)]
    return f'<g stroke="{color}" stroke-opacity="{opacity}" stroke-width="1">{"".join(lines)}</g>'


def fit_cap(lines, cap, max_w):
    """Reduz a altura de versal até a linha mais longa caber em max_w."""
    def line_w(parts, c):
        return sum(ARCHIVO.width(t, c, -0.02) for t, _ in parts) + ARCHIVO.width(" ", c) * (len(parts) - 1)
    widest = max(line_w(p, cap) for p in lines)
    return cap * min(1.0, max_w / widest)


def text_block(lines, cap, x, y, lh, colors):
    """Linhas de título em contorno. colors: lista de (texto, cor) por linha."""
    out = []
    for i, parts in enumerate(lines):
        base = y + cap + i * lh
        cx = x
        for txt, col in parts:
            d, w = ARCHIVO.path(txt, cap, cx, base, -0.02)
            out.append(f'<path fill="{col}" d="{d}"/>')
            cx += w + ARCHIVO.width(" ", cap)
    return "".join(out)


def mono(txt, cap, x, base, color, tracking=0.12):
    d, w = MONO.path(txt, cap, x, base, tracking)
    return f'<path fill="{color}" d="{d}"/>', w


# ------------------------------------------------------------------
# Cartão de visita 90×50 mm (unidade = 0,1 mm), sangria de 2 mm
# ------------------------------------------------------------------
def business_card():
    W, H, B = 900, 500, 20
    vb = f"{-B} {-B} {W + 2 * B} {H + 2 * B}"
    size = f'width="{(W + 2 * B) / 10}mm" height="{(H + 2 * B) / 10}mm"'

    # Frente: grafite, assinatura centrada, grade técnica sutil
    lw, lh, lbody = horizontal(SOLDA, PAPEL, ACO, True)
    s = 2.3
    fx, fy = (W - lw * s) / 2, (H - lh * s) / 2
    front = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" {size}>'
             f'<title>Cartão Mecano — frente</title>'
             f'<rect x="{-B}" y="{-B}" width="{W + 2 * B}" height="{H + 2 * B}" fill="{GRAFITE}"/>'
             f'{grid(W, H, 50, PAPEL, 0.05)}'
             f'<g transform="translate({fx:.1f} {fy:.1f}) scale({s})">{lbody}</g></svg>\n')

    # Verso: papel; dados em texto editável (placeholders); símbolo sangrando no canto
    back = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" {size}>'
            f'<title>Cartão Mecano — verso</title><style>{FONT_CSS}'
            f'.n{{font:800 44px Archivo,Arial,sans-serif;font-stretch:112%;letter-spacing:-1px;fill:{GRAFITE}}}'
            f'.r{{font:500 19px "JetBrains Mono",monospace;letter-spacing:2.5px;fill:#B93A0B;text-transform:uppercase}}'
            f'.c{{font:400 24px Archivo,Arial,sans-serif;fill:{GRAFITE}}}'
            f'.l{{font:500 15px "JetBrains Mono",monospace;letter-spacing:2px;fill:#6B655B}}</style>'
            f'<rect x="{-B}" y="{-B}" width="{W + 2 * B}" height="{H + 2 * B}" fill="{PAPEL}"/>'
            f'{symbol(SOLDA, 600, 190, 420)}'
            f'<text class="n" x="70" y="130">[INSERIR: Nome]</text>'
            f'<text class="r" x="70" y="172">[INSERIR: CARGO]</text>'
            f'<text class="l" x="70" y="300">TEL</text><text class="c" x="190" y="301">[INSERIR: telefone]</text>'
            f'<text class="l" x="70" y="350">E-MAIL</text><text class="c" x="190" y="351">[INSERIR: e-mail]</text>'
            f'<text class="l" x="70" y="400">SITE</text><text class="c" x="190" y="401">[INSERIR: site]</text>'
            f'</svg>\n')
    write(os.path.join(APPS, "cartao-visita-frente.svg"), front)
    write(os.path.join(APPS, "cartao-visita-verso.svg"), back)


def _headline(lines, cap, bottom, x=88, max_w=1080 - 176):
    """Bloco de título ancorado na base (bottom = linha de base da última linha)."""
    cap = fit_cap(lines, cap, max_w)
    lh = cap * 1.42
    top = bottom - cap - lh * (len(lines) - 1)
    return text_block(lines, cap, x, top, lh, None)


# ------------------------------------------------------------------
# Posts 1080×1080 (texto em contorno)
# ------------------------------------------------------------------
def post_manifesto():
    S = 1080
    lw, lh, lbody = horizontal(SOLDA, PAPEL, ACO, False)
    body = [f'<rect width="{S}" height="{S}" fill="{GRAFITE}"/>', grid(S, S, 72, PAPEL, 0.05),
            f'<g transform="translate(88 88) scale(1.25)">{lbody}</g>',
            _headline([[("Sites, apps e", PAPEL)], [("automações que", PAPEL)],
                       [("funcionam no", PAPEL)], [("primeiro deploy.", SOLDA)]], 74, bottom=S - 200)]
    tag, _ = mono("SITES · AUTOMAÇÕES · APPS · SAAS", 20, 88, S - 88, ACO, 0.14)
    body.append(f'<rect x="88" y="{S - 150}" width="{S - 176}" height="1" fill="{PAPEL}" fill-opacity=".15"/>')
    body.append(tag)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}">'
           f'<title>Post Mecano — manifesto</title>{"".join(body)}</svg>\n')
    write(os.path.join(APPS, "post-manifesto.svg"), svg)


def post_cta():
    S = 1080
    body = [f'<rect width="{S}" height="{S}" fill="{SOLDA}"/>', grid(S, S, 72, GRAFITE, 0.08),
            symbol(GRAFITE, 88 - 6.89 * 1.6, 88, 102),
            _headline([[("Tem um projeto", GRAFITE)], [("em mente?", GRAFITE)]], 104, bottom=S - 190)]
    t, _ = mono("DIAGNÓSTICO GRATUITO · RESPOSTA EM 1 DIA ÚTIL", 19, 88, S - 88, GRAFITE, 0.12)
    body.append(t)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}">'
           f'<title>Post Mecano — chamada</title>{"".join(body)}</svg>\n')
    write(os.path.join(APPS, "post-chamada.svg"), svg)


def avatars():
    S = 1080
    for name, bg, fg in (("solda", SOLDA, GRAFITE), ("grafite", GRAFITE, SOLDA)):
        k = 560  # símbolo cabe no círculo de recorte das redes
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}">'
               f'<title>Avatar Mecano</title><rect width="{S}" height="{S}" fill="{bg}"/>'
               f'{symbol(fg, (S - k) / 2, (S - k) / 2, k)}</svg>\n')
        write(os.path.join(APPS, f"avatar-{name}.svg"), svg)


# ------------------------------------------------------------------
# Assinatura de e-mail (tabelas + estilos inline, compatível com Gmail/Outlook)
# ------------------------------------------------------------------
def email_signature():
    html = f"""<!-- Assinatura de e-mail Mecano. Troque os [INSERIR] e hospede o PNG do símbolo
     (marca/logo/png/mecano-simbolo-solda-128.png) numa URL pública antes de usar. -->
<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="font-family:Arial,Helvetica,sans-serif;color:{GRAFITE};">
  <tr>
    <td style="padding-right:16px;vertical-align:top;">
      <img src="[INSERIR: URL pública]/marca/logo/png/mecano-simbolo-solda-128.png" width="56" height="56" alt="Mecano" style="display:block;border:0;">
    </td>
    <td style="border-left:2px solid {SOLDA};padding-left:16px;vertical-align:top;">
      <div style="font-size:16px;font-weight:bold;line-height:22px;">[INSERIR: Nome]</div>
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#B93A0B;line-height:18px;">[INSERIR: Cargo]</div>
      <div style="font-size:13px;line-height:20px;padding-top:8px;">
        <b style="letter-spacing:1px;">MECANO</b> <span style="color:#6B655B;">Soluções Digitais</span><br>
        <a href="tel:[INSERIR]" style="color:{GRAFITE};text-decoration:none;">[INSERIR: telefone]</a> ·
        <a href="mailto:[INSERIR]" style="color:{GRAFITE};text-decoration:none;">[INSERIR: e-mail]</a><br>
        <a href="[INSERIR: site]" style="color:#B93A0B;text-decoration:none;">[INSERIR: site]</a>
      </div>
    </td>
  </tr>
</table>
"""
    write(os.path.join(APPS, "assinatura-email.html"), html)


if __name__ == "__main__":
    business_card()
    post_manifesto()
    post_cta()
    avatars()
    email_signature()
    print("ok", sorted(os.listdir(APPS)))
