import { WIDTH, HEIGHT, FONT, COLORS } from '../config.js';
import { ROOMS, CHARACTERS } from '../data/rooms.js';
import { ITEMS } from '../data/items.js';
import { TWIST_CARD, ENDINGS, endingCard, IDLE_MUTTERS, LIGHTNING_TEXT, tideBandIndex } from '../data/text.js';
import { BEATS } from '../data/cutscenes.js';
import { epilogueLine } from '../data/board.js';
import { lightningPending, lightningStrike } from '../data/puzzles.js';
import { state } from '../systems/State.js';
import { createApi, interact, pendingTalk } from '../systems/Interact.js';
import { objectiveTarget } from '../systems/Hints.js';
import { sfx } from '../systems/Sfx.js';

const listItems = (items) => {
  const names = items.map((i) => `the ${ITEMS[i].name.toLowerCase()}`);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
};

const PLATE_DOTS = [0xf4f1e6, 0x3f9a4a, 0xc0392b, 0xe0b52c, 0x2f6fb5];
const IDLE_MS = 25_000;
const RAIN_DROPS = 70;
// Lightning: while the window writing is unseen it strikes every 20-30 s; from tide 4 it also rumbles now and then.
const STRIKE_REVEAL_MS = [20_000, 30_000];
const STRIKE_FIRST_MS = 9_000;
const STRIKE_AMBIENT_MS = [35_000, 55_000];
const REVEAL_MS = 3000;
// Walking: feet slide at WALK_SPEED px/s while the frames cycle; walk frames face right. The idle
// pose faces the viewer, so it can't be the passing frame between two side-on strides.
const WALK_SPEED = 280;
const HOLD_WALK_BOOST = 1.5;
const WALK_FPS = 5;
const WALK_CYCLE = ['walk_a', 'walk_b'];
const BOB_PX = 5;
const ARRIVE_PX = 3;
// Hotspots whose centre is below this line are examined crouching.
const LOW_HOTSPOT_Y = 430;
const POSE_MS = { act: 700, crouch: 950 };
// A crouch is drawn at its own size, so it is fitted to this fraction of the standing height.
const CROUCH_H = 0.68;
const BEAT_DELAY_MS = 1300;

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.busy = false;
    this.playing = false;
    this.layoutMode = false;
    this.layoutAllowed = ['localhost', '127.0.0.1'].includes(location.hostname) || location.search.includes('debug');
    this.zones = [];
    this.layoutLabels = [];
    // Where each character stands in their room; presentation only, kept across swaps.
    this.pos = Object.fromEntries(Object.entries(CHARACTERS).map(([who, c]) => [who, ROOMS[c.room].char.x]));
    this.facing = { mara: 1, tobin: -1 };
    this.walk = null;
    this.moving = false;
    this.walkClock = 0;
    this.pose = 'idle';
    this.revealOn = false;
    this.arrowTarget = null;

    this.bg = this.add.image(0, 0, this.roomKey()).setOrigin(0);
    this.windowView = this.add.image(0, 0, 'lamp_after').setOrigin(0).setVisible(false);
    this.dim = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x1a0c02, 0.42).setOrigin(0).setVisible(false);
    this.water = this.add.graphics();
    this.plate = this.add.container(0, 0);
    this.rheostat = this.add.image(0, 0, 'rheostat').setVisible(false);
    this.flash = this.add.graphics().setAlpha(0);
    this.rain = this.add.graphics();
    this.drops = Array.from({ length: RAIN_DROPS }, () => this.newDrop(true));
    this.flicker = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x05070a, 0).setOrigin(0);
    this.hatchGlow = this.add.graphics();
    this.holdGlow = this.add.graphics();
    this.character = this.add.image(0, 0, state.active).setOrigin(0.5, 1);
    this.legs = this.add.image(0, 0, state.active).setOrigin(0.5, 1).setTint(0x4a7d8f).setAlpha(0.22).setVisible(false);
    this.ripple = this.add.graphics().setVisible(false);
    this.rippleRing = this.add.graphics().setVisible(false);
    this.revealLayer = this.add.container(0, 0).setAlpha(0);
    this.hoverGfx = this.add.graphics();
    this.hoverLabel = this.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '20px',
        color: COLORS.paperCss,
        backgroundColor: 'rgba(7,11,16,0.8)',
        padding: { x: 10, y: 5 },
      })
      .setVisible(false);
    this.lightning = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0xeef4ff, 0).setOrigin(0).setDepth(20);
    this.reveal = this.add
      .text(0, 0, LIGHTNING_TEXT.reveal, { fontFamily: FONT, fontSize: '30px', fontStyle: 'italic bold', color: '#e8f2f6', align: 'center', lineSpacing: 10 })
      .setOrigin(0.5)
      .setAngle(-7)
      .setAlpha(0)
      .setDepth(21);
    this.layoutGfx = this.add.graphics();
    this.layoutText = this.add
      .text(12, 78, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#7fffd4',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: { x: 6, y: 4 },
      })
      .setVisible(false);

    this.api = createApi(state, this.view());
    this.renderRoom();

    this.scene.launch('UI');
    this.ui = this.scene.get('UI');

    const kb = this.input.keyboard;
    kb.addCapture('TAB,SPACE');
    kb.on('keydown-TAB', () => this.swap());
    kb.on('keydown-L', () => this.toggleLayoutMode());
    this.keys = kb.addKeys({ a: 'A', d: 'D', left: 'LEFT', right: 'RIGHT' });
    for (const k of ['SPACE', 'SHIFT']) {
      kb.on(`keydown-${k}`, () => this.showReveal(true));
      kb.on(`keyup-${k}`, () => this.showReveal(false));
    }
    this.input.on('pointerdown', (p, over) => {
      if (over.length || p.rightButtonDown() || !this.playing || state.modal || this.busy || this.layoutMode) return;
      if (!this.canWalk()) return;
      this.walkTo(p.x);
    });
    this.events.on('wake', this.onWake, this);
    state.on('request-swap', this.swap, this);
    state.on('flag', this.onFlag, this);
    state.on('tide', this.onTide, this);
    state.on('flash', this.flashWindow, this);
    state.on('hold', this.onHold, this);
    state.on('muffled', (text) => this.time.delayedCall(700, () => this.ui.say(text)), this);
    const onInput = () => state.noteInput();
    window.addEventListener('pointerdown', onInput);
    window.addEventListener('keydown', onInput);
    this.events.once('shutdown', () => {
      state.offContext(this);
      this.events.off('wake', this.onWake, this);
      window.removeEventListener('pointerdown', onInput);
      window.removeEventListener('keydown', onInput);
    });
    this.strikeClock = STRIKE_FIRST_MS;
    this.lastMutter = null;
    state.noteInput();
    sfx.setStorm(state.tide / 6);
    this.setupLayoutTool();

    this.cameras.main.fadeIn(500);
    this.time.delayedCall(600, () => {
      this.playing = true;
      const begin = () => {
        this.api.toast('look', 'look');
        this.introduceRoom();
      };
      if (state.seen.has('howto')) begin();
      else this.ui.howTo(begin);
    });
  }

  update(time, delta) {
    if (this.playing && !this.busy && !state.modal && !state.has('final_phase')) state.tick(delta);
    if (this.playing && !state.modal) {
      const expired = state.tickHold(delta);
      if (expired) this.api.holdExpired(expired);
    }
    if (!this.playing) return;
    if (this.revealOn && (state.modal || this.busy)) this.showReveal(false);
    this.updateWalk(delta);
    this.updateAtmosphere(time, delta);
    this.updateLightning(delta);
    this.updateIdle();
  }

  // ---------- walking ----------

  /** Automation (tools/playthrough.browser.js, webdriver) teleports instead of walking. */
  fastWalk() {
    return window.__fastWalk ?? navigator.webdriver === true;
  }

  /** The character holding something in place (the rheostat) can't walk away from it. */
  canWalk() {
    return !state.modal && !this.busy && !this.layoutMode && state.holding?.by !== state.active;
  }

  floor() {
    return ROOMS[state.room].floor;
  }

  get charX() {
    return this.pos[state.active];
  }

  /** Walks to x (clamped to the floor), then runs `onArrive` facing `faceX`. A new call retargets. */
  walkTo(x, onArrive = null, faceX = null) {
    const { minX, maxX } = this.floor();
    const target = Phaser.Math.Clamp(Math.round(x), minX, maxX);
    if (this.fastWalk() || Math.abs(target - this.charX) <= ARRIVE_PX) {
      this.pos[state.active] = target;
      this.walk = null;
      this.arrive(onArrive, faceX);
      return;
    }
    this.walk = { x: target, onArrive, faceX };
  }

  /** Stops on the spot, turns toward `faceX` and runs the pending action. */
  arrive(onArrive, faceX) {
    if (faceX !== null && faceX !== undefined && Math.abs(faceX - this.charX) > 4) this.facing[state.active] = Math.sign(faceX - this.charX);
    this.stopWalking();
    onArrive?.();
  }

  stopWalking() {
    const wasMoving = this.moving;
    this.moving = false;
    this.walkClock = 0;
    if (wasMoving || this.character.x !== this.charX) this.placeCharacter(this.pose === 'walk_a' || this.pose === 'walk_b' ? 'idle' : this.pose);
  }

  cancelWalk() {
    this.walk = null;
    if (this.moving) this.stopWalking();
  }

  updateWalk(delta) {
    const k = this.keys;
    const keyDir = this.canWalk() ? (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0) : 0;
    if (keyDir) this.walk = null;
    const walking = keyDir || (this.walk && !state.modal && !this.busy);
    if (!walking) {
      if (this.moving) this.stopWalking();
      return;
    }
    const { minX, maxX, y } = this.floor();
    const x = this.charX;
    const target = keyDir ? (keyDir > 0 ? maxX : minX) : this.walk.x;
    const dx = target - x;
    const step = (WALK_SPEED * (state.holding ? HOLD_WALK_BOOST : 1) * delta) / 1000;
    if (Math.abs(dx) <= Math.max(step, ARRIVE_PX)) {
      this.pos[state.active] = target;
      if (keyDir) {
        // Pressed against the end of the floor: stand, facing that way.
        this.facing[state.active] = keyDir;
        if (this.moving) this.stopWalking();
        return;
      }
      const { onArrive, faceX } = this.walk;
      this.walk = null;
      this.arrive(onArrive, faceX);
      return;
    }
    const dir = Math.sign(dx);
    this.pos[state.active] = x + dir * step;
    this.facing[state.active] = dir;
    state.noteInput();
    this.actTimer?.remove();
    if (!this.moving) {
      this.moving = true;
      this.tweens.killTweensOf(this.character);
      this.walkClock = 0;
    }
    this.walkClock += delta;
    const t = (this.walkClock * WALK_FPS) / 1000;
    const pose = WALK_CYCLE[Math.floor(t) % WALK_CYCLE.length];
    if (pose !== this.pose || this.character.flipX !== this.flipFor(pose)) this.setPose(pose);
    // One bob per stride: lowest as each frame lands, highest mid-stride.
    this.character.setPosition(this.pos[state.active], y - BOB_PX * Math.sin((t % 1) * Math.PI));
    if (this.wadeDepth > 0) this.applyWading(this.wadeDepth);
  }

  /** Where the character stops to use a hotspot: its `stand`, or beside it on the near side. */
  standX(hs) {
    if (hs.stand !== undefined) return hs.stand;
    const { minX, maxX } = this.floor();
    const cx = hs.x + hs.w / 2;
    const off = Phaser.Math.Clamp(hs.w / 2 + 30, 60, 200);
    const sides = [cx - off, cx + off].filter((x) => x >= minX && x <= maxX);
    if (!sides.length) return Phaser.Math.Clamp(cx, minX, maxX);
    return sides.reduce((a, b) => (Math.abs(b - this.charX) < Math.abs(a - this.charX) ? b : a));
  }

  // ---------- reactive world: idle mutters, lightning, tide atmosphere ----------

  updateIdle() {
    if (this.busy || state.modal || state.holding || this.ui.showing || state.has('final_phase')) return;
    if (Date.now() - state.lastInputAt < IDLE_MS) return;
    const pool = IDLE_MUTTERS[state.active][tideBandIndex(state.tide)].filter((l) => l !== this.lastMutter);
    this.lastMutter = pool[Math.floor(Math.random() * pool.length)];
    state.noteInput();
    this.ui.say(`"${this.lastMutter}"`);
  }

  updateLightning(delta) {
    const reveal = lightningPending(this.api);
    if (state.has('final_phase') || (!reveal && state.tide < 4)) return;
    this.strikeClock -= delta;
    if (this.strikeClock > 0) return;
    if (this.busy || state.modal || state.holding) {
      this.strikeClock = 1500;
      return;
    }
    const [lo, hi] = reveal ? STRIKE_REVEAL_MS : STRIKE_AMBIENT_MS;
    this.strikeClock = lo + Math.random() * (hi - lo);
    this.strike(reveal);
  }

  /** A lightning flash and thunder. While the window writing is unseen, it shows on Mara's glass. */
  strike(reveal = lightningPending(this.api)) {
    const lamp = state.room === 'lamp';
    this.tweens.killTweensOf(this.lightning);
    this.tweens.chain({
      targets: this.lightning,
      tweens: [
        { alpha: lamp ? 0.7 : 0.35, duration: 40 },
        { alpha: 0, duration: 140 },
        { alpha: lamp ? 0.45 : 0.2, duration: 40, delay: 90 },
        { alpha: 0, duration: 420 },
      ],
    });
    this.time.delayedCall(450 + Math.random() * 500, () => sfx.play('thunder'));
    if (!reveal) return;
    if (lamp) {
      const w = ROOMS.lamp.window;
      this.tweens.killTweensOf(this.reveal);
      this.reveal.setPosition(w.x + w.w / 2, w.y + w.h * 0.42).setAlpha(0.95);
      this.tweens.add({ targets: this.reveal, alpha: 0, delay: REVEAL_MS - 900, duration: 900, ease: 'Sine.In' });
    }
    this.time.delayedCall(600, () => {
      const result = lightningStrike(this.api);
      if (result === 'missed' && state.markSeen('lightning_missed')) this.ui.say(LIGHTNING_TEXT.missedCellar);
    });
  }

  newDrop(anywhere = false) {
    const w = ROOMS.lamp.window;
    return { x: w.x + Math.random() * (w.w + 60), y: anywhere ? w.y + Math.random() * w.h : w.y - 20, len: 10 + Math.random() * 14, speed: 600 + Math.random() * 500 };
  }

  /** Rain on the lamp-room glass, a guttering light and a slow sway, all growing with the tide. */
  updateAtmosphere(time, delta) {
    const level = state.tide / 6;
    const lamp = state.room === 'lamp';
    const cam = this.cameras.main;
    const sway = (lamp ? 2.6 : 1.2) * level;
    cam.setScroll(Math.sin(time / 1900) * sway, Math.sin(time / 1300) * sway * 0.5);

    if (!this.flickerAt || time > this.flickerAt) {
      const lit = state.has('lamp_lit');
      const strength = (lamp ? 0.05 : 0.035) + level * (lamp && lit && !state.has('lamp_full') ? 0.2 : 0.12);
      this.flicker.setAlpha(Math.random() < 0.25 + level * 0.35 ? Math.random() * strength : 0);
      this.flickerAt = time + 60 + Math.random() * (260 - level * 160);
    }

    this.rain.clear();
    if (!lamp) return;
    const w = ROOMS.lamp.window;
    const dt = delta / 1000;
    const shown = Math.round(RAIN_DROPS * (0.3 + level * 0.7));
    this.rain.lineStyle(1, 0xcfe3ee, 0.18 + level * 0.3);
    this.rain.beginPath();
    for (let i = 0; i < shown; i++) {
      const d = this.drops[i];
      d.y += d.speed * dt;
      d.x -= d.speed * (0.15 + level * 0.25) * dt;
      if (d.y - d.len > w.y + w.h || d.x < w.x - 10) Object.assign(d, this.newDrop());
      const x0 = Phaser.Math.Clamp(d.x, w.x, w.x + w.w);
      const x1 = Phaser.Math.Clamp(d.x + d.len * 0.3, w.x, w.x + w.w);
      const y0 = Phaser.Math.Clamp(d.y, w.y, w.y + w.h);
      const y1 = Phaser.Math.Clamp(d.y - d.len, w.y, w.y + w.h);
      if (y0 === y1) continue;
      this.rain.moveTo(x0, y0);
      this.rain.lineTo(x1, y1);
    }
    this.rain.strokePath();
  }

  // ---------- presentation hooks used by puzzle handlers ----------

  view() {
    return {
      say: (text) => this.ui.say(text),
      toast: (text) => this.ui.toast(text),
      sfx: (name) => sfx.play(name),
      pickup: (item, hs) => {
        const x = hs ? hs.x + hs.w / 2 : WIDTH / 2;
        const y = hs ? hs.y + hs.h / 2 : HEIGHT / 2;
        this.ui.pickup(item, x, y);
      },
      sent: (item, hs) => this.animateSend(item, hs),
      roomChanged: (room) => this.onRoomChanged(room),
      refresh: () => this.renderOverlays(),
      swapTo: (who) => this.swapTo(who),
      keypad: (opts) => this.ui.keypad(opts),
      choice: (opts) => this.ui.choice(opts),
      lens: (opts) => this.ui.lens(opts),
      valves: (opts) => this.ui.valves(opts),
      morse: (opts) => this.ui.morse(opts),
      talk: (lines, onDone, onChoose) => {
        this.talkPose();
        this.ui.talk(
          lines,
          () => {
            if (this.pose === 'talk' && !this.moving) this.placeCharacter('idle');
            onDone?.();
          },
          onChoose,
        );
      },
      closeup: (id, then) => this.ui.closeup(id, then),
      cutscene: (id, then) => {
        this.busy = true;
        this.time.delayedCall(BEAT_DELAY_MS, () => {
          this.busy = false;
          this.playBeat(id, then);
        });
      },
      ending: (id, onDone) => this.showEnding(id, onDone),
      end: (id) => this.endGame(id),
    };
  }

  /** Speaking into the tube: face the hatch in the talk pose until the conversation ends. */
  talkPose() {
    const hatch = ROOMS[state.room].hotspots.find((h) => h.handler === 'hatch');
    const dx = hatch.x + hatch.w / 2 - this.charX;
    if (Math.abs(dx) > 4) this.facing[state.active] = Math.sign(dx);
    this.strikePose('talk');
  }

  // ---------- room rendering ----------

  roomKey(room = state.room) {
    if (room === 'lamp' && state.roomStates.lamp === 'before' && state.tide <= 1 && this.textures.exists('lamp_lowtide')) {
      return 'lamp_lowtide';
    }
    return `${room}_${state.roomStates[room]}`;
  }

  renderRoom() {
    this.bg.setTexture(this.roomKey()).setDisplaySize(WIDTH, HEIGHT);
    this.wadeTween?.remove();
    this.wadeTween = null;
    this.walk = null;
    this.moving = false;
    this.actTimer?.remove();
    this.holdingPose = state.holding?.by === state.active;
    this.placeCharacter(this.holdingPose ? 'act' : 'idle');
    this.clearArrow();
    this.buildHotspots();
    this.renderOverlays();
    this.drawLayout();
  }

  /** Redraws everything that depends on flags or the tide: window, dim lamp, water, plate, glow. */
  renderOverlays() {
    const room = state.room;
    const lamp = room === 'lamp';
    const cellar = room === 'cellar';

    const storm = lamp && state.roomStates.lamp === 'before' && state.tide >= 4;
    if (storm) {
      const w = ROOMS.lamp.window;
      const src = this.textures.get('lamp_after').getSourceImage();
      const k = src.width / WIDTH;
      this.windowView.setTexture('lamp_after').setDisplaySize(WIDTH, HEIGHT).setCrop(w.x * k, w.y * k, w.w * k, w.h * k);
    }
    this.windowView.setVisible(storm);

    const dim = lamp && state.has('lamp_lit') && !state.has('lamp_full') && !state.holding;
    this.dim.setVisible(dim);
    if (dim) this.bg.setTint(0xffb27a);
    else this.bg.clearTint();

    this.drawWater(cellar && !state.has('valves_set'));
    this.drawPlate(cellar);

    const rh = ROOMS.cellar.hotspots.find((h) => h.id === 'rheostat');
    const showRh = cellar && rh.visibleIf(state);
    if (showRh) {
      this.rheostat.setPosition(rh.x + rh.w / 2, rh.y + rh.h / 2).setVisible(true);
      this.rheostat.setScale((rh.h - 12) / this.rheostat.height).setAngle(state.has('lamp_full') ? 0 : -6);
    } else {
      this.rheostat.setVisible(false);
    }

    this.drawHatchGlow();
    this.drawHoldGlow();
  }

  drawHoldGlow() {
    this.tweens.killTweensOf(this.holdGlow);
    this.holdGlow.clear().setAlpha(1);
    const hold = state.holding;
    if (!hold) return;
    const target = state.room === 'cellar' ? 'rheostat' : state.room === 'lamp' ? 'lamp' : null;
    const hs = ROOMS[state.room].hotspots.find((h) => h.id === target);
    if (!hs) return;
    this.holdGlow.lineStyle(4, 0xfff1c4, 1).strokeRoundedRect(hs.x, hs.y, hs.w, hs.h, 14);
    this.tweens.add({ targets: this.holdGlow, alpha: 0.2, duration: 320, yoyo: true, repeat: -1 });
  }

  drawWater(show) {
    this.water.clear();
    if (!show || state.tide <= 0) return;
    const top = 636 - state.tide * 15;
    this.water.fillStyle(0x2c6d86, 0.12 + state.tide * 0.025).fillRect(0, top, WIDTH, HEIGHT - top);
    this.water.lineStyle(2, 0xbfe3ea, 0.35).beginPath();
    for (let x = 0; x <= WIDTH; x += 16) {
      const y = top + Math.sin(x / 37) * 2.5;
      if (x === 0) this.water.moveTo(x, y);
      else this.water.lineTo(x, y);
    }
    this.water.strokePath();
  }

  drawPlate(show) {
    this.plate.removeAll(true);
    if (!show) return;
    const { x, y, w, h } = ROOMS.cellar.plate;
    const cx = x + w / 2;
    const frame = this.add.graphics();
    frame.fillStyle(0xd8e4e6, 0.16).fillRect(x, y, w, h);
    frame.lineStyle(5, 0x2a2d2e, 0.95).strokeRect(x, y, w, h);
    frame.lineStyle(1, 0xbfd3d6, 0.35).strokeRect(x + 4, y + 4, w - 8, h - 8);
    this.plate.add(frame);
    if (!state.has('lantern_set')) return;

    const glow = this.add.graphics();
    const full = state.has('final_phase');
    glow.fillStyle(0xffd59a, full ? 0.4 : 0.22).fillEllipse(cx, y + h / 2, w - 6, h - 6);
    this.plate.add(glow);

    if (!state.has('lens_wiped')) {
      const smear = this.add.graphics();
      [[-18, -10, 34], [14, 6, 40], [-4, 18, 28]].forEach(([dx, dy, r]) => smear.fillStyle(0xfff0c8, 0.16).fillCircle(cx + dx, y + h / 2 + dy, r));
      this.plate.add(smear);
      return;
    }
    const dotsY = full ? y + h - 30 : y + h / 2;
    if (!state.has('lens_set')) {
      const off = this.add.graphics();
      PLATE_DOTS.slice(0, 3).forEach((c, i) => off.fillStyle(c, 0.35).fillCircle(x + w - 22 + i * 16, dotsY, 12));
      this.plate.add(off);
      return;
    }
    const dots = this.add.graphics();
    PLATE_DOTS.forEach((c, i) => {
      const dx = x + 16 + i * 19;
      dots.fillStyle(c, 0.25).fillCircle(dx, dotsY, 11);
      dots.fillStyle(c, 0.95).fillCircle(dx, dotsY, 7);
    });
    this.plate.add(dots);
    const one = this.add
      .text(x + w - 12, dotsY, '1', { fontFamily: FONT, fontSize: '22px', color: '#fff6dc', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setFlipX(true);
    this.plate.add(one);

    if (full) {
      // The rim's soot writing, thrown down the well mirrored.
      const soot = this.add
        .text(cx + 12, y + 12, 'IF I FALL\nIT WAS —', {
          fontFamily: FONT,
          fontSize: '17px',
          color: '#1c1610',
          fontStyle: 'bold',
          align: 'left',
          lineSpacing: 2,
        })
        .setOrigin(0.5, 0)
        .setFlipX(true)
        .setAlpha(0.9);
      const streak = this.add.graphics();
      // Mirrored, so "after the bar" is to its left.
      streak.fillStyle(0xfff3d6, 0.6).fillRoundedRect(x + 5, y + 36, 22, 18, 7);
      this.plate.add([soot, streak]);
    }
  }

  drawHatchGlow() {
    this.tweens.killTweensOf(this.hatchGlow);
    this.hatchGlow.clear().setAlpha(1);
    const calling = state.has('final_phase') ? state.has('final_plate') && !state.has('final_seen') : !!pendingTalk(this.api);
    if (!calling) return;
    const hs = ROOMS[state.room].hotspots.find((h) => h.handler === 'hatch');
    this.hatchGlow.fillStyle(COLORS.amber, 0.16).fillRoundedRect(hs.x, hs.y, hs.w, hs.h, 12);
    this.hatchGlow.lineStyle(3, COLORS.amber, 0.95).strokeRoundedRect(hs.x, hs.y, hs.w, hs.h, 12);
    this.tweens.add({ targets: this.hatchGlow, alpha: 0.25, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  onFlag() {
    // Modals set flags outside a hotspot click, so conditional hotspots are rebuilt here too.
    if (ROOMS[state.room].hotspots.some((h) => h.visibleIf && h.visibleIf(state) !== this.zones.some((z) => z.hotspot === h))) {
      this.buildHotspots();
    }
    this.renderOverlays();
    if (this.arrowTarget && objectiveTarget(state) !== this.arrowTarget) this.clearArrow();
    if (pendingTalk(this.api) && !state.has('final_phase')) this.api.toast('tube', 'tube');
  }

  onTide() {
    sfx.setStorm(state.tide / 6);
    if (state.room === 'lamp' && state.roomStates.lamp === 'before') this.bg.setTexture(this.roomKey()).setDisplaySize(WIDTH, HEIGHT);
    this.renderOverlays();
    if (state.room === 'cellar' && !this.wadeTween) this.riseWater(900, this.wadeDepth);
    this.api.toast('tide', 'tide');
  }

  /** Flashes the window glass, for shutter presses and the cutter's reply. */
  flashWindow(ms = 120, color = 0xfff1c4) {
    if (state.room !== 'lamp') return;
    const w = ROOMS.lamp.window;
    this.tweens.killTweensOf(this.flash);
    this.flash.clear().fillStyle(color, 0.85).fillRect(w.x, w.y, w.w, w.h).setAlpha(1);
    this.tweens.add({ targets: this.flash, alpha: 0, delay: ms, duration: 160 });
  }

  /** Puts the active character on the floor at their stored x in `pose`, breathing. */
  placeCharacter(pose = 'idle') {
    this.tweens.killTweensOf(this.character);
    this.character.setPosition(this.charX, this.floor().y);
    this.setPose(pose);
    const s = this.character.scaleY;
    this.tweens.add({ targets: this.character, scaleY: s * 1.012, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  /** Texture for a pose, or the idle pose when that art is missing (unless idle is a placeholder too). */
  poseKey(pose, who = state.active) {
    if (pose === 'idle') return who;
    const key = `${who}_${pose}`;
    const missing = this.registry.get('missing');
    if (!this.textures.exists(key) || (missing.has(key) && !missing.has(who))) return who;
    return key;
  }

  /**
   * Walk and talk frames are scaled to the idle pose's on-screen height, since the cutouts
   * trim differently; a crouch to CROUCH_H of it. Act art shares the idle framing and scale.
   */
  poseScale(key, pose) {
    const { h } = ROOMS[state.room].char;
    const idle = h / this.textures.get(state.active).getSourceImage().height;
    if (key === state.active || pose === 'act') return idle;
    return (h * (pose === 'crouch' ? CROUCH_H : 1)) / this.textures.get(key).getSourceImage().height;
  }

  /** Whether a pose's art must be mirrored to face the current direction. Idle is never flipped. */
  flipFor(pose) {
    if (this.poseKey(pose) === state.active) return false;
    const faces = CHARACTERS[state.active].faces[pose.startsWith('walk') ? 'walk' : pose] ?? 0;
    return faces !== 0 && faces !== this.facing[state.active];
  }

  setPose(pose) {
    const key = this.poseKey(pose);
    this.pose = pose;
    this.character.setTexture(key).setScale(this.poseScale(key, pose)).setFlipX(this.flipFor(pose));
    this.applyWading(this.wadeTween ? this.wadeDepth : this.waterDepth());
  }

  /** Holds a pose for `ms` (or until changed), then returns to idle. */
  strikePose(pose, ms) {
    const who = state.active;
    this.actTimer?.remove();
    this.placeCharacter(pose);
    if (!ms) return;
    this.actTimer = this.time.delayedCall(ms, () => {
      if (state.active === who && !this.moving && state.holding?.by !== who) this.placeCharacter('idle');
    });
  }

  /** Crouch for low hotspots, reach for the rest; the holder keeps both hands on the rheostat. */
  interactPose(hs) {
    const pose = hs.y + hs.h / 2 > LOW_HOTSPOT_Y ? 'crouch' : 'act';
    this.strikePose(pose, POSE_MS[pose]);
  }

  onHold() {
    this.renderOverlays();
    if (!this.playing || this.moving) return;
    if (state.holding?.by === state.active) {
      this.strikePose('act');
      this.holdingPose = true;
    } else if (this.holdingPose) {
      this.holdingPose = false;
      this.placeCharacter('idle');
    }
  }

  waterDepth(room = state.room) {
    const r = ROOMS[room];
    const roomState = state.roomStates[room];
    if (r.wade?.[roomState] !== undefined) return r.wade[roomState];
    return (r.tideWade ?? 0) * state.tide;
  }

  /** Raises the water from `from` (default the floor) to the room's depth over `duration` ms. */
  riseWater(duration, from = 0) {
    this.wadeTween?.remove();
    this.wadeTween = this.tweens.addCounter({
      from,
      to: this.waterDepth(),
      duration,
      ease: 'Sine.Out',
      onUpdate: (t) => this.applyWading(t.getValue()),
      onComplete: () => (this.wadeTween = null),
    });
  }

  applyWading(depth) {
    this.wadeDepth = depth;
    const c = this.character;
    if (depth <= 0) {
      c.setCrop();
      this.tweens.killTweensOf([this.ripple, this.rippleRing]);
      this.legs.setVisible(false);
      this.ripple.setVisible(false);
      this.rippleRing.setVisible(false);
      return;
    }
    const { h } = ROOMS[state.room].char;
    const { y } = this.floor();
    const x = c.x;
    const scale = c.scaleX;
    const { width: fw, height: fh } = c.frame;
    // The waterline stays on the floor's frame of reference while the figure bobs and changes pose.
    const waterY = y - h * depth;
    const cut = Phaser.Math.Clamp(fh - (c.y - waterY) / scale, 0, fh);
    c.setCrop(0, 0, fw, cut);
    this.legs.setTexture(c.texture.key).setPosition(x, c.y).setScale(scale).setFlipX(c.flipX).setCrop(0, cut, fw, fh - cut).setVisible(true);

    if (this.ripple.visible) {
      this.ripple.setPosition(x, waterY);
      this.rippleRing.setPosition(x, waterY);
      return;
    }
    // Sized from the idle pose so the ripple doesn't jump when another pose swaps in.
    const idleScale = h / this.textures.get(state.active).getSourceImage().height;
    const rw = Math.min(this.textures.get(state.active).getSourceImage().width * idleScale * 0.85, 190);
    this.ripple
      .clear()
      .fillStyle(0xbfe3ea, 0.22)
      .fillEllipse(0, 0, rw, 18)
      .lineStyle(2, 0xdff4f7, 0.6)
      .strokeEllipse(0, 0, rw, 18)
      .lineStyle(1, 0xffffff, 0.35)
      .strokeEllipse(0, -1, rw * 0.7, 10)
      .setPosition(x, waterY)
      .setScale(1)
      .setAlpha(1)
      .setVisible(true);
    this.rippleRing.clear().lineStyle(2, 0xdff4f7, 0.6).strokeEllipse(0, 0, rw, 18).setPosition(x, waterY).setVisible(true);
    this.tweens.add({ targets: this.ripple, scaleX: 1.06, alpha: 0.7, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({
      targets: this.rippleRing,
      scale: { from: 1, to: 1.6 },
      alpha: { from: 0.8, to: 0 },
      duration: 2400,
      repeat: -1,
      ease: 'Sine.Out',
    });
  }

  buildHotspots() {
    this.zones.forEach((z) => z.destroy());
    this.zones = [];
    this.clearHover();
    for (const hs of ROOMS[state.room].hotspots) {
      if (hs.visibleIf && !hs.visibleIf(state)) continue;
      const zone = this.add.zone(hs.x, hs.y, hs.w, hs.h).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.hotspot = hs;
      zone.on('pointerover', () => {
        this.hoverTarget = hs;
        this.hover(hs);
      });
      zone.on('pointerout', () => {
        this.hoverTarget = null;
        this.clearHover();
      });
      zone.on('pointerdown', (pointer) => {
        if (!pointer.rightButtonDown()) this.click(hs);
      });
      this.zones.push(zone);
      if (hs.visibleIf && state.markSeen(`reveal_${hs.id}`)) this.revealPulse(hs);
    }
  }

  revealPulse(hs) {
    const ring = this.add.graphics();
    ring.lineStyle(4, COLORS.amber, 1).strokeRoundedRect(hs.x, hs.y, hs.w, hs.h, 12);
    this.tweens.add({ targets: ring, alpha: 0, duration: 700, yoyo: true, repeat: 2, onComplete: () => ring.destroy() });
  }

  hover(hs) {
    if (state.modal || this.busy || this.layoutMode) return;
    this.hoverGfx.clear();
    this.hoverGfx.fillStyle(COLORS.amber, 0.08).fillRoundedRect(hs.x, hs.y, hs.w, hs.h, 12);
    this.hoverGfx.lineStyle(3, COLORS.amber, 0.9).strokeRoundedRect(hs.x, hs.y, hs.w, hs.h, 12);
    this.tweens.killTweensOf(this.hoverGfx);
    this.hoverGfx.setAlpha(1);
    this.tweens.add({ targets: this.hoverGfx, alpha: 0.55, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    const label = state.selected ? `Use ${ITEMS[state.selected].name.toLowerCase()} on ${hs.label.toLowerCase()}` : hs.label;
    const above = hs.y > 110;
    this.hoverLabel
      .setText(label)
      .setOrigin(0.5, above ? 1 : 0)
      .setPosition(Phaser.Math.Clamp(hs.x + hs.w / 2, 140, WIDTH - 140), above ? hs.y - 8 : hs.y + hs.h + 8)
      .setVisible(true);
  }

  clearHover() {
    this.tweens.killTweensOf(this.hoverGfx);
    this.hoverGfx.clear();
    this.hoverLabel.setVisible(false);
  }

  /** Walks over to a hotspot, then uses it (with the item selected at click time, if any). */
  click(hs) {
    if (state.modal || this.busy || this.layoutMode) return;
    sfx.play('click');
    if (this.arrowTarget === hs.id) this.clearArrow();
    const item = state.selected;
    const use = () => this.use(hs, item);
    if (!this.canWalk()) return use();
    this.walkTo(this.standX(hs), use, hs.x + hs.w / 2);
  }

  use(hs, item) {
    if (state.modal || this.busy || !this.zones.some((z) => z.hotspot === hs)) return;
    if (item && !state.holds(item)) item = null;
    this.ui.clearMessages();
    this.interactPose(hs);
    interact(this.api, hs, item);
    if (item) state.select(null);
    if (this.busy) return;
    this.buildHotspots();
    this.renderOverlays();
    if (!state.modal && this.zones.some((z) => z.hotspot === hs) && this.hoverTarget === hs) this.hover(hs);
  }

  // ---------- helping new players: reveal, first-visit shimmer, the objective arrow ----------

  /** Hold Space or Shift: outline and label everything clickable in the room. */
  showReveal(on) {
    if (on && (!this.playing || state.modal || this.busy || this.layoutMode)) return;
    if (on === this.revealOn) return;
    this.revealOn = on;
    this.tweens.killTweensOf(this.revealLayer);
    if (!on) {
      this.tweens.add({ targets: this.revealLayer, alpha: 0, duration: 300 });
      return;
    }
    state.markSeen('space_reveal');
    this.revealLayer.removeAll(true);
    const g = this.add.graphics();
    this.revealLayer.add(g);
    for (const { hotspot: hs } of this.zones) {
      g.fillStyle(0xfff1c4, 0.08).fillRoundedRect(hs.x, hs.y, hs.w, hs.h, 12);
      g.lineStyle(2, 0xfff1c4, 0.85).strokeRoundedRect(hs.x, hs.y, hs.w, hs.h, 12);
      const label = this.add
        .text(Phaser.Math.Clamp(hs.x + hs.w / 2, 90, WIDTH - 90), Math.max(hs.y + hs.h / 2, 92), hs.label, {
          fontFamily: FONT,
          fontSize: '17px',
          color: COLORS.paperCss,
          backgroundColor: 'rgba(7,11,16,0.78)',
          padding: { x: 8, y: 3 },
        })
        .setOrigin(0.5);
      this.revealLayer.add(label);
    }
    this.children.bringToTop(this.revealLayer);
    this.tweens.add({ targets: this.revealLayer, alpha: 1, duration: 150 });
  }

  /** First visit to a room: hotspots shimmer once, and an arrow points at the objective's hotspot. */
  introduceRoom() {
    if (!this.playing || !state.markSeen(`visit_${state.room}`)) return;
    this.zones.forEach(({ hotspot: hs }, i) => {
      const g = this.add.graphics().setAlpha(0);
      g.fillStyle(0xfff1c4, 0.1).fillRoundedRect(hs.x, hs.y, hs.w, hs.h, 12);
      g.lineStyle(2, 0xfff1c4, 0.9).strokeRoundedRect(hs.x, hs.y, hs.w, hs.h, 12);
      this.tweens.add({ targets: g, alpha: 1, duration: 280, delay: 250 + i * 140, hold: 120, yoyo: true, onComplete: () => g.destroy() });
    });
    const target = objectiveTarget(state);
    if (target) this.time.delayedCall(450 + this.zones.length * 140, () => this.pointArrow(target));
  }

  pointArrow(id) {
    this.clearArrow();
    const hs = this.zones.find((z) => z.hotspot.id === id)?.hotspot;
    if (!hs || state.has('final_phase')) return;
    const below = hs.y < 110;
    const g = this.add.graphics();
    g.fillStyle(COLORS.amber, 1).fillTriangle(-15, -26, 15, -26, 0, 0);
    g.lineStyle(2, 0x10161b, 0.85).strokeTriangle(-15, -26, 15, -26, 0, 0);
    g.setPosition(hs.x + hs.w / 2, below ? hs.y + hs.h + 8 : hs.y - 6).setAngle(below ? 180 : 0);
    this.tweens.add({ targets: g, y: g.y + (below ? 12 : -12), duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.arrow = g;
    this.arrowTarget = id;
  }

  clearArrow() {
    if (!this.arrow) return;
    this.tweens.killTweensOf(this.arrow);
    this.arrow.destroy();
    this.arrow = null;
    this.arrowTarget = null;
  }

  // ---------- cutscene beats ----------

  /** Fades out, sleeps Game and UI under a CutsceneScene beat, and carries on where it left off. */
  playBeat(id, onDone) {
    const missing = this.registry.get('missing');
    const real = (k) => k && this.textures.exists(k) && !missing.has(k);
    const shots = BEATS[id];
    if (!shots?.some((s) => real(s.image) || real(s.fallback))) return onDone?.();
    const wasBusy = this.busy;
    const wasModal = state.modal;
    this.busy = true;
    state.modal = true;
    this.cancelWalk();
    this.clearHover();
    this.showReveal(false);
    const cam = this.cameras.main;
    cam.fadeOut(450, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      this.beatDone = () => {
        this.busy = wasBusy;
        state.modal = wasModal;
        onDone?.();
      };
      this.scene.launch('Cutscene', { shots, mode: 'beat' });
      this.scene.sleep('UI');
      this.scene.sleep();
    });
  }

  onWake() {
    // Keys released while asleep never sent their keyup here.
    this.input.keyboard.resetKeys();
    state.noteInput();
    this.cameras.main.fadeIn(600);
    const done = this.beatDone;
    this.beatDone = null;
    done?.();
  }

  // ---------- swapping, sending, state changes ----------

  swap() {
    if (this.busy || state.modal) return;
    this.busy = true;
    state.markSeen('swapped');
    sfx.play('swap');
    this.cancelWalk();
    this.clearHover();
    this.showReveal(false);
    const cam = this.cameras.main;
    cam.fadeOut(220, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      const { arrived, combined, reactions } = state.swap();
      this.renderRoom();
      cam.fadeIn(260);
      this.busy = false;
      this.ui.clearMessages();
      this.ui.hideToast();
      this.announceArrivals(arrived, combined, reactions);
      this.introduceRoom();
    });
  }

  /** Switches character immediately, for scripted moments that happen under a black card. */
  swapTo(who) {
    const result = state.setActive(who);
    this.renderRoom();
    if (result) this.announceArrivals(result.arrived, result.combined, result.reactions);
  }

  announceArrivals(arrived, combined, reactions = []) {
    for (const line of reactions) this.ui.say(`"${line}"`);
    if (arrived.length) {
      sfx.play('pickup');
      this.ui.say(`${CHARACTERS[state.active].name} finds ${listItems(arrived)} in the dumbwaiter.`);
    }
    for (const combo of combined) this.ui.say(combo.text);
  }

  animateSend(item, hs) {
    if (!hs) return;
    const icon = this.add.image(hs.x + hs.w / 2, hs.y + hs.h / 2, item);
    icon.setScale(56 / Math.max(icon.width, icon.height));
    const dir = state.active === 'mara' ? 1 : -1;
    this.tweens.add({
      targets: icon,
      y: icon.y + 70 * dir,
      alpha: 0,
      scale: icon.scale * 0.5,
      duration: 450,
      ease: 'Cubic.In',
      onComplete: () => icon.destroy(),
    });
  }

  onRoomChanged(room) {
    if (room !== state.room) return;
    const next = this.add.image(0, 0, this.roomKey(room)).setOrigin(0).setDisplaySize(WIDTH, HEIGHT).setAlpha(0);
    this.children.moveAbove(next, this.bg);
    this.tweens.add({
      targets: next,
      alpha: 1,
      duration: 1400,
      ease: 'Sine.InOut',
      onComplete: () => {
        this.bg.setTexture(this.roomKey(room)).setDisplaySize(WIDTH, HEIGHT);
        next.destroy();
        this.renderOverlays();
      },
    });
    if (this.waterDepth(room) > 0) this.riseWater(1400, this.wadeDepth ?? 0);
    this.cameras.main.shake(900, 0.006);
  }

  /** Cutter's reply in the window, the layered ending card, then the twist card into the final scene. */
  showEnding(id, onDone) {
    this.busy = true;
    this.clearHover();
    const reply = ['.', '-', '.'];
    let t = 500;
    for (const sym of reply) {
      const ms = sym === '.' ? 160 : 520;
      this.time.delayedCall(t, () => this.flashWindow(ms, 0xd8f0ff));
      t += ms + 380;
    }
    const card = () => {
      sfx.play('win');
      this.ui.endingCard(endingCard(state, id), () => {
        this.ui.blackCard(TWIST_CARD, () => {
          this.busy = false;
          onDone();
        });
      });
    };
    this.time.delayedCall(t + 300, () => (ENDINGS[id]?.beat ? this.playBeat(ENDINGS[id].beat, card) : card()));
  }

  endGame(id) {
    this.busy = true;
    this.clearHover();
    this.cameras.main.fadeOut(1400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('UI');
      this.scene.start('Ending', { id, actor: state.memo.final_actor ?? state.active, epilogue: epilogueLine(state.board) });
    });
  }

  // ---------- layout tool (L on localhost or with ?debug) ----------

  toggleLayoutMode() {
    if (!this.layoutAllowed || state.modal) return;
    this.layoutMode = !this.layoutMode;
    this.layoutText.setVisible(this.layoutMode);
    this.cancelWalk();
    this.clearHover();
    this.drawLayout();
    this.updateLayoutText(this.input.activePointer);
  }

  drawLayout() {
    this.layoutGfx.clear();
    this.layoutLabels.forEach((t) => t.destroy());
    this.layoutLabels = [];
    if (!this.layoutMode) return;
    for (const hs of ROOMS[state.room].hotspots) {
      const shown = !hs.visibleIf || hs.visibleIf(state);
      this.layoutGfx.lineStyle(2, shown ? 0x7fffd4 : 0x888888, shown ? 1 : 0.6).strokeRect(hs.x, hs.y, hs.w, hs.h);
      this.layoutLabels.push(
        this.add.text(hs.x + 4, hs.y + 4, `${hs.id}\n${hs.x},${hs.y} ${hs.w}x${hs.h}`, {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: shown ? '#7fffd4' : '#aaaaaa',
          backgroundColor: 'rgba(0,0,0,0.6)',
        }),
      );
    }
    const { h } = ROOMS[state.room].char;
    const { minX, maxX, y } = this.floor();
    const x = this.charX;
    this.layoutGfx.lineStyle(2, 0xff6b6b, 1).strokeRect(x - 4, y - h, 8, h).lineBetween(x - 30, y, x + 30, y);
    this.layoutGfx.lineStyle(2, 0xffd166, 0.9).lineBetween(minX, y, maxX, y).strokeRect(minX - 3, y - 12, 6, 24).strokeRect(maxX - 3, y - 12, 6, 24);
  }

  updateLayoutText(pointer, extra = '') {
    if (!this.layoutMode) return;
    const x = Math.round(pointer.x);
    const y = Math.round(pointer.y);
    this.layoutText.setText(
      [`LAYOUT MODE (L to exit)  pointer ${x}, ${y}`, 'drag: measure a hotspot   shift-click: place character (sets the feet line)', this.lastMeasure ?? '', extra]
        .filter(Boolean)
        .join('\n'),
    );
  }

  setupLayoutTool() {
    let start = null;
    const dragGfx = this.add.graphics();
    this.input.on('pointerdown', (p) => {
      if (!this.layoutMode) return;
      if (p.event.shiftKey) {
        const { char, floor } = ROOMS[state.room];
        char.x = Math.round(p.x);
        char.y = floor.y = Math.round(p.y);
        this.pos[state.active] = Phaser.Math.Clamp(char.x, floor.minX, floor.maxX);
        this.placeCharacter('idle');
        this.drawLayout();
        this.lastMeasure = `${state.room}.char: { x: ${char.x}, y: ${char.y}, h: ${char.h} }  floor: { minX: ${floor.minX}, maxX: ${floor.maxX}, y: ${floor.y} }`;
        console.log(this.lastMeasure);
        this.updateLayoutText(p);
        return;
      }
      start = { x: p.x, y: p.y };
    });
    this.input.on('pointermove', (p) => {
      if (!this.layoutMode) return;
      dragGfx.clear();
      if (start && p.isDown) {
        dragGfx.lineStyle(2, 0xffd166, 1).strokeRect(start.x, start.y, p.x - start.x, p.y - start.y);
      }
      this.updateLayoutText(p);
    });
    this.input.on('pointerup', (p) => {
      if (!this.layoutMode || !start) return;
      dragGfx.clear();
      const x = Math.round(Math.min(start.x, p.x));
      const y = Math.round(Math.min(start.y, p.y));
      const w = Math.round(Math.abs(p.x - start.x));
      const h = Math.round(Math.abs(p.y - start.y));
      start = null;
      if (w < 6 || h < 6) return;
      this.lastMeasure = `x: ${x}, y: ${y}, w: ${w}, h: ${h}`;
      console.log(`{ ${this.lastMeasure} }`);
      navigator.clipboard?.writeText(this.lastMeasure).catch(() => {});
      this.updateLayoutText(p, '(copied to clipboard)');
    });
  }
}
