import { CHARACTERS } from '../../src/data/rooms.js';
import { CHOICE_LABELS, TUTORIAL } from '../../src/data/text.js';
import { HEIGHT, WIDTH, BAR_H, AMBER, MUTED, el, text, button, fadeTo, stopAnims } from './dom.js';
import { portrait } from './modals.js';

const CHOICE_HEX = { lie: '#e8a090', deflect: '#9fb3c1', clean: '#9be59b' };

/**
 * Speaking-tube conversation: lines of [who, text]; click or Space advances. A choice entry
 * ({ choice, who, options }) lets the player pick that character's line; the picked option's
 * lines play next and `onChoose(choice, option)` records it.
 */
export function talk(ui, lines, onDone, onChoose) {
  const { state, sfx } = ui;
  ui.closeModal({ silent: true });
  const queue = [...lines];
  const pw = 1060;
  const ph = 180;
  const px = (WIDTH - pw) / 2;
  const py = HEIGHT - BAR_H - ph - 14;
  const root = el('div', { cls: 'talk-root', attrs: { 'data-kind': 'talk' }, parent: ui.stage });
  el('div', { cls: 'talk-dim', parent: root });
  el('div', { cls: 'talk-panel', parent: root, style: { left: px, top: py, width: pw, height: ph } });
  const faceBox = el('div', { cls: 'talk-face', parent: root, style: { left: px + 24, top: py + ph / 2 - 66 } });
  const name = text(root, '', { x: px + 180, y: py + 20, size: 20, bold: true });
  const body = text(root, '', { x: px + 180, y: py + 52, size: 22, width: pw - 220, spacing: 5 });
  const more = text(root, 'Click or Space', { x: px + pw - 20, y: py + ph - 14, ox: 1, oy: 1, size: 15, color: MUTED });
  text(root, 'Speaking tube', { x: px + 20, y: py - 10, oy: 1, size: 15, color: AMBER });
  const remember = text(root, '', { x: px + pw - 20, y: py - 10, ox: 1, oy: 1, size: 16, color: AMBER });
  const optionsBox = el('div', { cls: 'talk-options', parent: root });
  const c = ui.adoptModal({ kind: 'talk', closable: false, el: root, onClose: null });

  let options = null;
  let opened = performance.now();
  const setFace = (who, line = '') => {
    const ch = CHARACTERS[who];
    faceBox.replaceChildren(portrait(ui, who, { line, size: 132 }));
    faceBox.style.outlineColor = ch.css;
    return ch;
  };
  const pick = (entry, option) => {
    if (!options) return;
    optionsBox.replaceChildren();
    options = null;
    sfx.play('click');
    onChoose?.(entry, option);
    queue.unshift(...option.lines);
    if (option.kind !== 'deflect') {
      const listener = CHARACTERS[entry.who === 'mara' ? 'tobin' : 'mara'].name;
      remember.textContent = `${listener} will remember that.`;
      stopAnims(remember);
      remember.style.opacity = 1;
      fadeTo(remember, 0, 600, { delay: 2600 });
    }
    opened = performance.now();
    show();
  };
  const showChoice = (entry) => {
    const ch = setFace(entry.who);
    name.textContent = `${ch.name.toUpperCase()}  ·  choose a line`;
    name.style.color = ch.css;
    body.textContent = '';
    more.textContent = `Click a line, or press 1-${entry.options.length}`;
    if (state.markSeen('tube_choice')) ui.toast(TUTORIAL.choice);
    options = entry.options.map((option, i) => {
      const b = button(`${i + 1}.  ${CHOICE_LABELS[option.kind]}:  ${option.label}`, () => pick(entry, option), {
        size: 19,
        cls: 'talk-option',
        parent: optionsBox,
        at: [px + 180, py + 54 + i * 40],
        style: { color: CHOICE_HEX[option.kind] },
      });
      b.dataset.optionKind = option.kind;
      return option;
    });
    options.entry = entry;
  };
  const show = () => {
    const entry = queue.shift();
    if (entry === undefined) {
      if (ui.modal === c) ui.closeModal();
      onDone?.();
      return;
    }
    if (!Array.isArray(entry)) return showChoice(entry);
    const [who, line] = entry;
    const ch = setFace(who, line);
    name.textContent = ch.name.toUpperCase();
    name.style.color = ch.css;
    body.textContent = line;
    body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    more.textContent = queue.length === 0 ? 'Click or Space to close' : 'Click or Space';
  };
  const advance = () => {
    if (options || performance.now() - opened < 250) return;
    sfx.play('click');
    show();
  };
  root.addEventListener('click', advance);
  ui.onKeys(c, {
    down: (e) => {
      if (options) {
        const n = Number(e.key);
        if (n >= 1 && n <= options.length) pick(options.entry, options[n - 1]);
        return;
      }
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        advance();
      }
    },
  });
  show();
  return c;
}
