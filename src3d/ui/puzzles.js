import { UI_IMAGES } from '../../src/data/assets.js';
import { url } from '../assets.js';
import { WIDTH, HEIGHT, AMBER, MUTED, FONT, el, svg, text, button, place, shake, tween, ease, fadeTo, stopAnims } from './dom.js';

const VALVE_HEX = { red: '#c0392b', blue: '#2f6fb5', green: '#3f9a4a', yellow: '#e0b52c', white: '#eeeeee' };
const DOT_MS = 250;
const prettyMorse = (code) => code.replace(/\./g, '·').replace(/-/g, '−');

function stageSvg(parent) {
  return svg('svg', { class: 'puzzle-svg', width: WIDTH, height: HEIGHT, viewBox: `0 0 ${WIDTH} ${HEIGHT}` }, parent);
}

function cameraShake(node) {
  const frames = [0, 1, 2, 3, 4, 5].map(() => ({ translate: `${(Math.random() * 2 - 1) * 5}px ${(Math.random() * 2 - 1) * 3}px` }));
  node.animate([...frames, { translate: '0 0' }], { duration: 260 });
}

// ---------- A: lens dial ----------

export function lens(ui, { panels, rotation, wiped, rotate, wipe, attempt }) {
  const { sfx } = ui;
  const c = ui.openModal(840, 660, { kind: 'lens' });
  const { x, y, w, h } = c.box;
  const root = c.el;
  const cx = WIDTH / 2;
  const cy = y + 285;
  const R = 180;
  let rot = rotation;
  let solved = false;
  let isWiped = wiped;

  ui.titleText(root, 'The great lens', y + 20);
  const g = stageSvg(root);
  const src = url(UI_IMAGES.lens_closeup);
  if (src) {
    const clip = svg('clipPath', { id: 'lens-clip' }, svg('defs', {}, g));
    svg('circle', { cx, cy, r: R + 40 }, clip);
    const ih = (2 * (R - 30)) / 0.76;
    svg('image', { href: src, x: cx - 1500, y: cy - ih / 2, width: 3000, height: ih, preserveAspectRatio: 'xMidYMid meet', 'clip-path': 'url(#lens-clip)' }, g);
  } else {
    for (let r = R - 40; r > 10; r -= 14) svg('circle', { cx, cy, r, fill: 'none', stroke: AMBER, 'stroke-width': 6, 'stroke-opacity': 0.08 + (R - r) / 900 }, g);
  }

  const soot = svg('g', {}, g);
  svg('circle', { cx, cy, r: R - 36, fill: '#221d18', 'fill-opacity': 0.92 }, soot);
  [[-40, -30, 50], [50, 20, 60], [-10, 60, 40], [30, -70, 35]].forEach(([dx, dy, r]) => svg('circle', { cx: cx + dx, cy: cy + dy, r, fill: '#3a332b', 'fill-opacity': 0.6 }, soot));
  soot.style.display = isWiped ? 'none' : '';

  const ring = svg('g', {}, g);
  svg('circle', { cx, cy, r: R, fill: 'none', stroke: '#6e5426', 'stroke-width': 46 }, ring);
  for (const r of [R + 23, R - 23]) svg('circle', { cx, cy, r, fill: 'none', stroke: '#d9b45a', 'stroke-opacity': 0.9, 'stroke-width': 2 }, ring);
  panels.forEach((p, i) => {
    const deg = 90 + i * 45;
    const a = (deg * Math.PI) / 180;
    const plaque = svg('g', { transform: `translate(${cx + Math.cos(a) * R} ${cy + Math.sin(a) * R}) rotate(${deg - 90})` }, ring);
    svg('rect', { x: -46, y: -17, width: 92, height: 34, fill: p === 'anchor' ? '#3b2e17' : '#2a2114', stroke: '#d9b45a', 'stroke-opacity': 0.8, 'stroke-width': 1 }, plaque);
    const label = svg('text', { x: 0, y: 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: '#f0d9a0', 'font-size': 16, 'font-weight': 'bold', 'font-family': FONT }, plaque);
    label.textContent = p.toUpperCase();
  });
  let angle = -rot * 45;
  const setAngle = (a) => {
    angle = a;
    ring.setAttribute('transform', `rotate(${a} ${cx} ${cy})`);
  };
  setAngle(angle);

  svg('polygon', { points: `${cx},${cy + R + 26} ${cx - 14},${cy + R + 50} ${cx + 14},${cy + R + 50}`, fill: '#e0786f' }, g);
  text(root, 'WELL', { x: cx, y: cy + R + 54, ox: 0.5, size: 18, bold: true, color: '#e0786f' });
  const streaks = svg('g', {}, g);

  const status = ui.statusText(root, y + h - 104);
  status.textContent = isWiped ? 'Turn the ring with the arrows or A / D.' : 'The glass is black with soot. Turn the ring with the arrows or A / D.';

  let targetAngle = angle;
  let spin = null;
  const check = () => {
    if (solved || !attempt(panels[rot])) return;
    solved = true;
    status.textContent = 'The lens settles. Far below, something brightens.';
    status.style.color = AMBER;
    setTimeout(() => ui.modal === c && ui.closeModal(), 1300);
  };
  const turn = (d) => {
    if (solved) return;
    rot = (rot + d + panels.length) % panels.length;
    rotate(rot);
    sfx.play('click');
    targetAngle -= d * 45;
    spin?.stop();
    spin = tween({ from: angle, to: targetAngle, duration: 220, easing: ease.backOut, onUpdate: setAngle });
    check();
  };
  ui.makeButton(root, '◀', () => turn(-1), 30, [cx - R - 110, cy, 0.5, 0.5]);
  ui.makeButton(root, '▶', () => turn(1), 30, [cx + R + 110, cy, 0.5, 0.5]);
  const wipeBtn = ui.makeButton(root, isWiped ? 'Wiped' : 'Wipe with scarf', () => {
    if (isWiped) return;
    isWiped = true;
    wipeBtn.textContent = 'Wiped';
    tween({
      duration: 900,
      onUpdate: (v) => {
        streaks.replaceChildren();
        for (let k = 0; k < 4; k++) svg('rect', { x: cx - R + v * 2 * R - 40, y: cy - 120 + k * 60, width: 80, height: 22, fill: '#e8d8b8', 'fill-opacity': 0.18 }, streaks);
        soot.style.opacity = 1 - v;
      },
      onComplete: () => {
        streaks.replaceChildren();
        soot.style.display = 'none';
        if (ui.modal === c) check();
      },
    });
    status.textContent = wipe() ?? '';
  }, 20, [x + 40, y + h - 58]);
  ui.makeButton(root, 'Close (Esc)', () => ui.closeModal(), 20, [x + w - 40, y + h - 58, 1, 0]);
  ui.onKeys(c, {
    down: (e) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') turn(-1);
      else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') turn(1);
    },
  });
  const prev = c.onClose;
  c.onClose = () => {
    spin?.stop();
    prev?.();
  };
  return c;
}

// ---------- B: valve wheels ----------

export function valves(ui, { colors, settings, wrongText, change, attempt }) {
  const { sfx } = ui;
  const c = ui.openModal(940, 500, { kind: 'valves' });
  const { x, y, w, h } = c.box;
  const root = c.el;
  const values = [...settings];
  let solved = false;
  ui.titleText(root, 'Valve wheels', y + 22);
  text(root, 'Click a wheel or press 1–5 to turn it. Then open the sluice.', { x: WIDTH / 2, y: y + 70, ox: 0.5, size: 17, color: MUTED });

  const wheels = values.map((v, i) => {
    const wx = WIDTH / 2 + (i - 2) * 160;
    const wy = y + 210;
    const hit = button('', () => turn(i), { cls: 'wheel', parent: root, at: [wx - 66, wy - 66] });
    hit.dataset.wheel = String(i);
    hit.setAttribute('aria-label', `Wheel ${i + 1}`);
    const wheel = svg('svg', { width: 132, height: 132, viewBox: '-66 -66 132 132' }, hit);
    const draw = () => {
      wheel.replaceChildren();
      svg('circle', { r: 50, fill: 'none', stroke: VALVE_HEX[colors[values[i]]], 'stroke-width': 12 }, wheel);
      svg('circle', { r: 61, fill: 'none', stroke: '#2f3438', 'stroke-width': 5 }, wheel);
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2;
        svg('line', { x1: 0, y1: 0, x2: Math.cos(a) * 58, y2: Math.sin(a) * 58, stroke: '#3e454b', 'stroke-width': 7 }, wheel);
      }
      svg('circle', { r: 14, fill: '#50585f' }, wheel);
      svg('circle', { cx: 0, cy: -58, r: 5, fill: '#d9b45a' }, wheel);
    };
    draw();
    text(root, String(i + 1), { x: wx, y: wy + 82, ox: 0.5, oy: 0.5, size: 20, color: MUTED });
    return { hit, wheel, draw, angle: 0, spin: null };
  });

  const status = ui.statusText(root, y + 330);
  const turn = (i) => {
    if (solved) return;
    values[i] = (values[i] + 1) % colors.length;
    change(values);
    sfx.play('click');
    const wh = wheels[i];
    wh.draw();
    wh.spin?.stop();
    const from = wh.angle;
    wh.spin = tween({
      from,
      to: Math.round(from / 90) * 90 + 90,
      duration: 240,
      easing: ease.cubicOut,
      onUpdate: (a) => {
        wh.angle = a;
        wh.wheel.style.transform = `rotate(${a}deg)`;
      },
    });
    status.textContent = '';
  };
  const pull = () => {
    if (solved) return;
    if (attempt([...values])) {
      solved = true;
      status.textContent = 'The sluice groans open.';
      status.style.color = AMBER;
      setTimeout(() => ui.modal === c && ui.closeModal(), 800);
      return;
    }
    status.textContent = `${wrongText}\nThe tide rises.`;
    status.style.color = '#e8a090';
    cameraShake(root);
    wheels.forEach(({ hit }) => shake(hit, 6));
  };
  ui.makeButton(root, 'Open sluice (Enter)', pull, 22, [WIDTH / 2, y + h - 66, 0.5, 0.5]);
  ui.makeButton(root, 'Close (Esc)', () => ui.closeModal(), 18, [x + w - 30, y + h - 66, 1, 0.5]);
  ui.onKeys(c, {
    down: (e) => {
      if (/^[1-5]$/.test(e.key)) turn(Number(e.key) - 1);
      else if (e.key === 'Enter') pull();
    },
  });
  const prev = c.onClose;
  c.onClose = () => {
    wheels.forEach((wh) => wh.spin?.stop());
    prev?.();
  };
  return c;
}

// ---------- C: Morse shutter ----------

export function morse(ui, { words, code, step, onDone }) {
  const { sfx, state } = ui;
  const c = ui.openModal(960, 600, { kind: 'morse' });
  const { x, y, w, h } = c.box;
  const root = c.el;
  ui.titleText(root, 'The shutter', y + 20);
  const intro = text(root, 'The cutter Vigilant is close enough to read the lamp. What will you send?', { x: WIDTH / 2, y: y + 90, ox: 0.5, size: 20, width: 760, align: 'center' });
  const picks = words.map((opt, i) => {
    const oy = y + 180 + i * 70;
    if (opt.enabled) return ui.makeButton(root, opt.word, () => begin(opt.word), 26, [WIDTH / 2, oy, 0.5, 0]);
    const b = button(`${opt.word}  (${opt.lockedLabel})`, () => {}, { size: 26, cls: 'locked', parent: root, at: [WIDTH / 2, oy, 0.5, 0] });
    b.disabled = true;
    return b;
  });
  ui.makeButton(root, 'Close (Esc)', () => ui.closeModal(), 18, [x + w - 30, y + h - 50, 1, 0.5]);

  const begin = (word) => {
    intro.remove();
    picks.forEach((p) => p.remove());
    let progress = { letter: 0, buffer: '' };
    let finished = false;

    const boxes = [...word].map((ch, i) => {
      const bx = x + 110 + i * 84;
      const box = el('div', { cls: 'morse-box', parent: root });
      place(box, bx, y + 160, 0.5, 0.5);
      const letter = text(box, '', { x: 35, y: 40, ox: 0.5, oy: 0.5, size: 40, bold: true, color: AMBER });
      const buf = text(root, '', { x: bx, y: y + 210, ox: 0.5, size: 20, font: 'monospace' });
      return { box, letter, buf, ch };
    });
    text(root, `Sending: ${word}`, { x: x + 75, y: y + 82, size: 18, color: MUTED });

    const cardX = x + w - 270;
    const card = el('div', { cls: 'flash-card', parent: root, style: { left: cardX, top: y + 82 } });
    text(card, 'FLASH-CODE CARD', { x: 115, y: 16, ox: 0.5, size: 17, bold: true, color: '#2a1f12' });
    text(card, Object.entries(code).map(([k, v]) => `${k}    ${prettyMorse(v)}`).join('\n'), { x: 40, y: 52, size: 24, color: '#2a1f12', spacing: 9, font: 'Georgia, serif' });

    const lamp = el('div', { cls: 'morse-lamp', parent: root, style: { left: x + 200 - 30, top: y + 290 - 30, opacity: 0.15 } });
    text(root, 'lamp', { x: x + 200, y: y + 324, ox: 0.5, size: 14, color: MUTED });
    const lever = el('button', { cls: 'btn lever', text: 'SHUTTER LEVER\ntap = dot   hold = dash', parent: root });
    lever.type = 'button';
    lever.tabIndex = -1;
    place(lever, x + 200 - 140, y + 410 - 60);
    ui.makeButton(root, '·  dot', () => input('.'), 24, [x + 470, y + 300, 0.5, 0.5]);
    ui.makeButton(root, '—  dash', () => input('-'), 24, [x + 470, y + 370, 0.5, 0.5]);
    text(root, 'Keys: .  and  -   or tap / hold Space', { x: x + 470, y: y + 420, ox: 0.5, size: 15, color: MUTED });
    const status = ui.statusText(root, y + h - 100, 600, x + 330);

    const setLamp = (o) => {
      stopAnims(lamp);
      lamp.style.opacity = o;
    };
    const mark = () => {
      boxes.forEach((b, i) => {
        b.box.classList.toggle('current', i === progress.letter);
        b.buf.textContent = i === progress.letter ? prettyMorse(progress.buffer) : '';
      });
    };
    const flash = (sym) => {
      const ms = sym === '.' ? 120 : 420;
      state.emit('flash', ms);
      setLamp(1);
      fadeTo(lamp, 0.15, 160, { delay: ms });
    };
    const input = (sym) => {
      if (finished) return;
      flash(sym);
      const at = progress.letter;
      progress = step(word, progress, sym);
      if (progress.result === 'wrong') {
        sfx.play('error');
        status.textContent = 'That isn\'t the letter. Start it again.';
        status.style.color = '#e8a090';
        shake(boxes[at].box, 8);
      } else if (progress.result === 'letter' || progress.result === 'done') {
        sfx.play('click');
        boxes[at].letter.textContent = boxes[at].ch;
        status.textContent = '';
      } else {
        status.textContent = '';
      }
      mark();
      if (progress.result === 'done') {
        finished = true;
        sfx.play('unlock');
        status.textContent = `${word}. Sent. Now watch the window.`;
        status.style.color = AMBER;
        setTimeout(() => {
          if (ui.modal === c) ui.closeModal();
          onDone(word);
        }, 1000);
      }
    };

    let pressedAt = null;
    let released = false;
    lever.addEventListener('mousedown', (e) => e.preventDefault());
    lever.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      pressedAt = performance.now();
      released = false;
      setLamp(1);
    });
    const release = () => {
      if (pressedAt === null) return;
      const held = performance.now() - pressedAt;
      pressedAt = null;
      released = true;
      input(held < DOT_MS ? '.' : '-');
    };
    // A scripted .click() has no pointer press before it, so it counts as a tap.
    lever.addEventListener('click', (e) => {
      e.stopPropagation();
      if (released) released = false;
      else input('.');
    });
    window.addEventListener('pointerup', release);
    let spaceAt = null;
    ui.onKeys(c, {
      down: (e) => {
        if (e.key === '.') input('.');
        else if (e.key === '-' || e.key === '_') input('-');
        else if (e.code === 'Space' && spaceAt === null) {
          e.preventDefault();
          spaceAt = performance.now();
          setLamp(1);
        }
      },
      up: (e) => {
        if (e.code !== 'Space' || spaceAt === null) return;
        const held = performance.now() - spaceAt;
        spaceAt = null;
        input(held < DOT_MS ? '.' : '-');
      },
    });
    const prev = c.onClose;
    c.onClose = () => {
      window.removeEventListener('pointerup', release);
      prev?.();
    };
    mark();
  };
  return c;
}
