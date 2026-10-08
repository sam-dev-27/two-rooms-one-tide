// Asset lookup for the 3D frontend. The packaged build ships assets/manifest.json (large PNGs
// become JPEGs); in development it's absent and paths are used as written. Only files known to
// exist are requested, so the console stays clean.
import { ITEM_IMAGES } from '../src/data/assets.js';

let manifest = null;
const itemSrcs = {};
const images = new Map();

/** Only the packaged build (tools/package-itch.sh marks its 3d.html) has a manifest to fetch. */
export async function loadManifest() {
  if (!('build' in document.documentElement.dataset)) return;
  try {
    const res = await fetch('assets/manifest.json', { cache: 'no-cache' });
    if (res.ok) manifest = await res.json();
  } catch {
    manifest = null;
  }
}

/** The real path for an asset (the .jpg twin in the build), or null if the build doesn't have it. */
export function url(path) {
  if (!path) return null;
  if (!Array.isArray(manifest) || manifest.includes(path)) return path;
  const jpg = path.replace(/\.png$/, '.jpg');
  return manifest.includes(jpg) ? jpg : null;
}

export function loadImage(path) {
  const src = url(path);
  if (!src) return Promise.resolve(null);
  if (images.has(src)) return images.get(src);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  images.set(src, p);
  return p;
}

/** Loads the item icons; the envelope gets its "T." written on, as in the 2D game. */
export async function prepareItems() {
  await Promise.all(
    Object.entries(ITEM_IMAGES).map(async ([item, path]) => {
      const img = await loadImage(path);
      if (!img) return;
      if (item !== 'envelope') {
        itemSrcs[item] = img.src;
        return;
      }
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      ctx.translate(c.width * 0.5, c.height * 0.66);
      ctx.rotate(-0.08);
      ctx.font = `italic bold ${Math.round(c.height * 0.34)}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(30, 22, 14, 0.85)';
      ctx.fillText('T.', 0, 0);
      itemSrcs[item] = c.toDataURL();
    }),
  );
}

/** Image source for an inventory item icon (null if the art is missing). */
export const itemSrc = (item) => itemSrcs[item] ?? null;
