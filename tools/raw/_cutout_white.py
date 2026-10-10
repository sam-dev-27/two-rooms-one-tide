import sys
from collections import deque
from PIL import Image, ImageFilter, ImageChops, ImageOps


def components(cand, w, h):
    seen = bytearray(w * h)
    for start in range(w * h):
        if not cand[start] or seen[start]:
            continue
        comp = [start]; seen[start] = 1; q = deque([start])
        while q:
            i = q.popleft(); x, y = i % w, i // w
            for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                if 0 <= nx < w and 0 <= ny < h:
                    j = ny * w + nx
                    if cand[j] and not seen[j]:
                        seen[j] = 1; comp.append(j); q.append(j)
        yield comp


def cut(src, dst, thr=40, hole_frac=0.0004, shadow_band=0.0, mirror=False, shadow_sat=50):
    im = Image.open(src).convert("RGB")
    if mirror:
        im = ImageOps.mirror(im)
    w, h = im.size
    data = list(im.get_flattened_data()) if hasattr(im, "get_flattened_data") else list(im.getdata())

    def bgish(p):
        return (765 - sum(p)) < thr * 3 and max(p) - min(p) < 40

    def interior_white(p):
        return min(p) > 228 and max(p) - min(p) < 20

    bg = bytearray(w * h)
    edge_cand = bytearray(1 if bgish(p) else 0 for p in data)
    for comp in components(edge_cand, w, h):
        touches = any(i % w in (0, w-1) or i // w in (0, h-1) for i in comp)
        if touches:
            for i in comp: bg[i] = 1
    inner = bytearray(1 if (not bg[i] and interior_white(data[i])) else 0 for i in range(w * h))
    min_area = max(30, int(w * h * hole_frac))
    for comp in components(inner, w, h):
        if len(comp) >= min_area:
            for i in comp: bg[i] = 1

    y0 = h
    if shadow_band:
        bbox_bottom = max(i // w for i in range(w * h) if not bg[i])
        y0 = int(bbox_bottom - h * shadow_band)

    def growable(i):
        p = data[i]
        sat = max(p) - min(p)
        if min(p) > 195 and sat < 25:
            return True
        return i // w >= y0 and sat < shadow_sat and sum(p) / 3 > 85

    q = deque(i for i in range(w * h) if bg[i])
    while q:
        i = q.popleft(); x, y = i % w, i // w
        for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if 0 <= nx < w and 0 <= ny < h:
                j = ny * w + nx
                if not bg[j] and growable(j):
                    bg[j] = 1; q.append(j)

    if shadow_band:
        holes = bytearray(1 if (bg[i] and i // w >= y0) else 0 for i in range(w * h))
        for comp in components(holes, w, h):
            if len(comp) < w * h * 0.0005 and not any(
                i % w in (0, w - 1) or i // w == h - 1 or (i // w == y0) for i in comp
            ):
                for i in comp: bg[i] = 0

    mask = Image.frombytes("L", (w, h), bytes(0 if b else 255 for b in bg))
    k = 9 if w > 1500 else 5
    mask = mask.filter(ImageFilter.MaxFilter(k)).filter(ImageFilter.MinFilter(k))
    mask = mask.filter(ImageFilter.MedianFilter(5))
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    lum = im.convert("L").point(lambda v: 255 if v < 200 else int(255 * (255 - v) / 55))
    edge = ImageChops.subtract(mask.filter(ImageFilter.MaxFilter(5)), mask.filter(ImageFilter.MinFilter(5)))
    soft = ImageChops.multiply(mask, lum)
    mask = Image.composite(soft, mask, edge.point(lambda v: 255 if v > 0 else 0))
    out = im.convert("RGBA"); out.putalpha(mask)
    bbox = mask.point(lambda v: 255 if v > 16 else 0).getbbox()
    out = out.crop(bbox)
    out.save(dst, optimize=True)
    print(dst, "src", im.size, "bbox", bbox, "out", out.size)


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    band = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
    mirror = "mirror" in sys.argv[4:]
    sat = next((int(a[4:]) for a in sys.argv[4:] if a.startswith("sat=")), 50)
    cut(src, dst, shadow_band=band, mirror=mirror, shadow_sat=sat)
