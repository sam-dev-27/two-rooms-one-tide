import { CHARACTERS } from '../../src/data/rooms.js';
import { CLOSEUPS, TRUST_WARM } from '../../src/data/text.js';
import { CLOSEUP_IMAGES, PORTRAIT_IMAGES, UI_IMAGES } from '../../src/data/assets.js';
import { url } from '../assets.js';
import { WIDTH, HEIGHT, AMBER, PAPER, MUTED, FONT, el, svg, text, button, place, setStyle, shake, lineHeight, fadeTo } from './dom.js';

export const HOW_TO_3D = [
  { icon: 'click', text: 'Look at something and click (or press E) to examine, take or use it. Press 1-8 or scroll to hold an item, then use it on a thing.' },
  { icon: 'walk', text: 'WASD or the arrow keys walk; the mouse looks around. Click the view to capture the mouse, Esc to let go. If capture is blocked, drag to look.' },
  { icon: 'swap', text: 'Tab switches between Mara in the lamp room and Tobin in the cellar.' },
  { icon: 'hatch', text: 'The dumbwaiter hatch sends items between the rooms. The speaking tube beside it lets them talk.' },
  { icon: 'board', text: 'C opens the case board. H gives a hint; press it again for a stronger one.' },
  { icon: 'reveal', text: 'Hold Space to label everything you can use nearby.' },
];

/**
 * The painted portrait for a speaker, squared from the top of the art. There is no worried
 * variant on disk, so tense lines get a cooler, darker grade instead.
 */
export function portrait(ui, who, { worried = false, line = '', size = 132 } = {}) {
  const s = ui.state;
  const tense = worried || s.trust <= -TRUST_WARM || s.tide >= 4 || line.startsWith('...');
  const src = url(PORTRAIT_IMAGES[`${who}_portrait`]);
  const img = el('img', { cls: `portrait${tense ? ' tense' : ''}`, attrs: { alt: CHARACTERS[who].name, draggable: 'false' }, style: { width: size, height: size } });
  if (src) img.src = src;
  return img;
}

/** Draws a ring for a portrait: a 4px stroke centred on the square's edge, as Phaser strokes. */
export function portraitRing(parent, who, x, y, size) {
  return el('div', { cls: 'portrait-ring', parent, style: { left: x - 2, top: y - 2, width: size + 4, height: size + 4, borderColor: CHARACTERS[who].css } });
}

export function keypad(ui, { title, code, onSuccess }) {
  const { sfx } = ui;
  const c = ui.openModal(380, 500);
  const { y } = c.box;
  const root = c.el;
  let entry = '';
  let solved = false;
  ui.titleText(root, title, y + 28);
  const display = text(root, '', { x: WIDTH / 2, y: y + 110, ox: 0.5, oy: 0.5, size: 42, color: AMBER, font: 'monospace', cls: 'keypad-display' });
  const render = () => {
    display.textContent = Array.from({ length: code.length }, (_, i) => entry[i] ?? '_').join(' ');
  };
  const check = () => {
    if (entry === code) {
      solved = true;
      display.style.color = '#9be59b';
      setTimeout(() => {
        if (ui.modal === c) ui.closeModal();
        onSuccess();
      }, 250);
      return;
    }
    sfx.play('error');
    shake(display, 10);
    setTimeout(() => {
      entry = '';
      render();
    }, 450);
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
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', 'Back'].forEach((k, i) => {
    const bx = WIDTH / 2 + ((i % 3) - 1) * 96;
    const by = y + 190 + Math.floor(i / 3) * 70;
    const pad = button(k, () => press(k), { size: k.length > 1 ? 18 : 26, cls: 'pad', parent: root, at: [bx - 42, by - 29] });
    pad.dataset.key = k;
  });
  text(root, 'Type digits or click. Esc to close.', { x: WIDTH / 2, y: y + 470, ox: 0.5, oy: 0.5, size: 15, color: MUTED });
  ui.onKeys(c, {
    down: (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('Back');
    },
  });
  render();
  return c;
}

export function choice(ui, { title, text: body, options, closable = true, who = null, worried = false }) {
  const dx = who ? 70 : 0;
  const cx = WIDTH / 2 + dx;
  const bodyEl = text(null, body, { x: cx, y: 0, ox: 0.5, size: 20, width: 640, spacing: 6 });
  const bodyH = ui.measure(bodyEl).h;
  const c = ui.openModal(760 + dx * 2, Math.max(bodyH + 130 + options.length * 62, who ? 220 : 0), { closable });
  const { x, y } = c.box;
  const root = c.el;
  ui.titleText(root, title, y + 30, { x: cx });
  bodyEl.style.top = `${y + 88}px`;
  root.appendChild(bodyEl);
  if (who) {
    const face = portrait(ui, who, { worried, size: 124 });
    place(face, x + 28, y + 38);
    root.appendChild(face);
    portraitRing(root, who, x + 28, y + 38, 124);
  }
  options.forEach((opt, i) => {
    const oy = y + 120 + bodyH + i * 62;
    if (opt.enabled) {
      ui.makeButton(root, opt.label, () => {
        ui.closeModal();
        opt.onSelect();
      }, 20, [cx, oy, 0.5, 0]);
    } else {
      const b = button(`${opt.label}  (${opt.lockedLabel ?? 'no proof'})`, () => {}, { size: 20, cls: 'locked', parent: root, at: [cx, oy, 0.5, 0] });
      b.disabled = true;
    }
  });
  return c;
}

const arcPath = (cx, cy, r, a0, a1) => {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`;
};
const pts = (...p) => p.join(' ');

/** Small line drawings for the how-to rows, about 52px across, centred in a 72px box. */
export function drawIcon(icon) {
  const g = svg('svg', { width: 72, height: 72, viewBox: '-36 -36 72 72', class: 'howto-icon' });
  const amber = AMBER;
  const paper = PAPER;
  const line = (x1, y1, x2, y2, stroke = amber, w = 3) => svg('line', { x1, y1, x2, y2, stroke, 'stroke-width': w, 'stroke-linecap': 'round' }, g);
  const path = (d, stroke = amber, w = 3, extra = {}) => svg('path', { d, stroke, 'stroke-width': w, fill: 'none', ...extra }, g);
  const tri = (p, fill = amber) => svg('polygon', { points: p, fill }, g);
  const circle = (cx, cy, r, fill) => svg('circle', { cx, cy, r, fill }, g);
  if (icon === 'click') {
    tri(pts(-10, -18, -10, 12, 10, 4), paper);
    line(-2, 6, 6, 20);
    path(arcPath(-10, -18, 14, -2.6, -0.4));
    path(arcPath(-10, -18, 22, -2.4, -0.6));
  } else if (icon === 'walk') {
    svg('ellipse', { cx: -14, cy: 8, rx: 6, ry: 11, fill: paper }, g);
    svg('ellipse', { cx: 2, cy: -8, rx: 6, ry: 11, fill: paper }, g);
    line(-24, 24, 22, 24);
    line(22, 24, 14, 18);
    line(22, 24, 14, 30);
  } else if (icon === 'swap') {
    path(arcPath(0, 0, 18, Math.PI * 1.05, Math.PI * 1.95));
    path(arcPath(0, 0, 18, Math.PI * 0.05, Math.PI * 0.95));
    tri(pts(18, -10, 12, -2, 24, -2));
    tri(pts(-18, 10, -24, 2, -12, 2));
    circle(0, -4, 4, '#e3a46a');
    circle(0, 6, 4, '#78a8c8');
  } else if (icon === 'hatch') {
    svg('rect', { x: -18, y: -20, width: 36, height: 40, stroke: paper, 'stroke-width': 3, fill: 'none' }, g);
    line(-6, 12, -6, -12);
    line(6, -12, 6, 12);
    tri(pts(-6, -16, -11, -8, -1, -8));
    tri(pts(6, 16, 1, 8, 11, 8));
    svg('circle', { cx: 28, cy: -12, r: 5, stroke: '#b08d57', 'stroke-width': 3, fill: 'none' }, g);
    line(28, -7, 28, 20, '#b08d57');
  } else if (icon === 'board') {
    svg('rect', { x: -24, y: -18, width: 48, height: 36, fill: '#5a4632' }, g);
    for (const [x, y, w, h] of [[-18, -12, 14, 11], [4, -4, 14, 11], [-14, 4, 14, 9]]) svg('rect', { x, y, width: w, height: h, fill: paper }, g);
    for (const [x, y] of [[-11, -12], [11, -4], [-7, 4]]) circle(x, y, 2.5, '#e0605a');
    line(-11, -12, 11, -4, '#e0605a', 1.5);
  } else if (icon === 'reveal') {
    path(arcPath(0, 16, 26, -2.4, -0.74), paper);
    path(arcPath(0, -16, 26, 0.74, 2.4), paper);
    circle(0, 0, 7, amber);
    svg('rect', { x: -26, y: -24, width: 52, height: 48, rx: 6, stroke: amber, 'stroke-opacity': 0.8, 'stroke-width': 2, fill: 'none' }, g);
  }
  return g;
}

export function howTo(ui, onClose) {
  const rowH = 72;
  const c = ui.openModal(880, 170 + HOW_TO_3D.length * rowH, { kind: 'howto' });
  const { x, y, w, h } = c.box;
  const root = c.el;
  ui.titleText(root, 'How to play', y + 24);
  HOW_TO_3D.forEach((row, i) => {
    const cy = y + 112 + i * rowH;
    const icon = drawIcon(row.icon);
    place(icon, x + 72 - 36, cy - 36);
    root.appendChild(icon);
    text(root, row.text, { x: x + 128, y: cy, oy: 0.5, size: 19, width: w - 168, spacing: 3 });
  });
  text(root, 'Click or press Enter to begin   ·   ? or F1 shows this again', { x: WIDTH / 2, y: y + h - 34, ox: 0.5, oy: 0.5, size: 16, italic: true, color: AMBER });
  ui.state.markSeen('howto');
  ui.closeOnAnyInput(c);
  ui.afterClose(c, onClose);
  return c;
}

/** A painted close-up with its writing laid over in a hand; any click or Enter closes it. */
export function closeup(ui, id, then) {
  const def = CLOSEUPS[id];
  if (!def) return then?.();
  ui.holdMessages();
  const c = ui.openModal(1060, 690, { kind: 'closeup' });
  const { y, h } = c.box;
  const root = c.el;
  ui.titleText(root, def.title, y + 14, { size: 26 });
  const boxW = 1000;
  const boxH = 562;
  const boxY = y + 58;
  const src = url(CLOSEUP_IMAGES[def.image]);
  const art = el('div', { cls: 'closeup-art', parent: root });
  if (src) {
    const img = el('img', { cls: 'closeup-img', attrs: { alt: def.title, draggable: 'false' }, parent: art });
    img.addEventListener('load', () => {
      const s = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
      const left = WIDTH / 2 - dw / 2;
      const top = boxY + boxH / 2 - dh / 2;
      setStyle(img, { left, top, width: dw, height: dh });
      const areas = [def.area ?? []].flat();
      const per = Math.ceil(def.lines.length / Math.max(1, areas.length));
      areas.forEach((area, i) => {
        const lines = def.lines.slice(i * per, (i + 1) * per);
        if (lines.length) closeupWriting(art, { ...def, lines, angle: area.angle ?? def.angle }, area, left, top, dw, dh);
      });
    }, { once: true });
    img.src = src;
  }
  const caption = def.caption ? `${def.caption}   ·   ` : '';
  text(root, `${caption}Click to close`, { x: WIDTH / 2, y: y + h - 22, ox: 0.5, oy: 0.5, size: 17, italic: true, color: def.caption ? PAPER : MUTED });
  ui.closeOnAnyInput(c);
  const prev = c.onClose;
  c.onClose = () => {
    prev?.();
    setTimeout(() => {
      ui.releaseMessages();
      then?.();
    }, 0);
  };
  return c;
}

function closeupWriting(parent, def, a, left, top, dw, dh) {
  const scale = dw / 1000;
  const g = el('div', { cls: 'closeup-writing', parent, style: { left: left + (a.x + a.w / 2) * dw, top: top + (a.y + a.h / 2) * dh, transform: `rotate(${def.angle ?? 0}deg)` } });
  const size = Math.round(def.size * scale);
  const t = el('div', { cls: 'closeup-text', text: def.lines.join('\n'), parent: g });
  setStyle(t, { fontSize: size, color: def.ink, lineHeight: lineHeight(size, Math.round(size * 0.45)), maxWidth: a.w * dw, fontFamily: FONT });
  const tw = t.offsetWidth;
  const th = t.offsetHeight;
  const fit = Math.min(1, (a.h * dh) / th, (a.w * dw) / tw);
  t.style.transform = `translate(-50%, -50%) scale(${fit})`;
  const blank = def.lines.indexOf('');
  if (def.anchor && blank >= 0) {
    const lh = (th * fit) / def.lines.length;
    const k = lh * 0.8;
    const ax = (-tw / 2) * fit + k * 0.8;
    const ay = (-th / 2) * fit + (blank + 1) * lh;
    const s = svg('svg', { class: 'closeup-anchor', width: 1, height: 1 }, g);
    const stroke = { stroke: def.ink, 'stroke-opacity': 0.92, 'stroke-width': Math.max(3, k * 0.09), fill: 'none', 'stroke-linecap': 'round' };
    svg('circle', { cx: ax, cy: ay - k * 0.82, r: k * 0.16, ...stroke }, s);
    svg('line', { x1: ax, y1: ay - k * 0.66, x2: ax, y2: ay + k * 0.9, ...stroke }, s);
    svg('line', { x1: ax - k * 0.38, y1: ay - k * 0.38, x2: ax + k * 0.38, y2: ay - k * 0.38, ...stroke }, s);
    svg('path', { d: arcPath(ax, ay + k * 0.25, k * 0.65, 0.35, Math.PI - 0.35), ...stroke }, s);
  }
  return g;
}

export function endingCard(ui, { title, image, text: body, footer }, onDone) {
  ui.closeModal({ silent: true });
  ui.clearMessages();
  const root = el('div', { cls: 'ending-card', attrs: { 'data-kind': 'ending' }, parent: ui.stage });
  const src = url(UI_IMAGES[image]);
  if (src) el('img', { cls: 'full-img', attrs: { src, alt: '', draggable: 'false' }, parent: root });
  el('div', { cls: 'ending-shade', parent: root });
  const col = el('div', { cls: 'ending-col', parent: root });
  const parts = [
    el('div', { cls: 'ending-title', text: title, parent: col }),
    el('div', { cls: 'ending-body', text: body, parent: col }),
  ];
  if (footer) parts.push(el('div', { cls: 'ending-footer', text: footer, parent: col }));
  const c = ui.adoptModal({ kind: 'ending', closable: false, el: root, onClose: null });
  parts.push(ui.makeButton(root, 'Continue', () => {
    ui.closeModal();
    onDone();
  }, 22, [82, HEIGHT - 80]));
  root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900 });
  parts.forEach((p, i) => {
    p.style.opacity = 0;
    fadeTo(p, 1, 700, { delay: 700 + i * 400 });
  });
  return c;
}

/** Fades to black with a line of text, runs `onDone` under the black, then fades back. */
export function blackCard(ui, line, onDone) {
  const root = el('div', { cls: 'black-card', attrs: { 'data-kind': 'black' }, parent: ui.stage });
  const label = text(root, line, { x: WIDTH / 2, y: HEIGHT / 2, ox: 0.5, oy: 0.5, size: 34, italic: true });
  label.style.opacity = 0;
  const c = ui.adoptModal({ kind: 'black', closable: false, el: root, onClose: null });
  const total = 300 + 900 + 1700 + 700;
  label.animate(
    [
      { opacity: 0, offset: 0 },
      { opacity: 0, offset: 300 / total },
      { opacity: 1, offset: 1200 / total },
      { opacity: 1, offset: 2900 / total },
      { opacity: 0, offset: 1 },
    ],
    { duration: total, fill: 'forwards' },
  );
  setTimeout(() => {
    if (ui.modal === c) ui.modal = null;
    ui.state.modal = false;
    ui.notifyModal(false);
    onDone();
    fadeTo(root, 0, 900).then(() => root.remove());
  }, total);
  return c;
}
