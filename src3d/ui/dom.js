import { WIDTH, HEIGHT, COLORS } from '../../src/config.js';

export { WIDTH, HEIGHT };
export const FONT = 'Georgia, "Times New Roman", serif';
export const AMBER = COLORS.amberCss;
export const PAPER = COLORS.paperCss;
export const MUTED = COLORS.mutedCss;
export const INK = '#070b10';
export const RED = '#e0605a';
export const BAR_H = 84;
export const TOP_H = 70;

export const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
export const rgba = (n, a) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Creates an element; `style` may hold numbers (px) and `attrs` plain attributes. */
export function el(tag, { cls, text, style, attrs, parent } = {}) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  if (style) setStyle(node, style);
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

const UNITLESS = new Set(['opacity', 'zIndex', 'fontWeight', 'flex', 'lineHeight']);
export function setStyle(node, style) {
  for (const [k, v] of Object.entries(style)) node.style[k] = typeof v === 'number' && !UNITLESS.has(k) ? `${v}px` : v;
  return node;
}

/** Positions `node` at stage point (x, y) with a Phaser-style origin (0..1 of its own size). */
export function place(node, x, y, ox = 0, oy = 0) {
  setStyle(node, { position: 'absolute', left: x, top: y });
  node.style.transform = ox || oy ? `translate(${-ox * 100}%, ${-oy * 100}%)` : '';
  return node;
}

export const lineHeight = (size, spacing = 0) => `${Math.round(size * 1.16 + spacing)}px`;

/**
 * A Phaser-like text object: no wrap unless `width` is given; lines keep their spaces.
 * UI text is upright; `hand` sets in-world writing in italic.
 */
export function text(parent, str, { x = 0, y = 0, ox = 0, oy = 0, size = 20, color = PAPER, hand, bold, width, align, spacing = 0, font, cls, style } = {}) {
  const node = el('div', { cls: `txt${cls ? ` ${cls}` : ''}`, text: str, parent });
  setStyle(node, { fontSize: size, color, lineHeight: lineHeight(size, spacing), whiteSpace: width ? 'pre-wrap' : 'pre' });
  if (width) node.style.maxWidth = `${width}px`;
  if (hand) node.style.fontStyle = 'italic';
  if (bold) node.style.fontWeight = 'bold';
  if (align) node.style.textAlign = align;
  if (font) node.style.fontFamily = font;
  if (style) setStyle(node, style);
  return place(node, x, y, ox, oy);
}

const SVG_NS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

/**
 * A text button like UIScene.makeButton. Buttons never take focus, so Space/Enter (talk, close-ups)
 * and Tab (swap) don't re-trigger whatever was clicked last.
 */
export function button(label, onClick, { size = 18, cls = '', parent, style, sfx, at } = {}) {
  const b = el('button', { cls: `btn ${cls}`.trim(), text: label, parent, style: { fontSize: size, ...style } });
  if (at) place(b, ...at);
  b.type = 'button';
  b.tabIndex = -1;
  b.addEventListener('mousedown', (e) => e.preventDefault());
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (b.disabled) return;
    sfx?.play('click');
    onClick(e);
  });
  return b;
}

export const ease = {
  linear: (t) => t,
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  cubicOut: (t) => 1 - (1 - t) ** 3,
  cubicIn: (t) => t ** 3,
  backOut: (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
};
export const CSS_EASE = {
  sineInOut: 'cubic-bezier(0.37, 0, 0.63, 1)',
  cubicOut: 'cubic-bezier(0.33, 1, 0.68, 1)',
  cubicIn: 'cubic-bezier(0.32, 0, 0.67, 0)',
  backOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

/** rAF tween of a number; returns { stop() }. */
export function tween({ from = 0, to = 1, duration, delay = 0, easing = ease.linear, onUpdate, onComplete }) {
  let raf = 0;
  let timer = 0;
  let stopped = false;
  const run = () => {
    const start = performance.now();
    const step = (now) => {
      if (stopped) return;
      const t = duration > 0 ? clamp((now - start) / duration, 0, 1) : 1;
      onUpdate?.(from + (to - from) * easing(t));
      if (t < 1) raf = requestAnimationFrame(step);
      else onComplete?.();
    };
    onUpdate?.(from);
    raf = requestAnimationFrame(step);
  };
  if (delay > 0) timer = setTimeout(run, delay);
  else run();
  return {
    stop() {
      stopped = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    },
  };
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const fades = new WeakMap();

export function stopFade(node) {
  clearTimeout(fades.get(node));
  fades.delete(node);
  node.getAnimations().forEach((a) => a.id === 'fade' && a.cancel());
}

export function stopAnims(node) {
  stopFade(node);
  node.getAnimations().forEach((a) => a.cancel());
}

/**
 * Fades `node` to `opacity`. The animation is only the look: a timer commits the end value and
 * resolves, so game flow never waits on the animation timeline (which stalls without frames).
 * A newer fade or stopFade() on the node cancels it and its promise never resolves.
 */
export function fadeTo(node, opacity, duration, { delay = 0, easing = 'linear' } = {}) {
  const from = getComputedStyle(node).opacity;
  stopFade(node);
  const anim = node.animate([{ opacity: from }, { opacity }], { duration, delay, easing, fill: 'both' });
  anim.id = 'fade';
  return new Promise((resolve) => {
    fades.set(node, setTimeout(() => {
      fades.delete(node);
      node.style.opacity = opacity;
      anim.cancel();
      resolve();
    }, delay + duration));
  });
}

export function shake(node, dx = 10, { duration = 50, repeat = 3 } = {}) {
  const frames = [];
  for (let i = 0; i <= repeat; i++) frames.push({ transform: 'translateX(0)' }, { transform: `translateX(${dx}px)` });
  frames.push({ transform: 'translateX(0)' });
  return node.animate(frames, { duration: duration * 2 * (repeat + 1), easing: 'linear', composite: 'add' });
}

/** Height and width of `node` laid out inside `host` (the 1280x720 stage), unscaled. */
export function measure(node, host) {
  const parked = !node.isConnected;
  if (parked) {
    node.style.visibility = 'hidden';
    host.appendChild(node);
  }
  const size = { w: node.offsetWidth, h: node.offsetHeight };
  if (parked) {
    host.removeChild(node);
    node.style.visibility = '';
  }
  return size;
}
