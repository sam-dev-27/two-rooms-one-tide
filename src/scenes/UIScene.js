import { WIDTH, HEIGHT, FONT, COLORS } from '../config.js';
import { CHARACTERS, ROOMS } from '../data/rooms.js';
import { ITEMS } from '../data/items.js';
import { state } from '../systems/State.js';
import { isStuck, useHint } from '../systems/Hints.js';
import { sfx } from '../systems/Sfx.js';

const BAR_H = 84;
const SLOT = 64;
const SLOT_GAP = 12;
const SLOT_COUNT = 8;
const SLOT_X0 = 32;
const BUTTON_BG = '#1c2a37';
const BUTTON_HOVER = '#2c4052';

const fit = (img, size) => img.setScale(size / Math.max(img.width, img.height));

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    this.queue = [];
    this.showing = false;
    this.incoming = new Set();
    this.modal = null;
    this.pulse = null;

    this.input.mouse?.disableContextMenu();
    this.createTopBar();
    this.createInventory();
    this.createMessageBox();
    this.createToast();
    this.cursorIcon = this.add.image(0, 0, 'key').setVisible(false).setAlpha(0.9).setDepth(90);

    const kb = this.input.keyboard;
    kb.on('keydown-H', () => !this.modal && this.showHint());
    kb.on('keydown-N', () => this.toggleNotes());
    kb.on('keydown-M', () => this.toggleMute());
    kb.on('keydown-ESC', () => (this.modal?.closable ? this.closeModal() : state.select(null)));
    this.input.on('pointerdown', (p) => p.rightButtonDown() && state.select(null));

    state.on('inventory', this.refresh, this);
    state.on('select', this.refresh, this);
    state.on('swap', this.refresh, this);
    this.events.once('shutdown', () => state.offContext(this));
    this.refresh();
  }

  update() {
    const p = this.input.activePointer;
    const carrying = !!state.selected && !this.modal;
    this.cursorIcon.setVisible(carrying);
    if (carrying) this.cursorIcon.setPosition(p.x + 26, p.y + 26);

    const stuck = isStuck(state);
    if (stuck && !this.pulse) {
      this.hintBtn.setColor(COLORS.amberCss);
      this.pulse = this.tweens.add({ targets: this.hintBtn, scale: 1.12, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    } else if (!stuck && this.pulse) {
      this.pulse.stop();
      this.pulse = null;
      this.hintBtn.setScale(1).setColor(COLORS.paperCss);
    }
  }

  // ---------- widgets ----------

  makeButton(x, y, label, onClick, size = '18px') {
    const btn = this.add
      .text(x, y, label, { fontFamily: FONT, fontSize: size, color: COLORS.paperCss, backgroundColor: BUTTON_BG, padding: { x: 14, y: 7 } })
      .setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setBackgroundColor(BUTTON_HOVER));
    btn.on('pointerout', () => btn.setBackgroundColor(BUTTON_BG));
    btn.on('pointerdown', (p) => {
      if (p.rightButtonDown()) return;
      sfx.play('click');
      onClick();
    });
    return btn;
  }

  createTopBar() {
    this.add.rectangle(0, 0, WIDTH, 56, COLORS.ink, 0.6).setOrigin(0);
    this.whoText = this.add.text(24, 28, '', { fontFamily: FONT, fontSize: '24px', color: COLORS.paperCss }).setOrigin(0, 0.5);
    this.swapBtn = this.makeButton(0, 28, '', () => state.emit('request-swap'));
    this.hintBtn = this.makeButton(0, 28, 'Hint (H)', () => this.showHint());
    this.notesBtn = this.makeButton(0, 28, 'Notes (N)', () => this.toggleNotes());
    this.muteBtn = this.makeButton(0, 28, sfx.muted ? 'Sound off' : 'Sound on', () => this.toggleMute());
    this.layoutTopButtons();
  }

  layoutTopButtons() {
    let x = WIDTH - 16;
    for (const btn of [this.muteBtn, this.notesBtn, this.hintBtn, this.swapBtn]) {
      btn.setOrigin(1, 0.5).setX(x);
      x -= btn.width + 10;
    }
  }

  createInventory() {
    // Interactive so clicks on the bar never fall through to hotspots behind it.
    this.add.rectangle(0, HEIGHT - BAR_H, WIDTH, BAR_H, COLORS.ink, 0.82).setOrigin(0).setInteractive();
    this.slots = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      const x = SLOT_X0 + i * (SLOT + SLOT_GAP) + SLOT / 2;
      const y = HEIGHT - BAR_H / 2;
      const frame = this.add.rectangle(x, y, SLOT, SLOT, 0x1c2a37, 0.95).setStrokeStyle(2, 0x3b5266).setInteractive({ useHandCursor: true });
      const icon = this.add.image(x, y, 'key').setVisible(false);
      frame.on('pointerdown', (p) => !p.rightButtonDown() && this.onSlot(i));
      frame.on('pointerover', () => this.showItemInfo(i));
      frame.on('pointerout', () => this.showItemInfo(-1));
      this.slots.push({ frame, icon, x, y });
    }
    this.itemInfo = this.add
      .text(SLOT_X0 + SLOT_COUNT * (SLOT + SLOT_GAP) + 12, HEIGHT - BAR_H / 2, '', {
        fontFamily: FONT,
        fontSize: '18px',
        color: COLORS.mutedCss,
        wordWrap: { width: WIDTH - (SLOT_X0 + SLOT_COUNT * (SLOT + SLOT_GAP) + 36) },
      })
      .setOrigin(0, 0.5);
  }

  onSlot(i) {
    const item = state.inventory[state.active][i];
    if (!item) return;
    sfx.play('click');
    state.select(state.selected === item ? null : item);
  }

  showItemInfo(i) {
    const item = state.inventory[state.active][i];
    if (item) {
      this.itemInfo.setColor(COLORS.paperCss).setText(`${ITEMS[item].name}: ${ITEMS[item].desc}`);
    } else if (state.selected) {
      this.itemInfo
        .setColor(COLORS.amberCss)
        .setText(`Holding the ${ITEMS[state.selected].name.toLowerCase()}. Click something to use it, or the hatch to send it. Right-click to cancel.`);
    } else {
      this.itemInfo.setColor(COLORS.mutedCss).setText(state.inventory[state.active].length ? 'Click an item to pick it up and use it.' : '');
    }
  }

  refresh() {
    const inv = state.inventory[state.active];
    this.slots.forEach((slot, i) => {
      const item = inv[i];
      const selected = item && item === state.selected;
      slot.frame.setStrokeStyle(selected ? 3 : 2, selected ? COLORS.amber : 0x3b5266);
      if (!item) return slot.icon.setVisible(false);
      fit(slot.icon.setTexture(item), SLOT - 10).setVisible(!this.incoming.has(item));
    });

    const who = CHARACTERS[state.active];
    this.whoText.setText(`${who.name}  ·  ${ROOMS[who.room].name}`);
    const waiting = state.arrivals[state.other].length;
    this.swapBtn.setText(`Switch to ${CHARACTERS[state.other].name} (Tab)${waiting ? `  ·  ${waiting} in the hatch` : ''}`);
    this.layoutTopButtons();
    this.showItemInfo(-1);
    if (state.selected) fit(this.cursorIcon.setTexture(state.selected), 44);
  }

  // ---------- messages and toasts ----------

  createMessageBox() {
    this.msg = this.add.container(WIDTH / 2, HEIGHT - BAR_H - 24).setAlpha(0).setDepth(50);
    this.msgBg = this.add.graphics();
    this.msgText = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '21px', color: COLORS.paperCss, align: 'center', wordWrap: { width: 860 }, lineSpacing: 4 })
      .setOrigin(0.5, 1);
    this.msg.add([this.msgBg, this.msgText]);
  }

  say(text) {
    this.queue.push(text);
    if (!this.showing) this.nextMessage();
  }

  clearMessages() {
    this.queue = [];
    this.msgTimer?.remove();
    this.showing = false;
    this.tweens.killTweensOf(this.msg);
    this.msg.setAlpha(0);
  }

  nextMessage() {
    this.msgTimer?.remove();
    const text = this.queue.shift();
    if (text === undefined) {
      this.showing = false;
      this.tweens.add({ targets: this.msg, alpha: 0, duration: 400 });
      return;
    }
    this.showing = true;
    this.msgText.setText(text);
    const w = this.msgText.width;
    const h = this.msgText.height;
    this.msgBg.clear();
    this.msgBg.fillStyle(COLORS.ink, 0.88).fillRoundedRect(-w / 2 - 22, -h - 14, w + 44, h + 28, 12);
    this.msgBg.lineStyle(1, COLORS.amber, 0.45).strokeRoundedRect(-w / 2 - 22, -h - 14, w + 44, h + 28, 12);
    this.tweens.killTweensOf(this.msg);
    this.msg.setAlpha(0.3).setY(HEIGHT - BAR_H - 18);
    this.tweens.add({ targets: this.msg, alpha: 1, y: HEIGHT - BAR_H - 24, duration: 180, ease: 'Cubic.Out' });
    this.msgTimer = this.time.delayedCall(2400 + text.length * 45, () => this.nextMessage());
  }

  createToast() {
    this.toastText = this.add
      .text(WIDTH / 2, 76, '', {
        fontFamily: FONT,
        fontSize: '19px',
        color: '#10161b',
        backgroundColor: COLORS.amberCss,
        padding: { x: 16, y: 8 },
        wordWrap: { width: 760 },
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setAlpha(0)
      .setDepth(60);
  }

  toast(text) {
    if (!text) return;
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setText(text).setAlpha(0).setY(62);
    this.tweens.chain({
      targets: this.toastText,
      tweens: [
        { alpha: 1, y: 76, duration: 260, ease: 'Cubic.Out' },
        { alpha: 0, duration: 400, delay: 6500 },
      ],
    });
  }

  hideToast() {
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, duration: 200 });
  }

  showHint() {
    if (this.modal) return;
    this.clearMessages();
    this.say(useHint(state));
  }

  toggleMute() {
    this.muteBtn.setText(sfx.toggleMute() ? 'Sound off' : 'Sound on');
    this.layoutTopButtons();
  }

  // ---------- pickup animation ----------

  pickup(item, x, y) {
    this.incoming.add(item);
    this.refresh();
    const inv = state.inventory[state.active];
    const idx = inv.includes(item) ? inv.indexOf(item) : inv.length - 1;
    const slot = this.slots[Phaser.Math.Clamp(idx, 0, SLOT_COUNT - 1)];
    const img = fit(this.add.image(x, y, item).setDepth(80), 96);
    const start = img.scale;
    const end = (SLOT - 10) / Math.max(img.width, img.height);
    this.tweens.chain({
      targets: img,
      tweens: [
        { scale: start * 1.3, duration: 180, ease: 'Back.Out' },
        { x: slot.x, y: slot.y, scale: end, duration: 520, ease: 'Cubic.In' },
      ],
      onComplete: () => {
        img.destroy();
        this.incoming.delete(item);
        this.refresh();
        const s = slot.icon.scale;
        this.tweens.add({ targets: slot.icon, scale: { from: s * 1.35, to: s }, duration: 260, ease: 'Back.Out' });
        slot.frame.setStrokeStyle(3, COLORS.amber);
        this.time.delayedCall(300, () => this.refresh());
      },
    });
  }

  // ---------- modals ----------

  openModal(w, h, { closable = true, kind = 'modal' } = {}) {
    this.closeModal();
    state.modal = true;
    const x = (WIDTH - w) / 2;
    const y = (HEIGHT - h) / 2;
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.6).setOrigin(0).setInteractive();
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panel, 0.97).fillRoundedRect(x, y, w, h, 16);
    panel.lineStyle(2, COLORS.panelEdge, 0.8).strokeRoundedRect(x, y, w, h, 16);
    c.add([dim, panel]);
    Object.assign(c, { closable, kind, box: { x, y, w, h } });
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 160 });
    this.modal = c;
    return c;
  }

  closeModal() {
    if (!this.modal) return;
    this.modal.onClose?.();
    this.modal.destroy();
    this.modal = null;
    state.modal = false;
  }

  bodyText(text, width, size = '20px') {
    return this.add.text(WIDTH / 2, 0, text, {
      fontFamily: FONT,
      fontSize: size,
      color: COLORS.paperCss,
      wordWrap: { width },
      lineSpacing: 6,
    }).setOrigin(0.5, 0);
  }

  titleText(text, y) {
    return this.add.text(WIDTH / 2, y, text, { fontFamily: FONT, fontSize: '32px', color: COLORS.amberCss }).setOrigin(0.5, 0);
  }

  story({ title, text, button }, onDone) {
    const body = this.bodyText(text, 680);
    const c = this.openModal(780, body.height + 210, { closable: false });
    const { y, h } = c.box;
    body.setY(y + 92);
    const btn = this.makeButton(WIDTH / 2, y + h - 52, button, () => {
      this.closeModal();
      onDone?.();
    }, '22px').setOrigin(0.5);
    c.add([this.titleText(title, y + 32), body, btn]);
  }

  choice({ title, text, options }) {
    const body = this.bodyText(text, 640);
    const c = this.openModal(760, body.height + 130 + options.length * 62);
    const { y } = c.box;
    body.setY(y + 88);
    c.add([this.titleText(title, y + 30), body]);
    options.forEach((opt, i) => {
      const oy = y + 120 + body.height + i * 62;
      if (opt.enabled) {
        c.add(this.makeButton(WIDTH / 2, oy, opt.label, () => {
          this.closeModal();
          opt.onSelect();
        }, '20px').setOrigin(0.5, 0));
      } else {
        c.add(this.add.text(WIDTH / 2, oy, `${opt.label}  (no proof)`, {
          fontFamily: FONT, fontSize: '20px', color: '#5d6b76', backgroundColor: '#141c24', padding: { x: 14, y: 7 },
        }).setOrigin(0.5, 0));
      }
    });
  }

  toggleNotes() {
    if (this.modal?.kind === 'notes') return this.closeModal();
    if (this.modal) return;
    const text = state.notes.length
      ? state.notes.map((n) => `-  ${n.text}`).join('\n\n')
      : 'Nothing written down yet. Clues you read are copied here automatically.';
    const body = this.bodyText(text, 680, '19px');
    const c = this.openModal(780, body.height + 190, { kind: 'notes' });
    const { y, h } = c.box;
    body.setY(y + 90);
    const close = this.makeButton(WIDTH / 2, y + h - 48, 'Close (N)', () => this.closeModal()).setOrigin(0.5);
    c.add([this.titleText('Notebook', y + 30), body, close]);
  }

  keypad({ title, code, onSuccess }) {
    const c = this.openModal(380, 500);
    const { y } = c.box;
    let entry = '';
    let solved = false;
    const display = this.add
      .text(WIDTH / 2, y + 110, '', { fontFamily: 'monospace', fontSize: '42px', color: COLORS.amberCss, backgroundColor: '#0b1118', padding: { x: 22, y: 6 } })
      .setOrigin(0.5);
    const render = () => display.setText(Array.from({ length: code.length }, (_, i) => entry[i] ?? '_').join(' '));
    const check = () => {
      if (entry === code) {
        solved = true;
        display.setColor('#9be59b');
        this.time.delayedCall(250, () => {
          this.closeModal();
          onSuccess();
        });
        return;
      }
      sfx.play('error');
      this.tweens.add({ targets: display, x: WIDTH / 2 + 10, duration: 50, yoyo: true, repeat: 3, onComplete: () => display.setX(WIDTH / 2) });
      this.time.delayedCall(450, () => {
        entry = '';
        render();
      });
    };
    const press = (k) => {
      if (solved) return;
      if (k === 'Clear') entry = '';
      else if (k === 'Back') entry = entry.slice(0, -1);
      else if (entry.length < code.length) {
        entry += k;
        sfx.play('click');
      }
      render();
      if (entry.length === code.length) check();
    };

    c.add([this.titleText(title, y + 28), display]);
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', 'Back'];
    keys.forEach((k, i) => {
      const bx = WIDTH / 2 + ((i % 3) - 1) * 96;
      const by = y + 190 + Math.floor(i / 3) * 70;
      const pad = this.add.rectangle(bx, by, 84, 58, 0x1c2a37).setStrokeStyle(1, 0x3b5266).setInteractive({ useHandCursor: true });
      const label = this.add.text(bx, by, k, { fontFamily: FONT, fontSize: k.length > 1 ? '18px' : '26px', color: COLORS.paperCss }).setOrigin(0.5);
      pad.on('pointerover', () => pad.setFillStyle(0x2c4052));
      pad.on('pointerout', () => pad.setFillStyle(0x1c2a37));
      pad.on('pointerdown', () => press(k));
      c.add([pad, label]);
    });
    c.add(this.add.text(WIDTH / 2, y + 470, 'Type digits or click. Esc to close.', { fontFamily: FONT, fontSize: '15px', color: COLORS.mutedCss }).setOrigin(0.5));

    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('Back');
    };
    this.input.keyboard.on('keydown', onKey);
    c.onClose = () => this.input.keyboard.off('keydown', onKey);
    render();
  }
}
