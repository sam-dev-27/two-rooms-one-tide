import { WIDTH, HEIGHT, FONT, COLORS } from '../config.js';
import { ROOM_IMAGES, CHARACTER_IMAGES, ITEM_IMAGES, PROP_IMAGES, UI_IMAGES, AUDIO } from '../data/assets.js';
import { makePlaceholder } from '../systems/Placeholders.js';
import { trimTexture } from '../systems/TextureTools.js';
import { sfx } from '../systems/Sfx.js';

const IMAGE_GROUPS = [
  ['room', ROOM_IMAGES],
  ['character', CHARACTER_IMAGES],
  ['item', ITEM_IMAGES],
  ['prop', PROP_IMAGES],
  ['screen', UI_IMAGES],
];

const TRIM = { character: { maxSourceSize: 1024 }, item: { maxSourceSize: 384 }, prop: { maxSourceSize: 384 } };

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // The packaged build ships assets/manifest.json listing the files that exist (with large
    // PNGs converted to JPEG). In development it's absent and every listed path is attempted.
    this.load.json('manifest', 'assets/manifest.json');
  }

  create() {
    const manifest = this.cache.json.get('manifest');
    const resolve = (path) => {
      if (!Array.isArray(manifest) || manifest.includes(path)) return path;
      const jpg = path.replace(/\.png$/, '.jpg');
      return manifest.includes(jpg) ? jpg : null;
    };

    this.drawProgress();

    for (const [, files] of IMAGE_GROUPS) {
      for (const [key, path] of Object.entries(files)) {
        const found = resolve(path);
        if (found) this.load.image(key, found);
      }
    }
    for (const [key, path] of Object.entries(AUDIO)) {
      const found = resolve(path);
      if (found) this.load.audio(key, found);
    }

    this.load.once('complete', () => this.finish());
    this.load.start();
  }

  drawProgress() {
    const bar = this.add.rectangle(WIDTH / 2 - 200, HEIGHT / 2, 0, 6, COLORS.amber).setOrigin(0, 0.5);
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, 400, 6).setStrokeStyle(1, COLORS.amber, 0.5);
    this.add
      .text(WIDTH / 2, HEIGHT / 2 - 30, 'Climbing the tower...', { fontFamily: FONT, fontSize: '20px', color: COLORS.paperCss })
      .setOrigin(0.5);
    this.load.on('progress', (p) => (bar.width = 400 * p));
  }

  finish() {
    const missing = new Set();
    for (const [group, files] of IMAGE_GROUPS) {
      for (const key of Object.keys(files)) {
        if (this.textures.exists(key)) {
          if (TRIM[group]) trimTexture(this, key, TRIM[group]);
        } else {
          makePlaceholder(this, key, group);
          missing.add(key);
        }
      }
    }
    if (missing.size) console.info(`[assets] using placeholders for: ${[...missing].join(', ')}`);
    this.stampEnvelope();
    this.registry.set('missing', missing);
    sfx.attach(this.game);
    this.scene.start('Title');
  }

  /** The envelope art is unmarked; the "T." is written on in code so it can't drift in generation. */
  stampEnvelope() {
    const tex = this.textures.get('envelope');
    if (!tex.getContext) return;
    const ctx = tex.getContext();
    const { width: w, height: h } = tex.getSourceImage();
    ctx.save();
    ctx.translate(w * 0.5, h * 0.66);
    ctx.rotate(-0.08);
    ctx.font = `italic bold ${Math.round(h * 0.34)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(30, 22, 14, 0.85)';
    ctx.fillText('T.', 0, 0);
    ctx.restore();
    tex.refresh();
  }
}
