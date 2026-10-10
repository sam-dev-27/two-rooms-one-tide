import sys
from PIL import Image, ImageChops, ImageFilter

a = Image.open(sys.argv[1]).convert('RGB')
b = Image.open(sys.argv[2]).convert('RGB')
print('sizes', a.size, b.size)
if a.size != b.size:
    b = b.resize(a.size)
d = ImageChops.difference(a, b).convert('L').filter(ImageFilter.GaussianBlur(4))
thr = int(sys.argv[3]) if len(sys.argv) > 3 else 40
m = d.point(lambda v: 255 if v > thr else 0)
print('global mean diff', sum(d.getdata()) / (d.size[0] * d.size[1]))
# coarse grid of mean diffs (8x8 cells across)
W, H = d.size
cols, rows = 16, 9
for r in range(rows):
    line = []
    for c in range(cols):
        box = (c * W // cols, r * H // rows, (c + 1) * W // cols, (r + 1) * H // rows)
        cell = d.crop(box)
        line.append('%3d' % (sum(cell.getdata()) / (cell.size[0] * cell.size[1])))
    print(' '.join(line))
bbox = m.getbbox()
print('bbox(full)', bbox, 'bbox(1280)', tuple(round(v / 2) for v in bbox) if bbox else None)
if len(sys.argv) > 4:
    m.save(sys.argv[4])
