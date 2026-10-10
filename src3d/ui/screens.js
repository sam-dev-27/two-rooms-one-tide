import { OPENING } from '../../src/data/cutscenes.js';
import { CHARACTER_IMAGES, CUTSCENE_IMAGES, UI_IMAGES } from '../../src/data/assets.js';
import { ENDINGS, FINAL_CARD, TAGLINE, TITLE } from '../../src/data/text.js';
import { loadImage, url } from '../assets.js';
import { WIDTH, HEIGHT, AMBER, MUTED, el, text, button, setStyle, tween, ease, clamp, fadeTo, wait, CSS_EASE } from './dom.js';

const BAR = 96;
const CHAR_MS = 24;
const HOLD_MS = 1100;
const READ_MS_PER_CHAR = 10;
const FADE_MS = 900;
const RAIN_DROPS = 110;
const lerp = (a, b, t) => a + (b - a) * t;
const STILLS = { ...UI_IMAGES, ...CUTSCENE_IMAGES };

function screenLayer(ui, cls, kind) {
  return el('div', { cls: `screen ${cls}`, attrs: { 'data-screen': kind }, parent: ui.stage });
}

/**
 * Painted stills with a slow pan/zoom and typed captions. `mode: 'beat'` uses each shot's
 * `fallback` still when its own is missing and drops shots with neither. Resolves under black:
 * the global fade is left opaque so the game can fade back in.
 */
export function cutscene(ui, shots = OPENING, { mode = 'opening' } = {}) {
  const { state, sfx } = ui;
  ui.screen = 'cutscene';
  state.modal = true;
  ui.notifyModal(true);
  const layer = screenLayer(ui, 'cutscene', 'cutscene');
  layer.dataset.mode = mode;
  const pics = el('div', { cls: 'cut-pics', parent: layer });
  const rain = el('canvas', { cls: 'cut-rain', attrs: { width: WIDTH, height: HEIGHT }, parent: layer });
  const rctx = rain.getContext('2d');
  el('div', { cls: 'cut-vignette', parent: layer });
  el('div', { cls: 'cut-bar', parent: layer, style: { top: 0 } });
  el('div', { cls: 'cut-bar', parent: layer, style: { top: HEIGHT - BAR } });
  const caption = el('div', { cls: 'cut-caption', parent: layer });
  const typedSpan = el('span', { parent: caption });
  const restSpan = el('span', { cls: 'cut-rest', parent: caption });
  const black = el('div', { cls: 'screen-black', parent: layer });
  let done = false;
  let resolve;
  const finished = new Promise((r) => (resolve = r));

  const newDrop = (y) => ({ x: Math.random() * (WIDTH + 200), y, len: 14 + Math.random() * 18, speed: 700 + Math.random() * 500 });
  const drops = Array.from({ length: RAIN_DROPS }, () => newDrop(Math.random() * HEIGHT));
  let rainAlpha = 0;
  let rainTween = null;
  let raf = 0;
  let last = performance.now();
  const frameRain = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    rctx.clearRect(0, 0, WIDTH, HEIGHT);
    if (rainAlpha > 0) {
      rctx.strokeStyle = `rgba(207,227,238,${0.22 * rainAlpha})`;
      rctx.lineWidth = 1;
      rctx.beginPath();
      for (const d of drops) {
        d.y += d.speed * dt;
        d.x -= d.speed * 0.25 * dt;
        if (d.y - d.len > HEIGHT - BAR) Object.assign(d, newDrop(BAR - 20));
        rctx.moveTo(d.x, d.y);
        rctx.lineTo(d.x + d.len * 0.25, d.y - d.len);
      }
      rctx.stroke();
    }
    raf = requestAnimationFrame(frameRain);
  };
  raf = requestAnimationFrame(frameRain);

  let list = [];
  let index = -1;
  let current = null;
  let pan = null;
  let phase = 'wait';
  let full = '';
  let captionIndex = -1;
  let timers = [];
  let typer = 0;

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
    clearInterval(typer);
  };

  const frame = (img, nat, { x, y, zoom }) => {
    const s = Math.max(WIDTH / nat.w, HEIGHT / nat.h) * zoom;
    const w = nat.w * s;
    const h = nat.h * s;
    const cx = clamp(WIDTH / 2 - (x - 0.5) * w, WIDTH - w / 2, w / 2);
    const cy = clamp(HEIGHT / 2 - (y - 0.5) * h, HEIGHT - h / 2, h / 2);
    img.style.transform = `translate(${cx - w / 2}px, ${cy - h / 2}px) scale(${s})`;
  };

  const nextShot = () => {
    index++;
    const shot = list[index];
    if (!shot) return finish(false);
    const prev = current;
    const img = el('img', { cls: 'cut-img', attrs: { src: shot.src, alt: '', draggable: 'false' }, parent: pics, style: { width: shot.nat.w, height: shot.nat.h } });
    current = img;
    frame(img, shot.nat, shot.from);
    pan?.stop();
    pan = tween({
      duration: shot.duration,
      easing: ease.sineInOut,
      onUpdate: (t) => {
        const { from: a, to: b } = shot;
        frame(img, shot.nat, { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), zoom: lerp(a.zoom, b.zoom, t) });
      },
    });
    rainTween?.stop();
    rainTween = tween({ from: rainAlpha, to: shot.rain ?? 1, duration: FADE_MS, onUpdate: (v) => (rainAlpha = v) });
    if (prev) {
      img.style.opacity = 0;
      fadeTo(img, 1, FADE_MS);
      fadeTo(prev, 0, FADE_MS).then(() => prev.remove());
    }
    captionIndex = -1;
    typedSpan.textContent = '';
    restSpan.textContent = '';
    phase = 'wait';
    timers.push(setTimeout(nextCaption, prev ? FADE_MS * 0.7 : 900));
  };

  const nextCaption = () => {
    clearTimers();
    const shot = list[index];
    captionIndex++;
    if (captionIndex >= shot.captions.length) return nextShot();
    full = shot.captions[captionIndex];
    // The untyped rest is laid out invisibly, so the typed text never reflows mid-word.
    typedSpan.textContent = '';
    restSpan.textContent = full;
    caption.style.top = `${Math.round(HEIGHT - BAR / 2 - caption.offsetHeight / 2)}px`;
    let typed = 0;
    phase = 'typing';
    typer = setInterval(() => {
      typed++;
      typedSpan.textContent = full.slice(0, typed);
      restSpan.textContent = full.slice(typed);
      if (typed >= full.length) hold();
    }, CHAR_MS);
  };

  const hold = () => {
    clearTimers();
    typedSpan.textContent = full;
    restSpan.textContent = '';
    phase = 'hold';
    timers.push(setTimeout(nextCaption, HOLD_MS + full.length * READ_MS_PER_CHAR));
  };

  const advance = () => {
    if (done || index < 0) return;
    if (phase === 'typing') hold();
    else nextCaption();
  };

  const onKey = (e) => {
    if (e.key === 'Escape') finish(true);
    else if (e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      advance();
    }
  };

  const finish = (skipped) => {
    if (done) return;
    done = true;
    clearTimers();
    if (skipped) sfx.play('click');
    skip.disabled = true;
    fadeTo(black, 1, skipped ? 450 : 1200).then(() => {
      cancelAnimationFrame(raf);
      pan?.stop();
      rainTween?.stop();
      window.removeEventListener('keydown', onKey);
      ui.fade(1, 0);
      layer.remove();
      if (ui.screen === 'cutscene') ui.screen = null;
      state.modal = false;
      ui.notifyModal(false);
      resolve();
    });
  };

  const skip = button('Skip (Esc)', () => finish(true), { size: 16, cls: 'cut-skip', parent: layer, at: [WIDTH - 24, BAR / 2, 1, 0.5] });
  layer.addEventListener('click', advance);
  window.addEventListener('keydown', onKey);
  sfx.startAmbient?.();

  const real = (key) => (key && STILLS[key] ? url(STILLS[key]) : null);
  Promise.all(
    shots.map(async (s) => {
      const key = real(s.image) ? s.image : real(s.fallback) ? s.fallback : null;
      if (!key) return null;
      const img = await loadImage(STILLS[key]);
      return img ? { ...s, image: key, src: img.src, nat: { w: img.naturalWidth, h: img.naturalHeight } } : null;
    }),
  ).then((loaded) => {
    if (done) return;
    list = loaded.filter(Boolean);
    fadeTo(black, 0, 700);
    nextShot();
  });
  return finished;
}

export function title(ui, { onStart } = {}) {
  const { sfx } = ui;
  ui.screen = 'title';
  const layer = screenLayer(ui, 'title-screen', 'title');
  const bg = url(UI_IMAGES.title);
  if (bg) el('img', { cls: 'full-img', attrs: { src: bg, alt: '', draggable: 'false' }, parent: layer });
  el('div', { cls: 'title-shade-top', parent: layer });
  el('div', { cls: 'title-shade-bottom', parent: layer });
  for (const [key, x, h] of [['mara', WIDTH - 400, 420], ['tobin', WIDTH - 210, 400]]) {
    const src = url(CHARACTER_IMAGES[key]);
    if (!src) continue;
    const img = el('img', { cls: 'title-char', attrs: { src, alt: '', draggable: 'false' }, parent: layer, style: { left: x, height: h, opacity: 0 } });
    img.animate([{ opacity: 0, translate: '0 30px' }, { opacity: 1, translate: '0 0' }], { duration: 900, delay: 300, easing: CSS_EASE.cubicOut, fill: 'forwards' });
  }
  text(layer, TITLE, { x: 80, y: 110, size: 72, bold: true, cls: 'shadow-lg' });
  text(layer, TAGLINE, { x: 84, y: 200, size: 26, color: AMBER });
  text(layer, 'Click to begin', { x: 84, y: HEIGHT - 150, size: 30, cls: 'shadow title-prompt' });
  text(layer, 'WASD: move    Mouse: look    Click/E: use    Tab: switch    C: case board    H: hint    ?: help    M: sound', { x: 84, y: HEIGHT - 100, size: 18, cls: 'shadow' });
  text(layer, 'Made for the DreamLayer Game Jam. Art generated with DreamLayer. 3D version (experimental).', { x: 84, y: HEIGHT - 24, oy: 1, size: 14, color: MUTED });
  const link = el('a', { cls: 'btn link-btn', text: 'Play the 2D version', attrs: { href: 'index.html' }, parent: layer });
  setStyle(link, { right: 24, top: 24 });
  link.addEventListener('click', (e) => e.stopPropagation());
  const black = el('div', { cls: 'screen-black', parent: layer });
  fadeTo(black, 0, 600);

  let starting = false;
  const begin = () => {
    if (starting) return;
    starting = true;
    layer.removeEventListener('click', begin);
    window.removeEventListener('keydown', onKey);
    onStart?.();
    sfx.startAmbient?.();
    sfx.play('click');
    fadeTo(layer, 0, 500).then(() => {
      layer.remove();
      if (ui.screen === 'title') ui.screen = null;
    });
  };
  const onKey = (e) => {
    if (e.key === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      begin();
    }
  };
  layer.addEventListener('click', begin);
  window.addEventListener('keydown', onKey);
  return layer;
}

/** The last frames: a black card with the board's verdict, then the title over the night lighthouse. */
export function endingScreen(ui, { epilogue = null, time = '0:00', hints = 0, tide = 0, onAgain } = {}) {
  ui.screen = 'ending';
  ui.endingEpilogue = epilogue;
  const ending = ENDINGS.final;
  const layer = screenLayer(ui, 'ending-screen', 'ending');
  const card = text(layer, FINAL_CARD, { x: WIDTH / 2, y: HEIGHT / 2, ox: 0.5, oy: 0.5, size: 36, hand: true, style: { opacity: 0 } });
  const verdict = text(layer, epilogue ?? '', { x: WIDTH / 2, y: HEIGHT / 2 + 56, ox: 0.5, oy: 0.5, size: 22, color: AMBER, style: { opacity: 0 } });

  const chain = (node, steps) => {
    const total = steps.reduce((t, s) => t + s.delay + s.duration, 0);
    const frames = [{ opacity: 0, offset: 0 }];
    let t = 0;
    let from = 0;
    for (const s of steps) {
      t += s.delay;
      frames.push({ opacity: from, offset: t / total });
      t += s.duration;
      frames.push({ opacity: s.to, offset: t / total });
      from = s.to;
    }
    node.animate(frames, { duration: total, fill: 'forwards' });
    return wait(total);
  };
  chain(card, [{ to: 1, duration: 1400, delay: 600 }, { to: 0, duration: 1000, delay: epilogue ? 3600 : 2200 }]).then(showTitle);
  if (epilogue) chain(verdict, [{ to: 1, duration: 1000, delay: 2000 }, { to: 0, duration: 1000, delay: 1600 }]);

  function showTitle() {
    if (!layer.isConnected) return;
    const back = el('div', { cls: 'ending-back', parent: layer, style: { opacity: 0 } });
    const src = url(UI_IMAGES[ending.image]);
    if (src) el('img', { cls: 'full-img', attrs: { src, alt: '', draggable: 'false' }, parent: back });
    el('div', { cls: 'ending-screen-shade', parent: back });
    fadeTo(back, 1, 1800);
    const col = el('div', { cls: 'ending-screen-col', parent: layer });
    const stats = `Finished in ${time}  ·  Hints used: ${hints}  ·  Tide ${tide}/6${epilogue ? `\nCase board: ${epilogue}` : ''}`;
    const parts = [
      el('div', { cls: 'ending-screen-title shadow-lg', text: ending.title, parent: col }),
      el('div', { cls: 'ending-screen-tagline', text: TAGLINE, parent: col }),
      el('div', { cls: 'ending-screen-stats', text: stats, parent: col }),
    ];
    let leaving = false;
    parts.push(button('Play again', () => {
      if (leaving) return;
      leaving = true;
      const black = el('div', { cls: 'screen-black', parent: layer, style: { opacity: 0 } });
      fadeTo(black, 1, 400).then(() => {
        ui.fade(1, 0);
        layer.remove();
        if (ui.screen === 'ending') ui.screen = null;
        onAgain?.();
      });
    }, { size: 24, cls: 'again-btn', parent: layer, at: [82, HEIGHT - 90] }));
    parts.forEach((p, i) => {
      p.style.opacity = 0;
      fadeTo(p, 1, 900, { delay: 1200 + i * 450 });
    });
  }
  return layer;
}
