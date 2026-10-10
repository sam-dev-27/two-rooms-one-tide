import { WIDTH, HEIGHT, FONT, COLORS } from '../config.js';
import { RAID, RAID_FRONTS, RAID_TEXT } from '../data/raid.js';
import { RaidSim } from '../systems/Raid.js';
import { sfx } from '../systems/Sfx.js';

// The finale raid, drawn over the sleeping Game and UI scenes: an intro still, a how-to card, the
// two-front fight and a result card. The rules live in RaidSim; this scene only draws and feeds it.
// Coordinates are in the 1280x720 room paintings (gallery_lit and the flooded cellar).

const BAR_H = 80;
const CHAR_MS = 24;
const SWAP_MS = 250;
const RAIN_DROPS = 120;

// Gallery: the rail's top and the deck edge the climbers come up behind, and the lamp's centre.
const RAIL_TOP = 312;
const DECK_EDGE = 430;
const RAIL_X = [20, 720];
const LAMP = { x: 960, y: 218 };
const BEAM_HALF = 0.085;
const CLIMB_H = 230;
const DECK_Y = 585;
const TOP_H = 330;

// Cellar: where waders come in and what they make for, as waterline points; height grows with y.
const WATER_DEPTH = 0.27;
const CELLAR_FROM = { stairs: { x: 505, y: 452 }, side: { x: 1340, y: 600 } };
const CELLAR_TO = { hatch: { x: 420, y: 612 }, valves: { x: 280, y: 548 } };
const RING_R = 78;

const lerp = (a, b, t) => a + (b - a) * t;
const css = (n) => `#${n.toString(16).padStart(6, '0')}`;

export default class RaidScene extends Phaser.Scene {
  constructor() {
    super('Raid');
  }

  create({ onResult = null } = {}) {
    this.onResult = onResult;
    this.sim = new RaidSim(RAID);
    this.front = 'gallery';
    this.phase = 'intro';
    this.paused = false;
    this.swapping = false;
    this.finished = false;
    this.roughs = 0;
    this.earlyTips = 0;
    this.views = new Map();
    this.aim = { x: 640, y: 380 };
    this.nextShout = 4000;
    this.nextLightning = 6000;
    this.rainAlpha = 0;

    // Automation hurries through: the fight is skipped and recorded as such.
    if (window.__fastRaid ?? navigator.webdriver === true) {
      this.sim.skip();
      this.time.delayedCall(50, () => this.close());
      return;
    }

    this.buildFronts();
    this.buildHud();
    this.drops = Array.from({ length: RAIN_DROPS }, () => this.newDrop(Math.random() * HEIGHT));
    this.rain = this.add.graphics().setDepth(40);
    this.flash = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0xe8f2ff, 0).setOrigin(0).setDepth(45);

    this.input.on('pointermove', (p) => (this.aim = { x: p.worldX, y: p.worldY }));
    this.input.on('pointerdown', (p, over) => this.onPointer(p, over));
    const kb = this.input.keyboard;
    kb.addCapture(['TAB', 'SPACE', 'ESC']);
    kb.on('keydown-TAB', () => this.phase === 'fight' && this.swap());
    kb.on('keydown-ENTER', () => this.advance());
    kb.on('keydown-SPACE', () => this.advance());
    kb.on('keydown-ESC', () => this.onEsc());

    sfx.startAmbient();
    this.intro();
  }

  // ---------- helpers ----------

  real(key) {
    const missing = this.registry.get('missing');
    return !!key && this.textures.exists(key) && !missing?.has(key);
  }

  pick(...keys) {
    return keys.find((k) => this.real(k)) ?? keys.find((k) => this.textures.exists(k));
  }

  cover(img) {
    img.setScale(Math.max(WIDTH / img.width, HEIGHT / img.height)).setPosition(WIDTH / 2, HEIGHT / 2);
    return img;
  }

  /** Sizes a sprite to a display height, keeping its aspect. */
  fit(sprite, h) {
    sprite.setScale(h / sprite.frame.realHeight);
    return sprite;
  }

  tag(x, y, text, size = 16, color = COLORS.paperCss) {
    return this.add
      .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, backgroundColor: 'rgba(7, 11, 16, 0.78)', padding: { x: 10, y: 5 } })
      .setOrigin(0.5);
  }

  newDrop(y) {
    return { x: Math.random() * (WIDTH + 200), y, len: 14 + Math.random() * 18, speed: 700 + Math.random() * 500 };
  }

  // ---------- intro and how-to ----------

  intro() {
    const key = this.pick('wreckers_boats', 'cut_rowboat', 'cut_storm');
    this.introLayer = this.add.container(0, 0).setDepth(60);
    if (key) {
      const img = this.cover(this.add.image(0, 0, key));
      const s = img.scaleX;
      this.tweens.add({ targets: img, scale: s * 1.06, duration: 9000, ease: 'Sine.InOut' });
      this.introLayer.add(img);
    }
    this.introLayer.add(this.add.rectangle(0, 0, WIDTH, BAR_H, 0x000000).setOrigin(0));
    this.introLayer.add(this.add.rectangle(0, HEIGHT - BAR_H, WIDTH, BAR_H, 0x000000).setOrigin(0));
    this.caption = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '22px', color: COLORS.paperCss, wordWrap: { width: 1000 }, align: 'center' });
    this.introLayer.add(this.caption);
    this.rainAlpha = 1;
    this.lineIndex = -1;
    this.cameras.main.fadeIn(600);
    sfx.play('horn');
    this.time.delayedCall(800, () => this.nextLine());
  }

  nextLine() {
    this.typer?.remove(false);
    this.holdTimer?.remove(false);
    this.lineIndex++;
    if (this.lineIndex >= RAID_TEXT.intro.length) return this.howTo();
    const full = this.caption.getWrappedText(RAID_TEXT.intro[this.lineIndex]).join('\n');
    this.caption.setText(full);
    this.caption.setPosition(Math.round((WIDTH - this.caption.width) / 2), Math.round(HEIGHT - BAR_H / 2 - this.caption.height / 2));
    this.caption.setText('');
    this.full = full;
    this.typed = 0;
    this.typing = true;
    this.typer = this.time.addEvent({
      delay: CHAR_MS,
      repeat: full.length - 1,
      callback: () => {
        this.caption.setText(full.slice(0, ++this.typed));
        if (this.typed >= full.length) this.holdLine();
      },
    });
    if (this.lineIndex === 1) this.time.delayedCall(400, () => this.shout(WIDTH * 0.62, HEIGHT * 0.45, RAID_TEXT.shouts[0]));
  }

  holdLine() {
    this.typer?.remove(false);
    this.typing = false;
    this.caption.setText(this.full);
    this.holdTimer = this.time.delayedCall(1400 + this.full.length * 14, () => this.nextLine());
  }

  howTo() {
    this.typer?.remove(false);
    this.holdTimer?.remove(false);
    this.phase = 'howto';
    const card = this.add.container(WIDTH / 2, HEIGHT / 2).setDepth(70).setAlpha(0);
    const w = 780;
    const h = 440;
    card.add(this.add.rectangle(0, 0, w, h, COLORS.panel, 0.95).setStrokeStyle(2, COLORS.panelEdge));
    card.add(this.add.text(0, -h / 2 + 38, RAID_TEXT.howTo.title, { fontFamily: FONT, fontSize: '26px', color: COLORS.amberCss }).setOrigin(0.5));
    RAID_TEXT.howTo.rows.forEach((row, i) => {
      const y = -h / 2 + 108 + i * 72;
      card.add(this.icon(row.icon, -w / 2 + 62, y));
      card.add(
        this.add
          .text(-w / 2 + 110, y, row.text, { fontFamily: FONT, fontSize: '16px', color: COLORS.paperCss, wordWrap: { width: w - 150 }, lineSpacing: 3 })
          .setOrigin(0, 0.5),
      );
    });
    card.add(this.add.text(0, h / 2 - 34, `${RAID_TEXT.howTo.begin}  ·  Esc pauses`, { fontFamily: FONT, fontSize: '15px', color: COLORS.mutedCss }).setOrigin(0.5));
    this.howToCard = card;
    this.tweens.add({ targets: card, alpha: 1, duration: 300 });
  }

  /** The little drawn icons on the how-to card. */
  icon(kind, x, y) {
    const g = this.add.graphics({ x, y });
    if (kind === 'beam') {
      g.fillStyle(0xffd28a, 0.55).fillTriangle(-22, -4, 24, -18, 24, 12);
      g.fillStyle(0xffe7b0, 1).fillCircle(-22, -4, 6);
    } else if (kind === 'shove') {
      for (let i = 0; i < 3; i++) g.fillStyle(0xf3e6c8, 1).fillCircle(-14 + i * 14, 0, 5);
    } else if (kind === 'ring') {
      g.lineStyle(7, 0x5fd38a, 0.6).strokeCircle(0, 0, 11);
      g.lineStyle(2, 0xf3e6c8, 1).strokeCircle(0, 0, 22);
    } else {
      g.setPosition(0, 0).lineStyle(2, 0xf3e6c8, 1).strokeRoundedRect(-24, -13, 48, 26, 5);
      return this.add.container(x, y, [g, this.add.text(0, 0, 'Tab', { fontFamily: FONT, fontSize: '14px', color: COLORS.paperCss }).setOrigin(0.5)]);
    }
    return g;
  }

  advance() {
    if (this.paused || this.finished) return;
    if (this.phase === 'intro') {
      if (this.typing) this.holdLine();
      else this.nextLine();
    } else if (this.phase === 'howto') this.beginFight();
    else if (this.phase === 'result') this.close();
  }

  beginFight() {
    this.phase = 'fight';
    sfx.play('click');
    this.tweens.add({ targets: [this.howToCard, this.introLayer], alpha: 0, duration: 350, onComplete: () => (this.howToCard.destroy(), this.introLayer.destroy()) });
    this.hud.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.hud, alpha: 1, duration: 350 });
    this.showFront('gallery', true);
  }

  // ---------- the two fronts ----------

  buildFronts() {
    const g = this.add.container(0, 0).setDepth(10);
    g.add(this.cover(this.add.image(0, 0, this.pick('gallery_lit', 'gallery', 'lamp_after'))));
    g.add(this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x061018, 0.32).setOrigin(0));
    // Climbers come up behind the deck edge, so only the part above it shows.
    const maskShape = this.make.graphics({ add: false }).fillStyle(0xffffff).fillRect(0, 0, WIDTH, DECK_EDGE);
    this.climbLayer = this.add.container(0, 0);
    this.climbLayer.setMask(maskShape.createGeometryMask());
    this.deckLayer = this.add.container(0, 0);
    this.beam = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    g.add([this.climbLayer, this.beam, this.deckLayer]);

    const c = this.add.container(0, 0).setDepth(10).setVisible(false);
    c.add(this.cover(this.add.image(0, 0, this.pick('cellar_after_hatch', 'cellar_after', 'cellar_before'))));
    c.add(this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x041018, 0.22).setOrigin(0));
    this.wadeLayer = this.add.container(0, 0);
    this.rings = this.add.graphics();
    c.add([this.wadeLayer, this.rings]);

    this.layers = { gallery: g, cellar: c };
  }

  showFront(front, instant = false) {
    const out = this.layers[this.front];
    const into = this.layers[front];
    this.front = front;
    this.updateFrontLabels();
    if (instant || out === into) {
      out.setVisible(out === into);
      into.setVisible(true).setAlpha(1);
      return;
    }
    this.swapping = true;
    this.tweens.add({
      targets: out,
      alpha: 0,
      duration: SWAP_MS / 2,
      onComplete: () => {
        out.setVisible(false).setAlpha(1);
        into.setVisible(true).setAlpha(0);
        this.tweens.add({ targets: into, alpha: 1, duration: SWAP_MS / 2, onComplete: () => (this.swapping = false) });
      },
    });
  }

  swap() {
    if (this.paused || this.swapping || this.finished) return;
    sfx.play('swap');
    this.showFront(this.front === 'gallery' ? 'cellar' : 'gallery');
  }

  other() {
    return this.front === 'gallery' ? 'cellar' : 'gallery';
  }

  // ---------- HUD ----------

  buildHud() {
    const hud = this.add.container(0, 0).setDepth(50).setVisible(false);
    hud.add(this.add.rectangle(0, 0, WIDTH, 58, 0x070b10, 0.72).setOrigin(0));
    this.meters = {};
    [['lamp', 24, 0xd9a441], ['cellar', 254, 0x6fb7c4]].forEach(([id, x, color]) => {
      const label = this.add.text(x, 9, id === 'lamp' ? RAID_FRONTS.gallery.meterLabel : RAID_FRONTS.cellar.meterLabel, { fontFamily: FONT, fontSize: '14px', color: COLORS.mutedCss });
      const back = this.add.rectangle(x, 32, 200, 12, 0x000000, 0.6).setOrigin(0, 0.5).setStrokeStyle(1, 0x3a4652);
      const fill = this.add.rectangle(x, 32, 200, 12, color).setOrigin(0, 0.5);
      hud.add([label, back, fill]);
      this.meters[id] = { fill, color, flash: 0 };
    });

    // The cutter's run in: a bar with a little boat that reaches the rock when the fight ends.
    this.cutterX = [520, 900];
    hud.add(this.add.text(this.cutterX[0], 9, 'The Vigilant', { fontFamily: FONT, fontSize: '14px', color: COLORS.mutedCss }));
    hud.add(this.add.rectangle(this.cutterX[0], 34, this.cutterX[1] - this.cutterX[0], 4, 0x9fb3c1, 0.35).setOrigin(0, 0.5));
    this.cutterFill = this.add.rectangle(this.cutterX[0], 34, 0, 4, 0xd8f0ff, 0.9).setOrigin(0, 0.5);
    const rock = this.add.graphics({ x: this.cutterX[1] + 14, y: 34 });
    rock.fillStyle(0x3a4652, 1).fillTriangle(-12, 8, 12, 8, 0, -4);
    rock.fillStyle(0xd9a441, 1).fillRect(-2, -16, 4, 12);
    this.boat = this.add.graphics({ x: this.cutterX[0], y: 30 });
    this.boat.fillStyle(0xd8f0ff, 1).fillTriangle(-12, 0, 12, 0, 8, 7).fillRect(-12, 0, 20, 7).fillRect(-2, -10, 3, 10);
    hud.add([this.cutterFill, rock, this.boat]);

    this.pauseBtn = this.button(WIDTH - 24, 29, 'Pause (Esc)', () => this.togglePause(true)).setOrigin(1, 0.5);
    this.skipBtn = this.button(WIDTH - 150, 29, RAID_TEXT.skip, () => this.skipFight()).setOrigin(1, 0.5).setVisible(false);
    hud.add([this.pauseBtn, this.skipBtn]);

    // Bottom: who is where, and the swap button with the other front's warning.
    this.frontLabel = this.tag(0, HEIGHT - 34, '', 17).setOrigin(0, 0.5).setPosition(20, HEIGHT - 34);
    this.frontHint = this.add.text(20, HEIGHT - 66, '', { fontFamily: FONT, fontSize: '14px', color: COLORS.mutedCss, backgroundColor: 'rgba(7, 11, 16, 0.6)', padding: { x: 8, y: 3 } }).setOrigin(0, 0.5);
    this.swapBtn = this.button(WIDTH - 20, HEIGHT - 34, '', () => this.swap()).setOrigin(1, 0.5);
    this.swapBtn.setStyle({ backgroundColor: 'rgba(17, 26, 36, 0.92)', fontSize: '17px' });
    this.pressureText = this.add.text(WIDTH - 20, HEIGHT - 72, '', { fontFamily: FONT, fontSize: '15px', color: '#ffb36b', backgroundColor: 'rgba(7, 11, 16, 0.8)', padding: { x: 8, y: 4 } }).setOrigin(1, 0.5);
    hud.add([this.frontLabel, this.frontHint, this.swapBtn, this.pressureText]);

    this.banner = this.tag(WIDTH / 2, 120, '', 18).setDepth(55).setAlpha(0);
    this.banner.setWordWrapWidth(820).setAlign('center');
    this.hud = hud;
  }

  button(x, y, label, onClick) {
    const b = this.add
      .text(x, y, label, { fontFamily: FONT, fontSize: '15px', color: COLORS.mutedCss, padding: { x: 10, y: 6 } })
      .setInteractive({ useHandCursor: true });
    b.on('pointerover', () => b.setColor(COLORS.paperCss));
    b.on('pointerout', () => b.setColor(b.getData('color') ?? COLORS.mutedCss));
    b.on('pointerdown', (p, lx, ly, e) => {
      e?.stopPropagation?.();
      if (!this.paused || b.getData('menu')) onClick();
    });
    return b;
  }

  updateFrontLabels() {
    const here = RAID_FRONTS[this.front];
    const there = RAID_FRONTS[this.other()];
    this.frontLabel.setText(`${here.who === 'mara' ? 'Mara' : 'Tobin'}: the ${here.name.toLowerCase()}`);
    this.frontHint.setText(this.front === 'gallery' ? 'Hold the beam on a climber, then click. Over the rail: click three times.' : 'Click a wader when his ring is in the green.');
    this.swapBtn.setText(`Tab: ${there.who === 'mara' ? 'Mara' : 'Tobin'}, ${there.name.toLowerCase()}`);
  }

  showBanner(text, ms = 2800) {
    this.tweens.killTweensOf(this.banner);
    this.banner.setText(text).setAlpha(1);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: ms, duration: 500 });
  }

  // ---------- input ----------

  onPointer(p, over) {
    if (over.length) return;
    if (this.phase !== 'fight') return this.advance();
    if (this.paused || this.swapping || this.finished) return;
    const x = p.worldX;
    const y = p.worldY;
    if (this.front === 'gallery') {
      const top = this.sim.active('gallery').find((w) => w.state === 'top' && this.views.get(w.id)?.sprite.getBounds().contains(x, y));
      const near = top ?? this.nearest('gallery', x, y, 95, (w) => w.state === 'climbing');
      if (near) return this.react(near, this.sim.click(near.id));
    } else {
      const near = this.nearest('cellar', x, y, RING_R + 50);
      if (near) return this.react(near, this.sim.click(near.id));
    }
  }

  nearest(front, x, y, within, ok = () => true) {
    let best = null;
    let bestD = within;
    for (const w of this.sim.active(front)) {
      if (!ok(w)) continue;
      const d = Math.hypot(this.screenX(w) - x, this.screenY(w) - y);
      if (d < bestD) (best = w), (bestD = d);
    }
    return best;
  }

  react(w, result) {
    const v = this.views.get(w.id);
    if (result === 'flash') {
      sfx.play('flashbeam');
      this.burst(this.screenX(w), this.screenY(w), 0xfff4d0);
    } else if (result === 'early') {
      sfx.play('tick');
      if (this.earlyTips++ < 2) this.showBanner('Not yet: hold the beam on him until he shields his eyes.', 1800);
    } else if (result === 'push') {
      sfx.play('thud');
      if (v) this.tweens.add({ targets: v.sprite, x: v.sprite.x - 16, duration: 70, yoyo: true });
    } else if (result === 'shove') {
      sfx.play('shove');
    } else if (result === 'stagger') {
      sfx.play('shove');
      this.time.delayedCall(250, () => sfx.play('splash'));
    } else if (result === 'miss') {
      sfx.play('tick');
      if (v) v.missFlash = 220;
    }
  }

  onEsc() {
    if (this.finished) return;
    if (this.phase === 'intro') return this.howTo();
    if (this.phase === 'fight') this.togglePause(!this.paused);
  }

  togglePause(on) {
    if (on === this.paused || this.phase !== 'fight') return;
    this.paused = on;
    if (!on) {
      this.menu?.destroy();
      this.menu = null;
      return;
    }
    const m = this.add.container(WIDTH / 2, HEIGHT / 2).setDepth(80);
    m.add(this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.55).setInteractive());
    m.add(this.add.rectangle(0, 0, 420, 230, COLORS.panel, 0.96).setStrokeStyle(2, COLORS.panelEdge));
    m.add(this.add.text(0, -70, 'Paused', { fontFamily: FONT, fontSize: '26px', color: COLORS.amberCss }).setOrigin(0.5));
    const resume = this.button(0, -8, 'Resume (Esc)', () => this.togglePause(false)).setOrigin(0.5).setData('menu', true);
    const skip = this.button(0, 44, RAID_TEXT.skip, () => this.skipFight()).setOrigin(0.5).setData('menu', true);
    resume.setStyle({ fontSize: '19px', color: COLORS.paperCss }).setData('color', COLORS.paperCss);
    skip.setStyle({ fontSize: '17px' });
    m.add([resume, skip]);
    this.menu = m;
  }

  skipFight() {
    if (this.finished) return;
    this.menu?.destroy();
    this.menu = null;
    this.paused = false;
    this.sim.skip();
    this.endFight();
  }

  // ---------- the fight loop ----------

  update(time, delta) {
    this.drawRain(delta / 1000);
    if (this.phase !== 'fight' || this.paused || this.finished) return;
    const dt = Math.min(delta, 50);

    const beam = new Set();
    const angle = Math.atan2(this.aim.y - LAMP.y, this.aim.x - LAMP.x);
    if (this.front === 'gallery' && !this.swapping) {
      for (const w of this.sim.active('gallery')) {
        if (w.state !== 'climbing') continue;
        const a = Math.atan2(this.screenY(w) - LAMP.y, this.screenX(w) - LAMP.x);
        if (Math.abs(Phaser.Math.Angle.Wrap(a - angle)) < BEAM_HALF) beam.add(w.id);
      }
    }
    for (const e of this.sim.update(dt, { beam })) this.onEvent(e);
    if (this.finished) return;

    for (const w of this.sim.wreckers) this.syncView(w, dt);
    for (const [id, v] of this.views) if (!this.sim.wreckers.some((w) => w.id === id)) this.dropView(id, v);
    this.wadeLayer.sort('depth');
    this.drawBeam(angle);
    this.drawRings();
    this.drawHud(dt);
    this.ambience(dt);
  }

  onEvent(e) {
    if (e.type === 'spawn') this.makeView(this.sim.wreckers.find((w) => w.id === e.id));
    else if (e.type === 'top') {
      this.shout(this.screenX(this.sim.wreckers.find((w) => w.id === e.id)), RAIL_TOP - 30, 'Over the rail!', e.front);
      sfx.play('thud');
    } else if (e.type === 'brawl') sfx.play('shout');
    else if (e.type === 'hit') {
      this.meters[e.meter].flash = 300;
      if (e.front === this.front) {
        this.cameras.main.shake(180, 0.006);
        sfx.play('thud');
      } else sfx.play('tick');
    } else if (e.type === 'scuffle') {
      this.roughs++;
      this.cameras.main.shake(500, 0.012);
      sfx.play('shove');
      this.time.delayedCall(220, () => sfx.play('thud'));
      this.showBanner(e.text, 3600);
      this.skipBtn.setVisible(true);
    } else if (e.type === 'end') this.endFight();
  }

  screenX(w) {
    if (w.front === 'gallery') {
      if (w.state === 'climbing') return RAIL_X[0] + w.lane * (RAIL_X[1] - RAIL_X[0]);
      return this.views.get(w.id)?.sprite.x ?? RAIL_X[0] + w.lane * (RAIL_X[1] - RAIL_X[0]);
    }
    return this.waderPos(w).x;
  }

  screenY(w) {
    if (w.front === 'gallery') {
      if (w.state === 'climbing') return this.climbBottom(w) - CLIMB_H * 0.88;
      return DECK_Y - TOP_H * 0.6;
    }
    const p = this.waderPos(w);
    return p.y - p.h * 0.5;
  }

  /** Head and shoulders show above the deck edge from the start; at the top he is over the rail. */
  climbBottom(w) {
    return DECK_EDGE + CLIMB_H * (0.72 - 0.6 * w.progress);
  }

  waderPos(w) {
    const a = CELLAR_FROM[w.from];
    const b = CELLAR_TO[w.to];
    const t = Phaser.Math.Easing.Sine.Out(w.progress);
    const v = this.views.get(w.id);
    const back = v?.knock ?? 0;
    const x = lerp(a.x, b.x, t) + back;
    const y = lerp(a.y, b.y, t) - back * 0.12;
    return { x, y, h: 240 + (y - 440) * 1.05 };
  }

  makeView(w) {
    if (w.front === 'gallery') {
      const sprite = this.fit(this.add.image(0, 0, this.pick('wrecker_climb', 'wrecker')).setOrigin(0.5, 1), CLIMB_H);
      this.climbLayer.add(sprite);
      const mark = this.add.text(0, 0, '!', { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: '#fff2c0' }).setOrigin(0.5).setVisible(false);
      const pips = this.add.graphics();
      this.deckLayer.add([mark, pips]);
      this.views.set(w.id, { sprite, mark, pips, state: w.state });
    } else {
      const sprite = this.add.image(0, 0, this.pick('wrecker')).setOrigin(0.5, 1);
      const ripple = this.add.graphics();
      this.wadeLayer.add([ripple, sprite]);
      this.views.set(w.id, { sprite, ripple, state: w.state, knock: 0, missFlash: 0 });
    }
  }

  syncView(w, dt) {
    const v = this.views.get(w.id);
    if (!v) return;
    const changed = v.state !== w.state;
    v.state = w.state;
    if (w.front === 'gallery') this.syncClimber(w, v, changed);
    else this.syncWader(w, v, changed, dt);
  }

  syncClimber(w, v, changed) {
    const s = v.sprite;
    const x = RAIL_X[0] + w.lane * (RAIL_X[1] - RAIL_X[0]);
    if (w.state === 'climbing') {
      s.setPosition(x, this.climbBottom(w));
      s.setTint(w.blind ? 0xfff0c8 : w.light > 0 ? 0xffe2b0 : 0xffffff);
      s.setAngle(w.blind ? Math.sin(this.time.now / 60) * 3 : 0);
      v.mark.setVisible(w.blind).setPosition(x, this.screenY(w) - 34);
    } else if (w.state === 'top' && changed) {
      // Over the rail: out from behind the deck edge, onto the walkway, facing the lamp.
      v.mark.setVisible(false);
      this.climbLayer.remove(s);
      this.deckLayer.addAt(s, 0);
      s.setTexture(this.pick('wrecker', 'wrecker_climb')).clearTint().setAngle(0).setFlipX(true);
      this.fit(s, TOP_H);
      s.setPosition(x, RAIL_TOP + 40);
      this.tweens.add({ targets: s, y: DECK_Y, x: Math.min(x + 80, 760), duration: 380, ease: 'Quad.In' });
    } else if (w.state === 'top') {
      const fresh = this.sim.time - w.lastShove <= RAID.gallery.shoveGapMs ? w.shoves : 0;
      v.pips.clear();
      for (let i = 0; i < RAID.gallery.shoves; i++) {
        v.pips.fillStyle(i < fresh ? 0xffd28a : 0x000000, i < fresh ? 1 : 0.55).fillCircle(s.x - 18 + i * 18, s.y - TOP_H - 14, 6);
        v.pips.lineStyle(1, 0xf3e6c8, 0.8).strokeCircle(s.x - 18 + i * 18, s.y - TOP_H - 14, 6);
      }
    } else if (w.state === 'falling' && changed) {
      v.mark.setVisible(false);
      v.pips.clear();
      this.tweens.killTweensOf(s);
      const fromTop = s.parentContainer === this.deckLayer;
      this.tweens.add({
        targets: s,
        y: fromTop ? s.y - 60 : s.y + 40,
        angle: fromTop ? 50 : -25,
        alpha: 0,
        duration: 650,
        ease: 'Quad.In',
        onComplete: () => sfx.play('splash'),
      });
    }
  }

  syncWader(w, v, changed, dt) {
    const s = v.sprite;
    if (changed && w.state === 'staggered') {
      // The stagger pose reels to the left; flipped, he goes back the way he came.
      s.setTexture(this.pick('wrecker_shove', 'wrecker')).setFlipX(true);
      this.tweens.add({ targets: v, knock: 70, duration: 500, ease: 'Quad.Out' });
      this.tweens.add({ targets: s, alpha: 0, delay: 350, duration: 400 });
    }
    const p = this.waderPos(w);
    this.fit(s, p.h);
    const fh = s.frame.realHeight;
    s.setCrop(0, 0, s.frame.realWidth, fh * (1 - WATER_DEPTH));
    s.setPosition(p.x + (w.state === 'brawl' ? Math.sin(this.time.now / 140) * 5 : 0), p.y + p.h * WATER_DEPTH);
    s.setDepth?.(p.y);
    v.missFlash = Math.max(0, v.missFlash - dt);
    const t = this.time.now / 300;
    v.ripple.clear();
    v.ripple.lineStyle(2, 0xd8eef5, 0.35 * s.alpha);
    v.ripple.strokeEllipse(p.x, p.y, p.h * (0.36 + 0.04 * Math.sin(t)), 12 + 2 * Math.cos(t));
    v.ripple.lineStyle(1, 0xd8eef5, 0.18 * s.alpha);
    v.ripple.strokeEllipse(p.x, p.y + 2, p.h * (0.52 + 0.05 * Math.cos(t)), 18);
  }

  dropView(id, v) {
    for (const o of [v.sprite, v.mark, v.pips, v.ripple]) o?.destroy();
    this.views.delete(id);
  }

  drawBeam(angle) {
    const g = this.beam;
    g.clear();
    if (this.front !== 'gallery') return;
    const len = 1500;
    const ray = (a, l = len) => [LAMP.x + Math.cos(a) * l, LAMP.y + Math.sin(a) * l];
    const pulse = 0.9 + 0.1 * Math.sin(this.time.now / 260);
    for (const [half, alpha] of [[BEAM_HALF * 1.6, 0.07], [BEAM_HALF, 0.12], [BEAM_HALF * 0.45, 0.1]]) {
      const [ax, ay] = ray(angle - half);
      const [bx, by] = ray(angle + half);
      g.fillStyle(0xffd28a, alpha * pulse).fillTriangle(LAMP.x, LAMP.y, ax, ay, bx, by);
    }
    g.fillStyle(0xffe7b0, 0.18).fillCircle(LAMP.x, LAMP.y, 34);
    g.fillStyle(0xffd28a, 0.08).fillCircle(this.aim.x, this.aim.y, 46);
  }

  drawRings() {
    const g = this.rings;
    g.clear();
    if (this.front !== 'cellar') return;
    const [lo, hi] = RAID.cellar.green;
    for (const w of this.sim.active('cellar')) {
      const x = this.screenX(w);
      const y = this.screenY(w);
      const v = this.views.get(w.id);
      g.lineStyle((hi - lo) * RING_R, 0x5fd38a, 0.28).strokeCircle(x, y, ((lo + hi) / 2) * RING_R);
      const green = this.sim.inGreen(w);
      const color = v?.missFlash > 0 ? 0xe0604a : green ? 0x7cf0a4 : 0xf3e6c8;
      g.lineStyle(green ? 4 : 3, color, 0.95).strokeCircle(x, y, Math.max(2, this.sim.ringValue(w) * RING_R));
    }
  }

  drawHud(dt) {
    for (const [id, m] of Object.entries(this.meters)) {
      const f = this.sim.meters[id] / RAID.meterMax;
      m.fill.width = 200 * f;
      m.flash = Math.max(0, m.flash - dt);
      m.fill.setFillStyle(m.flash > 0 ? 0xe0604a : f < 0.3 ? 0xd27a4a : m.color);
    }
    const c = this.sim.cutter;
    this.cutterFill.width = (this.cutterX[1] - this.cutterX[0]) * c;
    this.boat.x = lerp(this.cutterX[0], this.cutterX[1], c);
    this.boat.y = 30 + Math.sin(this.time.now / 300) * 1.5;

    const p = this.sim.pressure(this.other());
    if (!p) {
      this.pressureText.setVisible(false);
      this.swapBtn.setColor(COLORS.mutedCss).setData('color', COLORS.mutedCss);
      return;
    }
    const urgent = p.level >= 2;
    const blink = urgent ? 0.55 + 0.45 * Math.abs(Math.sin(this.time.now / 180)) : 1;
    this.pressureText.setVisible(true).setText(p.text).setColor(urgent ? '#ff7a5c' : '#ffb36b').setAlpha(blink);
    const col = urgent ? '#ff9a7a' : COLORS.paperCss;
    this.swapBtn.setColor(col).setData('color', col);
  }

  /** Shouts, lightning and the occasional splash, so the night keeps moving. */
  ambience(dt) {
    this.nextShout -= dt;
    if (this.nextShout <= 0) {
      this.nextShout = 3500 + Math.random() * 3500;
      const list = this.sim.active(this.front);
      const w = list[Math.floor(Math.random() * list.length)];
      if (w) this.shout(this.screenX(w), this.screenY(w) - 80, RAID_TEXT.shouts[Math.floor(Math.random() * RAID_TEXT.shouts.length)]);
    }
    this.nextLightning -= dt;
    if (this.nextLightning <= 0) {
      this.nextLightning = 7000 + Math.random() * 7000;
      if (this.front === 'gallery') {
        this.flash.setAlpha(0.45);
        this.tweens.add({ targets: this.flash, alpha: 0, duration: 380 });
      }
      this.time.delayedCall(500 + Math.random() * 700, () => sfx.play('thunder'));
    }
  }

  shout(x, y, text, front = this.front) {
    if (front !== this.front && this.phase === 'fight') return;
    sfx.play('shout');
    const t = this.add
      .text(Phaser.Math.Clamp(x, 120, WIDTH - 120), Phaser.Math.Clamp(y, 90, HEIGHT - 120), text, {
        fontFamily: FONT,
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#f6d6b0',
        stroke: '#070b10',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(48);
    this.tweens.add({ targets: t, y: t.y - 30, alpha: 0, delay: 700, duration: 900, onComplete: () => t.destroy() });
  }

  burst(x, y, color) {
    const c = this.add.circle(x, y, 18, color, 0.9).setDepth(46).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: c, scale: 4, alpha: 0, duration: 380, onComplete: () => c.destroy() });
  }

  drawRain(dt) {
    if (!this.rain) return;
    this.rain.clear();
    const alpha = this.phase === 'fight' ? (this.front === 'gallery' ? 1 : 0) : this.rainAlpha;
    if (alpha <= 0) return;
    this.rain.lineStyle(1, 0xcfe3ee, 0.22 * alpha);
    this.rain.beginPath();
    for (const d of this.drops) {
      d.y += d.speed * dt;
      d.x -= d.speed * 0.25 * dt;
      if (d.y - d.len > HEIGHT) Object.assign(d, this.newDrop(-20));
      this.rain.moveTo(d.x, d.y);
      this.rain.lineTo(d.x + d.len * 0.25, d.y - d.len);
    }
    this.rain.strokePath();
  }

  // ---------- the end ----------

  endFight() {
    if (this.phase === 'result') return;
    this.phase = 'result';
    this.paused = false;
    this.beam?.clear();
    this.rings?.clear();
    for (const w of this.sim.wreckers) this.syncView(w, 0);
    sfx.play('horn');

    // The cutter's searchlight sweeps the rock and the wreckers run.
    const sweep = this.add.graphics().setDepth(47).setBlendMode(Phaser.BlendModes.ADD);
    const s = { a: -0.5 };
    this.tweens.add({
      targets: s,
      a: 0.6,
      duration: 1800,
      ease: 'Sine.InOut',
      onUpdate: () => {
        sweep.clear();
        const ox = -100;
        const oy = 260;
        sweep.fillStyle(0xd8f0ff, 0.14).fillTriangle(ox, oy, ox + Math.cos(s.a - 0.08) * 1700, oy + Math.sin(s.a - 0.08) * 1700, ox + Math.cos(s.a + 0.08) * 1700, oy + Math.sin(s.a + 0.08) * 1700);
      },
      onComplete: () => {
        sweep.destroy();
        this.resultCard();
      },
    });
  }

  resultCard() {
    const r = this.sim.result();
    this.hud.setVisible(false);
    this.banner.setAlpha(0);
    const card = this.add.container(WIDTH / 2, HEIGHT / 2).setDepth(70).setAlpha(0);
    card.add(this.add.rectangle(0, 0, 720, 270, COLORS.panel, 0.95).setStrokeStyle(2, COLORS.panelEdge));
    card.add(this.add.text(0, -84, RAID_TEXT.tierLabel[r.tier], { fontFamily: FONT, fontSize: '28px', color: COLORS.amberCss }).setOrigin(0.5));
    card.add(
      this.add
        .text(0, -10, r.skipped ? RAID_TEXT.skipped : RAID_TEXT.cutter, { fontFamily: FONT, fontSize: '18px', color: COLORS.paperCss, wordWrap: { width: 620 }, align: 'center', lineSpacing: 4 })
        .setOrigin(0.5),
    );
    const cost = r.skipped ? '' : `The lamp took ${this.sim.damage.lamp}, the cellar ${this.sim.damage.cellar}${r.scuffles ? `, and ${r.scuffles === 1 ? 'one scuffle' : `${r.scuffles} scuffles`}` : ''}.`;
    card.add(this.add.text(0, 58, cost, { fontFamily: FONT, fontSize: '15px', color: COLORS.mutedCss }).setOrigin(0.5));
    card.add(this.add.text(0, 102, 'Click to continue', { fontFamily: FONT, fontSize: '15px', color: COLORS.mutedCss }).setOrigin(0.5));
    this.tweens.add({ targets: card, alpha: 1, duration: 400 });
    this.result = r;
  }

  close() {
    if (this.finished) return;
    this.finished = true;
    const result = this.sim.result();
    const wake = () => {
      this.onResult?.(result);
      this.scene.wake('UI');
      this.scene.wake('Game');
      this.scene.stop();
    };
    if (!this.layers) return wake();
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', wake);
  }
}
