import { WIDTH, HEIGHT, FONT, COLORS, TIDE_MAX } from '../config.js';
import { CHARACTERS, ROOMS } from '../data/rooms.js';
import { ITEMS } from '../data/items.js';
import { CARDS, COLUMNS } from '../data/board.js';
import { CARD_TOAST, CHOICE_LABELS, CLOSEUPS, HOLD_TEXT, HOW_TO, REVEAL_TIP, TRUST_WARM, TUTORIAL, trustLabel } from '../data/text.js';
import { state } from '../systems/State.js';
import { isStuck, objective, useHint } from '../systems/Hints.js';
import { sfx } from '../systems/Sfx.js';

const BAR_H = 84;
const TOP_H = 70;
const TOP_ROW = 22;
const OBJ_ROW = 53;
const REVEAL_TIP_MS = 240_000;
const SLOT = 64;
const SLOT_GAP = 12;
const SLOT_COUNT = 8;
const SLOT_X0 = 32;
const BUTTON_BG = '#1c2a37';
const BUTTON_HOVER = '#2c4052';
const BRASS = 0xb08a3e;
const VALVE_HEX = { red: 0xc0392b, blue: 0x2f6fb5, green: 0x3f9a4a, yellow: 0xe0b52c, white: 0xeeeeee };
const DOT_MS = 250;
const CARD_W = 186;
const CARD_H = 54;
const CHOICE_HEX = { lie: '#e8a090', deflect: '#9fb3c1', clean: '#9be59b' };

const fit = (img, size) => img.setScale(size / Math.max(img.width, img.height));
const prettyMorse = (code) => code.replace(/\./g, '·').replace(/-/g, '−');

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
    this.toastQueue = [];
    this.toastBusy = false;
    this.cardTitles = [];

    this.input.mouse?.disableContextMenu();
    this.createTopBar();
    this.createInventory();
    this.createMessageBox();
    this.createToast();
    this.createHoldIndicator();
    this.cursorIcon = this.add.image(0, 0, 'key').setVisible(false).setAlpha(0.9).setDepth(90);

    const kb = this.input.keyboard;
    kb.on('keydown-H', () => !this.modal && this.showHint());
    kb.on('keydown-N', () => this.toggleCase('notes'));
    kb.on('keydown-C', () => this.toggleCase('board'));
    kb.on('keydown-M', () => this.toggleMute());
    kb.on('keydown-ESC', () => (this.modal?.closable ? this.closeModal() : state.select(null)));
    kb.addCapture('F1');
    kb.on('keydown', (e) => (e.key === '?' || e.key === 'F1') && this.toggleHowTo());
    this.input.on('pointerdown', (p) => p.rightButtonDown() && state.select(null));

    state.on('inventory', this.refresh, this);
    state.on('select', this.refresh, this);
    state.on('swap', this.refresh, this);
    state.on('tide', this.drawTide, this);
    state.on('card', this.onCard, this);
    state.on('board', this.updateCaseButton, this);
    this.events.once('shutdown', () => state.offContext(this));
    this.refresh();
  }

  update() {
    const p = this.input.activePointer;
    const carrying = !!state.selected && !this.modal;
    this.cursorIcon.setVisible(carrying);
    if (carrying) this.cursorIcon.setPosition(p.x + 26, p.y + 26);

    this.drawHold();
    this.updateObjective();

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
    // Interactive so clicks on the bar never walk the character or reach hotspots behind it.
    this.add.rectangle(0, 0, WIDTH, TOP_H, COLORS.ink, 0.62).setOrigin(0).setInteractive();
    this.whoText = this.add.text(24, TOP_ROW, '', { fontFamily: FONT, fontSize: '21px', color: COLORS.paperCss }).setOrigin(0, 0.5);
    this.tideGfx = this.add.graphics();
    this.tideLabel = this.add.text(0, TOP_ROW, '', { fontFamily: FONT, fontSize: '15px', color: COLORS.mutedCss }).setOrigin(0, 0.5);
    this.objText = this.add.text(24, OBJ_ROW, '', { fontFamily: FONT, fontSize: '17px', color: COLORS.amberCss }).setOrigin(0, 0.5);
    this.revealTip = this.add
      .text(WIDTH - 16, OBJ_ROW, REVEAL_TIP, { fontFamily: FONT, fontSize: '15px', fontStyle: 'italic', color: COLORS.mutedCss })
      .setOrigin(1, 0.5)
      .setVisible(false);
    this.objective = null;
    this.swapBtn = this.makeButton(0, TOP_ROW, '', () => state.emit('request-swap'), '17px');
    this.hintBtn = this.makeButton(0, TOP_ROW, 'Hint (H)', () => this.showHint(), '17px');
    this.caseBtn = this.makeButton(0, TOP_ROW, 'Case (C)', () => this.toggleCase('board'), '17px');
    this.muteBtn = this.makeButton(0, TOP_ROW, sfx.muted ? 'Sound off' : 'Sound on', () => this.toggleMute(), '17px');
    this.helpBtn = this.makeButton(0, TOP_ROW, '?', () => this.toggleHowTo(), '17px');
    this.layoutTopButtons();
  }

  layoutTopButtons() {
    let x = WIDTH - 16;
    for (const btn of [this.helpBtn, this.muteBtn, this.caseBtn, this.hintBtn, this.swapBtn]) {
      btn.setOrigin(1, 0.5).setX(x);
      x -= btn.width + 8;
    }
  }

  /** The active character's goal under their name; it pulses when it changes. */
  updateObjective() {
    const tip = !state.seen.has('space_reveal') && Date.now() - state.startedAt < REVEAL_TIP_MS;
    if (this.revealTip.visible !== tip) this.revealTip.setVisible(tip);
    const text = objective(state);
    const key = `${state.active}:${text}`;
    if (key === this.objective) return;
    const changed = this.objective !== null && this.objective.startsWith(state.active) && text;
    this.objective = key;
    this.objText.setText(text ? `Objective: ${text}` : '');
    if (!changed) return;
    this.tweens.killTweensOf(this.objText);
    this.objText.setScale(1).setColor('#fff6dc');
    this.tweens.add({ targets: this.objText, scale: 1.08, duration: 220, yoyo: true, repeat: 2, ease: 'Sine.InOut', onComplete: () => this.objText.setColor(COLORS.amberCss) });
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
    this.updateCaseButton();
    this.drawTide();
    this.showItemInfo(-1);
    if (state.selected) fit(this.cursorIcon.setTexture(state.selected), 44);
  }

  /** Small brass gauge beside the character name: tide 0..6. */
  drawTide() {
    const x = this.whoText.x + this.whoText.width + 34;
    const y = TOP_ROW;
    const r = 13;
    const angle = (i) => Phaser.Math.DegToRad(150 + (i * 240) / TIDE_MAX);
    const g = this.tideGfx.clear();
    g.fillStyle(0x241c12, 1).fillCircle(x, y, r + 4);
    g.lineStyle(2, BRASS, 1).strokeCircle(x, y, r + 4);
    for (let i = 0; i <= TIDE_MAX; i++) {
      const a = angle(i);
      g.lineStyle(2, i <= state.tide ? 0x6fb7d0 : 0x5a5040, 1);
      g.lineBetween(x + Math.cos(a) * (r - 5), y + Math.sin(a) * (r - 5), x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r - 1));
    }
    const a = angle(state.tide);
    g.lineStyle(2, 0xe0786f, 1).lineBetween(x, y, x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3));
    g.fillStyle(BRASS, 1).fillCircle(x, y, 3);
    this.tideLabel.setPosition(x + r + 12, y).setText(`Tide ${state.tide}/${TIDE_MAX}`);
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

  /** A close-up hides the message box; the line it interrupted is shown again afterwards. */
  holdMessages() {
    if (this.showing && !this.msgHeld && this.msgCurrent) this.queue.unshift(this.msgCurrent);
    this.msgTimer?.remove();
    this.tweens.killTweensOf(this.msg);
    this.msg.setAlpha(0);
    this.showing = true;
    this.msgHeld = true;
  }

  releaseMessages() {
    if (!this.msgHeld) return;
    this.msgHeld = false;
    this.showing = false;
    this.nextMessage();
  }

  clearMessages() {
    this.queue = [];
    this.msgTimer?.remove();
    this.showing = false;
    this.msgHeld = false;
    this.tweens.killTweensOf(this.msg);
    this.msg.setAlpha(0);
  }

  nextMessage() {
    this.msgTimer?.remove();
    const text = this.queue.shift();
    this.msgCurrent = text;
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
      .text(WIDTH / 2, TOP_H + 18, '', {
        fontFamily: FONT,
        fontSize: '19px',
        color: '#10161b',
        backgroundColor: COLORS.amberCss,
        padding: { x: 16, y: 8 },
        wordWrap: { width: 620 },
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setAlpha(0)
      .setDepth(60);
    // Case-board arrivals get their own small toast at the left, so they never fight the tips.
    this.cardToast = this.add
      .text(16, TOP_H + 8, '', {
        fontFamily: FONT,
        fontSize: '15px',
        color: COLORS.paperCss,
        backgroundColor: 'rgba(17,26,36,0.92)',
        padding: { x: 12, y: 6 },
        wordWrap: { width: 270 },
      })
      .setAlpha(0)
      .setDepth(60);
  }

  /** Tutorial tips queue up, so two tips triggered by one click are both read. */
  toast(text) {
    if (!text) return;
    if (this.toastBusy && this.toastCurrent !== TUTORIAL.look) {
      if (!this.toastQueue.includes(text)) this.toastQueue.push(text);
      return;
    }
    this.toastBusy = true;
    this.toastCurrent = text;
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setText(text).setAlpha(0).setY(TOP_H + 4);
    this.tweens.chain({
      targets: this.toastText,
      tweens: [
        { alpha: 1, y: TOP_H + 18, duration: 260, ease: 'Cubic.Out' },
        { alpha: 0, duration: 400, delay: this.toastQueue.length ? 4200 : 6500 },
      ],
      onComplete: () => this.nextToast(),
    });
  }

  nextToast() {
    this.toastBusy = false;
    this.toastCurrent = null;
    const next = this.toastQueue.shift();
    if (next) this.toast(next);
  }

  /** Called on a swap: the current tip and any queued swap tip are moot now. */
  hideToast() {
    this.toastQueue = this.toastQueue.filter((t) => t !== TUTORIAL.swap && t !== TUTORIAL.look);
    if (!this.toastBusy) return;
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, duration: 200, onComplete: () => this.nextToast() });
  }

  onCard(id) {
    this.updateCaseButton();
    this.cardTitles.push(CARDS[id].title);
    this.cardToast.setText(`${CARD_TOAST}: ${this.cardTitles.join(', ')}`);
    this.tweens.killTweensOf(this.cardToast);
    this.cardToast.setAlpha(1);
    this.tweens.add({ targets: this.cardToast, scale: { from: 1.06, to: 1 }, duration: 220, ease: 'Back.Out' });
    this.cardToastTimer?.remove();
    this.cardToastTimer = this.time.delayedCall(2800, () => {
      this.cardTitles = [];
      this.tweens.add({ targets: this.cardToast, alpha: 0, duration: 400 });
    });
  }

  updateCaseButton() {
    const fresh = state.freshCards;
    this.caseBtn.setText(fresh ? `Case (C)  ·  ${fresh} new` : 'Case (C)').setColor(fresh ? COLORS.amberCss : COLORS.paperCss);
    this.layoutTopButtons();
  }

  // ---------- two-hands countdown ----------

  createHoldIndicator() {
    this.holdRing = this.add.graphics().setDepth(55);
    this.holdText = this.add
      .text(WIDTH - 16, TOP_H + 8, '', { fontFamily: FONT, fontSize: '16px', color: '#10161b', backgroundColor: COLORS.amberCss, padding: { x: 12, y: 6 } })
      .setOrigin(1, 0)
      .setVisible(false)
      .setDepth(55);
    this.holdSecond = null;
  }

  /** A ring beside the swap button and a label that count down while someone is holding on. */
  drawHold() {
    const g = this.holdRing.clear();
    const hold = state.holding;
    if (!hold) {
      if (this.holdText.visible) this.holdText.setVisible(false);
      this.holdSecond = null;
      return;
    }
    const frac = Phaser.Math.Clamp(hold.left / hold.ms, 0, 1);
    const secs = Math.ceil(Math.max(0, hold.left) / 1000);
    const color = frac > 0.35 ? COLORS.amber : 0xe0605a;
    const b = this.swapBtn.getBounds();
    const cx = b.x - 22;
    const cy = b.centerY;
    g.fillStyle(0x070b10, 0.85).fillCircle(cx, cy, 16);
    g.lineStyle(4, 0x3b5266, 1).strokeCircle(cx, cy, 13);
    g.lineStyle(4, color, 1).beginPath().arc(cx, cy, 13, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false).strokePath();
    g.lineStyle(2, color, 0.9).strokeRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);
    this.holdText.setVisible(true).setText(`${HOLD_TEXT.label}  ·  ${secs}`).setBackgroundColor(frac > 0.35 ? COLORS.amberCss : '#e0605a');
    const tb = this.holdText.getBounds();
    g.fillStyle(0x070b10, 0.8).fillRect(tb.x, tb.bottom + 4, tb.width, 6);
    g.fillStyle(color, 1).fillRect(tb.x, tb.bottom + 4, tb.width * frac, 6);
    if (secs !== this.holdSecond) {
      if (this.holdSecond !== null && !state.modal) sfx.play('tick');
      this.holdSecond = secs;
    }
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

  choice({ title, text, options, closable = true, who = null, worried = false }) {
    const dx = who ? 70 : 0;
    const body = this.bodyText(text, 640).setX(WIDTH / 2 + dx);
    const c = this.openModal(760 + dx * 2, Math.max(body.height + 130 + options.length * 62, who ? 220 : 0), { closable });
    const { x, y } = c.box;
    body.setY(y + 88);
    c.add([this.titleText(title, y + 30).setX(WIDTH / 2 + dx), body]);
    if (who) {
      const face = this.add.image(x + 90, y + 100, this.portrait(who, { worried })).setDisplaySize(124, 124);
      const ring = this.add.graphics().lineStyle(4, CHARACTERS[who].color, 1).strokeRect(x + 28, y + 38, 124, 124);
      c.add([face, ring]);
    }
    options.forEach((opt, i) => {
      const oy = y + 120 + body.height + i * 62;
      if (opt.enabled) {
        c.add(this.makeButton(WIDTH / 2 + dx, oy, opt.label, () => {
          this.closeModal();
          opt.onSelect();
        }, '20px').setOrigin(0.5, 0));
      } else {
        c.add(this.add.text(WIDTH / 2 + dx, oy, `${opt.label}  (${opt.lockedLabel ?? 'no proof'})`, {
          fontFamily: FONT, fontSize: '20px', color: '#5d6b76', backgroundColor: '#141c24', padding: { x: 14, y: 7 },
        }).setOrigin(0.5, 0));
      }
    });
  }

  /** Calls `fn` after the modal has gone, so it may open the next modal safely. */
  afterClose(c, fn) {
    const prev = c.onClose;
    c.onClose = () => {
      prev?.();
      if (fn) this.time.delayedCall(0, fn);
    };
  }

  /** Click, Enter or Space anywhere closes the modal, but not with the click that opened it. */
  closeOnAnyInput(c) {
    const opened = this.time.now;
    const close = () => this.time.now - opened > 200 && this.modal === c && this.closeModal();
    c.list[0].setInteractive({ useHandCursor: true }).on('pointerdown', close);
    this.onKeys(c, { down: (e) => (e.key === 'Enter' || e.code === 'Space') && close() });
  }

  // ---------- how to play ----------

  howTo(onClose) {
    const rowH = 72;
    const c = this.openModal(880, 170 + HOW_TO.length * rowH, { kind: 'howto' });
    const { x, y, w, h } = c.box;
    c.add(this.titleText('How to play', y + 24));
    HOW_TO.forEach((row, i) => {
      const cy = y + 112 + i * rowH;
      const icon = this.add.graphics();
      this.drawIcon(icon, row.icon, x + 72, cy);
      const text = this.add
        .text(x + 128, cy, row.text, { fontFamily: FONT, fontSize: '19px', color: COLORS.paperCss, wordWrap: { width: w - 168 }, lineSpacing: 3 })
        .setOrigin(0, 0.5);
      c.add([icon, text]);
    });
    c.add(
      this.add
        .text(WIDTH / 2, y + h - 34, 'Click or press Enter to begin   ·   ? or F1 shows this again', {
          fontFamily: FONT,
          fontSize: '16px',
          fontStyle: 'italic',
          color: COLORS.amberCss,
        })
        .setOrigin(0.5),
    );
    state.markSeen('howto');
    this.closeOnAnyInput(c);
    this.afterClose(c, onClose);
  }

  toggleHowTo() {
    if (this.modal?.kind === 'howto') return this.closeModal();
    if (this.modal || !this.scene.isActive('Game')) return;
    sfx.play('click');
    this.howTo();
  }

  /** Small line drawings for the how-to rows, centred on (cx, cy), about 52px across. */
  drawIcon(g, icon, cx, cy) {
    const amber = COLORS.amber;
    const paper = 0xf3e6c8;
    g.lineStyle(3, amber, 1);
    if (icon === 'click') {
      g.fillStyle(paper, 1).fillTriangle(cx - 10, cy - 18, cx - 10, cy + 12, cx + 10, cy + 4);
      g.lineBetween(cx - 2, cy + 6, cx + 6, cy + 20);
      g.beginPath().arc(cx - 10, cy - 18, 14, -2.6, -0.4).strokePath();
      g.beginPath().arc(cx - 10, cy - 18, 22, -2.4, -0.6).strokePath();
    } else if (icon === 'walk') {
      g.fillStyle(paper, 1).fillEllipse(cx - 14, cy + 8, 12, 22).fillEllipse(cx + 2, cy - 8, 12, 22);
      g.lineBetween(cx - 24, cy + 24, cx + 22, cy + 24).lineBetween(cx + 22, cy + 24, cx + 14, cy + 18).lineBetween(cx + 22, cy + 24, cx + 14, cy + 30);
    } else if (icon === 'swap') {
      g.beginPath().arc(cx, cy, 18, Math.PI * 1.05, Math.PI * 1.95).strokePath();
      g.beginPath().arc(cx, cy, 18, Math.PI * 0.05, Math.PI * 0.95).strokePath();
      g.fillStyle(amber, 1).fillTriangle(cx + 18, cy - 10, cx + 12, cy - 2, cx + 24, cy - 2).fillTriangle(cx - 18, cy + 10, cx - 24, cy + 2, cx - 12, cy + 2);
      g.fillStyle(0xe3a46a, 1).fillCircle(cx, cy - 4, 4);
      g.fillStyle(0x78a8c8, 1).fillCircle(cx, cy + 6, 4);
    } else if (icon === 'hatch') {
      g.lineStyle(3, paper, 1).strokeRect(cx - 18, cy - 20, 36, 40);
      g.lineStyle(3, amber, 1).lineBetween(cx - 6, cy + 12, cx - 6, cy - 12).lineBetween(cx + 6, cy - 12, cx + 6, cy + 12);
      g.fillStyle(amber, 1).fillTriangle(cx - 6, cy - 16, cx - 11, cy - 8, cx - 1, cy - 8).fillTriangle(cx + 6, cy + 16, cx + 1, cy + 8, cx + 11, cy + 8);
      g.lineStyle(3, 0xb08d57, 1).strokeCircle(cx + 28, cy - 12, 5).lineBetween(cx + 28, cy - 7, cx + 28, cy + 20);
    } else if (icon === 'board') {
      g.fillStyle(0x5a4632, 1).fillRect(cx - 24, cy - 18, 48, 36);
      g.fillStyle(paper, 1).fillRect(cx - 18, cy - 12, 14, 11).fillRect(cx + 4, cy - 4, 14, 11).fillRect(cx - 14, cy + 4, 14, 9);
      g.fillStyle(0xe0605a, 1).fillCircle(cx - 11, cy - 12, 2.5).fillCircle(cx + 11, cy - 4, 2.5).fillCircle(cx - 7, cy + 4, 2.5);
      g.lineStyle(1.5, 0xe0605a, 1).lineBetween(cx - 11, cy - 12, cx + 11, cy - 4);
    } else if (icon === 'reveal') {
      g.lineStyle(3, paper, 1);
      g.beginPath().arc(cx, cy + 16, 26, -2.4, -0.74).strokePath();
      g.beginPath().arc(cx, cy - 16, 26, 0.74, 2.4).strokePath();
      g.fillStyle(amber, 1).fillCircle(cx, cy, 7);
      g.lineStyle(2, amber, 0.8).strokeRoundedRect(cx - 26, cy - 24, 52, 48, 6);
    }
  }

  // ---------- close-ups ----------

  /** A painted close-up with its writing laid over in a hand; any click or Enter closes it. */
  closeup(id, then) {
    const def = CLOSEUPS[id];
    if (!def) return then?.();
    this.holdMessages();
    const c = this.openModal(1060, 690, { kind: 'closeup' });
    const { y, h } = c.box;
    c.add(this.titleText(def.title, y + 14).setFontSize(26));
    const boxW = 1000;
    const boxH = 562;
    const boxY = y + 58;
    const img = this.add.image(WIDTH / 2, boxY + boxH / 2, def.image);
    const s = Math.min(boxW / img.width, boxH / img.height);
    img.setScale(s);
    const dw = img.width * s;
    const dh = img.height * s;
    const left = WIDTH / 2 - dw / 2;
    const top = boxY + boxH / 2 - dh / 2;
    c.add(img);
    const areas = [def.area ?? []].flat();
    const per = Math.ceil(def.lines.length / Math.max(1, areas.length));
    areas.forEach((area, i) => {
      const lines = def.lines.slice(i * per, (i + 1) * per);
      if (lines.length) c.add(this.closeupWriting({ ...def, lines, angle: area.angle ?? def.angle }, area, left, top, dw, dh));
    });
    const caption = def.caption ? `${def.caption}   ·   ` : '';
    c.add(
      this.add
        .text(WIDTH / 2, y + h - 22, `${caption}Click to close`, { fontFamily: FONT, fontSize: '17px', fontStyle: 'italic', color: def.caption ? COLORS.paperCss : COLORS.mutedCss })
        .setOrigin(0.5),
    );
    this.closeOnAnyInput(c);
    const prev = c.onClose;
    c.onClose = () => {
      prev?.();
      this.time.delayedCall(0, () => {
        this.releaseMessages();
        then?.();
      });
    };
  }

  closeupWriting(def, a, left, top, dw, dh) {
    const scale = dw / 1000;
    const g = this.add.container(left + (a.x + a.w / 2) * dw, top + (a.y + a.h / 2) * dh).setAngle(def.angle ?? 0);
    const text = this.add
      .text(0, 0, def.lines.join('\n'), {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontStyle: 'italic',
        fontSize: `${Math.round(def.size * scale)}px`,
        color: def.ink,
        lineSpacing: Math.round(def.size * scale * 0.45),
        wordWrap: { width: a.w * dw },
      })
      .setOrigin(0.5);
    const fit = Math.min(1, (a.h * dh) / text.height, (a.w * dw) / text.width);
    text.setScale(fit);
    g.add(text);
    const blank = def.lines.indexOf('');
    if (def.anchor && blank >= 0) {
      const lh = (text.height * fit) / def.lines.length;
      const k = lh * 0.8;
      const ax = (-text.width / 2) * fit + k * 0.8;
      const ay = (-text.height / 2) * fit + (blank + 1) * lh;
      const ink = Phaser.Display.Color.HexStringToColor(def.ink).color;
      const anchor = this.add.graphics().lineStyle(Math.max(3, k * 0.09), ink, 0.92);
      anchor.strokeCircle(ax, ay - k * 0.82, k * 0.16);
      anchor.lineBetween(ax, ay - k * 0.66, ax, ay + k * 0.9);
      anchor.lineBetween(ax - k * 0.38, ay - k * 0.38, ax + k * 0.38, ay - k * 0.38);
      anchor.beginPath().arc(ax, ay + k * 0.25, k * 0.65, 0.35, Math.PI - 0.35).strokePath();
      g.add(anchor);
    }
    return g;
  }

  // ---------- case file: board and notes ----------

  /** One modal with two tabs: the case board (C) and the notebook (N). */
  toggleCase(tab = 'board') {
    if (this.modal?.kind === 'case') {
      if (this.modal.tab === tab) return this.closeModal();
    } else if (this.modal) {
      return;
    }
    const c = this.openModal(1200, 660, { kind: 'case' });
    c.tab = tab;
    const { x, y, w, h } = c.box;
    c.add(this.add.text(x + 30, y + 18, 'Case', { fontFamily: FONT, fontSize: '30px', color: COLORS.amberCss }));
    const tabBtn = (tx, label, id) => {
      const btn = this.makeButton(tx, y + 24, label, () => this.toggleCase(id), '17px');
      if (id === tab) btn.setBackgroundColor('#3a4a2a').setColor(COLORS.amberCss);
      btn.on('pointerout', () => id === tab && btn.setBackgroundColor('#3a4a2a'));
      return btn;
    };
    const boardTab = tabBtn(x + 130, 'Board (C)', 'board');
    const notesTab = tabBtn(x + 130 + boardTab.width + 10, 'Notes (N)', 'notes');
    const close = this.makeButton(x + w - 24, y + 24, 'Close (Esc)', () => this.closeModal(), '17px').setOrigin(1, 0);
    c.add([boardTab, notesTab, close]);
    if (tab === 'notes') this.renderNotes(c);
    else this.renderBoard(c);
  }

  toggleNotes() {
    this.toggleCase('notes');
  }

  renderNotes(c) {
    const { y, h } = c.box;
    const text = state.notes.length
      ? state.notes.map((n) => `-  ${n.text}`).join('\n\n')
      : 'Nothing written down yet. Clues you read are copied here automatically.';
    const body = this.bodyText(text, 1000, state.notes.length > 6 ? '16px' : '19px').setY(y + 90);
    if (body.height > h - 120) body.setFontSize(14);
    c.add(body);
  }

  renderBoard(c) {
    const { x, y, w } = c.box;
    const tray = { x: x + 20, y: y + 96, w: w - 40, h: 196 };
    const colTop = y + 310;
    const colH = 290;
    const colW = 280;
    const cols = COLUMNS.map((col, i) => ({ ...col, x: x + 20 + i * 287, y: colTop, w: colW, h: colH }));
    let selected = null;
    let drag = null;
    let reaction = null;

    const trust = this.add
      .text(x + w - 160, y + 33, `Between them: ${trustLabel(state)}`, { fontFamily: FONT, fontSize: '16px', fontStyle: 'italic', color: COLORS.mutedCss })
      .setOrigin(1, 0.5);
    const trayBg = this.add.rectangle(tray.x, tray.y, tray.w, tray.h, 0x0b1118, 0.7).setOrigin(0).setStrokeStyle(1, 0x3b5266).setInteractive();
    const trayLabel = this.add.text(tray.x, tray.y - 24, 'Clues', { fontFamily: FONT, fontSize: '17px', color: COLORS.mutedCss });
    c.add([trust, trayBg, trayLabel]);
    const colBgs = cols.map((col) => {
      const bg = this.add.rectangle(col.x, col.y, col.w, col.h, 0x0b1118, 0.7).setOrigin(0).setStrokeStyle(1, 0x3b5266).setInteractive({ useHandCursor: true });
      const bar = this.add.rectangle(col.x, col.y, col.w, 34, col.color, 0.85).setOrigin(0);
      const name = this.add.text(col.x + col.w / 2, col.y + 17, col.name.toUpperCase(), { fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: '#f8f0dc' }).setOrigin(0.5);
      c.add([bg, bar, name]);
      return bg;
    });
    const info = this.add
      .text(x + 24, y + 614, '', { fontFamily: FONT, fontSize: '17px', color: COLORS.mutedCss, wordWrap: { width: w - 48 }, lineSpacing: 3 })
      .setOrigin(0, 0);
    c.add(info);
    const layer = this.add.container(0, 0);
    c.add(layer);

    const idle = 'Drag a clue onto a suspect, or click a clue and then a column (keys 1-4; 0 puts it back). Hover a clue to read it.';
    const showInfo = (id) => {
      if (id) info.setColor(COLORS.paperCss).setText(`${CARDS[id].title}: ${CARDS[id].detail}`);
      else if (reaction) info.setColor(CHARACTERS[reaction.who].css).setText(`${CHARACTERS[reaction.who].name.toUpperCase()}: "${reaction.text}"`);
      else info.setColor(COLORS.mutedCss).setText(Object.keys(state.board).length > 1 ? idle : `${idle}\nNew clues are added as you find them.`);
    };

    const ids = () => Object.keys(state.board).sort((a, b) => state.board[a].order - state.board[b].order);
    const slots = () => {
      const pos = {};
      const loose = ids().filter((id) => !state.board[id].column);
      const rows = Math.max(1, Math.ceil(loose.length / 6));
      const rowStep = rows > 1 ? Math.min(CARD_H + 8, (tray.h - 16 - CARD_H) / (rows - 1)) : 0;
      loose.forEach((id, i) => {
        pos[id] = { x: tray.x + 8 + CARD_W / 2 + (i % 6) * (CARD_W + 7), y: tray.y + 8 + CARD_H / 2 + Math.floor(i / 6) * rowStep };
      });
      for (const col of cols) {
        const list = ids().filter((id) => state.board[id].column === col.id);
        const step = list.length > 1 ? Math.min(CARD_H + 6, (col.h - 46 - CARD_H) / (list.length - 1)) : 0;
        list.forEach((id, i) => (pos[id] = { x: col.x + col.w / 2, y: col.y + 42 + CARD_H / 2 + i * step }));
      }
      return pos;
    };

    const makeCard = (id, px, py) => {
      const def = CARDS[id];
      const card = this.add.container(px, py);
      const isSel = selected === id;
      const bg = this.add.rectangle(0, 0, CARD_W, CARD_H, 0xe9dcbc, 1).setStrokeStyle(isSel ? 4 : 1, isSel ? COLORS.amber : 0x6e5426);
      const pin = this.add.circle(0, -CARD_H / 2 + 3, 4, 0xb5413a);
      const parts = [bg, pin];
      const ix = -CARD_W / 2 + 26;
      const missing = this.registry.get('missing');
      if (def.icon && this.textures.exists(def.icon) && !missing?.has(def.icon)) {
        parts.push(fit(this.add.image(ix, 0, def.icon), 40));
      } else {
        parts.push(this.add.circle(ix, 0, 19, 0x2a2114));
        parts.push(this.add.text(ix, 0, def.glyph ?? '?', { fontFamily: FONT, fontSize: def.glyph?.length > 1 ? '15px' : '22px', fontStyle: 'bold', color: '#f0d9a0' }).setOrigin(0.5));
      }
      const tw = CARD_W - 56;
      const title = this.add.text(ix + 23, -CARD_H / 2 + 5, def.title, { fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#2a1f12' });
      if (title.width > tw) title.setScale(tw / title.width, 1);
      const line = this.add.text(ix + 23, -CARD_H / 2 + 23, def.text, { fontFamily: FONT, fontSize: '12px', fontStyle: 'italic', color: '#5a4630', wordWrap: { width: tw } });
      if (line.height > 30) line.setFontSize(11);
      parts.push(title, line);
      if (state.board[id].fresh) {
        parts.push(this.add.text(CARD_W / 2 - 4, -CARD_H / 2 - 6, 'NEW', { fontFamily: FONT, fontSize: '11px', fontStyle: 'bold', color: '#fff6dc', backgroundColor: '#b5413a', padding: { x: 5, y: 1 } }).setOrigin(1, 0));
      }
      card.add(parts);
      card.cardId = id;
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => !drag && showInfo(id));
      bg.on('pointerout', () => !drag && showInfo(selected));
      bg.on('pointerdown', (p) => {
        if (p.rightButtonDown()) return;
        drag = { id, card, sx: p.x, sy: p.y, ox: card.x - p.x, oy: card.y - p.y, moved: false };
      });
      return card;
    };

    const render = () => {
      layer.removeAll(true);
      const pos = slots();
      const order = ids().sort((a, b) => (a === selected) - (b === selected));
      for (const id of order) layer.add(makeCard(id, pos[id].x, pos[id].y));
      showInfo(selected);
    };

    const place = (id, column) => {
      reaction = state.pinCard(id, column);
      if (reaction) sfx.play('pickup');
      else sfx.play('click');
      selected = null;
      render();
    };
    const columnAt = (px, py) => {
      const col = cols.find((k) => px >= k.x && px <= k.x + k.w && py >= k.y && py <= k.y + k.h);
      if (col) return col.id;
      if (px >= tray.x && px <= tray.x + tray.w && py >= tray.y && py <= tray.y + tray.h) return null;
      return undefined;
    };

    colBgs.forEach((bg, i) => bg.on('pointerdown', () => selected && !drag && place(selected, cols[i].id)));
    trayBg.on('pointerdown', () => selected && !drag && place(selected, null));

    const onMove = (p) => {
      if (!drag) return;
      if (!drag.moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) < 6) return;
      if (!drag.moved) {
        drag.moved = true;
        layer.bringToTop(drag.card);
        drag.card.setScale(1.05);
      }
      drag.card.setPosition(p.x + drag.ox, p.y + drag.oy);
    };
    const onUp = (p) => {
      if (!drag) return;
      const { id, moved } = drag;
      drag = null;
      if (moved) {
        const column = columnAt(p.x, p.y);
        if (column === undefined || column === state.board[id].column) render();
        else place(id, column);
        return;
      }
      selected = selected === id ? null : id;
      sfx.play('click');
      render();
    };
    this.input.on('pointermove', onMove);
    this.input.on('pointerup', onUp);
    this.onKeys(c, {
      down: (e) => {
        if (!selected) return;
        if (/^[1-4]$/.test(e.key)) place(selected, cols[Number(e.key) - 1].id);
        else if (e.key === '0' || e.key === 'Backspace') place(selected, null);
      },
    });
    const prev = c.onClose;
    c.onClose = () => {
      this.input.off('pointermove', onMove);
      this.input.off('pointerup', onUp);
      state.seeCards();
      prev?.();
    };
    render();
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

  statusText(y, width = 700) {
    return this.add
      .text(WIDTH / 2, y, '', { fontFamily: FONT, fontSize: '19px', color: COLORS.paperCss, align: 'center', wordWrap: { width } })
      .setOrigin(0.5, 0);
  }

  onKeys(c, handlers) {
    const down = (e) => handlers.down?.(e);
    const up = (e) => handlers.up?.(e);
    this.input.keyboard.on('keydown', down);
    this.input.keyboard.on('keyup', up);
    const prev = c.onClose;
    c.onClose = () => {
      this.input.keyboard.off('keydown', down);
      this.input.keyboard.off('keyup', up);
      prev?.();
    };
  }

  // ---------- speaking tube ----------

  /**
   * The portrait texture for a speaker: painted art (worried variant when things are tense) squared
   * to 128px, else a head crop of the idle sprite.
   */
  portrait(who, { worried = false, text = '' } = {}) {
    const tense = worried || state.trust <= -TRUST_WARM || state.tide >= 4 || text.startsWith('...');
    const art = [tense && `${who}_portrait_worried`, `${who}_portrait`].find((k) => k && this.textures.exists(k));
    return art ? this.squarePortrait(art) : this.cropPortrait(who);
  }

  squarePortrait(art) {
    const key = `${art}_sq`;
    if (this.textures.exists(key)) return key;
    const src = this.textures.get(art).getSourceImage();
    const side = Math.min(src.width, src.height);
    const out = this.textures.createCanvas(key, 256, 256);
    const ctx = out.getContext();
    ctx.fillStyle = '#1c2a37';
    ctx.fillRect(0, 0, 256, 256);
    ctx.drawImage(src, (src.width - side) / 2, 0, side, side, 0, 0, 256, 256);
    out.refresh();
    return key;
  }

  /** A head-and-shoulders crop of a character texture, made once and cached. */
  cropPortrait(who) {
    const key = `portrait_${who}`;
    if (this.textures.exists(key)) return key;
    const src = this.textures.get(who).getSourceImage();
    const { width: w, height: h } = src;
    const probe = document.createElement('canvas');
    probe.width = w;
    probe.height = h;
    const pctx = probe.getContext('2d', { willReadFrequently: true });
    pctx.drawImage(src, 0, 0);
    const data = pctx.getImageData(0, 0, w, h).data;
    const size = Math.round(h * 0.2);
    let top = 0;
    for (let y = 0; y < h && !top; y++) {
      let n = 0;
      for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 60) n++;
      if (n > 4) top = y;
    }
    let sum = 0;
    let count = 0;
    for (let y = top; y < Math.min(h, top + size * 0.6); y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 60) {
          sum += x;
          count++;
        }
      }
    }
    const cx = count ? sum / count : w / 2;
    const out = this.textures.createCanvas(key, 128, 128);
    const ctx = out.getContext();
    ctx.fillStyle = '#1c2a37';
    ctx.fillRect(0, 0, 128, 128);
    ctx.drawImage(src, cx - size / 2, Math.max(0, top - size * 0.06), size, size, 0, 0, 128, 128);
    out.refresh();
    return key;
  }

  /**
   * Speaking-tube conversation: lines of [who, text]; click or Space advances. A choice entry
   * ({ choice, who, options }) lets the player pick that character's line; the picked option's
   * lines play next and `onChoose(choice, option)` records it.
   */
  talk(lines, onDone, onChoose) {
    this.closeModal();
    state.modal = true;
    const queue = [...lines];
    const speaker = (e) => (Array.isArray(e) ? e[0] : e.who);
    const c = this.add.container(0, 0).setDepth(100);
    const dim = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.35).setOrigin(0).setInteractive({ useHandCursor: true });
    const pw = 1060;
    const ph = 180;
    const px = (WIDTH - pw) / 2;
    const py = HEIGHT - BAR_H - ph - 14;
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panel, 0.96).fillRoundedRect(px, py, pw, ph, 14);
    panel.lineStyle(2, COLORS.panelEdge, 0.7).strokeRoundedRect(px, py, pw, ph, 14);
    // The panel swallows clicks too, so a click on it advances instead of reaching the room.
    const hit = this.add.rectangle(px, py, pw, ph, 0x000000, 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
    const face = this.add.image(px + 90, py + ph / 2, this.portrait(speaker(queue[0]))).setDisplaySize(132, 132);
    const ring = this.add.graphics();
    const name = this.add.text(px + 180, py + 20, '', { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: COLORS.paperCss });
    const body = this.add.text(px + 180, py + 52, '', {
      fontFamily: FONT,
      fontSize: '22px',
      color: COLORS.paperCss,
      wordWrap: { width: pw - 220 },
      lineSpacing: 5,
    });
    const more = this.add
      .text(px + pw - 20, py + ph - 14, 'Click or Space', { fontFamily: FONT, fontSize: '15px', color: COLORS.mutedCss })
      .setOrigin(1, 1);
    const tube = this.add
      .text(px + 20, py - 10, 'Speaking tube', { fontFamily: FONT, fontSize: '15px', fontStyle: 'italic', color: COLORS.amberCss })
      .setOrigin(0, 1);
    const remember = this.add
      .text(px + pw - 20, py - 10, '', { fontFamily: FONT, fontSize: '16px', fontStyle: 'italic', color: COLORS.amberCss })
      .setOrigin(1, 1);
    c.add([dim, panel, hit, face, ring, name, body, more, tube, remember]);
    Object.assign(c, { closable: false, kind: 'talk' });
    this.modal = c;

    let options = null;
    let opened = this.time.now;
    const setFace = (who, text) => {
      const ch = CHARACTERS[who];
      face.setTexture(this.portrait(who, { text })).setDisplaySize(132, 132);
      ring.clear().lineStyle(4, ch.color, 1).strokeRect(px + 24, py + ph / 2 - 66, 132, 132);
      return ch;
    };
    const pick = (entry, option) => {
      if (!options) return;
      options.forEach((o) => o.destroy());
      options = null;
      sfx.play('click');
      onChoose?.(entry, option);
      queue.unshift(...option.lines);
      if (option.kind !== 'deflect') {
        const listener = CHARACTERS[entry.who === 'mara' ? 'tobin' : 'mara'].name;
        remember.setText(`${listener} will remember that.`).setAlpha(1);
        this.tweens.add({ targets: remember, alpha: 0, delay: 2600, duration: 600 });
      }
      opened = this.time.now;
      show();
    };
    const showChoice = (entry) => {
      const ch = setFace(entry.who);
      name.setText(`${ch.name.toUpperCase()}  ·  choose a line`).setColor(ch.css);
      body.setText('');
      more.setText('Click a line, or press 1-' + entry.options.length);
      if (state.markSeen('tube_choice')) this.toast(TUTORIAL.choice);
      options = entry.options.map((option, i) => {
        const btn = this.add
          .text(px + 180, py + 54 + i * 40, `${i + 1}.  ${CHOICE_LABELS[option.kind]}:  ${option.label}`, {
            fontFamily: FONT,
            fontSize: '19px',
            color: CHOICE_HEX[option.kind],
            backgroundColor: BUTTON_BG,
            padding: { x: 12, y: 5 },
          })
          .setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setBackgroundColor(BUTTON_HOVER));
        btn.on('pointerout', () => btn.setBackgroundColor(BUTTON_BG));
        btn.on('pointerdown', (p) => !p.rightButtonDown() && pick(entry, option));
        btn.option = option;
        c.add(btn);
        return btn;
      });
      options.entry = entry;
    };
    const show = () => {
      const entry = queue.shift();
      if (entry === undefined) {
        this.closeModal();
        onDone?.();
        return;
      }
      if (!Array.isArray(entry)) return showChoice(entry);
      const [who, text] = entry;
      const ch = setFace(who, text);
      name.setText(ch.name.toUpperCase()).setColor(ch.css);
      body.setText(text).setAlpha(0);
      this.tweens.add({ targets: body, alpha: 1, duration: 180 });
      more.setText(queue.length === 0 ? 'Click or Space to close' : 'Click or Space');
    };
    const advance = () => {
      if (options || this.time.now - opened < 250) return;
      sfx.play('click');
      show();
    };
    dim.on('pointerdown', advance);
    hit.on('pointerdown', advance);
    this.onKeys(c, {
      down: (e) => {
        if (options) {
          const n = Number(e.key);
          if (n >= 1 && n <= options.length) pick(options.entry, options[n - 1].option);
          return;
        }
        if (e.code === 'Space' || e.key === 'Enter') advance();
      },
    });
    show();
  }

  // ---------- ending card and the twist ----------

  endingCard({ title, image, text, footer }, onDone) {
    this.closeModal();
    this.clearMessages();
    state.modal = true;
    const c = this.add.container(0, 0).setDepth(150);
    const bg = this.add.image(0, 0, image).setOrigin(0).setDisplaySize(WIDTH, HEIGHT).setInteractive();
    const shade = this.add.graphics();
    shade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.88, 0, 0.88, 0);
    shade.fillRect(0, 0, WIDTH * 0.78, HEIGHT);
    const t = this.add.text(80, 70, title, { fontFamily: FONT, fontSize: '42px', fontStyle: 'bold', color: COLORS.paperCss, wordWrap: { width: 660 } });
    const body = this.add.text(82, t.y + t.height + 22, text, {
      fontFamily: FONT,
      fontSize: '19px',
      color: COLORS.paperCss,
      wordWrap: { width: 620 },
      lineSpacing: 5,
    });
    const parts = [t, body];
    if (footer) {
      parts.push(
        this.add.text(82, body.y + body.height + 20, footer, { fontFamily: FONT, fontSize: '18px', fontStyle: 'italic', color: COLORS.amberCss, wordWrap: { width: 620 } }),
      );
    }
    const btn = this.makeButton(82, HEIGHT - 80, 'Continue', () => {
      this.closeModal();
      onDone();
    }, '22px');
    parts.push(btn);
    c.add([bg, shade, ...parts]);
    Object.assign(c, { closable: false, kind: 'ending' });
    this.modal = c;
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 900 });
    parts.forEach((p, i) => {
      p.setAlpha(0);
      this.tweens.add({ targets: p, alpha: 1, duration: 700, delay: 700 + i * 400 });
    });
  }

  /** Fades to black with a line of text, runs `onDone` under the black, then fades back. */
  blackCard(text, onDone) {
    state.modal = true;
    const c = this.add.container(0, 0).setDepth(200);
    const black = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 1).setOrigin(0).setInteractive();
    const line = this.add
      .text(WIDTH / 2, HEIGHT / 2, text, { fontFamily: FONT, fontSize: '34px', fontStyle: 'italic', color: COLORS.paperCss })
      .setOrigin(0.5)
      .setAlpha(0);
    c.add([black, line]);
    this.tweens.chain({
      targets: line,
      tweens: [
        { alpha: 1, duration: 900, delay: 300 },
        { alpha: 0, duration: 700, delay: 1700 },
      ],
      onComplete: () => {
        state.modal = false;
        onDone();
        this.tweens.add({ targets: c, alpha: 0, duration: 900, onComplete: () => c.destroy() });
      },
    });
  }

  // ---------- mini-puzzle A: lens dial ----------

  lens({ panels, rotation, wiped, rotate, wipe, attempt }) {
    const c = this.openModal(840, 660, { kind: 'lens' });
    const { x, y, w, h } = c.box;
    const cx = WIDTH / 2;
    const cy = y + 285;
    const R = 180;
    let rot = rotation;
    let solved = false;
    let isWiped = wiped;

    c.add(this.titleText('The great lens', y + 20));
    if (this.textures.exists('lens_closeup') && !this.registry.get('missing').has('lens_closeup')) {
      const img = this.add.image(cx, cy, 'lens_closeup');
      img.setScale((2 * (R - 30)) / (img.height * 0.76));
      img.setMask(this.make.graphics().fillCircle(cx, cy, R + 40).createGeometryMask());
      c.add(img);
    } else {
      const glass = this.add.graphics();
      for (let r = R - 40; r > 10; r -= 14) glass.lineStyle(6, 0xd9a441, 0.08 + (R - r) / 900).strokeCircle(cx, cy, r);
      c.add(glass);
    }

    const soot = this.add.graphics();
    soot.fillStyle(0x221d18, 0.92).fillCircle(cx, cy, R - 36);
    [[-40, -30, 50], [50, 20, 60], [-10, 60, 40], [30, -70, 35]].forEach(([dx, dy, r]) => soot.fillStyle(0x3a332b, 0.6).fillCircle(cx + dx, cy + dy, r));
    soot.setVisible(!isWiped);
    c.add(soot);

    const ring = this.add.container(cx, cy);
    const band = this.add.graphics();
    band.lineStyle(46, 0x6e5426, 1).strokeCircle(0, 0, R);
    band.lineStyle(2, 0xd9b45a, 0.9).strokeCircle(0, 0, R + 23).strokeCircle(0, 0, R - 23);
    ring.add(band);
    panels.forEach((p, i) => {
      const a = Phaser.Math.DegToRad(90 + i * 45);
      const plaque = this.add.container(Math.cos(a) * R, Math.sin(a) * R).setRotation(a - Math.PI / 2);
      const bgp = this.add.rectangle(0, 0, 92, 34, p === 'anchor' ? 0x3b2e17 : 0x2a2114, 1).setStrokeStyle(1, 0xd9b45a, 0.8);
      const label = this.add.text(0, 0, p.toUpperCase(), { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#f0d9a0' }).setOrigin(0.5);
      plaque.add([bgp, label]);
      ring.add(plaque);
    });
    ring.setAngle(-rot * 45);
    c.add(ring);

    const pointer = this.add.graphics();
    pointer.fillStyle(0xe0786f, 1).fillTriangle(cx, cy + R + 26, cx - 14, cy + R + 50, cx + 14, cy + R + 50);
    const wellLabel = this.add.text(cx, cy + R + 54, 'WELL', { fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#e0786f' }).setOrigin(0.5, 0);
    c.add([pointer, wellLabel]);

    const status = this.statusText(y + h - 104);
    status.setText(isWiped ? 'Turn the ring with the arrows or A / D.' : 'The glass is black with soot. Turn the ring with the arrows or A / D.');
    c.add(status);

    let targetAngle = ring.angle;
    const check = () => {
      if (solved || !attempt(panels[rot])) return;
      solved = true;
      status.setText('The lens settles. Far below, something brightens.').setColor(COLORS.amberCss);
      this.time.delayedCall(1300, () => this.modal === c && this.closeModal());
    };
    const turn = (d) => {
      if (solved) return;
      rot = (rot + d + panels.length) % panels.length;
      rotate(rot);
      sfx.play('click');
      targetAngle -= d * 45;
      this.tweens.add({ targets: ring, angle: targetAngle, duration: 220, ease: 'Back.Out' });
      check();
    };
    const left = this.makeButton(cx - R - 110, cy, '◀', () => turn(-1), '30px').setOrigin(0.5);
    const right = this.makeButton(cx + R + 110, cy, '▶', () => turn(1), '30px').setOrigin(0.5);
    const wipeBtn = this.makeButton(x + 40, y + h - 58, isWiped ? 'Wiped' : 'Wipe with scarf', () => {
      if (isWiped) return;
      isWiped = true;
      wipeBtn.setText('Wiped');
      const streaks = this.add.graphics();
      c.add(streaks);
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 900,
        onUpdate: (tw) => {
          const v = tw.getValue();
          streaks.clear();
          for (let k = 0; k < 4; k++) streaks.fillStyle(0xe8d8b8, 0.18).fillRect(cx - R + v * 2 * R - 40, cy - 120 + k * 60, 80, 22);
          soot.setAlpha(1 - v);
        },
        onComplete: () => {
          streaks.destroy();
          soot.setVisible(false);
          check();
        },
      });
      status.setText(wipe() ?? '');
    }, '20px');
    const close = this.makeButton(x + w - 40, y + h - 58, 'Close (Esc)', () => this.closeModal(), '20px').setOrigin(1, 0);
    c.add([left, right, wipeBtn, close]);
    this.onKeys(c, {
      down: (e) => {
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') turn(-1);
        else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') turn(1);
      },
    });
  }

  // ---------- mini-puzzle B: valve wheels ----------

  valves({ colors, settings, wrongText, change, attempt }) {
    const c = this.openModal(940, 500, { kind: 'valves' });
    const { x, y, w, h } = c.box;
    const values = [...settings];
    let solved = false;
    c.add(this.titleText('Valve wheels', y + 22));
    c.add(
      this.add
        .text(WIDTH / 2, y + 70, 'Click a wheel or press 1–5 to turn it. Then open the sluice.', { fontFamily: FONT, fontSize: '17px', color: COLORS.mutedCss })
        .setOrigin(0.5, 0),
    );

    const wheels = values.map((v, i) => {
      const wx = WIDTH / 2 + (i - 2) * 160;
      const wy = y + 210;
      const wheel = this.add.container(wx, wy);
      const g = this.add.graphics();
      wheel.add(g);
      const draw = () => {
        g.clear();
        g.lineStyle(12, VALVE_HEX[colors[values[i]]], 1).strokeCircle(0, 0, 50);
        g.lineStyle(5, 0x2f3438, 1).strokeCircle(0, 0, 61);
        g.lineStyle(7, 0x3e454b, 1);
        for (let k = 0; k < 4; k++) {
          const a = (k * Math.PI) / 2;
          g.lineBetween(0, 0, Math.cos(a) * 58, Math.sin(a) * 58);
        }
        g.fillStyle(0x50585f, 1).fillCircle(0, 0, 14);
        g.fillStyle(0xd9b45a, 1).fillCircle(0, -58, 5);
      };
      draw();
      const hit = this.add.circle(wx, wy, 66).setInteractive({ useHandCursor: true });
      hit.setFillStyle(0xffffff, 0.001);
      hit.on('pointerdown', () => turn(i));
      const num = this.add.text(wx, wy + 82, String(i + 1), { fontFamily: FONT, fontSize: '20px', color: COLORS.mutedCss }).setOrigin(0.5);
      c.add([wheel, hit, num]);
      return { wheel, draw };
    });

    const status = this.statusText(y + 330);
    c.add(status);
    const turn = (i) => {
      if (solved) return;
      values[i] = (values[i] + 1) % colors.length;
      change(values);
      sfx.play('click');
      wheels[i].draw();
      this.tweens.add({ targets: wheels[i].wheel, angle: wheels[i].wheel.angle + 90, duration: 240, ease: 'Cubic.Out' });
      status.setText('');
    };
    const pull = () => {
      if (solved) return;
      if (attempt([...values])) {
        solved = true;
        status.setText('The sluice groans open.').setColor(COLORS.amberCss);
        this.time.delayedCall(800, () => this.modal === c && this.closeModal());
        return;
      }
      status.setText(`${wrongText}\nThe tide rises.`).setColor('#e8a090');
      this.cameras.main.shake(260, 0.004);
      wheels.forEach(({ wheel }) => this.tweens.add({ targets: wheel, x: wheel.x + 6, duration: 50, yoyo: true, repeat: 3 }));
    };
    const lever = this.makeButton(WIDTH / 2, y + h - 66, 'Open sluice (Enter)', pull, '22px').setOrigin(0.5);
    const close = this.makeButton(x + w - 30, y + h - 66, 'Close (Esc)', () => this.closeModal(), '18px').setOrigin(1, 0.5);
    c.add([lever, close]);
    this.onKeys(c, {
      down: (e) => {
        if (/^[1-5]$/.test(e.key)) turn(Number(e.key) - 1);
        else if (e.key === 'Enter') pull();
      },
    });
  }

  // ---------- mini-puzzle C: Morse shutter ----------

  morse({ words, code, step, onDone }) {
    const c = this.openModal(960, 600, { kind: 'morse' });
    const { x, y, w, h } = c.box;
    c.add(this.titleText('The shutter', y + 20));
    const intro = this.add
      .text(WIDTH / 2, y + 90, 'The cutter Vigilant is close enough to read the lamp. What will you send?', {
        fontFamily: FONT,
        fontSize: '20px',
        color: COLORS.paperCss,
        wordWrap: { width: 760 },
        align: 'center',
      })
      .setOrigin(0.5, 0);
    const picks = words.map((opt, i) => {
      const oy = y + 180 + i * 70;
      if (opt.enabled) return this.makeButton(WIDTH / 2, oy, opt.word, () => begin(opt.word), '26px').setOrigin(0.5, 0);
      return this.add
        .text(WIDTH / 2, oy, `${opt.word}  (${opt.lockedLabel})`, { fontFamily: FONT, fontSize: '26px', color: '#5d6b76', backgroundColor: '#141c24', padding: { x: 14, y: 7 } })
        .setOrigin(0.5, 0);
    });
    const close = this.makeButton(x + w - 30, y + h - 50, 'Close (Esc)', () => this.closeModal(), '18px').setOrigin(1, 0.5);
    c.add([intro, ...picks, close]);

    const begin = (word) => {
      intro.destroy();
      picks.forEach((p) => p.destroy());
      let progress = { letter: 0, buffer: '' };
      let finished = false;

      const boxes = [...word].map((ch, i) => {
        const bx = x + 110 + i * 84;
        const box = this.add.rectangle(bx, y + 160, 70, 80, 0x0b1118).setStrokeStyle(2, 0x3b5266);
        const letter = this.add.text(bx, y + 160, '', { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: COLORS.amberCss }).setOrigin(0.5);
        const buf = this.add.text(bx, y + 210, '', { fontFamily: 'monospace', fontSize: '20px', color: COLORS.paperCss }).setOrigin(0.5, 0);
        c.add([box, letter, buf]);
        return { box, letter, buf, ch };
      });
      const target = this.add.text(x + 75, y + 82, `Sending: ${word}`, { fontFamily: FONT, fontSize: '18px', color: COLORS.mutedCss });

      const cardX = x + w - 270;
      const card = this.add.graphics();
      card.fillStyle(0xe9dcbc, 1).fillRoundedRect(cardX, y + 82, 230, 330, 8);
      const cardTitle = this.add.text(cardX + 115, y + 98, 'FLASH-CODE CARD', { fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: '#2a1f12' }).setOrigin(0.5, 0);
      const cardText = this.add.text(
        cardX + 40,
        y + 134,
        Object.entries(code).map(([k, v]) => `${k}    ${prettyMorse(v)}`).join('\n'),
        { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#2a1f12', lineSpacing: 9 },
      );

      const lamp = this.add.circle(x + 200, y + 290, 30, 0xffe2a0, 1).setAlpha(0.15);
      const lampLabel = this.add.text(x + 200, y + 324, 'lamp', { fontFamily: FONT, fontSize: '14px', color: COLORS.mutedCss }).setOrigin(0.5, 0);
      const leverBg = this.add.rectangle(x + 200, y + 410, 280, 120, 0x2a2114).setStrokeStyle(2, 0xd9b45a).setInteractive({ useHandCursor: true });
      const leverText = this.add
        .text(x + 200, y + 410, 'SHUTTER LEVER\ntap = dot   hold = dash', { fontFamily: FONT, fontSize: '19px', color: '#f0d9a0', align: 'center' })
        .setOrigin(0.5);
      const dotBtn = this.makeButton(x + 470, y + 300, '·  dot', () => input('.'), '24px').setOrigin(0.5);
      const dashBtn = this.makeButton(x + 470, y + 370, '—  dash', () => input('-'), '24px').setOrigin(0.5);
      const keysHint = this.add
        .text(x + 470, y + 420, 'Keys: .  and  -   or tap / hold Space', { fontFamily: FONT, fontSize: '15px', color: COLORS.mutedCss })
        .setOrigin(0.5, 0);
      const status = this.statusText(y + h - 100, 600).setX(x + 330);
      c.add([target, card, cardTitle, cardText, lamp, lampLabel, leverBg, leverText, dotBtn, dashBtn, keysHint, status]);

      const mark = () => {
        boxes.forEach((b, i) => {
          b.box.setStrokeStyle(i === progress.letter ? 3 : 2, i === progress.letter ? COLORS.amber : 0x3b5266);
          b.buf.setText(i === progress.letter ? prettyMorse(progress.buffer) : '');
        });
      };
      const flash = (sym) => {
        const ms = sym === '.' ? 120 : 420;
        state.emit('flash', ms);
        this.tweens.killTweensOf(lamp);
        lamp.setAlpha(1);
        this.tweens.add({ targets: lamp, alpha: 0.15, delay: ms, duration: 160 });
      };
      const input = (sym) => {
        if (finished) return;
        flash(sym);
        const at = progress.letter;
        progress = step(word, progress, sym);
        if (progress.result === 'wrong') {
          sfx.play('error');
          status.setText('That isn\'t the letter. Start it again.').setColor('#e8a090');
          const b = boxes[at].box;
          this.tweens.add({ targets: b, x: b.x + 8, duration: 50, yoyo: true, repeat: 3, onComplete: () => b.setX(x + 110 + at * 84) });
        } else if (progress.result === 'letter' || progress.result === 'done') {
          sfx.play('click');
          boxes[at].letter.setText(boxes[at].ch);
          status.setText('');
        } else {
          status.setText('');
        }
        mark();
        if (progress.result === 'done') {
          finished = true;
          sfx.play('unlock');
          status.setText(`${word}. Sent. Now watch the window.`).setColor(COLORS.amberCss);
          this.time.delayedCall(1000, () => {
            if (this.modal === c) this.closeModal();
            onDone(word);
          });
        }
      };

      let pressedAt = null;
      leverBg.on('pointerdown', () => {
        pressedAt = this.time.now;
        lamp.setAlpha(1);
      });
      const release = () => {
        if (pressedAt === null) return;
        const held = this.time.now - pressedAt;
        pressedAt = null;
        input(held < DOT_MS ? '.' : '-');
      };
      this.input.on('pointerup', release);
      let spaceAt = null;
      this.onKeys(c, {
        down: (e) => {
          if (e.key === '.') input('.');
          else if (e.key === '-' || e.key === '_') input('-');
          else if (e.code === 'Space' && spaceAt === null) {
            spaceAt = this.time.now;
            lamp.setAlpha(1);
          }
        },
        up: (e) => {
          if (e.code !== 'Space' || spaceAt === null) return;
          const held = this.time.now - spaceAt;
          spaceAt = null;
          input(held < DOT_MS ? '.' : '-');
        },
      });
      const prev = c.onClose;
      c.onClose = () => {
        this.input.off('pointerup', release);
        prev?.();
      };
      mark();
    };
  }
}
