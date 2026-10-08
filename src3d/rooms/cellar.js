// Tobin's cellar: stone walls, stairs up to a barred door, five valve wheels, the locker, the
// crate, chalk marks, the glass plate under the weight-well, the hatch, and the flood. Hotspots:
// valves, chalk, plate, locker, crate, stairs, hatch_cellar, rheostat (once lit), plank (after the flood).
import * as THREE from 'three';
import { RoomKit, texture, canvasTexture, paintedTexture, mat, brass, iron, box, cyl, group } from './common.js';
import { url } from '../assets.js';

const W = 8;
const D = 6;
const H = 4.0;
const X0 = -W / 2;
const Z0 = -D / 2;
const FLOOD = 0.5;
const TIDE_STEP = 0.05;
const PLATE_DOTS = ['#f4f1e6', '#3f9a4a', '#c0392b', '#e0b52c', '#2f6fb5'];
const VALVE_HEX = [0xc0392b, 0x2f6fb5, 0x3f9a4a, 0xe0b52c, 0xeeeeee];

const stoneFallback = () =>
  canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#4c5256';
    ctx.fillRect(0, 0, w, h);
    for (let row = 0; row < 8; row++) {
      const off = (row % 2) * 24;
      for (let x = -off; x < w; x += 48 + Math.random() * 10) {
        const g = 70 + Math.random() * 30;
        ctx.fillStyle = `rgb(${g},${g + 4},${g + 8})`;
        ctx.fillRect(x + 2, row * 32 + 2, 44, 28);
      }
    }
  });

const chalkTexture = () =>
  canvasTexture(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = ctx.fillStyle = 'rgba(235,231,218,0.92)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.font = 'italic 86px Georgia, serif';
    ctx.save();
    ctx.translate(40, 120);
    ctx.rotate(-0.05);
    ctx.fillText('LIT 1874', 0, 0);
    ctx.font = 'italic 54px Georgia, serif';
    ctx.fillText('drawer', 30, 80);
    ctx.restore();
    // The little anchor with an arrow pointing up at the plate, "to the well".
    const ax = 120;
    const ay = 320;
    ctx.beginPath();
    ctx.arc(ax, ay - 52, 12, 0, Math.PI * 2);
    ctx.moveTo(ax, ay - 40);
    ctx.lineTo(ax, ay + 60);
    ctx.moveTo(ax - 30, ay - 20);
    ctx.lineTo(ax + 30, ay - 20);
    ctx.moveTo(ax - 50, ay + 20);
    ctx.quadraticCurveTo(ax - 40, ay + 70, ax, ay + 62);
    ctx.quadraticCurveTo(ax + 40, ay + 70, ax + 50, ay + 20);
    ctx.stroke();
    ctx.font = 'italic 44px Georgia, serif';
    ctx.fillText('to the well', 190, 340);
    ctx.beginPath();
    ctx.moveTo(300, 300);
    ctx.lineTo(300, 200);
    ctx.moveTo(285, 220);
    ctx.lineTo(300, 196);
    ctx.lineTo(315, 220);
    ctx.stroke();
    ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(360 + i * 14, 430);
      ctx.lineTo(366 + i * 14, 480);
      ctx.stroke();
    }
  });

const printsTexture = () =>
  canvasTexture(256, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const sole = (x, y, s) => {
      ctx.fillStyle = 'rgba(40,30,20,0.75)';
      ctx.beginPath();
      ctx.ellipse(x, y, 22 * s, 9 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + 30 * s, y, 8 * s, 8 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    sole(60, 40, 1.2);
    sole(150, 92, 0.8);
  });

const plankTexture = () =>
  canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#5b4129';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(255,220,170,${Math.random() * 0.08})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 40 + Math.random() * 80, 2);
    }
  });

export function buildCellar() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06090c);
  scene.fog = new THREE.FogExp2(0x0b1216, 0.06);
  const kit = new RoomKit(scene);

  const stoneMap = texture('assets/3d/tex_stone.png', { repeat: [5, 2.6], fallback: stoneFallback });
  const flagMap = texture('assets/3d/tex_flagstone.png', { repeat: [3, 2.2], fallback: stoneFallback });
  const stone = mat(0x9c9d9a, { map: stoneMap });
  const stepStone = mat(0x8a8b88, { map: texture('assets/3d/tex_flagstone.png', { repeat: [0.5, 0.5], fallback: stoneFallback }) });
  const wood = mat(0x5e4128, { map: paintedTexture('#5e4128', { horizontal: true, spread: 20 }) });
  const darkWood = mat(0x3a2818, { map: paintedTexture('#3a2818', { horizontal: true }) });

  // ---- shell ----
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(0xa8a8a4, { map: flagMap }));
  floor.rotation.x = -Math.PI / 2;
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mat(0x2a2e30, { map: paintedTexture('#2a2e30') }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = H;
  const wall = (w, x, z, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, H), stone);
    m.position.set(x, H / 2, z);
    m.rotation.y = ry;
    return m;
  };
  scene.add(floor, ceiling, wall(W, 0, Z0, 0), wall(W, 0, -Z0, Math.PI), wall(D, X0, 0, Math.PI / 2), wall(D, -X0, 0, -Math.PI / 2));
  for (let i = 0; i < 4; i++) scene.add(box(0.22, 0.25, D, darkWood, -3 + i * 2, H - 0.12, 0));
  kit.bounds = { type: 'rect', minX: X0 + 0.35, maxX: -X0 - 0.35, minZ: Z0 + 0.35, maxZ: -Z0 - 0.35 };

  // ---- stairs up the back-left wall to a barred door ----
  const stairs = new THREE.Group();
  const STEPS = 8;
  const stepW = 0.3;
  const rise = 0.25;
  for (let i = 0; i < STEPS; i++) {
    const h = rise * (i + 1);
    stairs.add(box(stepW, h, 0.95, stepStone, -0.75 - i * stepW, h / 2, Z0 + 0.475));
  }
  const landing = box(0.95, rise * STEPS, 0.95, stepStone, X0 + 0.475, (rise * STEPS) / 2, Z0 + 0.475);
  const top = rise * STEPS;
  const door = box(0.85, 1.85, 0.08, mat(0xffffff, { map: paintedTexture('#4a3220', { horizontal: false, spread: 14 }) }), X0 + 0.48, top + 0.925, Z0 + 0.05);
  const bar = box(1.1, 0.1, 0.08, iron(), X0 + 0.48, top + 1.0, Z0 + 0.12);
  const leakMat = new THREE.MeshBasicMaterial({ color: 0xbfd4e6, transparent: true, opacity: 0.25 });
  const leak = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.025), leakMat);
  leak.position.set(X0 + 0.48, top + 0.015, Z0 + 0.1);
  leak.userData.noGlow = true;
  const prints = new THREE.Group();
  const printMap = printsTexture();
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.56), new THREE.MeshBasicMaterial({ map: printMap, transparent: true, depthWrite: false }));
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = Math.PI / 2;
    p.position.set(-0.75 - i * stepW, rise * (i + 1) + 0.003, Z0 + 0.5);
    p.userData.noGlow = true;
    prints.add(p);
  }
  stairs.add(landing, door, bar, leak, prints);
  kit.hotspot('stairs', stairs, { size: [3.4, 2.6, 1.4], center: [-2.3, 1.3, Z0 + 0.6] });
  kit.block(-2.3, Z0 + 0.5, 3.4, 1.0);
  const doorLight = new THREE.PointLight(0xcfe0ff, 0, 6, 1.5);
  doorLight.position.set(X0 + 0.6, top + 0.4, Z0 + 0.5);
  scene.add(doorLight);

  // ---- chalk marks and the glass plate under the weight-well ----
  const chalk = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshStandardMaterial({ map: chalkTexture(), transparent: true, roughness: 1 }));
  chalk.position.set(0.15, 1.25, Z0 + 0.42);
  const chalkObj = group(chalk);
  kit.hotspot('chalk', chalkObj, { size: [1.0, 1.0, 0.4], center: [0.15, 1.25, Z0 + 0.5] });
  const chimney = box(1.0, H - 1.9, 0.4, stone, 0.15, 1.9 + (H - 1.9) / 2, Z0 + 0.2);
  scene.add(chimney);
  kit.block(0.15, Z0 + 0.2, 1.0, 0.45);
  const plateCanvas = document.createElement('canvas');
  plateCanvas.width = 256;
  plateCanvas.height = 300;
  const plateTex = new THREE.CanvasTexture(plateCanvas);
  plateTex.colorSpace = THREE.SRGBColorSpace;
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, emissiveMap: plateTex, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.4 });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.72), plateMat);
  plate.position.set(0.15, 2.55, Z0 + 0.41);
  const plateFrame = group(box(0.72, 0.06, 0.05, iron(), 0.15, 2.92, Z0 + 0.42), box(0.72, 0.06, 0.05, iron(), 0.15, 2.18, Z0 + 0.42), box(0.06, 0.8, 0.05, iron(), -0.18, 2.55, Z0 + 0.42), box(0.06, 0.8, 0.05, iron(), 0.48, 2.55, Z0 + 0.42));
  const plateObj = group(plate, plateFrame);
  kit.hotspot('plate', plateObj, { size: [0.8, 0.9, 0.4], center: [0.15, 2.55, Z0 + 0.5], range: 3.6 });

  // ---- steel locker with brass padlock ----
  const LX = 1.55;
  const locker = new THREE.Group();
  const steel = mat(0x56636b, { rough: 0.55, metal: 0.45, map: paintedTexture('#56636b', { spread: 30 }) });
  locker.add(box(0.78, 1.95, 0.55, steel, 0, 0.975, 0));
  const lockerDoor = new THREE.Group();
  lockerDoor.add(box(0.74, 1.88, 0.03, steel, 0.37, 0, 0));
  for (let i = 0; i < 4; i++) lockerDoor.add(box(0.4, 0.02, 0.01, mat(0x2a3034), 0.37, 0.7 - i * 0.05, 0.02));
  lockerDoor.position.set(-0.37, 0.975, 0.29);
  const padlock = group(box(0.08, 0.09, 0.03, brass(), 0.66, -0.05, 0.04), new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 12, Math.PI), brass()));
  padlock.children[1].position.set(0.66, 0.0, 0.04);
  lockerDoor.add(padlock);
  locker.add(lockerDoor);
  const rags = box(0.6, 0.18, 0.4, mat(0x8a8070), 0, 0.3, 0);
  locker.add(rags);
  locker.position.set(LX, 0, Z0 + 0.3);
  kit.hotspot('locker', locker, { size: [0.95, 2.1, 0.9] });
  kit.block(LX, Z0 + 0.3, 0.8, 0.6);

  // ---- dumbwaiter hatch with speaking tube ----
  const hatch = new THREE.Group();
  hatch.add(box(0.8, 0.7, 0.12, darkWood, 0, 1.95, 0));
  hatch.add(box(0.64, 0.54, 0.04, wood, 0, 1.95, 0.07));
  hatch.add(box(0.1, 0.04, 0.04, brass(), 0.22, 1.95, 0.1));
  hatch.add(box(0.9, H - 2.3, 0.3, stone, 0, 2.3 + (H - 2.3) / 2, -0.08));
  const tube = cyl(0.04, 0.04, 1.6, brass(), 10, 0.55, 2.0, 0.05);
  const mouth = cyl(0.11, 0.05, 0.16, brass(), 14, 0.55, 1.3, 0.1);
  mouth.rotation.x = Math.PI / 2.4;
  hatch.add(tube, mouth);
  hatch.position.set(2.9, 0, Z0 + 0.06);
  kit.hotspot('hatch_cellar', hatch, { size: [1.2, 1.1, 0.8], center: [3.0, 1.85, Z0 + 0.35] });

  // ---- supply crate (lid opens) ----
  const crate = new THREE.Group();
  crate.add(box(1.0, 0.7, 0.8, wood, 0, 0.35, 0));
  for (const y of [0.12, 0.58]) crate.add(box(1.02, 0.06, 0.82, darkWood, 0, y, 0));
  const lid = new THREE.Group();
  lid.add(box(1.04, 0.06, 0.84, darkWood, 0, 0, 0.42));
  lid.position.set(0, 0.73, -0.42);
  const glove = box(0.24, 0.06, 0.34, mat(0xc8a040, { rough: 0.6 }), 0.15, 0.72, 0.05);
  crate.add(lid, glove);
  crate.position.set(3.25, 0, 0.4);
  crate.rotation.y = -0.15;
  kit.hotspot('crate', crate, { size: [1.2, 1.0, 1.1] });
  kit.block(3.25, 0.4, 1.15, 1.0);

  // ---- five valve wheels with brass tags on the left wall; wheel three leaks until the gasket ----
  const valves = new THREE.Group();
  const pipe = cyl(0.07, 0.07, 4.2, iron(), 10, X0 + 0.2, 1.15, 0.45);
  pipe.rotation.x = Math.PI / 2;
  valves.add(pipe, cyl(0.07, 0.07, H - 1.15, iron(), 10, X0 + 0.2, 1.15 + (H - 1.15) / 2, 2.55));
  const wheels = [];
  for (let i = 0; i < 5; i++) {
    const z = -1.2 + i * 0.75;
    const stem = cyl(0.03, 0.03, 0.3, iron(), 8, X0 + 0.35, 1.15, z);
    stem.rotation.z = Math.PI / 2;
    const wheel = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 24), mat(0x3e454b, { rough: 0.6, metal: 0.4, own: true }));
    wheel.add(rim);
    for (let k = 0; k < 4; k++) {
      const spoke = box(0.4, 0.025, 0.025, iron());
      spoke.rotation.z = (k * Math.PI) / 4;
      wheel.add(spoke);
    }
    wheel.add(cyl(0.04, 0.04, 0.05, iron(), 10, 0, 0, 0));
    wheel.children.at(-1).rotation.x = Math.PI / 2;
    wheel.position.set(X0 + 0.5, 1.15, z);
    wheel.rotation.y = Math.PI / 2;
    const tag = box(0.1, 0.07, 0.01, brass(), X0 + 0.42, 0.88, z);
    tag.rotation.y = Math.PI / 2;
    valves.add(stem, wheel, tag);
    wheels.push({ wheel, rim });
  }
  const spray = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xcfe8f0, transparent: true, opacity: 0.35, depthWrite: false }));
  spray.position.set(X0 + 0.6, 1.4, 0.3);
  spray.rotation.z = -Math.PI / 2.6;
  spray.userData.noGlow = true;
  valves.add(spray);
  kit.hotspot('valves', valves, { size: [0.65, 0.9, 3.4], center: [X0 + 0.42, 1.15, 0.3] });
  kit.block(X0 + 0.3, 0.3, 0.7, 4.2);

  // ---- rheostat on the pipe by the wheels (appears once the lamp is lit) ----
  const rheostat = new THREE.Group();
  const rhSrc = url('assets/ui/rheostat.png');
  const rhFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshStandardMaterial({ map: rhSrc ? texture('assets/ui/rheostat.png') : null, color: rhSrc ? 0xffffff : 0x7a5a2a, transparent: true, alphaTest: 0.3, roughness: 0.6 }),
  );
  const handle = new THREE.Group();
  handle.add(box(0.035, 0.24, 0.035, mat(0x1a1a1a, { rough: 0.5 }), 0, 0.12, 0));
  handle.position.z = 0.03;
  rheostat.add(box(0.56, 0.56, 0.03, iron(), 0, 0, -0.02), rhFace, handle);
  rheostat.position.set(X0 + 0.05, 1.6, 2.4);
  rheostat.rotation.y = Math.PI / 2;
  kit.hotspot('rheostat', rheostat, { size: [0.5, 0.7, 0.7], center: [X0 + 0.2, 1.6, 2.4] });

  // ---- the loose floorboard: set in the floor, floats free after the flood ----
  const boards = new THREE.Group();
  const bmat = mat(0xffffff, { map: plankTexture() });
  for (let i = 0; i < 4; i++) boards.add(box(1.2, 0.03, 0.2, bmat, 0, 0.015, -0.33 + i * 0.22));
  const hollow = box(1.1, 0.01, 0.2, mat(0x050505), 0, 0.02, 0.33);
  boards.add(hollow);
  boards.position.set(0.2, 0, 1.0);
  scene.add(boards);
  const loose = boards.children[3];
  const plank = group(box(1.15, 0.05, 0.2, mat(0xffffff, { map: plankTexture() }), 0, 0, 0));
  plank.position.set(0.5, FLOOD, 0.7);
  const plankHs = kit.hotspot('plank', plank, { size: [1.3, 0.5, 0.6] });

  // ---- flood water: a rippling plane whose height follows the tide, then the sluice ----
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D, 24, 18),
    new THREE.MeshStandardMaterial({ color: 0x2c6d86, transparent: true, opacity: 0.62, roughness: 0.15, metalness: 0.1, depthWrite: false }),
  );
  water.rotation.x = -Math.PI / 2;
  water.renderOrder = 2;
  scene.add(water);
  const basePos = water.geometry.attributes.position.array.slice();
  let level = -0.05;

  // ---- hanging lantern, cold fill ----
  const lantern = group(box(0.18, 0.26, 0.18, brass(), 0, 0, 0), new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(0xffd08a, { emissive: 0xffa040, emissiveIntensity: 2.2 })), cyl(0.008, 0.008, 1.0, iron(), 4, 0, 0.6, 0));
  lantern.position.set(1.0, H - 1.3, 0.3);
  scene.add(lantern);
  const lanternLight = new THREE.PointLight(0xffb066, 13, 14, 1.4);
  lanternLight.position.copy(lantern.position);
  const hemi = new THREE.HemisphereLight(0x5f7f96, 0x241a12, 1.0);
  const plateLight = new THREE.PointLight(0xffd59a, 0, 3.5, 1.6);
  plateLight.position.set(0.15, 2.5, Z0 + 0.9);
  scene.add(lanternLight, hemi, plateLight);

  let lightning = 0;

  function drawPlate(s) {
    const ctx = plateCanvas.getContext('2d');
    const w = plateCanvas.width;
    const h = plateCanvas.height;
    ctx.fillStyle = '#26302f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(216,228,230,0.18)';
    ctx.fillRect(8, 8, w - 16, h - 16);
    if (!s.has('lantern_set')) return;
    const full = s.has('final_phase');
    const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.55);
    g.addColorStop(0, `rgba(255,213,154,${full ? 0.95 : 0.6})`);
    g.addColorStop(1, 'rgba(255,213,154,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (!s.has('lens_wiped')) {
      for (const [dx, dy, r] of [[-36, -20, 70], [28, 12, 80], [-8, 36, 56]]) {
        ctx.fillStyle = 'rgba(255,240,200,0.18)';
        ctx.beginPath();
        ctx.arc(w / 2 + dx, h / 2 + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    const dotsY = full ? h - 60 : h / 2;
    if (!s.has('lens_set')) {
      PLATE_DOTS.slice(0, 3).forEach((c, i) => {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(w - 40 + i * 32, dotsY, 22, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      return;
    }
    PLATE_DOTS.forEach((c, i) => {
      const x = 34 + i * 40;
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(x, dotsY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(x, dotsY, 14, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(w - 22, dotsY);
    ctx.scale(-1, 1);
    ctx.font = 'bold 40px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff6dc';
    ctx.fillText('1', 0, 0);
    ctx.restore();
    if (full) {
      // The rim's soot writing, thrown down the well mirrored; the streak sits left of the bar.
      ctx.save();
      ctx.translate(w / 2 + 20, 30);
      ctx.scale(-1, 1);
      ctx.font = 'bold 32px Georgia, serif';
      ctx.fillStyle = 'rgba(28,22,16,0.92)';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      ctx.fillText('IF I FALL', 0, 0);
      ctx.fillText('IT WAS —', 0, 40);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,243,214,0.65)';
      ctx.fillRect(10, 72, 44, 34);
    }
  }

  return {
    id: 'cellar',
    scene,
    kit,
    spawn: { x: 1.4, z: 1.9, yaw: 0.2 },
    eye: 1.5,
    get waterLevel() {
      return level;
    },
    targetLevel(s) {
      return s.has('valves_set') ? FLOOD : s.tide * TIDE_STEP - 0.02;
    },
    sync(s) {
      drawPlate(s);
      plateTex.needsUpdate = true;
      plateLight.intensity = s.has('lantern_set') ? (s.has('final_phase') ? 2.2 : 1) : 0;
      lockerDoor.rotation.y = s.has('locker_open') ? -1.9 : 0;
      padlock.visible = !s.has('locker_open');
      lid.rotation.x = s.has('crate_open') ? -1.6 : 0;
      glove.visible = s.has('crate_open');
      prints.visible = !s.has('prints_gone');
      spray.visible = !s.has('gasket');
      const settings = s.memo.valves ?? [0, 0, 0, 0, 0];
      wheels.forEach(({ wheel, rim }, i) => {
        wheel.rotation.x = settings[i] * ((Math.PI * 2) / 5);
        rim.material.color.set(s.has('valves_set') ? VALVE_HEX[settings[i]] : 0x3e454b);
      });
      this.spin = s.has('valves_set');
      const shown = !!s.has('lamp_lit');
      rheostat.visible = shown;
      kit.hotspots.rheostat.hit.visible = shown;
      handle.rotation.z = s.has('lamp_full') || s.holding?.id === 'rheostat' ? -1.0 : 1.0;
      const floating = s.has('valves_set') && !s.has('evidence_found');
      plank.visible = floating;
      plankHs.hit.visible = floating;
      loose.visible = !s.has('valves_set');
      hollow.visible = s.has('valves_set');
    },
    update(dt, t, s, flicker) {
      const target = this.targetLevel(s);
      level += Math.sign(target - level) * Math.min(Math.abs(target - level), dt * 0.35);
      water.visible = level > 0.005;
      water.position.y = level;
      const pos = water.geometry.attributes.position;
      const amp = 0.012 + (s.tide / 6) * 0.02;
      for (let i = 0; i < pos.count; i++) {
        const x = basePos[i * 3];
        const y = basePos[i * 3 + 1];
        pos.array[i * 3 + 2] = Math.sin(x * 2.1 + t * 1.6) * amp + Math.cos(y * 2.7 + t * 1.2) * amp;
      }
      pos.needsUpdate = true;
      plank.position.y = level + 0.02 + Math.sin(t * 1.5) * 0.02;
      plank.rotation.z = Math.sin(t * 1.1) * 0.05;
      plank.rotation.y = Math.sin(t * 0.3) * 0.2;
      plankHs.hit.position.copy(plank.position);
      plankHs.anchor.copy(plank.position);
      if (this.spin) wheels.forEach(({ wheel }, i) => (wheel.rotation.x += dt * 0.15 * (i % 2 ? 1 : -1)));
      spray.scale.setScalar(0.85 + Math.random() * 0.3);
      lanternLight.intensity = 13 * (1 - flicker);
      lantern.rotation.z = Math.sin(t * 0.8) * 0.04 * (1 + s.tide / 3);
      lightning = Math.max(0, lightning - dt * 2.6);
      doorLight.intensity = lightning * 18;
      leakMat.opacity = 0.2 + lightning * 0.8;
    },
    strike(strength) {
      lightning = Math.max(lightning, strength);
    },
    flashWindow() {},
  };
}
