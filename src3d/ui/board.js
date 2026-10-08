import { CHARACTERS } from '../../src/data/rooms.js';
import { CARDS, COLUMNS } from '../../src/data/board.js';
import { trustLabel } from '../../src/data/text.js';
import { PROP_IMAGES } from '../../src/data/assets.js';
import { itemSrc, url } from '../assets.js';
import { WIDTH, AMBER, PAPER, MUTED, el, text, rgba } from './dom.js';

const CARD_W = 186;
const CARD_H = 54;
const IDLE = 'Drag a clue onto a suspect, or click a clue and then a column (keys 1-4; 0 puts it back). Hover a clue to read it.';

const cardIcon = (icon) => (icon === 'rheostat' ? url(PROP_IMAGES.rheostat) : icon ? itemSrc(icon) : null);

/** One modal with two tabs: the case board (C) and the notebook (N). */
export function toggleCase(ui, tab = 'board') {
  if (ui.modal?.kind === 'case') {
    if (ui.modal.tab === tab) return ui.closeModal();
  } else if (ui.modal || ui.screen) {
    return;
  }
  const c = ui.openModal(1200, 660, { kind: 'case' });
  c.tab = tab;
  c.el.dataset.tab = tab;
  const { x, y, w } = c.box;
  const root = c.el;
  text(root, 'Case', { x: x + 30, y: y + 18, size: 30, color: AMBER });
  const tabs = el('div', { cls: 'case-tabs', parent: root, style: { left: x + 130, top: y + 24 } });
  for (const [label, id] of [['Board (C)', 'board'], ['Notes (N)', 'notes']]) {
    const b = ui.makeButton(tabs, label, () => toggleCase(ui, id), 17);
    b.style.position = 'static';
    b.classList.toggle('active', id === tab);
  }
  ui.makeButton(root, 'Close (Esc)', () => ui.closeModal(), 17, [x + w - 24, y + 24, 1, 0]);
  if (tab === 'notes') renderNotes(ui, c);
  else renderBoard(ui, c);
  return c;
}

function renderNotes(ui, c) {
  const { state } = ui;
  const { y, h } = c.box;
  const body = state.notes.length
    ? state.notes.map((n) => `-  ${n.text}`).join('\n\n')
    : 'Nothing written down yet. Clues you read are copied here automatically.';
  const node = text(c.el, body, { x: WIDTH / 2, y: y + 90, ox: 0.5, size: state.notes.length > 6 ? 16 : 19, width: 1000, spacing: 6, cls: 'notes' });
  if (node.offsetHeight > h - 120) {
    node.style.fontSize = '14px';
    node.style.lineHeight = `${Math.round(14 * 1.16 + 6)}px`;
  }
}

function renderBoard(ui, c) {
  const { state, sfx } = ui;
  const { x, y, w } = c.box;
  const root = c.el;
  const tray = { x: x + 20, y: y + 96, w: w - 40, h: 196 };
  const cols = COLUMNS.map((col, i) => ({ ...col, x: x + 20 + i * 287, y: y + 310, w: 280, h: 290 }));
  let selected = null;
  let drag = null;
  let reaction = null;
  let dragEndedAt = -Infinity;

  text(root, `Between them: ${trustLabel(state)}`, { x: x + w - 160, y: y + 33, ox: 1, oy: 0.5, size: 16, italic: true, color: MUTED });
  const trayEl = el('div', { cls: 'tray', attrs: { 'data-column': '' }, parent: root, style: { left: tray.x, top: tray.y, width: tray.w, height: tray.h } });
  text(root, 'Clues', { x: tray.x, y: tray.y - 24, size: 17, color: MUTED });
  const colEls = cols.map((col) => {
    const node = el('div', { cls: 'column', attrs: { 'data-column': col.id }, parent: root, style: { left: col.x, top: col.y, width: col.w, height: col.h } });
    const bar = el('div', { cls: 'column-bar', parent: node, style: { background: rgba(col.color, 0.85) } });
    el('span', { text: col.name.toUpperCase(), parent: bar });
    return node;
  });
  const info = text(root, '', { x: x + 24, y: y + 614, size: 17, color: MUTED, width: w - 48, spacing: 3 });
  const layer = el('div', { cls: 'cards-layer', parent: root });

  const showInfo = (id) => {
    if (id) {
      info.style.color = PAPER;
      info.textContent = `${CARDS[id].title}: ${CARDS[id].detail}`;
    } else if (reaction) {
      info.style.color = CHARACTERS[reaction.who].css;
      info.textContent = `${CHARACTERS[reaction.who].name.toUpperCase()}: "${reaction.text}"`;
    } else {
      info.style.color = MUTED;
      info.textContent = Object.keys(state.board).length > 1 ? IDLE : `${IDLE}\nNew clues are added as you find them.`;
    }
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
    const card = el('button', { cls: `card${selected === id ? ' selected' : ''}`, attrs: { 'data-card': id, type: 'button' }, parent: layer, style: { left: px - CARD_W / 2, top: py - CARD_H / 2 } });
    card.tabIndex = -1;
    el('div', { cls: 'card-pin', parent: card });
    const src = cardIcon(def.icon);
    if (src) {
      el('img', { cls: 'card-icon', attrs: { src, alt: '', draggable: 'false' }, parent: card });
    } else {
      const glyph = el('div', { cls: 'card-glyph', text: def.glyph ?? '?', parent: card });
      if (def.glyph?.length > 1) glyph.style.fontSize = '15px';
    }
    const title = el('div', { cls: 'card-title', text: def.title, parent: card });
    const line = el('div', { cls: 'card-line', text: def.text, parent: card });
    if (title.offsetWidth > CARD_W - 56) title.style.transform = `scaleX(${(CARD_W - 56) / title.offsetWidth})`;
    if (line.offsetHeight > 30) line.style.fontSize = '11px';
    if (state.board[id].fresh) el('div', { cls: 'card-new', text: 'NEW', parent: card });
    card.addEventListener('mousedown', (e) => e.preventDefault());
    card.addEventListener('pointerenter', () => !drag && showInfo(id));
    card.addEventListener('pointerleave', () => !drag && showInfo(selected));
    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const p = ui.clientToStage(e.clientX, e.clientY);
      drag = { id, card, sx: p.x, sy: p.y, ox: px - p.x, oy: py - p.y, moved: false };
    });
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      if (performance.now() - dragEndedAt < 80) return;
      selected = selected === id ? null : id;
      sfx.play('click');
      render();
    });
    return card;
  };

  const render = () => {
    layer.replaceChildren();
    const pos = slots();
    const order = ids().sort((a, b) => (a === selected) - (b === selected));
    for (const id of order) makeCard(id, pos[id].x, pos[id].y);
    showInfo(selected);
  };

  const place = (id, column) => {
    reaction = state.pinCard(id, column);
    sfx.play(reaction ? 'pickup' : 'click');
    selected = null;
    render();
  };
  const columnAt = (px, py) => {
    const col = cols.find((k) => px >= k.x && px <= k.x + k.w && py >= k.y && py <= k.y + k.h);
    if (col) return col.id;
    if (px >= tray.x && px <= tray.x + tray.w && py >= tray.y && py <= tray.y + tray.h) return null;
    return undefined;
  };

  colEls.forEach((node, i) => node.addEventListener('click', () => selected && !drag && place(selected, cols[i].id)));
  trayEl.addEventListener('click', () => selected && !drag && place(selected, null));

  const onMove = (e) => {
    if (!drag) return;
    const p = ui.clientToStage(e.clientX, e.clientY);
    if (!drag.moved && Math.hypot(p.x - drag.sx, p.y - drag.sy) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      layer.appendChild(drag.card);
      drag.card.classList.add('dragging');
    }
    drag.card.style.left = `${p.x + drag.ox - CARD_W / 2}px`;
    drag.card.style.top = `${p.y + drag.oy - CARD_H / 2}px`;
  };
  const onUp = (e) => {
    if (!drag) return;
    const { id, moved } = drag;
    drag = null;
    if (!moved) return;
    dragEndedAt = performance.now();
    const p = ui.clientToStage(e.clientX, e.clientY);
    const column = columnAt(p.x, p.y);
    if (column === undefined || column === state.board[id].column) render();
    else place(id, column);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  ui.onKeys(c, {
    down: (e) => {
      if (!selected) return;
      if (/^[1-4]$/.test(e.key)) place(selected, cols[Number(e.key) - 1].id);
      else if (e.key === '0' || e.key === 'Backspace') place(selected, null);
    },
  });
  const prev = c.onClose;
  c.onClose = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    state.seeCards();
    prev?.();
  };
  render();
}
