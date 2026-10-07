import { WIDTH, HEIGHT, FONT, COLORS } from '../config.js';
import { OPENING } from '../data/cutscenes.js';
import { state } from '../systems/State.js';
import { sfx } from '../systems/Sfx.js';

const BAR_H = 96;
const CHAR_MS = 24;
const HOLD_MS = 1100;
const READ_MS_PER_CHAR = 10;
const FADE_MS = 900;
const RAIN_DROPS = 110;

const lerp = (a, b, t) => a + (b - a) * t;

export default class CutsceneScene extends Phaser.Scene {
  constructor() {
    super('Cutscene');
  }

  /**
   * `mode: 'opening'` resets the game state and starts `next`. `mode: 'beat'` is a mid-game
   * cutscene: the Game and UI scenes sleep under it and are woken, untouched, when it ends.
   */
  create({ shots = OPENING, next = 'Game', mode = 'opening' } = {}) {
    this.mode = mode;
    this.shots = shots.map((s) => ({ ...s, image: this.stillFor(s) })).filter((s) => s.image);
    this.next = next;
    this.index = -1;
    this.done = false;
    this.image = null;
    this.phase = 'wait';
    this.full = '';
    this.rainAlpha = 0;

    this.drops = Array.from({ length: RAIN_DROPS }, () => this.newDrop(Math.random() * HEIGHT));
    this.rain = this.add.graphics().setDepth(5);
    this.add.image(0, 0, this.vignette()).setOrigin(0).setDepth(6);
    this.add.rectangle(0, 0, WIDTH, BAR_H, 0x000000).setOrigin(0).setDepth(10);
    this.add.rectangle(0, HEIGHT - BAR_H, WIDTH, BAR_H, 0x000000).setOrigin(0).setDepth(10);

    this.caption = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '22px', color: COLORS.paperCss, lineSpacing: 6, wordWrap: { width: 1000 } })
      .setDepth(11);

    this.skipBtn = this.add
      .text(WIDTH - 24, BAR_H / 2, 'Skip (Esc)', { fontFamily: FONT, fontSize: '16px', color: COLORS.mutedCss, padding: { x: 12, y: 6 } })
      .setOrigin(1, 0.5)
      .setDepth(11)
      .setInteractive({ useHandCursor: true });
    this.skipBtn.on('pointerover', () => this.skipBtn.setColor(COLORS.paperCss));
    this.skipBtn.on('pointerout', () => this.skipBtn.setColor(COLORS.mutedCss));
    this.skipBtn.on('pointerdown', () => this.finish(true));

    this.input.on('pointerdown', (p, over) => !over.includes(this.skipBtn) && this.advance());
    const kb = this.input.keyboard;
    kb.addCapture('SPACE');
    kb.on('keydown-SPACE', () => this.advance());
    kb.on('keydown-ENTER', () => this.advance());
    kb.on('keydown-ESC', () => this.finish(true));

    sfx.startAmbient();
    this.cameras.main.fadeIn(700);
    this.nextShot();
  }

  update(time, delta) {
    const dt = delta / 1000;
    this.rain.clear();
    if (this.rainAlpha <= 0) return;
    this.rain.lineStyle(1, 0xcfe3ee, 0.22 * this.rainAlpha);
    this.rain.beginPath();
    for (const d of this.drops) {
      d.y += d.speed * dt;
      d.x -= d.speed * 0.25 * dt;
      if (d.y - d.len > HEIGHT - BAR_H) Object.assign(d, this.newDrop(BAR_H - 20));
      this.rain.moveTo(d.x, d.y);
      this.rain.lineTo(d.x + d.len * 0.25, d.y - d.len);
    }
    this.rain.strokePath();
  }

  /** The shot's still, its fallback if the still is missing, or null to drop the shot. */
  stillFor(shot) {
    const missing = this.registry.get('missing');
    const real = (key) => key && this.textures.exists(key) && !missing?.has(key);
    if (real(shot.image)) return shot.image;
    if (real(shot.fallback)) return shot.fallback;
    return this.mode === 'beat' ? null : shot.image;
  }

  newDrop(y) {
    return { x: Math.random() * (WIDTH + 200), y, len: 14 + Math.random() * 18, speed: 700 + Math.random() * 500 };
  }

  vignette() {
    const key = 'cut_vignette';
    if (this.textures.exists(key)) return key;
    const tex = this.textures.createCanvas(key, WIDTH, HEIGHT);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * 0.35, WIDTH / 2, HEIGHT / 2, WIDTH * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    tex.refresh();
    return key;
  }

  // ---------- shots ----------

  nextShot() {
    this.index++;
    const shot = this.shots[this.index];
    if (!shot) return this.finish(false);

    const prev = this.image;
    const img = this.add.image(0, 0, shot.image).setDepth(this.index * 0.01);
    this.image = img;
    this.frame(img, shot.from);
    const pan = { t: 0 };
    this.tweens.add({
      targets: pan,
      t: 1,
      duration: shot.duration,
      ease: 'Sine.InOut',
      onUpdate: () => {
        if (!img.active) return;
        const { from: a, to: b } = shot;
        this.frame(img, { x: lerp(a.x, b.x, pan.t), y: lerp(a.y, b.y, pan.t), zoom: lerp(a.zoom, b.zoom, pan.t) });
      },
    });
    this.tweens.add({ targets: this, rainAlpha: shot.rain ?? 1, duration: FADE_MS });

    if (prev) {
      img.setAlpha(0);
      this.tweens.add({ targets: img, alpha: 1, duration: FADE_MS });
      this.tweens.add({ targets: prev, alpha: 0, duration: FADE_MS, onComplete: () => prev.destroy() });
    }

    this.captionIndex = -1;
    this.caption.setText('');
    this.phase = 'wait';
    this.waitTimer = this.time.delayedCall(prev ? FADE_MS * 0.7 : 900, () => this.nextCaption());
  }

  /** Scales the image to cover the screen times `zoom`, holding image point (x, y) at centre. */
  frame(img, { x, y, zoom }) {
    const s = Math.max(WIDTH / img.width, HEIGHT / img.height) * zoom;
    const w = img.width * s;
    const h = img.height * s;
    img
      .setScale(s)
      .setPosition(
        Phaser.Math.Clamp(WIDTH / 2 - (x - 0.5) * w, WIDTH - w / 2, w / 2),
        Phaser.Math.Clamp(HEIGHT / 2 - (y - 0.5) * h, HEIGHT - h / 2, h / 2),
      );
  }

  // ---------- captions ----------

  nextCaption() {
    this.clearTimers();
    const shot = this.shots[this.index];
    this.captionIndex++;
    if (this.captionIndex >= shot.captions.length) return this.nextShot();

    // Wrap once up front so the typed text never reflows mid-word.
    this.full = this.caption.getWrappedText(shot.captions[this.captionIndex]).join('\n');
    this.caption.setText(this.full);
    this.caption.setPosition(Math.round((WIDTH - this.caption.width) / 2), Math.round(HEIGHT - BAR_H / 2 - this.caption.height / 2));
    this.caption.setText('');
    this.typed = 0;
    this.phase = 'typing';
    this.typer = this.time.addEvent({
      delay: CHAR_MS,
      repeat: this.full.length - 1,
      callback: () => {
        this.caption.setText(this.full.slice(0, ++this.typed));
        if (this.typed >= this.full.length) this.hold();
      },
    });
  }

  hold() {
    this.clearTimers();
    this.caption.setText(this.full);
    this.phase = 'hold';
    this.holdTimer = this.time.delayedCall(HOLD_MS + this.full.length * READ_MS_PER_CHAR, () => this.nextCaption());
  }

  advance() {
    if (this.done) return;
    if (this.phase === 'typing') this.hold();
    else this.nextCaption();
  }

  clearTimers() {
    for (const t of [this.waitTimer, this.typer, this.holdTimer]) t?.remove(false);
    this.waitTimer = this.typer = this.holdTimer = null;
  }

  finish(skipped) {
    if (this.done) return;
    this.done = true;
    this.clearTimers();
    if (skipped) sfx.play('click');
    this.skipBtn.disableInteractive();
    this.cameras.main.fadeOut(skipped ? 450 : 1200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.mode === 'beat') {
        this.scene.wake('UI');
        this.scene.wake('Game');
        this.scene.stop();
        return;
      }
      state.reset();
      this.scene.start(this.next);
    });
  }
}
