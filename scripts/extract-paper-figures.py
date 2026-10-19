"""Reproduce the paper covers from verified PDF clips (pip install pymupdf pillow)."""
import json
import pathlib
import urllib.request

import fitz
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
for item in json.loads((ROOT / '_data/figure_sources.json').read_text()):
    url = item['source_url'].replace('/abs/', '/pdf/')
    with urllib.request.urlopen(url, timeout=90) as response:
        document = fitz.open(stream=response.read(), filetype='pdf')
    clip = fitz.Rect(item['clip'])
    page = document[item['page'] - 1]
    pix = page.get_pixmap(matrix=fitz.Matrix(1400 / clip.width, 1400 / clip.width), clip=clip, alpha=False)
    image = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    image.save(ROOT / item['output'], 'WEBP', quality=91, method=6)
    print(item['paper_id'], 'figure', item['figure'])
