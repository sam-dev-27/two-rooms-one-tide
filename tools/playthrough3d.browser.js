// Full playthrough of the 3D version (3d.html) on localhost, through window.__game3d plus real
// DOM input: keys go to window (Tab, digits, E, Space, modal keys), modal buttons and case-board
// cards get real pointer events, and hotspots are used by turning the camera onto them and
// clicking the canvas, so the crosshair raycast picks them. Run headless with tools/run3d.mjs:
//   node tools/run3d.mjs --url http://localhost:8123/3d.html --script /tools/playthrough3d.browser.js \
//        --opts '{"actor":"mara","truth":false}' --shots /tmp/trot-3d --prefix mara_
// Options: actor 'tobin' | 'mara' (who speaks the final line), truth (CRANE + ledger, or SOS),
// tube 'clean' | 'deflect' | 'lie', board (column for the suspicious cards), lightning (wait for
// the window writing), shots (call window.__shot at checkpoints), inputChecks (movement/look tests).

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frames = (n = 2) => new Promise((r) => {
  const tick = () => (--n <= 0 ? r() : requestAnimationFrame(tick));
  requestAnimationFrame(tick);
});

export async function run({ actor = 'tobin', truth = true, tube: tubeKind = 'lie', board = 'tobin', lightning = false, shots = true, inputChecks = false } = {}) {
  for (let i = 0; i < 200 && !window.__game3d; i++) await sleep(100);
  const G = window.__game3d;
  const S = G.state;
  const ui = G.ui;
  const canvas = document.getElementById('view');
  const { VALVE_COLORS, VALVE_ORDER, MORSE } = await import('/src/data/puzzles.js');
  const { EPILOGUES } = await import('/src/data/board.js');
  G.setDrag(true);

  const log = [];
  const stats = { realClicks: 0, fallbackClicks: 0, shots: [] };
  const step = (msg) => log.push(`${S.active}: ${msg}`);
  const expect = (cond, msg) => {
    if (!cond) throw new Error(`FAILED: ${msg}\n${log.slice(-25).join('\n')}`);
  };
  const where = () => `modal=${S.modal} kind=${ui.modal?.kind} screen=${ui.screen} busy=${G.game.busy} room=${S.room}`;
  const waitFor = async (cond, label, timeout = 15000) => {
    const t0 = performance.now();
    while (!cond()) {
      if (performance.now() - t0 > timeout) throw new Error(`timed out waiting for ${label} (${where()})\n${log.slice(-25).join('\n')}`);
      await sleep(80);
    }
  };
  const shot = async (name) => {
    step(`shot ${name}`);
    if (!shots || !window.__shot) return;
    await frames(3);
    await window.__shot(name);
    stats.shots.push(name);
  };

  const CODES = { Tab: 'Tab', Enter: 'Enter', Escape: 'Escape', ' ': 'Space', '.': 'Period', '-': 'Minus', Shift: 'ShiftLeft' };
  const codeFor = (k) => CODES[k] ?? (/^\d$/.test(k) ? `Digit${k}` : k.length === 1 ? `Key${k.toUpperCase()}` : k);
  const keyEvent = (type, k) => window.dispatchEvent(new KeyboardEvent(type, { key: k, code: codeFor(k), bubbles: true, cancelable: true }));
  const key = (k) => {
    keyEvent('keydown', k);
    keyEvent('keyup', k);
  };
  const center = () => {
    const r = canvas.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  const mouse = (type, x, y, target = canvas, buttons = 1) =>
    target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, button: 0, buttons, view: window }));
  const pointer = (type, x, y, target) =>
    target.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerId: 1, isPrimary: true, view: window }));
  const clickCanvas = () => {
    const { x, y } = center();
    mouse('mousemove', x, y, canvas, 0);
    mouse('mousedown', x, y);
    mouse('mouseup', x, y, window, 0);
  };
  const clickEl = (node) => {
    const r = node.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    pointer('pointerdown', x, y, node);
    mouse('mousedown', x, y, node);
    pointer('pointerup', x, y, node);
    mouse('mouseup', x, y, node, 0);
    node.click();
  };
  const idle = () => !S.modal && !G.game.busy && !ui.screen;
  const modalKind = () => ui.modal?.kind ?? null;

  const DIST = { lamp: 1.9, plate: 1.9, stairs: 1.8, valves: 1.5, window: 1.6, balcony: 1.5, plank: 1.4 };
  let closeupShot = false;
  const closeCloseup = async () => {
    if (modalKind() !== 'closeup') return;
    await sleep(260);
    if (!closeupShot) {
      closeupShot = true;
      await shot('closeup');
    }
    key('Enter');
    step('closed close-up');
    await sleep(250);
  };
  /** Turns onto a hotspot and clicks the canvas: the crosshair raycast must pick it. */
  const hotspot = async (id) => {
    await closeCloseup();
    await waitFor(idle, `idle before ${id}`);
    mouse('mousemove', center().x, center().y, canvas, 0);
    if (id === 'rheostat') G.place(-2.6, 2.3);
    G.lookAt(id, DIST[id] ?? 1.5);
    await frames(3);
    if (G.target === id) {
      clickCanvas();
      stats.realClicks++;
    } else {
      step(`(crosshair on ${G.target} instead of ${id}; using __game3d.interact)`);
      G.interact(id, S.selected);
      stats.fallbackClicks++;
      (stats.fallbacks ??= []).push(`${S.room}:${id}->${G.target}`);
    }
    step(id);
    await sleep(420);
    await closeCloseup();
  };
  const swap = async () => {
    await waitFor(idle, 'idle before swap');
    const before = S.active;
    key('Tab');
    await waitFor(() => S.active !== before && !G.game.busy, 'swap');
    step('swap');
    await sleep(350);
  };
  const as = async (who) => {
    if (S.active !== who) await swap();
  };
  const useItem = async (item, id) => {
    const i = S.inventory[S.active].indexOf(item);
    expect(i >= 0, `${S.active} holds ${item}`);
    await waitFor(idle, `idle before selecting ${item}`);
    if (S.selected !== item) key(String(i + 1));
    await sleep(120);
    expect(S.selected === item, `selected ${item} with key ${i + 1}`);
    await hotspot(id);
  };
  const findButton = (label) => [...(ui.modal?.el.querySelectorAll('button') ?? [])].find((b) => b.textContent.trim().startsWith(label));
  const button = async (label) => {
    await waitFor(() => modalKind() === 'closeup' || findButton(label), `modal with "${label}"`);
    await closeCloseup();
    await waitFor(() => findButton(label) && !findButton(label).disabled, `button "${label}"`);
    clickEl(findButton(label));
    step(`button "${label}"`);
    await sleep(350);
  };
  const typeCode = async (digits) => {
    for (const d of digits) {
      key(d);
      await sleep(90);
    }
    await sleep(700);
  };
  let choicesSeen = 0;
  const talk = async (id) => {
    await hotspot(id);
    await waitFor(() => modalKind() === 'talk', 'talk panel');
    await sleep(320);
    while (modalKind() === 'talk') {
      const opts = [...ui.modal.el.querySelectorAll('[data-option-kind]')];
      if (opts.length) {
        const i = Math.max(0, opts.findIndex((o) => o.dataset.optionKind === tubeKind));
        choicesSeen++;
        if (choicesSeen === 1) await shot('tube_choice');
        step(`tube choice: ${opts[i].dataset.optionKind}`);
        key(String(i + 1));
        await sleep(380);
        continue;
      }
      key(' ');
      await sleep(280);
    }
    step('talk done');
  };
  const tube = () => talk(S.active === 'mara' ? 'hatch_lamp' : 'hatch_cellar');
  const skipBeat = async (name) => {
    const t0 = performance.now();
    while (ui.screen !== 'cutscene' && performance.now() - t0 < 8000) await sleep(100);
    if (ui.screen !== 'cutscene') return step(`no ${name} beat`);
    await sleep(1800);
    await shot(`beat_${name}`);
    key('Escape');
    await waitFor(() => ui.screen !== 'cutscene', `back from ${name}`);
    await waitFor(() => !G.game.busy || modalKind(), `game after ${name}`, 8000);
    step(`${name} beat`);
    await sleep(700);
  };

  // ---- start: title → opening → how-to ----
  await waitFor(() => ui.screen === 'title', 'title screen', 20000);
  await shot('title');
  clickEl(ui.stage.querySelector('[data-screen="title"]'));
  await waitFor(() => ui.screen === 'cutscene', 'opening');
  await sleep(1500);
  await shot('opening');
  key('Escape');
  await waitFor(() => G.game.playing, 'game started', 20000);
  await sleep(600);
  if (modalKind() === 'howto') {
    await sleep(300);
    await shot('howto');
    key('Enter');
    step('closed how-to');
  }
  await waitFor(() => !S.modal, 'how-to closed');
  await sleep(500);

  if (inputChecks) {
    // Real input: WASD moves (with collision), drag turns, Space labels hotspots, wheel picks items.
    const p = G.world.pos.mara;
    let n = 0;
    const t0 = performance.now();
    while (performance.now() - t0 < 2000) {
      await frames(1);
      n++;
    }
    stats.headlessFps = Math.round((n * 1000) / (performance.now() - t0));
    G.place(0, 2.6, 0, 0);
    const start = { x: p.x, z: p.z };
    keyEvent('keydown', 'w');
    await sleep(1200);
    keyEvent('keyup', 'w');
    const moved = Math.hypot(p.x - start.x, p.z - start.z);
    expect(moved > 0.1, `W walks forward (moved ${moved.toFixed(2)} m)`);
    keyEvent('keydown', 'w');
    await waitFor(() => Math.hypot(p.x, p.z) < 1.1, 'walking up to the lamp', 30000);
    await sleep(1500);
    keyEvent('keyup', 'w');
    expect(Math.hypot(p.x, p.z) >= 0.72 + 0.3 - 0.01, `the lamp pedestal blocks the walk (${Math.hypot(p.x, p.z).toFixed(2)} m from its centre)`);
    const yaw0 = G.world.controls.yaw;
    const { x, y } = center();
    mouse('mousedown', x, y);
    for (let k = 1; k <= 10; k++) {
      mouse('mousemove', x + k * 20, y, window);
      await frames(1);
    }
    mouse('mouseup', x + 200, y, window, 0);
    expect(G.world.controls.yaw < yaw0 - 0.5, 'dragging right turns right');
    keyEvent('keydown', ' ');
    await frames(4);
    const labels = ui.stage.querySelectorAll('.reveal-marker').length;
    keyEvent('keyup', ' ');
    expect(labels > 0, `Space labels hotspots in view (${labels})`);
    step(`input checks ok: walked ${moved.toFixed(2)} m, turned ${(yaw0 - G.world.controls.yaw).toFixed(2)} rad, ${labels} labels`);
  }
  const wheelCheck = async () => {
    if (!inputChecks) return;
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }));
    await sleep(100);
    expect(S.selected === S.inventory[S.active][0], 'the wheel picks the first item');
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }));
    await sleep(100);
    expect(S.selected === null, 'wheel back puts it away');
    step('wheel check ok');
  };

  // ---- investigation ----
  await as('mara');
  await shot('lamp_room');
  G.lookAt('logbook', 1.5);
  await frames(3);
  await shot('highlight_logbook');
  await hotspot('logbook');
  expect(S.has('read_logbook'), 'logbook read');
  await swap();
  await shot('cellar_room');
  await wheelCheck();
  await hotspot('chalk');
  await hotspot('stairs');
  await hotspot('crate');
  expect(S.has('knows_code'), 'chalk read');
  await tube();
  expect(S.has('talk_1'), 'talk 1');

  await swap();
  await hotspot('drawer');
  await waitFor(() => !!ui.modal?.el.querySelector('[data-key]'), 'keypad');
  await sleep(200);
  await shot('keypad');
  await typeCode('0000');
  expect(!S.has('drawer_open'), 'wrong code rejected');
  await typeCode('1874');
  await waitFor(() => S.has('drawer_open'), 'drawer open');
  await sleep(300);
  await shot('choice');
  await button(truth ? 'Tell Tobin' : 'Keep it to yourself');
  await useItem('key', 'hatch_lamp');

  await swap();
  await hotspot('locker');
  await waitFor(() => S.has('locker_open'), 'locker open');
  await button(truth ? 'Pocket it' : 'Tell Mara');
  await useItem('fuse', 'hatch_cellar');

  // ---- working the tower ----
  await swap();
  await useItem('fuse', 'lamp');
  expect(S.has('fuse_fitted'), 'fuse fitted');
  await tube();
  await tube();
  expect(S.has('talk_2') && S.has('talk_4'), 'talks 2 and 4');
  await hotspot('lamp');
  await waitFor(() => modalKind() === 'lens', 'lens dial');
  await sleep(400);
  await shot('lens_sooty');
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
  await shot('lens');
  key(presses.at(-1));
  await waitFor(() => S.has('lens_set') && !S.modal, 'lens set');

  await swap();
  await hotspot('plate');
  expect(S.has('knows_order'), 'order seen');
  G.lookAt('plate', 1.9);
  await shot('plate_projection');
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
        await sleep(110);
      }
    }
  };
  await setWheels(['white', 'green', 'red', 'yellow', 'blue']);
  const tide = S.tide;
  key('Enter');
  await sleep(500);
  expect(S.tide === Math.min(6, tide + 1) && !S.has('valves_set'), 'wrong valves raise the tide');
  await shot('valves');
  await setWheels(VALVE_ORDER);
  key('Enter');
  await waitFor(() => S.has('valves_set') && !S.modal, 'flood');
  await sleep(2600);
  G.place(1.6, 1.6, 0.9, -0.35);
  await sleep(400);
  await shot('cellar_flooded');
  await hotspot('plank');
  expect(S.has('evidence_found'), 'evidence');
  await sleep(800);
  await tube();
  if (truth) expect(S.has('ledger_volunteered') === (tubeKind === 'clean'), 'a trusting Tobin volunteers the ledger');

  if (lightning) {
    await swap();
    G.lookAt('window', 2.0);
    await waitFor(() => G.world.rooms.lamp.revealOpacity > 0.5, 'lightning on the window', 45000);
    await shot('lightning');
    await waitFor(() => S.has('saw_boats') && S.board.two_boats, 'lightning card', 5000);
    await swap();
  }

  await swap();
  await hotspot('lamp');
  expect(S.has('lamp_lit'), 'lamp lit');
  await sleep(1600);
  G.lookAt('lamp', 2.6);
  await shot('lamp_dim');
  await tube();

  await swap();
  await hotspot('rheostat');
  expect(S.holding?.id === 'rheostat', 'Tobin holds the rheostat');
  const pos = { ...G.world.pos.tobin };
  keyEvent('keydown', 's');
  await sleep(400);
  keyEvent('keyup', 's');
  expect(Math.hypot(G.world.pos.tobin.x - pos.x, G.world.pos.tobin.z - pos.z) < 0.01, 'the holder cannot walk away');
  await swap();
  await sleep(300);
  expect(S.holding, 'still holding after the swap');
  G.lookAt('lamp', 2.4);
  await shot('hold');
  await hotspot('lamp');
  expect(S.has('lamp_full'), 'lamp full');
  await skipBeat('lamplit');
  expect(S.has('lamp_full') && !S.holding, 'the beat returns to the same game');
  G.place(0.4, 3.1, 0.1, 0.2);
  await sleep(400);
  await shot('lamp_full');
  await swap();
  if (truth) {
    await sleep(700);
    await useItem('ledger', 'hatch_cellar');
  }
  await swap();
  if (truth) await tube();
  await hotspot('window');
  await hotspot('balcony');

  // ---- climax ----
  await hotspot('lamp');
  await waitFor(() => modalKind() === 'morse', 'morse');
  const word = truth ? 'CRANE' : 'SOS';
  await button(word);
  await sleep(300);
  key(word === 'CRANE' ? '-' : '.');
  await sleep(200);
  key('-');
  await sleep(300);
  await shot('morse');
  for (const ch of word) {
    for (const sym of MORSE[ch]) {
      key(sym);
      await sleep(170);
    }
  }
  if (truth) await skipBeat('arrest');
  await waitFor(() => modalKind() === 'ending', 'ending card', 20000);
  await sleep(3500);
  await shot('ending_card');
  await button('Continue');
  await waitFor(() => S.has('final_phase') && S.active === 'tobin' && !S.modal && !G.game.busy, 'final scene', 20000);
  await sleep(1200);

  // ---- final scene ----
  await hotspot('plate');
  expect(S.has('final_plate'), 'soot read');
  G.lookAt('plate', 1.9);
  await shot('final_projection');
  await waitFor(() => ui.log.some((l) => l.includes('IF I FALL')), 'twist line', 20000);
  if (board) {
    await waitFor(idle, 'idle before board');
    key('c');
    await waitFor(() => modalKind() === 'case', 'case board');
    await sleep(400);
    const root = ui.modal.el;
    const cardEl = (id) => root.querySelector(`[data-card="${id}"]`);
    const colEl = (id) => root.querySelector(`.column[data-column="${id}"]`);
    const drag = async (id, column) => {
      const a = cardEl(id).getBoundingClientRect();
      const b = colEl(column).getBoundingClientRect();
      const x0 = a.left + a.width / 2;
      const y0 = a.top + a.height / 2;
      const x1 = b.left + b.width / 2;
      const y1 = b.top + b.height / 2;
      pointer('pointerdown', x0, y0, cardEl(id));
      await sleep(50);
      for (let k = 1; k <= 8; k++) {
        pointer('pointermove', x0 + ((x1 - x0) * k) / 8, y0 + ((y1 - y0) * k) / 8, window);
        await sleep(25);
      }
      pointer('pointerup', x1, y1, window);
      await sleep(250);
      expect(S.board[id].column === column, `dragged ${id} onto ${column}`);
      step(`pinned ${id} on ${column} (drag)`);
    };
    const clickPin = async (id, column) => {
      cardEl(id).click();
      await sleep(200);
      colEl(column).click();
      await sleep(250);
      expect(S.board[id].column === column, `click-pinned ${id} onto ${column}`);
      step(`pinned ${id} on ${column} (click)`);
    };
    const mine = { tobin: ['projection', 'envelope', 'torn_page'], mara: ['projection', 'letter', 'wool'], crane: ['glove', 'photo', 'ledger'] }[board];
    await drag(mine[0], board);
    await drag(mine[1], board);
    await clickPin(mine[2], board);
    if (board !== 'crane') await clickPin('glove', 'crane');
    await sleep(300);
    await shot('case_board');
    key('Escape');
    await sleep(400);
  }
  if (actor === 'mara') {
    await swap();
    await hotspot('lamp');
  }
  await hotspot(actor === 'mara' ? 'hatch_lamp' : 'hatch_cellar');
  await waitFor(() => modalKind() === 'talk', 'final line');
  await sleep(500);
  await shot('final_line');
  const finalText = ui.modal.el.textContent;
  key(' ');
  await waitFor(() => ui.screen === 'ending', 'ending screen', 25000);
  await sleep(3400);
  await shot('epilogue');
  const epilogue = ui.endingEpilogue;
  expect(Object.values(EPILOGUES).includes(epilogue), `epilogue line shown (${epilogue})`);
  await sleep(6500);
  await shot('final');
  step(`ending reached as ${actor}, truth ${truth}, tube ${tubeKind}, trust ${S.trust}, epilogue "${epilogue}", hints ${S.hintsUsed}, tide ${S.tideBand}`);
  return { ok: true, actor, truth, finalText: finalText.slice(0, 200), epilogue, stats, log: log.slice(-6) };
}
