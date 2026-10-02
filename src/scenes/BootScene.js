import { WIDTH, HEIGHT, FONT, COLORS } from '../config.js';
import { ROOM_IMAGES, CHARACTER_IMAGES, ITEM_IMAGES, UI_IMAGES, AUDIO } from '../data/assets.js';
import { makePlaceholder } from '../systems/Placeholders.js';
import { trimTexture } from '../systems/TextureTools.js';
import { sfx } from '../systems/Sfx.js';

const IMAGE_GROUPS = [
  ['room', ROOM_IMAGES],
  ['character', CHARACTER_IMAGES],
  ['item', ITEM_IMAGES],
  ['screen', UI_IMAGES],
];

const TRIM = { character: { maxSourceSize: 1024 }, item: { maxSourceSize: 384 } };

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
    this.registry.set('missing', missing);
    sfx.attach(this.game);
    this.scene.start('Title');
  }
}
