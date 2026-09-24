# Gerador da marca Mecano

Scripts que geram os SVGs da marca (texto convertido em curvas), as aplicações e o manual.

```bash
pip install fonttools uharfbuzz
# baixe as fontes estáticas para gerador/fonts/:
#   archivo-125-800.ttf  (Archivo, largura 125, peso 800)
#   jbmono-500.ttf       (JetBrains Mono, peso 500)
# (Google Fonts: css2?family=Archivo:wdth,wght@125,800 e JetBrains+Mono:wght@500)
python gen.py ..       # marca/logo/svg
python apps.py ..      # marca/aplicacoes
python manual.py ..    # marca/manual.html
```

Os PNGs foram exportados a partir dos SVGs com um navegador headless (Playwright).
