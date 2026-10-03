// Browser playthrough: plays the whole story with real mouse/keyboard events on localhost.
// Paste into the devtools console on http://localhost:8000 (title screen), or load with:
//   await import('/tools/playthrough.browser.js').then((m) => m.run({ actor: 'mara', truth: false }))
// Options:
//   actor   'tobin' | 'mara'   who clicks the hatch at the very end (picks the final line)
//   truth   true sends the ledger up and signals CRANE; false signals SOS without it
//   pause   checkpoint names to stop at (e.g. ['lens', 'valves', 'morse']). At each one the run sets
//           window.__checkpoint and waits until window.__resume = true, so a screenshot can be taken.
// Checkpoints: lensSooty, lens, plate, valves, dim, morse, ending, projection, twist, finalLine, final.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function run({ actor = 'tobin', truth = true, pause = [] } = {}) {
  const game = window.__game;
  const S = window.__state;
  const canvas = document.querySelector('canvas');
  const { ROOMS } = await import('/src/data/rooms.js');
  const { VALVE_COLORS, VALVE_ORDER, MORSE } = await import('/src/data/puzzles.js');

  const pt = (gx, gy, buttons = 1) => {
    const r = canvas.getBoundingClientRect();
    return { clientX: r.left + (gx * r.width) / 1280, clientY: r.top + (gy * r.height) / 720, bubbles: true, cancelable: true, button: 0, buttons, view: window };
  };
  const move = (x, y) => canvas.dispatchEvent(new MouseEvent('mousemove', pt(x, y, 0)));
  const click = (x, y) => {
    move(x, y);
    canvas.dispatchEvent(new MouseEvent('mousedown', pt(x, y)));
    window.dispatchEvent(new MouseEvent('mouseup', pt(x, y, 0)));
  };
  const KEYCODES = { Tab: 9, Enter: 13, Escape: 27, ' ': 32, '.': 190, '-': 189, a: 65, d: 68 };
  const keyEvent = (type, k) => {
    const code = k === ' ' ? 'Space' : /^\d$/.test(k) ? `Digit${k}` : k === '.' ? 'Period' : k === '-' ? 'Minus' : k.length === 1 ? `Key${k.toUpperCase()}` : k;
    const keyCode = KEYCODES[k] ?? (/^\d$/.test(k) ? 48 + Number(k) : k.toUpperCase().charCodeAt(0));
    window.dispatchEvent(new KeyboardEvent(type, { key: k, code, keyCode, which: keyCode, bubbles: true }));
  };
  const key = (k) => {
    keyEvent('keydown', k);
    keyEvent('keyup', k);
  };
  const scenes = () => game.scene.getScenes(true).map((s) => s.scene.key);
  const ui = () => game.scene.getScene('UI');
  const gs = () => game.scene.getScene('Game');
  const center = (id) => {
    const h = ROOMS[S.room].hotspots.find((x) => x.id === id);
    if (!h) throw new Error(`${id} is not in ${S.room}`);
    return [h.x + h.w / 2, h.y + h.h / 2];
  };
  const log = [];
  const step = (msg) => log.push(`${S.active}: ${msg}`);
  const expect = (cond, msg) => {
    if (!cond) throw new Error(`FAILED: ${msg}\n${log.join('\n')}`);
  };
  const waitFor = async (cond, label, timeout = 15000) => {
    const t0 = performance.now();
    while (!cond()) {
      if (performance.now() - t0 > timeout) {
        const where = `modal=${S.modal} kind=${ui()?.modal?.kind} busy=${gs()?.busy} scenes=${scenes()}`;
        throw new Error(`timed out waiting for ${label} (${where})\n${log.join('\n')}`);
      }
      await sleep(100);
    }
  };
  const checkpoint = async (name) => {
    step(`checkpoint ${name}`);
    if (!pause.includes(name)) return;
    window.__resume = false;
    window.__checkpoint = name;
    await waitFor(() => window.__resume, `resume after ${name}`, 600000);
    window.__checkpoint = null;
  };
  const modalKind = () => ui().modal?.kind ?? null;

  const hotspot = async (id) => {
    await waitFor(() => !S.modal && !gs().busy, `idle before ${id}`);
    click(...center(id));
    step(id);
    await sleep(450);
  };
  const swap = async () => {
    await waitFor(() => !S.modal && !gs().busy, 'idle before swap');
    const before = S.active;
    key('Tab');
    await waitFor(() => S.active !== before && !gs().busy, 'swap');
    step('swap');
    await sleep(300);
  };
  const as = async (who) => {
    if (S.active !== who) await swap();
  };
  const useItem = async (item, id) => {
    const i = S.inventory[S.active].indexOf(item);
    expect(i >= 0, `${S.active} holds ${item}`);
    click(32 + i * 76 + 32, 720 - 42);
    await sleep(150);
    expect(S.selected === item, `selected ${item}`);
    await hotspot(id);
  };
  const clickObj = async (obj, label) => {
    const b = obj.getBounds();
    click(b.centerX, b.centerY);
    step(`button "${label}"`);
    await sleep(350);
  };
  const button = async (label) => {
    await waitFor(() => ui().modal?.list.some((o) => o.text?.startsWith(label) && o.input?.enabled), `button "${label}"`);
    await clickObj(ui().modal.list.find((o) => o.text?.startsWith(label) && o.input?.enabled), label);
  };
  const typeCode = async (digits) => {
    for (const d of digits) {
      key(d);
      await sleep(90);
    }
    await sleep(700);
  };
  const talk = async (id) => {
    await hotspot(id);
    await waitFor(() => modalKind() === 'talk', 'talk panel');
    await sleep(350);
    while (modalKind() === 'talk') {
      key(' ');
      await sleep(260);
    }
    step('talk done');
  };
  const tube = () => talk(S.active === 'mara' ? 'hatch_lamp' : 'hatch_cellar');

  // ---- start ----
  if (scenes().includes('Title')) {
    click(640, 360);
    await waitFor(() => scenes().includes('Game') && ui()?.modal, 'intro');
  }
  for (let i = 0; i < 5 && ui().modal?.kind === 'modal'; i++) {
    await sleep(400);
    await button('Begin');
  }
  await waitFor(() => !S.modal, 'intro closed');

  // Investigation
  await as('mara');
  await hotspot('logbook');
  expect(S.has('read_logbook'), 'logbook read');
  await swap();
  await hotspot('chalk');
  await hotspot('stairs');
  await hotspot('crate');
  expect(S.has('knows_code'), 'chalk read');
  await tube();
  expect(S.has('talk_1'), 'talk 1');

  await swap();
  await hotspot('drawer');
  await waitFor(() => modalKind() === 'modal', 'keypad');
  await typeCode('0000');
  expect(!S.has('drawer_open'), 'wrong code rejected');
  await typeCode('1874');
  await waitFor(() => S.has('drawer_open'), 'drawer open');
  await button(truth ? 'Tell Tobin' : 'Keep it to yourself');
  await useItem('key', 'hatch_lamp');

  await swap();
  await hotspot('locker');
  await waitFor(() => S.has('locker_open'), 'locker open');
  await button(truth ? 'Pocket it' : 'Tell Mara');
  await useItem('fuse', 'hatch_cellar');

  // Working the tower
  await swap();
  await useItem('fuse', 'lamp');
  expect(S.has('fuse_fitted'), 'fuse fitted');
  await tube();
  await tube();
  expect(S.has('talk_2') && S.has('talk_4'), 'talks 2 and 4');
  await hotspot('lamp');
  await waitFor(() => modalKind() === 'lens', 'lens dial');
  await sleep(400);
  await checkpoint('lensSooty');
  key('d');
  await sleep(400);
  expect(!S.has('lens_set'), 'sooty lens never solves');
  key('Escape');
  await sleep(300);

  await swap();
  await hotspot('plate');
  expect(S.has('saw_smear'), 'smear seen');
  await tube();

  await swap();
  await hotspot('lamp');
  await waitFor(() => modalKind() === 'lens', 'lens dial again');
  await button('Wipe with scarf');
  await sleep(1200);
  expect(S.has('lens_wiped'), 'lens wiped');
  const rot = S.memo.lens_rot;
  const presses = rot <= 4 ? Array(rot).fill('a') : Array(8 - rot).fill('d');
  for (const k of presses.slice(0, -1)) {
    key(k);
    await sleep(350);
  }
  await checkpoint('lens');
  key(presses.at(-1));
  await waitFor(() => S.has('lens_set') && !S.modal, 'lens set');

  await swap();
  await hotspot('plate');
  expect(S.has('knows_order'), 'order seen');
  await checkpoint('plate');
  await useItem('diary', 'valves');
  expect(S.has('gasket'), 'gasket');
  await hotspot('valves');
  await waitFor(() => modalKind() === 'valves', 'valve wheels');
  const setWheels = async (names) => {
    for (let i = 0; i < 5; i++) {
      const target = VALVE_COLORS.indexOf(names[i]);
      const n = (target - S.memo.valves[i] + 5) % 5;
      for (let k = 0; k < n; k++) {
        key(String(i + 1));
        await sleep(120);
      }
    }
  };
  await setWheels(['white', 'green', 'red', 'yellow', 'blue']);
  const tide = S.tide;
  key('Enter');
  await sleep(500);
  expect(S.tide === Math.min(6, tide + 1) && !S.has('valves_set'), 'wrong valves raise the tide');
  await checkpoint('valves');
  await setWheels(VALVE_ORDER);
  key('Enter');
  await waitFor(() => S.has('valves_set') && !S.modal, 'flood');
  await sleep(1800);
  await hotspot('plank');
  expect(S.has('evidence_found'), 'evidence');
  await sleep(800);
  await tube();

  await swap();
  await hotspot('lamp');
  expect(S.has('lamp_lit'), 'lamp lit');
  await sleep(1600);
  await checkpoint('dim');
  await tube();

  await swap();
  await hotspot('rheostat');
  expect(S.has('lamp_full'), 'lamp full');
  if (truth) {
    await sleep(700);
    await useItem('ledger', 'hatch_cellar');
  }
  await swap();
  if (truth) await tube();
  await hotspot('window');
  await hotspot('balcony');

  // Climax
  await hotspot('lamp');
  await waitFor(() => modalKind() === 'morse', 'morse');
  const word = truth ? 'CRANE' : 'SOS';
  await button(word);
  await sleep(300);
  // One wrong symbol: it resets only the current letter. Phaser drops identical keys in one frame.
  key(word === 'CRANE' ? '-' : '.');
  await sleep(200);
  key('-');
  await sleep(300);
  await checkpoint('morse');
  for (const ch of word) {
    for (const sym of MORSE[ch]) {
      key(sym);
      await sleep(160);
    }
  }
  await waitFor(() => modalKind() === 'ending', 'ending card', 20000);
  await sleep(3500);
  await checkpoint('ending');
  await button('Continue');
  await waitFor(() => S.has('final_phase') && S.active === 'tobin' && !S.modal && !gs().busy, 'final scene', 20000);
  await sleep(1200);

  // Final scene
  await hotspot('plate');
  expect(S.has('final_plate'), 'soot read');
  await checkpoint('projection');
  await waitFor(() => ui().msgText.text.includes('IF I FALL'), 'twist line', 20000);
  await sleep(400);
  await checkpoint('twist');
  if (actor === 'mara') {
    await swap();
    await hotspot('lamp');
  }
  await hotspot(actor === 'mara' ? 'hatch_lamp' : 'hatch_cellar');
  await waitFor(() => modalKind() === 'talk', 'final line');
  await sleep(500);
  await checkpoint('finalLine');
  key(' ');
  await waitFor(() => scenes().includes('Ending'), 'ending scene', 20000);
  await sleep(7500);
  await checkpoint('final');
  step(`ending reached as ${actor}, hints used ${S.hintsUsed}, tide ${S.tideBand}`);
  return log;
}
