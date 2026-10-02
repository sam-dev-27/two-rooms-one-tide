// Browser smoke test: plays the game with real mouse/keyboard events on localhost.
// Paste into the devtools console on http://localhost:8000 (title screen), or load with:
//   await import('/tools/playthrough.browser.js').then((m) => m.run())
// Pass { stopAfter: 'flood' } to pause at the flooded cellar for a screenshot.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function run({ stopAfter = null, truth = true } = {}) {
  const game = window.__game;
  const S = window.__state;
  const canvas = document.querySelector('canvas');
  const { ROOMS } = await import('/src/data/rooms.js');

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
  const key = (k, code, keyCode) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, keyCode, which: keyCode, bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, keyCode, which: keyCode, bubbles: true }));
  };
  const scenes = () => game.scene.getScenes(true).map((s) => s.scene.key);
  const ui = () => game.scene.getScene('UI');
  const center = (id) => {
    const h = Object.values(ROOMS).flatMap((r) => r.hotspots).find((x) => x.id === id);
    return [h.x + h.w / 2, h.y + h.h / 2];
  };
  const log = [];
  const step = (msg) => log.push(`${S.active}: ${msg}`);

  const hotspot = async (id) => {
    click(...center(id));
    step(id);
    await sleep(500);
  };
  const swap = async () => {
    key('Tab', 'Tab', 9);
    step('swap');
    await sleep(800);
  };
  const useItem = async (item, id) => {
    const i = S.inventory[S.active].indexOf(item);
    if (i < 0) throw new Error(`${S.active} does not hold ${item}`);
    click(32 + i * 76 + 32, 720 - 42);
    await sleep(150);
    if (S.selected !== item) throw new Error(`could not select ${item}`);
    await hotspot(id);
  };
  const typeCode = async (digits) => {
    for (const d of digits) {
      key(d, `Digit${d}`, 48 + Number(d));
      await sleep(90);
    }
    await sleep(700);
  };
  const pressModalButton = async (label) => {
    const btn = ui().modal?.list.find((o) => o.text?.startsWith(label) && o.input);
    if (!btn) throw new Error(`no modal button "${label}"`);
    btn.emit('pointerdown', { rightButtonDown: () => false });
    step(`button "${label}"`);
    await sleep(600);
  };
  const expect = (cond, msg) => {
    if (!cond) throw new Error(`FAILED: ${msg}\n${log.join('\n')}`);
  };

  if (scenes().includes('Title')) {
    click(640, 360);
    await sleep(1600);
  }
  await pressModalButton('Begin');

  await hotspot('logbook');
  expect(S.holds('page_a'), 'logbook gives page_a');
  await swap();
  await hotspot('chalk');
  await hotspot('crate');
  expect(S.holds('page_b'), 'crate gives page_b');
  await swap();
  await hotspot('drawer');
  expect(S.modal, 'drawer opens keypad');
  await typeCode('1874');
  expect(S.holds('key'), 'keypad gives key');
  await sleep(500);
  await useItem('key', 'hatch_lamp');
  await useItem('page_a', 'hatch_lamp');
  await swap();
  expect(S.holds('valve_order'), 'pages combine on arrival');
  await hotspot('locker');
  expect(S.holds('fuse'), 'locker gives fuse');
  await sleep(500);
  await hotspot('valves');
  expect(S.roomStates.cellar === 'after', 'cellar floods');
  await sleep(1800);
  if (stopAfter === 'flood') return log;

  if (truth) {
    await hotspot('plank');
    expect(S.has('evidence_found'), 'plank gives evidence');
    await sleep(800);
  }
  await useItem('fuse', 'hatch_cellar');
  await swap();
  await hotspot('lamp');
  expect(S.has('lamp_lit'), 'lamp lights');
  await sleep(1800);
  if (stopAfter === 'lamp') return log;
  await hotspot('balcony');
  await pressModalButton(truth ? 'Signal the truth' : 'Signal for rescue');
  await sleep(2500);
  expect(scenes().includes('Ending'), 'ending scene reached');
  step(`ending reached, hints used ${S.hintsUsed}`);
  return log;
}
