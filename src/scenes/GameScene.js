import { WIDTH, HEIGHT, FONT, COLORS } from '../config.js';
import { ROOMS, CHARACTERS } from '../data/rooms.js';
import { ITEMS } from '../data/items.js';
import { INTRO } from '../data/text.js';
import { state } from '../systems/State.js';
import { createApi, interact } from '../systems/Interact.js';
import { sfx } from '../systems/Sfx.js';

const listItems = (items) => {
  const names = items.map((i) => `the ${ITEMS[i].name.toLowerCase()}`);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
};

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.busy = false;
    this.layoutMode = false;
    this.layoutAllowed = ['localhost', '127.0.0.1'].includes(location.hostname) || location.search.includes('debug');
    this.zones = [];
    this.layoutLabels = [];

    this.bg = this.add.image(0, 0, this.roomKey()).setOrigin(0);
    this.character = this.add.image(0, 0, state.active).setOrigin(0.5, 1);
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
    this.events.once('shutdown', () => state.offContext(this));
    this.setupLayoutTool();

    this.cameras.main.fadeIn(500);
    this.time.delayedCall(400, () => this.ui.story(INTRO, () => this.api.toast('look', 'look')));
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
      keypad: (opts) => this.ui.keypad(opts),
      choice: (opts) => this.ui.choice(opts),
      end: (id) => this.endGame(id),
    };
  }

  // ---------- room rendering ----------

  roomKey(room = state.room) {
    return `${room}_${state.roomStates[room]}`;
  }

  renderRoom() {
    this.bg.setTexture(this.roomKey()).setDisplaySize(WIDTH, HEIGHT);
    this.placeCharacter(state.active);
    this.buildHotspots();
    this.drawLayout();
  }

  placeCharacter(textureKey) {
    const { x, y, h } = ROOMS[state.room].char;
    this.tweens.killTweensOf(this.character);
    this.character.setTexture(textureKey).setPosition(x, y);
    const scale = h / this.character.height;
    this.character.setScale(scale);
    this.tweens.add({ targets: this.character, scaleY: scale * 1.012, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
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
    this.buildHotspots();
    if (this.zones.some((z) => z.hotspot === hs)) this.hover(hs);
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
      if (arrived.length) {
        sfx.play('pickup');
        this.ui.say(`${CHARACTERS[state.active].name} finds ${listItems(arrived)} in the dumbwaiter.`);
      }
      for (const combo of combined) this.ui.say(combo.text);
    });
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
      },
    });
    this.cameras.main.shake(900, 0.006);
  }

  endGame(id) {
    this.busy = true;
    this.clearHover();
    sfx.play('win');
    this.cameras.main.fadeOut(1400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('UI');
      this.scene.start('Ending', { id });
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
