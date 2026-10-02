// Crops transparent padding from a loaded texture (DreamLayer cutouts arrive on a large,
// mostly empty canvas) and optionally downsamples it, replacing the texture in place.

export function trimTexture(scene, key, { maxSourceSize = Infinity, alphaThreshold = 10 } = {}) {
  const src = scene.textures.get(key).getSourceImage();
  const { width: w, height: h } = src;
  const probe = document.createElement('canvas');
  probe.width = w;
  probe.height = h;
  const ctx = probe.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      if (data[row + x * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return;

  // Scale depends only on the source size, so poses generated at the same size stay in proportion.
  const scale = Math.min(1, maxSourceSize / Math.max(w, h));
  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  scene.textures.remove(key);
  const out = scene.textures.createCanvas(key, Math.ceil(tw * scale), Math.ceil(th * scale));
  const octx = out.getContext();
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(src, minX, minY, tw, th, 0, 0, out.width, out.height);
  out.refresh();
}
