"""Paste one rectangle of a (possibly square) DreamLayer edit back onto the original room.

usage: _composite.py <original> <edit> <out> x0 y0 x1 y1 [feather]
Coordinates are in original pixels; the edit is resized to the original first.
"""
import sys
from PIL import Image, ImageFilter

orig = Image.open(sys.argv[1]).convert('RGB')
edit = Image.open(sys.argv[2]).convert('RGB')
out = sys.argv[3]
x0, y0, x1, y1 = map(int, sys.argv[4:8])
feather = int(sys.argv[8]) if len(sys.argv) > 8 else 14

if edit.size != orig.size:
    edit = edit.resize(orig.size, Image.LANCZOS)

mask = Image.new('L', orig.size, 0)
mask.paste(255, (x0, y0, x1, y1))
mask = mask.filter(ImageFilter.GaussianBlur(feather))
Image.composite(edit, orig, mask).save(out)
print('saved', out, orig.size, 'rect', (x0, y0, x1, y1), '-> 1280x720', (x0 // 2, y0 // 2, x1 // 2, y1 // 2))
