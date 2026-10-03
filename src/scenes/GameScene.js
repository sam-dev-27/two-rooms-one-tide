import { WIDTH, HEIGHT, FONT, COLORS } from '../config.js';
import { ROOMS, CHARACTERS } from '../data/rooms.js';
import { ITEMS } from '../data/items.js';
import { INTRO, TWIST_CARD, endingCard } from '../data/text.js';
import { state } from '../systems/State.js';
import { createApi, interact, pendingTalk } from '../systems/Interact.js';
import { sfx } from '../systems/Sfx.js';

const listItems = (items) => {
  const names = items.map((i) => `the ${ITEMS[i].name.toLowerCase()}`);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
};

const PLATE_DOTS = [0xf4f1e6, 0x3f9a4a, 0xc0392b, 0xe0b52c, 0x2f6fb5];

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

    this.bg = this.add.image(0, 0, this.roomKey()).setOrigin(0);
    this.windowView = this.add.image(0, 0, 'lamp_after').setOrigin(0).setVisible(false);
    this.dim = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x1a0c02, 0.42).setOrigin(0).setVisible(false);
    this.water = this.add.graphics();
    this.plate = this.add.container(0, 0);
    this.rheostat = this.add.image(0, 0, 'rheostat').setVisible(false);
    this.flash = this.add.graphics().setAlpha(0);
    this.hatchGlow = this.add.graphics();
    this.character = this.add.image(0, 0, state.active).setOrigin(0.5, 1);
    this.legs = this.add.image(0, 0, state.active).setOrigin(0.5, 1).setTint(0x4a7d8f).setAlpha(0.22).setVisible(false);
    this.ripple = this.add.graphics().setVisible(false);
    this.rippleRing = this.add.graphics().setVisible(false);
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
    this.layoutGfx = this.add.graphics();
    this.layoutText = this.add
      .text(12, 64, '', {
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

    this.input.keyboard.addCapture('TAB');
    this.input.keyboard.on('keydown-TAB', () => this.swap());
    this.input.keyboard.on('keydown-D', () => this.toggleLayoutMode());
    state.on('request-swap', this.swap, this);
    state.on('flag', this.onFlag, this);
    state.on('tide', this.onTide, this);
    state.on('flash', this.flashWindow, this);
    this.events.once('shutdown', () => state.offContext(this));
    this.setupLayoutTool();

    this.cameras.main.fadeIn(500);
    this.time.delayedCall(400, () =>
      this.ui.story(INTRO, () => {
        this.playing = true;
        this.api.toast('look', 'look');
      }),
    );
  }

  update(time, delta) {
    if (this.playing && !this.busy && !state.modal && !state.has('final_phase')) state.tick(delta);
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
      talk: (lines, onDone) => this.ui.talk(lines, onDone),
      ending: (id, onDone) => this.showEnding(id, onDone),
      end: (id) => this.endGame(id),
    };
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
    this.placeCharacter(state.active);
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

    const dim = lamp && state.has('lamp_lit') && !state.has('lamp_full');
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
    if (pendingTalk(this.api) && !state.has('final_phase')) this.api.toast('tube', 'tube');
  }

  onTide() {
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

  placeCharacter(textureKey) {
    const { x, y, h } = ROOMS[state.room].char;
    this.tweens.killTweensOf(this.character);
    this.character.setTexture(textureKey).setPosition(x, y);
    // Poses share the idle pose's scale so the figure doesn't change size between them.
    const scale = h / this.textures.get(state.active).getSourceImage().height;
    this.character.setScale(scale);
    this.tweens.add({ targets: this.character, scaleY: scale * 1.012, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.applyWading(this.wadeTween ? this.wadeDepth : this.waterDepth());
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
    const { x, y, h } = ROOMS[state.room].char;
    const scale = c.scaleX;
    const { width: fw, height: fh } = c.frame;
    const cut = Math.max(0, fh - (h * depth) / scale);
    const waterY = y - h * depth;
    c.setCrop(0, 0, fw, cut);
    this.legs.setTexture(c.texture.key).setPosition(x, y).setScale(scale).setCrop(0, cut, fw, fh - cut).setVisible(true);

    if (this.ripple.visible) {
      this.ripple.setPosition(x, waterY);
      this.rippleRing.setPosition(x, waterY);
      return;
    }
    // Sized from the idle pose so the ripple doesn't jump when the act pose swaps in.
    const rw = Math.min(this.textures.get(state.active).getSourceImage().width * scale * 0.85, 190);
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

  actPose() {
    const who = state.active;
    const actKey = `${who}_act`;
    const missing = this.registry.get('missing');
    if (!this.textures.exists(actKey) || (missing.has(actKey) && !missing.has(who))) return;
    this.placeCharacter(actKey);
    this.actTimer?.remove();
    this.actTimer = this.time.delayedCall(700, () => {
      if (state.active === who) this.placeCharacter(who);
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
      zone.on('pointerover', () => this.hover(hs));
      zone.on('pointerout', () => this.clearHover());
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

  click(hs) {
    if (state.modal || this.busy || this.layoutMode) return;
    sfx.play('click');
    this.ui.clearMessages();
    const item = state.selected;
    this.actPose();
    interact(this.api, hs, item);
    if (item) state.select(null);
    if (this.busy) return;
    this.buildHotspots();
    this.renderOverlays();
    if (!state.modal && this.zones.some((z) => z.hotspot === hs)) this.hover(hs);
  }

  // ---------- swapping, sending, state changes ----------

  swap() {
    if (this.busy || state.modal) return;
    this.busy = true;
    state.markSeen('swapped');
    sfx.play('swap');
    this.clearHover();
    const cam = this.cameras.main;
    cam.fadeOut(220, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      const { arrived, combined } = state.swap();
      this.renderRoom();
      cam.fadeIn(260);
      this.busy = false;
      this.ui.clearMessages();
      this.ui.hideToast();
      this.announceArrivals(arrived, combined);
    });
  }

  /** Switches character immediately, for scripted moments that happen under a black card. */
  swapTo(who) {
    const result = state.setActive(who);
    this.renderRoom();
    if (result) this.announceArrivals(result.arrived, result.combined);
  }

  announceArrivals(arrived, combined) {
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
    this.time.delayedCall(t + 300, () => {
      sfx.play('win');
      this.ui.endingCard(endingCard(state, id), () => {
        this.ui.blackCard(TWIST_CARD, () => {
          this.busy = false;
          onDone();
        });
      });
    });
  }

  endGame(id) {
    this.busy = true;
    this.clearHover();
    this.cameras.main.fadeOut(1400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('UI');
      this.scene.start('Ending', { id, actor: state.memo.final_actor ?? state.active });
    });
  }

  // ---------- layout tool (D on localhost or with ?debug) ----------

  toggleLayoutMode() {
    if (!this.layoutAllowed || state.modal) return;
    this.layoutMode = !this.layoutMode;
    this.layoutText.setVisible(this.layoutMode);
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
    const { x, y, h } = ROOMS[state.room].char;
    this.layoutGfx.lineStyle(2, 0xff6b6b, 1).strokeRect(x - 4, y - h, 8, h).lineBetween(x - 30, y, x + 30, y);
  }

  updateLayoutText(pointer, extra = '') {
    if (!this.layoutMode) return;
    const x = Math.round(pointer.x);
    const y = Math.round(pointer.y);
    this.layoutText.setText(
      [`LAYOUT MODE (D to exit)  pointer ${x}, ${y}`, 'drag: measure a hotspot   shift-click: place character', this.lastMeasure ?? '', extra]
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
        const char = ROOMS[state.room].char;
        char.x = Math.round(p.x);
        char.y = Math.round(p.y);
        this.placeCharacter(state.active);
        this.drawLayout();
        this.lastMeasure = `${state.room}.char: { x: ${char.x}, y: ${char.y}, h: ${char.h} }`;
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
