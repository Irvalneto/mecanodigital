"""Gera os arquivos da marca Mecano (símbolo Porca + cores Encaixe).

Todo texto é convertido em contorno vetorial: os SVGs não dependem de
fonte instalada. Saída em marca/logo/svg e marca/aplicacoes.
"""
import math
import os
import sys

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "out")
FONTS = os.path.join(HERE, "fonts")

# --- Paleta (alinhada aos tokens do site) ---
SOLDA = "#FF5A1F"
GRAFITE = "#0E0D0B"
PAPEL = "#F4F2EC"
ACO = "#A29C90"
SOLDA_TEXTO = "#B93A0B"
BRANCO = "#FFFFFF"


# ------------------------------------------------------------------
# Símbolo: porca sextavada com o M vazado em duas peças espelhadas
# (a folga central é o "encaixe": tudo encaixa, nada é colado).
# Grade 64×64. fill-rule evenodd -> o M é furo de verdade.
# ------------------------------------------------------------------
def _hex_path(cx=32.0, cy=32.0, R=29.0, r=3.2):
    pts = [(cx + R * math.cos(math.radians(a)), cy + R * math.sin(math.radians(a)))
           for a in (-90, -30, 30, 90, 150, 210)]
    d = r / math.tan(math.radians(60))  # recuo do canto para ângulo interno de 120°
    segs = []
    n = len(pts)
    for i, (x, y) in enumerate(pts):
        px, py = pts[i - 1]
        nx, ny = pts[(i + 1) % n]
        def toward(ax, ay, bx, by, dist):
            L = math.hypot(bx - ax, by - ay)
            return ax + (bx - ax) * dist / L, ay + (by - ay) * dist / L
        a = toward(x, y, px, py, d)
        b = toward(x, y, nx, ny, d)
        segs.append(("L" if segs else "M") + f"{a[0]:.3f} {a[1]:.3f}")
        segs.append(f"A{r} {r} 0 0 1 {b[0]:.3f} {b[1]:.3f}")
    return "".join(segs) + "Z"


SYMBOL_D = None  # preenchido depois que a fonte carrega (o M vazado é o M da Archivo)
SYMBOL_BOX = (0, 0, 64, 64)  # sextavado ocupa y 3..61, x 6.9..57.1


def symbol(color, x=0.0, y=0.0, size=64.0):
    s = size / 64
    return (f'<path transform="translate({x:.3f} {y:.3f}) scale({s:.5f})" '
            f'fill="{color}" fill-rule="evenodd" d="{SYMBOL_D}"/>')


# ------------------------------------------------------------------
# Texto em contorno (HarfBuzz para kerning + fontTools para desenho)
# ------------------------------------------------------------------
class Face:
    def __init__(self, path):
        self.file = path
        self.tt = TTFont(path)
        self.upm = self.tt["head"].unitsPerEm
        self.cap = self.tt["OS/2"].sCapHeight
        self.gs = self.tt.getGlyphSet()
        self.names = self.tt.getGlyphOrder()
        blob = hb.Blob.from_file_path(path)
        self.hbfont = hb.Font(hb.Face(blob))

    def layout(self, text, tracking=0.0):
        """tracking em em (ex.: 0.2). Retorna [(nome, x_em)], largura_em."""
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(self.hbfont, buf, {"kern": True, "liga": False})
        x = 0.0
        out = []
        infos, poss = buf.glyph_infos, buf.glyph_positions
        for i, (info, pos) in enumerate(zip(infos, poss)):
            out.append((self.names[info.codepoint], x + pos.x_offset))
            x += pos.x_advance
            if i < len(infos) - 1:
                x += tracking * self.upm
        return out, x / self.upm

    def path(self, text, cap_height, x, baseline, tracking=0.0):
        """Desenha o texto com altura de versal = cap_height. Retorna (d, largura)."""
        s = cap_height / self.cap
        glyphs, width_em = self.layout(text, tracking)
        pen = SVGPathPen(self.gs, ntos=lambda v: f"{v:.2f}")
        for name, gx in glyphs:
            tp = TransformPen(pen, (s, 0, 0, -s, x + gx * s, baseline))
            self.gs[name].draw(tp)
        return pen.getCommands(), width_em * self.upm * s

    def width(self, text, cap_height, tracking=0.0):
        return self.layout(text, tracking)[1] * self.upm * cap_height / self.cap


ARCHIVO = Face(os.path.join(FONTS, "archivo-125-800.ttf"))
MONO = Face(os.path.join(FONTS, "jbmono-500.ttf"))

def _build_symbol():
    """Sextavado + o mesmo M da palavra, centrado óptico no sextavado."""
    m_width = 29.0
    cap = m_width / ARCHIVO.width("M", 1.0)
    w = ARCHIVO.width("M", cap)
    # centro óptico: M um pouco acima do centro geométrico
    d, _ = ARCHIVO.path("M", cap, 32 - w / 2, 32 + cap / 2 - 0.3)
    return _hex_path() + d


SYMBOL_D = _build_symbol()

WORD = "MECANO"
DESC = "SOLUÇÕES DIGITAIS"
WORD_TRACK = -0.01


DESC_TRACK = 0.16


def _desc_cap(word_w, tracking=DESC_TRACK):
    """Altura de versal do descritor para ocupar a largura da palavra com tracking fixo."""
    width_em = MONO.layout(DESC, tracking)[1]
    return word_w / width_em * MONO.cap / MONO.upm


def _desc_track(word_w, desc_cap):
    base_w = MONO.width(DESC, desc_cap, 0)
    font_size = desc_cap / MONO.cap * MONO.upm  # px por em
    return (word_w - base_w) / (len(DESC) - 1) / font_size


# ------------------------------------------------------------------
# Assinaturas (lockups)
# ------------------------------------------------------------------
def svg_doc(w, h, body, title):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {h:.2f}" '
            f'width="{w:.0f}" height="{h:.0f}" role="img" aria-label="{title}">'
            f"<title>{title}</title>{body}</svg>\n")


def horizontal(sym_c, word_c, desc_c, with_desc=True, pad=0):
    S = 64.0
    gap = 15.0
    hx = 6.89  # respiro lateral do sextavado dentro da grade 64
    sx = pad - hx  # encosta o sextavado na borda esquerda
    x0 = pad + (S - 2 * hx) + gap
    if with_desc:
        cap = 23.0
        ww = ARCHIVO.width(WORD, cap, WORD_TRACK)
        dcap = _desc_cap(ww)
        between = 8.0
        block = cap + between + dcap
        top = pad + (S - block) / 2
        wd, ww = ARCHIVO.path(WORD, cap, x0, top + cap, WORD_TRACK)
        dd, _ = MONO.path(DESC, dcap, x0, top + block, DESC_TRACK)
        body = symbol(sym_c, sx, pad, S) + f'<path fill="{word_c}" d="{wd}"/><path fill="{desc_c}" d="{dd}"/>'
    else:
        cap = 27.0
        top = pad + (S - cap) / 2
        wd, ww = ARCHIVO.path(WORD, cap, x0, top + cap, WORD_TRACK)
        body = symbol(sym_c, sx, pad, S) + f'<path fill="{word_c}" d="{wd}"/>'
    w = x0 + ww + pad
    return w, S + 2 * pad, body


def vertical(sym_c, word_c, desc_c, pad=0):
    cap = 22.0
    ww = ARCHIVO.width(WORD, cap, WORD_TRACK)
    dcap = _desc_cap(ww)
    W = ww + 2 * pad
    S = 72.0
    sx = pad + (ww - S) / 2
    body = symbol(sym_c, sx, pad, S)
    base = pad + S + 14 + cap
    wd, _ = ARCHIVO.path(WORD, cap, pad, base, WORD_TRACK)
    dd, _ = MONO.path(DESC, dcap, pad, base + 9 + dcap, DESC_TRACK)
    body += f'<path fill="{word_c}" d="{wd}"/><path fill="{desc_c}" d="{dd}"/>'
    return W, base + 9 + dcap + pad, body


VARIANTS = {
    # nome: (símbolo, palavra, descritor, fundo de prévia)
    "cor-fundo-claro": (SOLDA, GRAFITE, GRAFITE, PAPEL),
    "cor-fundo-escuro": (SOLDA, PAPEL, ACO, GRAFITE),
    "mono-grafite": (GRAFITE, GRAFITE, GRAFITE, BRANCO),
    "mono-papel": (PAPEL, PAPEL, PAPEL, GRAFITE),
    "mono-solda": (GRAFITE, GRAFITE, GRAFITE, SOLDA),
}


def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def main():
    svg_dir = os.path.join(OUT, "logo", "svg")
    title = "Mecano Soluções Digitais"
    for name, (sc, wc, dc, _bg) in VARIANTS.items():
        w, h, b = horizontal(sc, wc, dc, True)
        write(os.path.join(svg_dir, f"mecano-horizontal-{name}.svg"), svg_doc(w, h, b, title))
        w, h, b = horizontal(sc, wc, dc, False)
        write(os.path.join(svg_dir, f"mecano-horizontal-curta-{name}.svg"), svg_doc(w, h, b, "Mecano"))
        w, h, b = vertical(sc, wc, dc)
        write(os.path.join(svg_dir, f"mecano-vertical-{name}.svg"), svg_doc(w, h, b, title))
    for name, c in {"solda": SOLDA, "grafite": GRAFITE, "papel": PAPEL}.items():
        write(os.path.join(svg_dir, f"mecano-simbolo-{name}.svg"), svg_doc(64, 64, symbol(c), "Mecano"))
    # Ícone de app / favicon com fundo
    icon = f'<rect width="64" height="64" rx="14" fill="{GRAFITE}"/>' + symbol(SOLDA, 7, 7, 50)
    write(os.path.join(svg_dir, "mecano-icone-app.svg"), svg_doc(64, 64, icon, "Mecano"))
    avatar = f'<rect width="64" height="64" fill="{SOLDA}"/>' + symbol(GRAFITE, 12, 12, 40)
    write(os.path.join(svg_dir, "mecano-avatar-solda.svg"), svg_doc(64, 64, avatar, "Mecano"))
    avatar2 = f'<rect width="64" height="64" fill="{GRAFITE}"/>' + symbol(SOLDA, 12, 12, 40)
    write(os.path.join(svg_dir, "mecano-avatar-grafite.svg"), svg_doc(64, 64, avatar2, "Mecano"))
    print("ok", len(os.listdir(svg_dir)), "svgs")


if __name__ == "__main__":
    main()
