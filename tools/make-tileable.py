#!/usr/bin/env python3
"""Turns the generated 3D surface images into seamless tiles: crops (floors square), cross-fades
each edge into the opposite one, and resizes. Re-run after regenerating group "3d".

    python3 tools/make-tileable.py
"""
from PIL import Image

# name: (square crop, output size)
TEXTURES = {
    'stone': (False, (1280, 720)),
    'plaster': (False, (1280, 720)),
    'flagstone': (True, (1024, 1024)),
    'floorboards': (True, (1024, 1024)),
}
BLEND = 0.12


def blend_axis(im, horizontal):
    w, h = im.size
    n = w if horizontal else h
    b = int(n * BLEND)
    keep = n - b
    box = (0, 0, keep, h) if horizontal else (0, 0, w, keep)
    out = im.crop(box)
    for i in range(b):
        a = i / b
        if horizontal:
            head = im.crop((i, 0, i + 1, h))
            tail = im.crop((keep + i, 0, keep + i + 1, h))
            out.paste(Image.blend(tail, head, a), (i, 0))
        else:
            head = im.crop((0, i, w, i + 1))
            tail = im.crop((0, keep + i, w, keep + i + 1))
            out.paste(Image.blend(tail, head, a), (0, i))
    return out


for name, (square, size) in TEXTURES.items():
    im = Image.open(f'assets/3d/tex_{name}_raw.png').convert('RGB')
    if square:
        w, h = im.size
        s = min(w, h)
        im = im.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2))
    im = blend_axis(blend_axis(im, True), False)
    im.resize(size, Image.LANCZOS).save(f'assets/3d/tex_{name}.png', optimize=True)
    print(name, size)
