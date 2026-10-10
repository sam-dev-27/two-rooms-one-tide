// Screenshot helper: jumps straight into story states and photographs hover glows, the Space
// reveal, the cellar hatch, Captain Hale's death vision and the raid. Run with tools/run3d.mjs:
//   node tools/run3d.mjs --url http://localhost:8765/index.html --script /tools/shots.browser.js \
//        --opts '{"set":"glow"}' --shots /tmp/trot-v3 --prefix after_
// Sets: glow, hatch, hale, raid. State is forced through window.__state, so this is a look-only tool.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function run({ set = 'glow' } = {}) {
  for (let i = 0; i < 200 && !window.__game; i++) await sleep(100);
  const game = window.__game;
  const S = window.__state;
  const canvas = document.querySelector('canvas');
  window.__fastWalk = true;
  window.__fastStory = true;
  const { ROOMS } = await import('/src/data/rooms.js');
  const pt = (gx, gy, buttons = 1) => {
    const r = canvas.getBoundingClientRect();
    return { clientX: r.left + (gx * r.width) / 1280, clientY: r.top + (gy * r.height) / 720, bubbles: true, cancelable: true, button: 0, buttons, view: window };
  };
  const move = (x, y) => canvas.dispatchEvent(new MouseEvent('mousemove', pt(x, y, 0)));
  const click = (x, y) => {
    move(x, y);
    canvas.dispatchEvent(new MouseEvent('mousedown', pt(x, y)));
    canvas.dispatchEvent(new MouseEvent('mouseup', pt(x, y, 0)));
  };
  const KEYCODES = { Tab: 9, Enter: 13, Escape: 27, ' ': 32, Shift: 16 };
  const keyEvent = (type, k) => {
    const code = k === ' ' ? 'Space' : k === 'Shift' ? 'ShiftLeft' : k.length === 1 ? `Key${k.toUpperCase()}` : k;
    const keyCode = KEYCODES[k] ?? k.toUpperCase().charCodeAt(0);
    window.dispatchEvent(new KeyboardEvent(type, { key: k, code, keyCode, which: keyCode, bubbles: true }));
  };
  const key = (k) => {
    keyEvent('keydown', k);
    keyEvent('keyup', k);
  };
  const scenes = () => game.scene.getScenes(true).map((s) => s.scene.key);
  const gs = () => game.scene.getScene('Game');
  const ui = () => game.scene.getScene('UI');
  const shot = async (name) => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await window.__shot?.(name);
  };
  const waitFor = async (cond, label, timeout = 20000) => {
    const t0 = performance.now();
    while (!cond()) {
      if (performance.now() - t0 > timeout) throw new Error(`timed out waiting for ${label} (scenes=${scenes()})`);
      await sleep(100);
    }
  };
  const center = (id) => {
    const h = ROOMS[S.room].hotspots.find((x) => x.id === id);
    if (!h) throw new Error(`${id} is not in ${S.room}`);
    return [h.x + h.w / 2, h.y + h.h / 2];
  };

  // Title, opening, chapter card, hook and how-to out of the way.
  S.seen.add('howto');
  await waitFor(() => scenes().includes('Title') || scenes().includes('Game'), 'boot', 60000);
  for (let i = 0; i < 20 && scenes().includes('Title'); i++) {
    click(640, 360);
    await sleep(500);
  }
  if (scenes().includes('Cutscene')) key('Escape');
  await waitFor(() => scenes().includes('Game') && gs().playing, 'game');
  for (let i = 0; i < 60 && (S.modal || ui().modal); i++) {
    key(ui().modal?.kind === 'talk' ? ' ' : 'Escape');
    await sleep(200);
  }
  ui().clearMessages();

  const flags = (list) => list.forEach((f) => S.set(f));
  const goto = async (who, area) => {
    if (S.active !== who) S.setActive(who);
    S.area[who] = area;
    for (const r of Object.keys(ROOMS)) S.seen.add(`visit_${r}`);
    gs().renderRoom();
    ui().refresh?.();
    ui().clearMessages();
    await sleep(500);
  };
  const hover = async (id) => {
    move(...center(id));
    await sleep(900);
  };
  const reveal = async (name) => {
    move(5, 700);
    keyEvent('keydown', 'Shift');
    await sleep(900);
    await shot(name);
    keyEvent('keyup', 'Shift');
    await sleep(400);
  };
  const out = [];

  if (set === 'glow') {
    await goto('mara', 'lamp');
    await hover('lamp');
    await shot('glow_lamp_hover');
    await hover('logbook');
    await shot('glow_logbook_hover');
    await reveal('glow_lamp_reveal');
    flags(['fuse_fitted', 'lantern_set', 'lens_wiped', 'lens_set', 'valves_set', 'lamp_lit', 'lamp_full']);
    S.setRoomState('lamp', 'after');
    S.setRoomState('cellar', 'after');
    await goto('mara', 'gallery');
    await hover('tally');
    await shot('glow_gallery_hover');
    await reveal('glow_gallery_reveal');
    await goto('mara', 'lamp');
    await hover('lamp');
    await shot('glow_lamplit_hover');
    await goto('tobin', 'cellar');
    await hover('valves');
    await shot('glow_cellar_flooded_hover');
    await reveal('glow_cellar_flooded_reveal');
    out.push('glow shots taken');
  }

  if (set === 'hatch') {
    await goto('tobin', 'cellar');
    await shot('hatch_closed');
    await hover('floor_hatch');
    await shot('hatch_closed_hover');
    await reveal('hatch_closed_reveal');
    click(...center('floor_hatch'));
    await sleep(1800);
    await shot('hatch_open');
    out.push(`hatch open: ${S.has('hatch_open')}`);
    await hover('floor_hatch_open');
    await shot('hatch_open_hover');
    click(...center('floor_hatch_open'));
    await waitFor(() => S.room === 'wheelroom', 'descend');
    await sleep(1500);
    for (let i = 0; i < 30 && (gs().ghostShowing || S.modal || scenes().includes('Cutscene')); i++) {
      key('Escape');
      await sleep(300);
    }
    await shot('hatch_wheelroom');
    click(...center('wheel_back'));
    await waitFor(() => S.room === 'cellar', 'climb back');
    await sleep(900);
    flags(['fuse_fitted', 'lantern_set', 'lens_wiped', 'lens_set', 'knows_order', 'gasket']);
    gs().api.setRoomState('cellar', 'after');
    S.set('valves_set');
    await sleep(2200);
    ui().clearMessages();
    await shot('hatch_flooded');
    out.push(`room key after flood: ${gs().bg.texture.key}`);
  }

  if (set === 'hale') {
    window.__fastStory = false;
    await goto('mara', 'lamp');
    flags(['fuse_fitted', 'lantern_set', 'lens_wiped', 'lens_set', 'valves_set', 'lamp_lit']);
    S.setRoomState('lamp', 'after');
    S.setRoomState('cellar', 'after');
    await goto('mara', 'lamp');
    gs().api.ghost('signal');
    await waitFor(() => gs().ghostShowing, 'captain');
    await sleep(2500);
    await shot('hale_ghost');
    key('Escape');
    await sleep(400);
    key('Escape');
    await waitFor(() => scenes().includes('Cutscene'), 'vision', 15000);
    const cut = game.scene.getScene('Cutscene');
    for (let i = 0; i < 4; i++) {
      await sleep(3800);
      await shot(`hale_vision_${i + 1}`);
      if (!scenes().includes('Cutscene')) break;
      cut.nextShot?.();
    }
    key('Escape');
    await waitFor(() => scenes().includes('Game'), 'back');
    out.push(`card: ${!!S.board.marigold_last}`);
  }

  if (set === 'raid') {
    flags(['fuse_fitted', 'lantern_set', 'lens_wiped', 'lens_set', 'valves_set', 'lamp_lit', 'lamp_full', 'signalled_sos']);
    S.setRoomState('lamp', 'after');
    S.setRoomState('cellar', 'after');
    await goto('mara', 'lamp');
    window.__fastRaid = false;
    gs().api.raid(() => {
      out.push('raid done');
      gs().view().ending('cover', () => out.push('ending done'));
    });
    await waitFor(() => scenes().includes('Raid'), 'raid scene', 15000);
    const raid = game.scene.getScene('Raid');
    await sleep(1500);
    await shot('raid_intro');
    await waitFor(() => raid.phase === 'howto' || raid.phase === 'fight', 'howto');
    await sleep(600);
    await shot('raid_howto');
    key('Enter');
    await waitFor(() => raid.phase === 'fight', 'fight');
    for (let i = 0; i < 30; i++) {
      const w = raid.sim.wreckers.find((x) => x.front === 'gallery' && x.state === 'climbing');
      if (w) move(raid.screenX(w), raid.screenY(w));
      else move(640, 420);
      await sleep(250);
    }
    await shot('raid_gallery');
    key('Tab');
    await sleep(900);
    for (let i = 0; i < 40; i++) {
      await sleep(150);
      if (raid.sim.wreckers.some((x) => x.front === 'cellar' && x.state === 'wading')) break;
    }
    await sleep(1200);
    await shot('raid_cellar');
    out.push(`meters ${JSON.stringify(raid.sim.meters)}`);
    key('Tab');
    move(1100, 650);
    await waitFor(() => raid.sim.wreckers.some((w) => w.state === 'top'), 'one over the rail', 30000);
    await sleep(1500);
    move(400, 300);
    await sleep(500);
    await shot('raid_gallery_top');

    // Play the rest with a simple bot: aim at the highest climber, flash him when blind, shove
    // anyone over the rail, click waders in the green, and swap when the other front is worse.
    let shotPressure = false;
    while (raid.phase === 'fight') {
      const sim = raid.sim;
      const there = raid.front === 'gallery' ? 'cellar' : 'gallery';
      const p = sim.pressure(there);
      const mine = sim.pressure(raid.front);
      if (!shotPressure && p?.level >= 1 && raid.front === 'cellar') {
        shotPressure = true;
        await shot('raid_pressure');
      }
      if (p && (!mine || p.level > mine.level)) {
        key('Tab');
        await sleep(450);
        continue;
      }
      if (raid.front === 'gallery') {
        const top = sim.active('gallery').find((w) => w.state === 'top');
        if (top) {
          for (let i = 0; i < 3; i++) {
            click(raid.screenX(top), raid.screenY(top));
            await sleep(150);
          }
          continue;
        }
        const c = sim.active('gallery').filter((w) => w.state === 'climbing').sort((a, b) => b.progress - a.progress)[0];
        if (c) {
          move(raid.screenX(c), raid.screenY(c));
          if (c.blind) click(raid.screenX(c), raid.screenY(c));
        }
      } else {
        const w = sim.active('cellar').sort((a, b) => b.progress - a.progress)[0];
        if (w && sim.inGreen(w)) click(raid.screenX(w), raid.screenY(w));
      }
      await sleep(70);
    }
    await waitFor(() => raid.phase === 'result' && raid.result, 'result card', 10000);
    await sleep(700);
    await shot('raid_result');
    out.push(`result ${JSON.stringify(raid.sim.result())}`);
    click(640, 600);
    await waitFor(() => ui().modal, 'ending card', 15000);
    await sleep(1500);
    await shot('raid_ending_card');
    out.push(`tier flag: ${['clean', 'bruised', 'battered'].find((t) => S.has(`raid_${t}`))}`);
  }

  return out.join('\n');
}
