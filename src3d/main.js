// Entry point for the first-person version (3d.html). The puzzle chain, text and state are the
// 2D game's own modules; this only swaps the presentation.
import { state } from '../src/systems/State.js';
import { sfx } from '../src/systems/Sfx.js';
import { OPENING } from '../src/data/cutscenes.js';
import { loadManifest, prepareItems } from './assets.js';
import { createAudio } from './audio.js';
import { createUI } from './ui/index.js';
import { World } from './world.js';
import { Game } from './game.js';

const DIGITS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'];
const params = new URLSearchParams(location.search);
const debug = ['localhost', '127.0.0.1'].includes(location.hostname) || params.has('debug');

async function boot() {
  await loadManifest();
  const audio = createAudio();
  sfx.attach(audio.game);
  await Promise.all([prepareItems(), audio.load()]);

  const canvas = document.getElementById('view');
  const app = document.getElementById('app');
  const vignette = document.createElement('div');
  vignette.className = 'glasses-vignette';
  // Tobin sees through his round spectacles: soft dark rims and a faint lens tint.
  Object.assign(vignette.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 300ms',
    background: 'radial-gradient(ellipse 62% 78% at 50% 48%, rgba(0,0,0,0) 70%, rgba(20,14,8,0.45) 88%, rgba(6,4,2,0.8) 100%)',
    boxShadow: 'inset 0 0 60px 18px rgba(0,0,0,0.35)',
  });
  const glasses = () => (vignette.style.opacity = state.active === 'tobin' && game.playing ? '1' : '0');
  app.insertBefore(vignette, document.getElementById('hud'));

  let manualPause = false;
  let lastScreenAt = 0;
  const startDrag = params.has('drag') || navigator.webdriver === true;
  const world = new World(canvas, { drag: startDrag, onStep: (wet) => audio.step(sfx, wet) });
  const controls = world.controls;

  const ui = createUI({
    state,
    sfx,
    hooks: {
      onModal(open) {
        controls.clearKeys();
        if (open) controls.unlock();
        else if (game.playing && !controls.dragMode && !ui.screen) controls.lock();
      },
      onEscape() {
        if (game.playing && !game.busy && performance.now() - lastScreenAt > 400) manualPause = !manualPause;
      },
    },
  });
  const game = new Game({ state, ui, world, sfx });

  const paused = () => game.playing && !state.modal && !ui.screen && (manualPause || (!controls.dragMode && !controls.locked));

  controls.h = {
    canLook: () => game.playing && !state.modal && !ui.screen && !game.busy,
    onClick(x, y) {
      if (manualPause) {
        manualPause = false;
        return;
      }
      game.click(x, y);
    },
    onUnlockedClick() {
      manualPause = false;
      if (game.playing && !state.modal && !ui.screen) controls.lock();
    },
    onRightClick: () => state.select(null),
    onLockChange(locked) {
      if (locked) manualPause = false;
    },
    onLockFailed() {
      manualPause = false;
      ui.toast('Mouse capture is unavailable here: drag to look, click to use.');
    },
  };

  const playable = () => game.playing && !state.modal && !ui.screen && !game.busy;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Tab') e.preventDefault();
    if (!playable() || e.ctrlKey || e.metaKey || e.altKey) return;
    state.noteInput();
    if (e.code === 'Space' || e.key === 'Shift') {
      e.preventDefault();
      game.showReveal(true);
      return;
    }
    controls.keyDown(e.code);
    if (e.repeat) return;
    if (e.code === 'Tab') game.swap();
    else if (e.code === 'KeyE') game.click(controls.dragMode && controls.mouse ? controls.mouse.x : null, controls.dragMode && controls.mouse ? controls.mouse.y : null);
    else if (e.code === 'KeyQ') state.select(null);
    else if (DIGITS.includes(e.code)) game.selectSlot(DIGITS.indexOf(e.code));
  });
  window.addEventListener('keyup', (e) => {
    controls.keyUp(e.code);
    if (e.code === 'Space' || e.key === 'Shift') game.showReveal(false);
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (playable()) game.cycleItem(Math.sign(e.deltaY));
    },
    { passive: false },
  );
  window.addEventListener('pointerdown', () => state.noteInput());

  // ---------- flow: title, opening, play, ending ----------

  function showTitle() {
    game.playing = false;
    controls.unlock();
    ui.setCrosshair(false);
    ui.title({
      onStart: async () => {
        sfx.startAmbient();
        await ui.cutscene(OPENING, { mode: 'opening' });
        state.reset();
        game.begin();
        ui.fade(0, 500);
        if (!controls.dragMode) controls.lock();
      },
    });
  }

  game.onEnd = (info) => {
    controls.unlock();
    ui.setCrosshair(false);
    ui.endingScreen({ ...info, onAgain: () => showTitle() });
  };

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    if (ui.screen || state.modal) lastScreenAt = now;
    glasses();
    const isPaused = paused();
    ui.setPaused(isPaused);
    ui.setCrosshair(game.playing && !state.modal && !ui.screen && !isPaused && !controls.dragMode);
    canvas.style.cursor = controls.dragMode && game.world.target && !state.modal ? 'pointer' : '';
    ui.update(dt);
    game.update(dt, { paused: isPaused, mouse: controls.dragMode ? controls.mouse : null });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  if (debug) {
    window.__game3d = {
      state,
      ui,
      world,
      game,
      sfx,
      ready: true,
      /** Uses a hotspot in the current room, as a click would (optionally with an item). */
      interact(id, item = null) {
        const hs = game.hotspotData(id);
        if (!hs) throw new Error(`no hotspot ${id} in ${state.room}`);
        game.use(hs, item);
      },
      swap: () => game.swap(),
      setDrag: (on) => controls.setDragMode(on),
      /** Teleports the player and turns them toward a hotspot (for screenshots and input tests). */
      lookAt(id, distance = 1.8) {
        const hs = world.hotspot(id);
        if (!hs) throw new Error(`no hotspot ${id}`);
        const p = world.pos[world.who];
        const a = hs.anchor;
        if (distance !== null) {
          let dx = p.x - a.x;
          let dz = p.z - a.z;
          const d = Math.hypot(dx, dz) || 1;
          p.x = a.x + (dx / d) * distance;
          p.z = a.z + (dz / d) * distance;
        }
        const dx = a.x - p.x;
        const dz = a.z - p.z;
        controls.yaw = Math.atan2(-dx, -dz);
        controls.pitch = Math.atan2(a.y - world.room.eye, Math.hypot(dx, dz));
      },
      place(x, z, yaw = null, pitch = null) {
        const p = world.pos[world.who];
        p.x = x;
        p.z = z;
        if (yaw !== null) controls.yaw = yaw;
        if (pitch !== null) controls.pitch = pitch;
      },
      get target() {
        return world.target;
      },
      get paused() {
        return paused();
      },
    };
  }

  showTitle();
}

boot().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f6efe0;position:fixed;inset:20px;font:14px monospace">3D version failed to start:\n${err?.stack ?? err}</pre>`);
});
