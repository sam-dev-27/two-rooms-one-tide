import { TIDE_MAX } from '../../src/config.js';
import { CHARACTERS, ROOMS } from '../../src/data/rooms.js';
import { ITEMS } from '../../src/data/items.js';
import { CARDS } from '../../src/data/board.js';
import { CARD_TOAST, HOLD_TEXT, REVEAL_TIP, TUTORIAL } from '../../src/data/text.js';
import { isStuck, objective, useHint } from '../../src/systems/Hints.js';
import { itemSrc } from '../assets.js';
import {
  WIDTH, HEIGHT, AMBER, PAPER, MUTED, RED, BAR_H, TOP_H, CSS_EASE,
  el, setStyle, svg, button, text, place, fadeTo, stopAnims, measure,
} from './dom.js';
import { keypad, choice, howTo, closeup, endingCard, blackCard } from './modals.js';
import { lens, valves, morse } from './puzzles.js';
import { toggleCase } from './board.js';
import { talk } from './talk.js';
import { cutscene, title, endingScreen } from './screens.js';

const TOP_ROW = 22;
const OBJ_ROW = 53;
const REVEAL_TIP_MS = 240_000;
const SLOT = 64;
const SLOT_GAP = 12;
const SLOT_COUNT = 8;
const SLOT_X0 = 32;
const BRASS = '#b08a3e';
const INFO_X = SLOT_X0 + SLOT_COUNT * (SLOT + SLOT_GAP) + 12;

let scale = 1;

/** Letterboxes #app to 16:9 in the window and scales the 1280x720 stage to fit it. */
export function layout() {
  const app = document.getElementById('app');
  const stage = document.querySelector('#hud > .stage');
  const w = Math.min(window.innerWidth, (window.innerHeight * 16) / 9);
  const h = (w * 9) / 16;
  setStyle(app, { width: w, height: h, left: (window.innerWidth - w) / 2, top: (window.innerHeight - h) / 2, translate: 'none' });
  scale = w / WIDTH;
  if (stage) stage.style.transform = `scale(${scale})`;
}

export function clientToStage(x, y) {
  const r = document.getElementById('app').getBoundingClientRect();
  return { x: (x - r.left) / scale, y: (y - r.top) / scale };
}

export function stageToClient(x, y) {
  const r = document.getElementById('app').getBoundingClientRect();
  return { x: r.left + x * scale, y: r.top + y * scale };
}

export function createUI({ state, sfx, hooks = {} }) {
  const hud = document.getElementById('hud');
  const app = document.getElementById('app');
  hud.querySelector('.stage')?.remove();
  const stage = el('div', { cls: 'stage', parent: hud });
  layout();
  window.addEventListener('resize', layout);

  const ui = {
    state, sfx, hooks, stage,
    modal: null,
    showing: false,
    currentMessage: null,
    log: [],
    screen: null,
    endingEpilogue: null,
    clientToStage,
    stageToClient,
  };
  const ctx = {};

  // ---------- top bar ----------

  el('div', { cls: 'topbar', parent: stage });
  const who = el('div', { cls: 'who', parent: stage, style: { left: 24, top: TOP_ROW - 17 } });
  const whoName = el('span', { cls: 'who-name', parent: who });
  const gauge = svg('svg', { width: 34, height: 34, viewBox: '-17 -17 34 34', class: 'gauge' }, who);
  const tideLabel = el('span', { cls: 'tide-label', parent: who });
  const objText = text(stage, '', { x: 24, y: OBJ_ROW, oy: 0.5, size: 17, color: AMBER, cls: 'objective' });
  const revealTip = text(stage, REVEAL_TIP, { x: WIDTH - 16, y: OBJ_ROW, ox: 1, oy: 0.5, size: 15, color: MUTED, cls: 'bar-text' });
  revealTip.hidden = true;
  const topButtons = el('div', { cls: 'top-buttons', parent: stage, style: { right: 16, top: TOP_ROW - 17 } });
  const swapBtn = button('', () => state.emit('request-swap'), { size: 17, parent: topButtons, sfx });
  const hintBtn = button('Hint (H)', () => showHint(), { size: 17, parent: topButtons, sfx, cls: 'hint-btn' });
  const caseBtn = button('Case (C)', () => ui.toggleCase('board'), { size: 17, parent: topButtons, sfx });
  const muteBtn = button(sfx.muted ? 'Sound off' : 'Sound on', () => toggleMute(), { size: 17, parent: topButtons, sfx });
  button('?', () => toggleHowTo(), { size: 17, parent: topButtons, sfx });
  let objKey = null;
  let pulsing = false;

  function drawTide() {
    const r = 13;
    const angle = (i) => ((150 + (i * 240) / TIDE_MAX) * Math.PI) / 180;
    gauge.replaceChildren();
    svg('circle', { r: r + 4, fill: '#241c12', stroke: BRASS, 'stroke-width': 2 }, gauge);
    for (let i = 0; i <= TIDE_MAX; i++) {
      const a = angle(i);
      const [c, s] = [Math.cos(a), Math.sin(a)];
      svg('line', { x1: c * (r - 5), y1: s * (r - 5), x2: c * (r - 1), y2: s * (r - 1), stroke: i <= state.tide ? '#6fb7d0' : '#5a5040', 'stroke-width': 2 }, gauge);
    }
    const a = angle(state.tide);
    svg('line', { x1: 0, y1: 0, x2: Math.cos(a) * (r - 3), y2: Math.sin(a) * (r - 3), stroke: '#e0786f', 'stroke-width': 2 }, gauge);
    svg('circle', { r: 3, fill: BRASS }, gauge);
    tideLabel.textContent = `Tide ${state.tide}/${TIDE_MAX}`;
  }

  function updateCaseButton() {
    const fresh = state.freshCards;
    caseBtn.textContent = fresh ? `Case (C)  ·  ${fresh} new` : 'Case (C)';
    caseBtn.style.color = fresh ? AMBER : '';
  }

  function updateObjective() {
    revealTip.hidden = !(!state.seen.has('space_reveal') && Date.now() - state.startedAt < REVEAL_TIP_MS);
    const goal = objective(state);
    const key = `${state.active}:${goal}`;
    if (key === objKey) return;
    const changed = objKey !== null && objKey.startsWith(state.active) && goal;
    objKey = key;
    objText.textContent = goal ? `Objective: ${goal}` : '';
    if (!changed) return;
    stopAnims(objText);
    objText.animate(
      [{ scale: 1, color: '#fff6dc' }, { scale: 1.08, color: '#fff6dc' }, { scale: 1, color: '#fff6dc' }],
      { duration: 440, iterations: 3, easing: CSS_EASE.sineInOut },
    );
  }

  // ---------- inventory ----------

  el('div', { cls: 'invbar', parent: stage });
  const incoming = new Set();
  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => {
    const x = SLOT_X0 + i * (SLOT + SLOT_GAP);
    const frame = button('', () => onSlot(i), { cls: 'slot', parent: stage, style: { left: x, top: HEIGHT - BAR_H / 2 - SLOT / 2 } });
    frame.dataset.slot = String(i);
    const icon = el('div', { cls: 'slot-icon', parent: frame });
    el('span', { cls: 'slot-num', text: String(i + 1), parent: frame });
    frame.addEventListener('pointerenter', () => showItemInfo(i));
    frame.addEventListener('pointerleave', () => showItemInfo(-1));
    return { frame, icon, item: null, x: x + SLOT / 2, y: HEIGHT - BAR_H / 2 };
  });
  const itemInfo = text(stage, '', { x: INFO_X, y: HEIGHT - BAR_H / 2, oy: 0.5, size: 18, color: MUTED, width: WIDTH - (INFO_X + 24), cls: 'bar-text' });

  function onSlot(i) {
    const item = state.inventory[state.active][i];
    if (!item) return;
    sfx.play('click');
    state.select(state.selected === item ? null : item);
  }

  function showItemInfo(i) {
    const item = state.inventory[state.active][i];
    if (item) {
      itemInfo.style.color = PAPER;
      itemInfo.textContent = `${ITEMS[item].name}: ${ITEMS[item].desc}`;
    } else if (state.selected) {
      itemInfo.style.color = AMBER;
      itemInfo.textContent = `Holding the ${ITEMS[state.selected].name.toLowerCase()}. Look at something and click (or E) to use it, or at the hatch to send it. Right-click or Q to drop.`;
    } else {
      itemInfo.style.color = MUTED;
      itemInfo.textContent = state.inventory[state.active].length ? 'Press 1-8 or click an item to hold it.' : '';
    }
  }

  /** The item's icon, or a coloured square with its initial when the art is missing. */
  function itemIcon(item, parent) {
    const src = itemSrc(item);
    if (src) return el('img', { cls: 'item-img', attrs: { src, alt: ITEMS[item]?.name ?? item, draggable: 'false' }, parent });
    return el('div', { cls: 'item-fallback', text: (ITEMS[item]?.name ?? item)[0], style: { background: ITEMS[item]?.color ?? '#555' }, parent });
  }

  function refresh() {
    const inv = state.inventory[state.active];
    slots.forEach((slot, i) => {
      const item = inv[i] ?? null;
      slot.frame.classList.toggle('selected', !!item && item === state.selected);
      slot.frame.classList.remove('flash');
      if (slot.item !== item) {
        slot.icon.replaceChildren();
        if (item) itemIcon(item, slot.icon);
        slot.item = item;
      }
      slot.icon.style.visibility = item && !incoming.has(item) ? 'visible' : 'hidden';
    });
    const ch = CHARACTERS[state.active];
    whoName.textContent = `${ch.name}  ·  ${ROOMS[ch.room].name}`;
    const waiting = state.arrivals[state.other].length;
    swapBtn.textContent = `Switch to ${CHARACTERS[state.other].name} (Tab)${waiting ? `  ·  ${waiting} in the hatch` : ''}`;
    updateCaseButton();
    drawTide();
    showItemInfo(-1);
  }

  function pickup(item, x, y) {
    incoming.add(item);
    refresh();
    const inv = state.inventory[state.active];
    const idx = inv.includes(item) ? inv.indexOf(item) : inv.length - 1;
    const slot = slots[Math.min(SLOT_COUNT - 1, Math.max(0, idx))];
    const fly = el('div', { cls: 'fly', parent: stage, style: { left: x - 48, top: y - 48, width: 96, height: 96 } });
    itemIcon(item, fly);
    const end = `translate(${slot.x - x}px, ${slot.y - y}px) scale(${(SLOT - 10) / 96})`;
    fly.animate(
      [
        { transform: 'translate(0, 0) scale(1)', easing: CSS_EASE.backOut },
        { transform: 'translate(0, 0) scale(1.3)', offset: 180 / 700, easing: CSS_EASE.cubicIn },
        { transform: end },
      ],
      { duration: 700, fill: 'forwards' },
    );
    setTimeout(() => {
      fly.remove();
      incoming.delete(item);
      refresh();
      slot.icon.animate([{ scale: 1.35 }, { scale: 1 }], { duration: 260, easing: CSS_EASE.backOut });
      slot.frame.classList.add('flash');
      setTimeout(refresh, 300);
    }, 700);
  }

  function sent(item, x, y, dir = 1) {
    const icon = el('div', { cls: 'fly', parent: stage, style: { left: x - 28, top: y - 28, width: 56, height: 56 } });
    itemIcon(item, icon);
    icon.animate([{ transform: 'none', opacity: 1 }, { transform: `translateY(${70 * dir}px) scale(0.5)`, opacity: 0 }], { duration: 450, easing: CSS_EASE.cubicIn, fill: 'forwards' });
    setTimeout(() => icon.remove(), 450);
  }

  // ---------- messages ----------

  const msg = el('div', { cls: 'msg', parent: stage, style: { bottom: HEIGHT - (HEIGHT - BAR_H - 24) } });
  let queue = [];
  let msgTimer = 0;
  let msgHeld = false;
  let msgCurrent;

  function hideMsgNow() {
    stopAnims(msg);
    msg.style.opacity = 0;
  }

  function say(textLine) {
    ui.log.push(textLine);
    queue.push(textLine);
    if (!ui.showing) nextMessage();
  }

  function holdMessages() {
    if (ui.showing && !msgHeld && msgCurrent) queue.unshift(msgCurrent);
    clearTimeout(msgTimer);
    hideMsgNow();
    ui.showing = true;
    ui.currentMessage = null;
    msgHeld = true;
  }

  function releaseMessages() {
    if (!msgHeld) return;
    msgHeld = false;
    ui.showing = false;
    nextMessage();
  }

  function clearMessages() {
    queue = [];
    clearTimeout(msgTimer);
    ui.showing = false;
    ui.currentMessage = null;
    msgHeld = false;
    hideMsgNow();
  }

  function nextMessage() {
    clearTimeout(msgTimer);
    const line = queue.shift();
    msgCurrent = line;
    if (line === undefined) {
      ui.showing = false;
      ui.currentMessage = null;
      fadeTo(msg, 0, 400);
      return;
    }
    ui.showing = true;
    ui.currentMessage = line;
    msg.textContent = line;
    stopAnims(msg);
    msg.style.opacity = 1;
    msg.animate([{ opacity: 0.3, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { duration: 180, easing: CSS_EASE.cubicOut });
    msgTimer = setTimeout(nextMessage, 2400 + line.length * 45);
  }

  // ---------- toasts ----------

  const toastEl = el('div', { cls: 'toast', parent: stage, style: { top: TOP_H + 18 } });
  const cardToast = el('div', { cls: 'card-toast', parent: stage, style: { left: 16, top: TOP_H + 8 } });
  let toastQueue = [];
  let toastBusy = false;
  let toastCurrent = null;
  let toastTimers = [];
  let cardTitles = [];
  let cardTimer = 0;

  const clearToastTimers = () => {
    toastTimers.forEach(clearTimeout);
    toastTimers = [];
    stopAnims(toastEl);
  };

  function toast(line) {
    if (!line) return;
    if (toastBusy && toastCurrent !== TUTORIAL.look) {
      if (!toastQueue.includes(line)) toastQueue.push(line);
      return;
    }
    toastBusy = true;
    toastCurrent = line;
    clearToastTimers();
    toastEl.textContent = line;
    toastEl.style.opacity = 1;
    toastEl.animate([{ opacity: 0, translate: '0 -14px' }, { opacity: 1, translate: '0 0' }], { duration: 260, easing: CSS_EASE.cubicOut });
    const hold = toastQueue.length ? 4200 : 6500;
    toastTimers.push(setTimeout(() => {
      fadeTo(toastEl, 0, 400);
      toastTimers.push(setTimeout(nextToast, 400));
    }, 260 + hold));
  }

  function nextToast() {
    toastBusy = false;
    toastCurrent = null;
    const next = toastQueue.shift();
    if (next) toast(next);
  }

  function hideToast() {
    toastQueue = toastQueue.filter((t) => t !== TUTORIAL.swap && t !== TUTORIAL.look);
    if (!toastBusy) return;
    clearToastTimers();
    fadeTo(toastEl, 0, 200);
    toastTimers.push(setTimeout(nextToast, 200));
  }

  function onCard(id) {
    updateCaseButton();
    cardTitles.push(CARDS[id].title);
    cardToast.textContent = `${CARD_TOAST}: ${cardTitles.join(', ')}`;
    stopAnims(cardToast);
    cardToast.style.opacity = 1;
    cardToast.animate([{ scale: 1.06 }, { scale: 1 }], { duration: 220, easing: CSS_EASE.backOut });
    clearTimeout(cardTimer);
    cardTimer = setTimeout(() => {
      cardTitles = [];
      fadeTo(cardToast, 0, 400);
    }, 2800);
  }

  // ---------- hold countdown ----------

  const holdSvg = svg('svg', { class: 'hold-svg', width: WIDTH, height: HEIGHT, viewBox: `0 0 ${WIDTH} ${HEIGHT}` }, stage);
  const holdText = el('div', { cls: 'hold-pill', parent: stage, style: { right: 16, top: TOP_H + 8 } });
  holdText.hidden = true;
  let holdSecond = null;

  function drawHold() {
    const hold = state.holding;
    if (!hold) {
      if (!holdText.hidden) {
        holdText.hidden = true;
        holdSvg.replaceChildren();
      }
      holdSecond = null;
      return;
    }
    const frac = Math.min(1, Math.max(0, hold.left / hold.ms));
    const secs = Math.ceil(Math.max(0, hold.left) / 1000);
    const color = frac > 0.35 ? AMBER : RED;
    const bx = topButtons.offsetLeft + swapBtn.offsetLeft;
    const by = topButtons.offsetTop + swapBtn.offsetTop;
    const bw = swapBtn.offsetWidth;
    const bh = swapBtn.offsetHeight;
    const cx = bx - 22;
    const cy = by + bh / 2;
    holdText.hidden = false;
    holdText.textContent = `${HOLD_TEXT.label}  ·  ${secs}`;
    holdText.style.background = color;
    const tx = holdText.offsetLeft;
    const tb = holdText.offsetTop + holdText.offsetHeight;
    const tw = holdText.offsetWidth;
    const a0 = -Math.PI / 2;
    const a1 = a0 + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const arc = frac >= 1
      ? `M ${cx} ${cy - 13} a 13 13 0 1 1 0 26 a 13 13 0 1 1 0 -26`
      : `M ${cx + 13 * Math.cos(a0)} ${cy + 13 * Math.sin(a0)} A 13 13 0 ${large} 1 ${cx + 13 * Math.cos(a1)} ${cy + 13 * Math.sin(a1)}`;
    holdSvg.replaceChildren();
    svg('circle', { cx, cy, r: 16, fill: 'rgba(7,11,16,0.85)' }, holdSvg);
    svg('circle', { cx, cy, r: 13, fill: 'none', stroke: '#3b5266', 'stroke-width': 4 }, holdSvg);
    if (frac > 0) svg('path', { d: arc, fill: 'none', stroke: color, 'stroke-width': 4 }, holdSvg);
    svg('rect', { x: bx - 2, y: by - 2, width: bw + 4, height: bh + 4, fill: 'none', stroke: color, 'stroke-opacity': 0.9, 'stroke-width': 2 }, holdSvg);
    svg('rect', { x: tx, y: tb + 4, width: tw, height: 6, fill: 'rgba(7,11,16,0.8)' }, holdSvg);
    svg('rect', { x: tx, y: tb + 4, width: tw * frac, height: 6, fill: color }, holdSvg);
    if (secs !== holdSecond) {
      if (holdSecond !== null && !state.modal) sfx.play('tick');
      holdSecond = secs;
    }
  }

  // ---------- crosshair, target label, reveal, pause, fade ----------

  const crosshair = el('div', { cls: 'crosshair', parent: stage });
  el('div', { cls: 'crosshair-ring', parent: crosshair });
  el('div', { cls: 'crosshair-dot', parent: crosshair });
  const targetLabel = el('div', { cls: 'target-label', parent: stage });
  targetLabel.hidden = true;
  const revealLayer = el('div', { cls: 'reveal-layer', parent: stage });

  function setCrosshair(visible) {
    crosshair.hidden = !visible;
  }

  function setTarget(label) {
    crosshair.classList.toggle('has-target', !!label);
    targetLabel.hidden = !label;
    if (label) targetLabel.textContent = label;
  }

  function reveal(list) {
    revealLayer.replaceChildren();
    for (const { label, x, y } of list ?? []) {
      const m = el('div', { cls: 'reveal-marker', parent: revealLayer, style: { left: x, top: y } });
      el('div', { cls: 'reveal-dot', parent: m });
      el('div', { cls: 'reveal-label', text: label, parent: m });
    }
  }

  const pause = el('div', { cls: 'pause', parent: stage });
  const pauseBox = el('div', { cls: 'pause-box', parent: pause });
  el('div', { cls: 'pause-title', text: 'Paused', parent: pauseBox });
  el('div', { cls: 'pause-sub', text: 'Click to look around', parent: pauseBox });
  const controls = [
    ['WASD / arrows', 'move'], ['Mouse', 'look'], ['Click or E', 'interact'], ['1-8 or scroll', 'pick an item'],
    ['Tab', 'switch'], ['Space', 'reveal'], ['C', 'case board'], ['H', 'hint'], ['Esc', 'pause'],
  ];
  const grid = el('div', { cls: 'pause-grid', parent: pauseBox });
  for (const [k, v] of controls) {
    el('span', { cls: 'pause-key', text: k, parent: grid });
    el('span', { cls: 'pause-val', text: v, parent: grid });
  }
  pause.hidden = true;

  function setPaused(show) {
    pause.hidden = !show;
  }

  const fadeEl = el('div', { cls: 'fade', parent: stage });
  function fade(alpha, ms = 400) {
    return fadeTo(fadeEl, alpha, ms);
  }

  // ---------- modal infrastructure ----------

  let notified = false;
  function notifyModal(open) {
    if (open === notified) return;
    notified = open;
    hooks.onModal?.(open);
  }

  function openModal(w, h, { closable = true, kind = 'modal' } = {}) {
    closeModal({ silent: true });
    state.modal = true;
    const x = (WIDTH - w) / 2;
    const y = (HEIGHT - h) / 2;
    const root = el('div', { cls: 'modal-root', attrs: { 'data-kind': kind }, parent: stage });
    el('div', { cls: 'dim', parent: root });
    el('div', { cls: 'panel', parent: root, style: { left: x, top: y, width: w, height: h } });
    const c = { kind, closable, el: root, box: { x, y, w, h }, onClose: null };
    root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
    ui.modal = c;
    notifyModal(true);
    return c;
  }

  /** Registers a non-panel overlay (talk, ending card, black card) as the open modal. */
  function adoptModal(c) {
    ui.modal = c;
    state.modal = true;
    notifyModal(true);
    return c;
  }

  function closeModal({ silent = false } = {}) {
    const c = ui.modal;
    if (!c) return;
    c.onClose?.();
    c.el.remove();
    if (ui.modal === c) ui.modal = null;
    state.modal = false;
    if (!silent) notifyModal(false);
  }

  /** Calls `fn` after the modal has gone, so it may open the next modal safely. */
  function afterClose(c, fn) {
    const prev = c.onClose;
    c.onClose = () => {
      prev?.();
      if (fn) setTimeout(fn, 0);
    };
  }

  function onKeys(c, handlers) {
    const down = (e) => handlers.down?.(e);
    const up = (e) => handlers.up?.(e);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    const prev = c.onClose;
    c.onClose = () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      prev?.();
    };
  }

  /** Click, Enter or Space anywhere closes the modal, but not with the click that opened it. */
  function closeOnAnyInput(c) {
    const opened = performance.now();
    const close = () => performance.now() - opened > 200 && ui.modal === c && closeModal();
    c.el.classList.add('click-close');
    c.el.addEventListener('click', close);
    onKeys(c, { down: (e) => (e.key === 'Enter' || e.code === 'Space') && close() });
  }

  const titleText = (parent, str, y, { size = 32, x = WIDTH / 2 } = {}) => text(parent, str, { x, y, ox: 0.5, size, color: AMBER });
  const makeButton = (parent, label, onClick, size, at) => button(label, onClick, { size, parent, at, sfx });
  const statusText = (parent, y, width = 700, x = WIDTH / 2) => text(parent, '', { x, y, ox: 0.5, size: 19, width, align: 'center' });

  // ---------- commands ----------

  function showHint() {
    if (ui.modal) return;
    clearMessages();
    say(useHint(state));
  }

  function toggleMute() {
    muteBtn.textContent = sfx.toggleMute() ? 'Sound off' : 'Sound on';
  }

  function toggleHowTo() {
    if (ui.modal?.kind === 'howto') return closeModal();
    if (ui.modal || ui.screen) return;
    sfx.play('click');
    ui.howTo();
  }

  function update() {
    drawHold();
    updateObjective();
    const stuck = isStuck(state);
    if (stuck !== pulsing) {
      pulsing = stuck;
      hintBtn.classList.toggle('pulse', stuck);
    }
  }

  const onKeyDown = (e) => {
    if (ui.screen || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') {
      if (ui.modal?.closable) closeModal();
      else if (!ui.modal) hooks.onEscape?.();
      return;
    }
    if (e.key === '?' || e.key === 'F1') {
      e.preventDefault();
      if (!e.repeat) toggleHowTo();
      return;
    }
    if (e.repeat) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'h') {
      if (!ui.modal) showHint();
    } else if (k === 'n') ui.toggleCase('notes');
    else if (k === 'c') ui.toggleCase('board');
    else if (k === 'm') toggleMute();
  };
  const onContextMenu = (e) => {
    e.preventDefault();
    state.select(null);
  };
  window.addEventListener('keydown', onKeyDown);
  app.addEventListener('contextmenu', onContextMenu);

  for (const ev of ['inventory', 'select', 'swap', 'board']) state.on(ev, refresh, ctx);
  state.on('tide', drawTide, ctx);
  state.on('card', onCard, ctx);

  Object.assign(ui, {
    ctx, refresh, update, say, clearMessages, holdMessages, releaseMessages, toast, hideToast,
    showHint, toggleMute, toggleHowTo, pickup, sent, itemIcon,
    setCrosshair, setTarget, reveal, setPaused, fade,
    notifyModal, openModal, adoptModal, closeModal, afterClose, onKeys, closeOnAnyInput, titleText, makeButton, statusText,
    measure: (node) => measure(node, stage),
    text, place,
    keypad: (opts) => keypad(ui, opts),
    choice: (opts) => choice(ui, opts),
    howTo: (onClose) => howTo(ui, onClose),
    closeup: (id, then) => closeup(ui, id, then),
    endingCard: (opts, onDone) => endingCard(ui, opts, onDone),
    blackCard: (line, onDone) => blackCard(ui, line, onDone),
    lens: (opts) => lens(ui, opts),
    valves: (opts) => valves(ui, opts),
    morse: (opts) => morse(ui, opts),
    toggleCase: (tab = 'board') => toggleCase(ui, tab),
    talk: (lines, onDone, onChoose) => talk(ui, lines, onDone, onChoose),
    cutscene: (shots, opts) => cutscene(ui, shots, opts),
    title: (opts) => title(ui, opts),
    endingScreen: (opts) => endingScreen(ui, opts),
    destroy() {
      state.offContext(ctx);
      window.removeEventListener('resize', layout);
      window.removeEventListener('keydown', onKeyDown);
      app.removeEventListener('contextmenu', onContextMenu);
      stage.remove();
    },
  });
  refresh();
  return ui;
}
