// Mara's lamp room: a round brass-and-plaster room at the top of the tower. Every hotspot in
// ROOMS.lamp has a body here: logbook, drawer, lamp, window, balcony, hatch_lamp.
import * as THREE from 'three';
import { RoomKit, texture, canvasTexture, paintedTexture, mat, brass, iron, box, cyl, group } from './common.js';
import { LIGHTNING_TEXT } from '../../src/data/text.js';

export const R = 4.2;
const H = 4.0;
const DEG = Math.PI / 180;
const at = (deg, r, y = 0) => new THREE.Vector3(r * Math.sin(deg * DEG), y, -r * Math.cos(deg * DEG));

const WINDOW = { deg: 50, half: 8, sill: 0.95, top: 2.65 };
const DOOR = { deg: 105, half: 7, top: 2.25 };

/** A curved slice of the round wall between two angles (our convention: 0 deg is -z, clockwise from above). */
function wallSlice(material, fromDeg, toDeg, y0, y1) {
  const geo = new THREE.CylinderGeometry(R, R, y1 - y0, Math.max(2, Math.round((toDeg - fromDeg) / 5)), 1, true, Math.PI - toDeg * DEG, (toDeg - fromDeg) * DEG);
  const m = new THREE.Mesh(geo, material);
  m.position.y = (y0 + y1) / 2;
  return m;
}

/** Places `obj` against the wall at `deg`, its local +z facing the room centre. */
function onWall(obj, deg, r, y = 0) {
  obj.position.copy(at(deg, r, y));
  obj.rotation.y = -deg * DEG;
  return obj;
}

const lensTexture = () =>
  canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#cfe6e8';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      const g = ctx.createLinearGradient(0, y, 0, y + 16);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.6, 'rgba(120,160,170,0.5)');
      g.addColorStop(1, 'rgba(40,70,80,0.6)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y, w, 16);
    }
    ctx.fillStyle = 'rgba(176,138,62,0.9)';
    for (let x = 0; x < w; x += 64) ctx.fillRect(x, 0, 4, h);
  });

const pageTexture = () =>
  canvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#efe2c0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(120,90,50,0.25)';
    ctx.fillRect(w / 2 - 3, 0, 6, h);
    ctx.strokeStyle = 'rgba(43,33,22,0.75)';
    ctx.lineWidth = 2;
    for (let page = 0; page < 2; page++) {
      for (let i = 0; i < 9; i++) {
        const y = 30 + i * 24;
        ctx.beginPath();
        let x = page * (w / 2) + 26;
        ctx.moveTo(x, y);
        const end = page * (w / 2) + w / 2 - 26 - Math.random() * 60;
        while (x < end) {
          x += 6 + Math.random() * 10;
          ctx.lineTo(x, y + (Math.random() - 0.5) * 4);
        }
        ctx.stroke();
      }
    }
  });

const plankTexture = (base) =>
  canvasTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 42) {
      ctx.fillStyle = `rgba(0,0,0,${0.12 + Math.random() * 0.12})`;
      ctx.fillRect(x, 0, 3, h);
      for (let k = 0; k < 18; k++) {
        ctx.fillStyle = `rgba(255,230,190,${Math.random() * 0.06})`;
        ctx.fillRect(x + 4 + Math.random() * 34, Math.random() * h, 2, 30 + Math.random() * 80);
      }
    }
  });

const rainTexture = () => {
  const tex = canvasTexture(256, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(210,230,240,0.55)';
    for (let i = 0; i < 140; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const len = 10 + Math.random() * 26;
      ctx.lineWidth = Math.random() < 0.2 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - len * 0.25, y + len);
      ctx.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
};

const revealTexture = () =>
  canvasTexture(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h * 0.45);
    ctx.rotate(-7 * DEG);
    ctx.font = 'italic bold 64px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eef6fa';
    ctx.shadowColor = 'rgba(220,240,255,0.9)';
    ctx.shadowBlur = 18;
    LIGHTNING_TEXT.reveal.split('\n').forEach((line, i) => ctx.fillText(line, 0, i * 84));
    ctx.restore();
  });

/** Reef and the Marigold's hull, shown on the sea at low tide. */
const reefTexture = () =>
  canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#141a1c';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 32) ctx.lineTo(x, h - 30 - Math.abs(Math.sin(x * 0.013)) * 70 - Math.random() * 20);
    ctx.lineTo(w, h);
    ctx.fill();
    ctx.fillStyle = '#20262a';
    ctx.beginPath();
    ctx.moveTo(560, h - 70);
    ctx.lineTo(720, h - 95);
    ctx.lineTo(760, h - 60);
    ctx.lineTo(600, h - 40);
    ctx.fill();
    ctx.strokeStyle = '#20262a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(650, h - 85);
    ctx.lineTo(630, h - 170);
    ctx.stroke();
    ctx.fillStyle = 'rgba(220,235,240,0.35)';
    for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * w, h - 40 - Math.random() * 50, 18 + Math.random() * 30, 2);
  });

export function buildLamp() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1118);
  scene.fog = new THREE.FogExp2(0x0d151d, 0.035);
  const kit = new RoomKit(scene);

  const plasterMap = texture('assets/3d/tex_plaster.png', { repeat: [6, 1.4], fallback: () => paintedTexture('#3d6b6a', { spread: 30 }) });
  const floorMap = texture('assets/3d/tex_floorboards.png', { repeat: [3, 3], fallback: () => plankTexture('#5a3f28') });
  const plaster = mat(0xffffff, { map: plasterMap, side: THREE.BackSide });
  const wood = mat(0x6b4a2e, { map: paintedTexture('#6b4a2e', { horizontal: true, spread: 20 }) });
  const darkWood = mat(0x3f2b1b, { map: paintedTexture('#3f2b1b', { horizontal: true }) });

  // ---- shell: floor, curved wall with window and door openings, conical ceiling ----
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R + 0.05, 48), mat(0xffffff, { map: floorMap }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const w0 = WINDOW.deg - WINDOW.half;
  const w1 = WINDOW.deg + WINDOW.half;
  const d0 = DOOR.deg - DOOR.half;
  const d1 = DOOR.deg + DOOR.half;
  scene.add(wallSlice(plaster, w1, d0, 0, H), wallSlice(plaster, d1, w0 + 360, 0, H));
  scene.add(wallSlice(plaster, w0, w1, 0, WINDOW.sill), wallSlice(plaster, w0, w1, WINDOW.top, H));
  scene.add(wallSlice(plaster, d0, d1, DOOR.top, H));
  const skirting = wallSlice(darkWood.clone(), 0, 360, 0, 0.18);
  skirting.material.side = THREE.BackSide;
  skirting.scale.set(0.995, 1, 0.995);
  scene.add(skirting);
  const ceiling = new THREE.Mesh(new THREE.ConeGeometry(R + 0.02, 1.4, 36, 1, true), mat(0x22323a, { side: THREE.BackSide, map: paintedTexture('#22323a') }));
  ceiling.position.y = H + 0.7;
  scene.add(ceiling);
  for (let i = 0; i < 12; i++) {
    const rib = box(0.08, 0.1, R, darkWood);
    rib.position.copy(at(i * 30 + 15, R / 2, H + 0.32));
    rib.rotation.y = -(i * 30 + 15) * DEG;
    rib.rotation.x = Math.atan2(1.4, R) * 0.6;
    scene.add(rib);
  }
  kit.bounds = { type: 'circle', r: R - 0.38 };

  // ---- the sea outside: a painted ring far away, plus reef, ships and a rowboat ----
  const seaMap = texture('assets/3d/sea_backdrop.png', {
    repeat: [3, 1],
    mirror: true,
    fallback: () =>
      canvasTexture(512, 256, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#1b2a36');
        g.addColorStop(0.5, '#3a5562');
        g.addColorStop(0.52, '#1f3a44');
        g.addColorStop(1, '#0b1a20');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }),
  });
  const seaMat = new THREE.MeshBasicMaterial({ map: seaMap, color: 0x8a9aa6, side: THREE.BackSide, fog: false });
  const sea = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 34, 48, 1, true), seaMat);
  sea.position.y = 1.0;
  scene.add(sea);
  const seaFloor = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshBasicMaterial({ color: 0x0a161c, fog: false }));
  seaFloor.rotation.x = -Math.PI / 2;
  seaFloor.position.y = -15;
  scene.add(seaFloor);
  const reef = new THREE.Mesh(new THREE.PlaneGeometry(26, 6.5), new THREE.MeshBasicMaterial({ map: reefTexture(), transparent: true, fog: false, depthWrite: false }));
  reef.position.copy(at(WINDOW.deg + 4, 30, -3.6));
  reef.lookAt(0, -3.6, 0);
  scene.add(reef);
  const dot = (color, size) => new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), new THREE.MeshBasicMaterial({ color, fog: false }));
  const ship = group(dot(0xffd27a, 0.14), dot(0xff6a4a, 0.1), dot(0xffd27a, 0.1));
  ship.children[1].position.x = 0.6;
  ship.children[2].position.set(-0.5, 0.35, 0);
  ship.position.copy(at(WINDOW.deg - 6, 34, -0.6));
  const cutter = group(dot(0x9fe2ff, 0.12), dot(0x7dff9a, 0.09));
  cutter.children[1].position.x = 0.4;
  cutter.position.copy(at(WINDOW.deg + 6, 22, -1.6));
  const rowboat = group(dot(0xffc46a, 0.08));
  rowboat.position.copy(at(WINDOW.deg - 2, 12, -4.5));
  scene.add(ship, cutter, rowboat);

  // ---- window: frame, glass, rain, the salt writing and a flash layer ----
  const winR = R * Math.cos(WINDOW.half * DEG) - 0.02;
  const winW = 2 * R * Math.sin(WINDOW.half * DEG);
  const winH = WINDOW.top - WINDOW.sill;
  const winY = (WINDOW.sill + WINDOW.top) / 2;
  const frameMat = darkWood;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), mat(0x9fb8c4, { transparent: true, opacity: 0.12, rough: 0.1 }));
  const rainMap = rainTexture();
  const rain = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), new THREE.MeshBasicMaterial({ map: rainMap, transparent: true, opacity: 0.3, depthWrite: false }));
  rain.position.z = 0.01;
  rain.userData.noGlow = true;
  const revealMat = new THREE.MeshBasicMaterial({ map: revealTexture(), transparent: true, opacity: 0, depthWrite: false });
  const reveal = new THREE.Mesh(new THREE.PlaneGeometry(winW * 0.95, winW * 0.95), revealMat);
  reveal.position.set(0, 0.1, 0.02);
  reveal.userData.noGlow = true;
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xfff1c4, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), flashMat);
  flash.position.z = 0.03;
  flash.userData.noGlow = true;
  const sill = box(winW + 0.3, 0.08, 0.32, frameMat, 0, -winH / 2 - 0.02, 0.1);
  const lintel = box(winW + 0.3, 0.14, 0.16, frameMat, 0, winH / 2 + 0.04, 0.04);
  const jambs = [-1, 1].map((s) => box(0.09, winH, 0.14, frameMat, (s * (winW + 0.06)) / 2, 0, 0.03));
  const mullion = box(0.05, winH, 0.06, frameMat, 0, 0, 0.02);
  const transom = box(winW, 0.05, 0.06, frameMat, 0, winH * 0.18, 0.02);
  const windowObj = onWall(group(glass, rain, reveal, flash, sill, lintel, ...jambs, mullion, transom), WINDOW.deg, winR, winY);
  kit.hotspot('window', windowObj, { size: [1.4, 1.9, 1.4] });

  // ---- balcony door: planks, iron latch wired into the lamp circuit; it swings ajar at full power ----
  const doorR = R * Math.cos(DOOR.half * DEG) - 0.02;
  const doorW = 2 * R * Math.sin(DOOR.half * DEG);
  const doorLeaf = new THREE.Group();
  const leaf = box(doorW - 0.06, DOOR.top - 0.05, 0.06, mat(0xffffff, { map: plankTexture('#4a3220') }), doorW / 2 - 0.03, DOOR.top / 2, 0);
  const latch = box(0.16, 0.08, 0.06, iron(), doorW - 0.18, 1.1, 0.05);
  const wire = box(0.02, 1.1, 0.02, mat(0x8a5a2a), doorW - 0.12, 1.7, 0.05);
  doorLeaf.add(leaf, latch, wire, box(doorW - 0.1, 0.06, 0.07, iron(), doorW / 2, 0.5, 0.02), box(doorW - 0.1, 0.06, 0.07, iron(), doorW / 2, 1.8, 0.02));
  doorLeaf.position.x = -doorW / 2;
  const doorFrame = group(box(0.1, DOOR.top, 0.16, frameMat, -doorW / 2 - 0.03, DOOR.top / 2, 0), box(0.1, DOOR.top, 0.16, frameMat, doorW / 2 + 0.03, DOOR.top / 2, 0), box(doorW + 0.26, 0.12, 0.16, frameMat, 0, DOOR.top + 0.03, 0));
  // Outside the door: the balcony rail and the tuft of red wool.
  const rail = group(box(2.4, 0.05, 0.05, iron(), 0, 1.0, -1.1), box(0.05, 1.0, 0.05, iron(), -0.8, 0.5, -1.1), box(0.05, 1.0, 0.05, iron(), 0.8, 0.5, -1.1), box(2.4, 0.06, 1.3, mat(0x2b3034), 0, -0.03, -0.55));
  const wool = box(0.06, 0.08, 0.05, mat(0xb5413a), 0.3, 1.04, -1.08);
  rail.add(wool);
  rail.children.forEach((c) => (c.userData.noGlow = true));
  const balconyObj = onWall(group(doorLeaf, doorFrame), DOOR.deg, doorR, 0);
  const outside = onWall(rail, DOOR.deg, doorR, 0);
  scene.add(outside);
  kit.hotspot('balcony', balconyObj, { size: [1.3, 2.4, 1.3], center: at(DOOR.deg, doorR - 0.1, 1.15).toArray() });

  // ---- desk with logbook and number-lock drawer ----
  const DESK = -58;
  const desk = new THREE.Group();
  desk.add(box(1.4, 0.06, 0.7, wood, 0, 0.78, 0));
  for (const [x, z] of [[-0.64, -0.3], [0.64, -0.3], [-0.64, 0.3], [0.64, 0.3]]) desk.add(box(0.06, 0.76, 0.06, darkWood, x, 0.38, z));
  desk.add(box(1.3, 0.5, 0.04, darkWood, 0, 0.5, -0.32));
  desk.add(box(0.06, 0.4, 0.62, darkWood, -0.28, 0.55, 0), box(0.06, 0.4, 0.62, darkWood, 0.28, 0.55, 0));
  const compass = group(cyl(0.07, 0.07, 0.025, brass(), 20, 0.48, 0.82, -0.12), cyl(0.06, 0.06, 0.005, mat(0xe8dcc0), 20, 0.48, 0.835, -0.12));
  const needle = box(0.008, 0.004, 0.1, mat(0xb5413a), 0.48, 0.84, -0.12);
  const inkpot = cyl(0.035, 0.045, 0.06, mat(0x1a1d22, { rough: 0.3 }), 10, -0.5, 0.84, -0.18);
  const candle = group(cyl(0.05, 0.06, 0.03, brass(), 12, -0.52, 0.82, 0.12), cyl(0.018, 0.018, 0.12, mat(0xefe6d0), 8, -0.52, 0.89, 0.12));
  desk.add(compass, needle, inkpot, candle);
  onWall(desk, DESK, R - 0.5);
  scene.add(desk);
  const chair = group(box(0.42, 0.05, 0.42, wood, 0, 0.45, 0), box(0.42, 0.5, 0.05, wood, 0, 0.72, 0.19));
  for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) chair.add(box(0.04, 0.45, 0.04, darkWood, x, 0.22, z));
  onWall(chair, DESK + 3, R - 1.25);
  chair.rotation.y += 0.4;
  scene.add(chair);
  for (const dx of [-0.42, 0.42]) {
    const p = at(DESK, R - 0.5).add(new THREE.Vector3(Math.cos(DESK * DEG) * dx, 0, Math.sin(DESK * DEG) * dx));
    kit.post(p.x, p.z, 0.42);
  }
  const cp = at(DESK + 3, R - 1.25);
  kit.post(cp.x, cp.z, 0.28);

  const pages = pageTexture();
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.3), mat(0xffffff, { map: pages }));
  paper.rotation.x = -Math.PI / 2;
  paper.position.set(0, 0.84, 0.02);
  const book = group(box(0.5, 0.02, 0.34, mat(0x5a2e1e), 0, 0.82, 0.02), box(0.46, 0.012, 0.3, mat(0xefe2c0), 0, 0.832, 0.02), paper);
  onWall(book, DESK, R - 0.5);
  book.rotation.y += 0.12;
  const logbook = kit.hotspot('logbook', book, { size: [0.6, 0.18, 0.6] });

  const drawer = group(box(0.5, 0.16, 0.05, wood, 0, 0.66, 0.33), cyl(0.025, 0.025, 0.04, brass(), 10, 0, 0.66, 0.37), box(0.12, 0.06, 0.03, brass(), 0.16, 0.66, 0.37));
  drawer.children[1].rotation.x = Math.PI / 2;
  onWall(drawer, DESK, R - 0.5);
  const drawerHs = kit.hotspot('drawer', drawer, { size: [0.55, 0.2, 0.55] });
  drawerHs.hit.position.copy(at(DESK, R - 0.5 - 0.3, 0.66));
  drawerHs.anchor.copy(drawerHs.hit.position);
  logbook.hit.position.copy(at(DESK, R - 0.5, 0.86));

  // ---- the great lamp: pedestal, fuse socket, brass cage, Fresnel lens, soot, bulb ----
  const lampObj = new THREE.Group();
  lampObj.add(cyl(0.55, 0.65, 0.85, iron(), 20, 0, 0.425, 0));
  lampObj.add(cyl(0.62, 0.62, 0.06, brass(), 24, 0, 0.88, 0));
  const socket = box(0.18, 0.18, 0.08, brass(), 0, 0.55, 0.6);
  const fuse = cyl(0.03, 0.03, 0.12, mat(0xb86b3c, { rough: 0.5 }), 10, 0, 0.55, 0.66);
  fuse.rotation.z = Math.PI / 2;
  lampObj.add(socket, fuse);
  const cage = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    cage.add(box(0.035, 1.5, 0.035, brass(), Math.cos(a) * 0.56, 1.65, Math.sin(a) * 0.56));
  }
  for (const y of [0.92, 1.65, 2.4]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.025, 6, 32), brass());
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    cage.add(ring);
  }
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.66, 0.5, 20), brass());
  cap.position.y = 2.66;
  const vent = cyl(0.08, 0.1, 0.3, iron(), 10, 0, 3.05, 0);
  cage.add(cap, vent);
  lampObj.add(cage);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.3, 24, 1, true), mat(0xffffff, { map: lensTexture(), transparent: true, opacity: 0.62, rough: 0.15, side: THREE.DoubleSide }));
  lens.position.y = 1.65;
  const soot = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 1.3, 24, 1, true), mat(0x221d18, { transparent: true, opacity: 0.86, map: paintedTexture('#221d18', { spread: 40 }) }));
  soot.position.y = 1.65;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), mat(0x4a4038, { emissive: 0x000000, own: true }));
  bulb.position.y = 1.85;
  const hung = group(box(0.14, 0.2, 0.14, brass(), 0, 1.35, 0), new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mat(0xffd08a, { emissive: 0xffa040, emissiveIntensity: 2 })));
  hung.children[1].position.y = 1.35;
  lampObj.add(lens, soot, bulb, hung);
  scene.add(lampObj);
  kit.hotspot('lamp', lampObj, { size: [1.4, 3.0, 1.4], center: [0, 1.5, 0] });
  kit.post(0, 0, 0.72);
  // The weight-well: a square shaft beside the pedestal, down to Tobin's glass plate.
  const well = group(box(0.5, 0.02, 0.5, mat(0x050608), 0, 0.006, 0), box(0.6, 0.05, 0.06, brass(), 0, 0.02, 0.28), box(0.6, 0.05, 0.06, brass(), 0, 0.02, -0.28), box(0.06, 0.05, 0.6, brass(), 0.28, 0.02, 0), box(0.06, 0.05, 0.6, brass(), -0.28, 0.02, 0));
  well.position.set(-0.55, 0, 0.95);
  scene.add(well);

  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.6, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff4d6, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.rotation.z = Math.PI / 2;
  beam.position.x = 1.8;
  const beamPivot = group(beam);
  beamPivot.position.y = 1.85;
  scene.add(beamPivot);

  // ---- dumbwaiter hatch and speaking tube ----
  const HATCH = -108;
  const hatch = new THREE.Group();
  hatch.add(box(0.72, 0.66, 0.1, darkWood, 0, 0.85, 0));
  hatch.add(box(0.58, 0.52, 0.04, mat(0xffffff, { map: plankTexture('#5e4128') }), 0, 0.85, 0.06));
  hatch.add(box(0.1, 0.04, 0.04, brass(), 0.2, 0.85, 0.1));
  const tube = cyl(0.04, 0.04, H - 1.2, brass(), 10, 0.52, (H + 1.2) / 2, 0.02);
  const mouth = cyl(0.11, 0.05, 0.16, brass(), 14, 0.52, 1.18, 0.08);
  mouth.rotation.x = Math.PI / 2.4;
  hatch.add(tube, mouth);
  onWall(hatch, HATCH, R - 0.08);
  kit.hotspot('hatch_lamp', hatch, { size: [1.0, 1.0, 1.0], center: at(HATCH, R - 0.3, 0.95).toArray() });

  // ---- props: shelf, barrel, rope, the barred trapdoor ----
  const shelf = group(box(1.1, 0.04, 0.3, wood, 0, 1.2, 0), box(1.1, 0.04, 0.3, wood, 0, 1.65, 0), box(0.04, 1.0, 0.3, darkWood, -0.55, 1.4, 0), box(0.04, 1.0, 0.3, darkWood, 0.55, 1.4, 0));
  for (let i = 0; i < 5; i++) shelf.add(cyl(0.05, 0.05, 0.14 + Math.random() * 0.08, mat([0x5a7a6a, 0x8a6a3a, 0x3a4a5a][i % 3], { rough: 0.4 }), 10, -0.4 + i * 0.2, 1.3, 0));
  onWall(shelf, 168, R - 0.18);
  scene.add(shelf);
  const barrel = cyl(0.3, 0.27, 0.8, wood, 14, 0, 0.4, 0);
  barrel.position.copy(at(-150, R - 0.55, 0.4));
  scene.add(barrel);
  const bp = at(-150, R - 0.55);
  kit.post(bp.x, bp.z, 0.38);
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 6, 18), mat(0x9a8058));
  rope.rotation.x = Math.PI / 2;
  rope.position.copy(at(-125, R - 0.4, 0.06));
  scene.add(rope);
  const trap = group(box(1.0, 0.03, 0.8, mat(0xffffff, { map: plankTexture('#4a3220') }), 0, 0.015, 0), box(1.1, 0.05, 0.08, iron(), 0, 0.04, 0.1));
  trap.position.copy(at(205, 2.9));
  trap.rotation.y = -205 * DEG;
  scene.add(trap);

  // ---- lights ----
  const hemi = new THREE.HemisphereLight(0x6f8fa8, 0x2a1e14, 2.0);
  const moon = new THREE.DirectionalLight(0x9db8d8, 1.6);
  moon.position.copy(at(WINDOW.deg, 10, 6));
  const lampLight = new THREE.PointLight(0xff8a3a, 0, 14, 1.6);
  lampLight.position.y = 1.85;
  const hungLight = new THREE.PointLight(0xffb060, 0, 5, 1.8);
  hungLight.position.y = 1.4;
  const windowLight = new THREE.PointLight(0xdce8ff, 0, 10, 1.4);
  windowLight.position.copy(at(WINDOW.deg, R - 0.6, 2));
  const sweep = new THREE.SpotLight(0xfff4d6, 0, 9, 0.35, 0.6, 1.2);
  sweep.position.y = 1.85;
  scene.add(hemi, moon, lampLight, hungLight, windowLight, sweep, sweep.target);

  const glowFlash = { until: 0, color: new THREE.Color() };
  const seaBase = new THREE.Color(0x8a9aa6);
  const WHITE = new THREE.Color(0xffffff);
  let lightning = 0;
  let revealLeft = 0;

  return {
    id: 'lamp',
    scene,
    kit,
    spawn: { x: 0.2, z: 2.75, yaw: 0.05 },
    eye: 1.62,
    sync(s) {
      fuse.visible = s.has('fuse_fitted');
      hung.visible = s.has('lantern_set');
      soot.visible = !s.has('lens_wiped');
      lens.rotation.y = -(s.memo.lens_rot ?? 3) * (Math.PI / 4);
      const full = s.has('lamp_full') || (s.has('lamp_lit') && s.holding?.id === 'rheostat');
      const dim = s.has('lamp_lit') && !full;
      this.mode = full ? 'full' : dim ? 'dim' : 'off';
      bulb.material.color.set(full ? 0xfff8e8 : dim ? 0xffa060 : 0x4a4038);
      bulb.material.emissive.set(full ? 0xfff0d0 : dim ? 0xff7a28 : 0x000000);
      bulb.material.userData.base.copy(bulb.material.emissive);
      bulb.material.emissiveIntensity = full ? 4 : 2;
      bulb.material.userData.baseIntensity = bulb.material.emissiveIntensity;
      lampLight.color.set(full ? 0xfff2d8 : 0xff8a3a);
      this.lampPower = full ? 48 : dim ? 16 : 0;
      hungLight.intensity = s.has('lantern_set') ? 6 : 0;
      beamPivot.visible = s.has('lamp_full');
      sweep.intensity = s.has('lamp_full') ? 40 : 0;
      hemi.color.set(dim ? 0x8a6a50 : 0x6f8fa8);
      reef.visible = s.tide <= 1 && !s.has('lamp_lit');
      ship.visible = s.has('lamp_lit') && !s.has('final_phase');
      cutter.visible = s.has('lamp_full');
      rowboat.visible = s.has('final_phase');
      seaBase.set(s.tide >= 4 ? 0x6f7f8c : s.tide <= 1 ? 0x9aa8b0 : 0x8a9aa6);
      rain.material.opacity = 0.18 + (s.tide / 6) * 0.5;
      this.doorOpen = s.has('lamp_full');
    },
    update(dt, t, s, flicker) {
      const level = s.tide / 6;
      rainMap.offset.y += dt * (0.5 + level * 1.2);
      rainMap.offset.x += dt * (0.05 + level * 0.15);
      needle.rotation.y = Math.sin(t * 1.3) * 0.8 + Math.sin(t * 3.1) * 0.3;
      const power = this.lampPower ?? 0;
      lampLight.intensity = power * (this.mode === 'dim' ? 1 - flicker * 1.6 : 1 - flicker * 0.3);
      beamPivot.rotation.y = t * 0.6;
      sweep.target.position.set(Math.cos(-t * 0.6) * 4, 1.2, Math.sin(-t * 0.6) * 4);
      doorLeaf.rotation.y += ((this.doorOpen ? 0.5 : 0) - doorLeaf.rotation.y) * Math.min(1, dt * 2);
      ship.position.y = -0.6 + Math.sin(t * 0.7) * 0.05;
      rowboat.position.y = -4.5 + Math.sin(t * 1.4) * 0.12;
      sea.position.y = 1.0 + Math.sin(t * 0.35) * 0.08 * (1 + level);
      lightning = Math.max(0, lightning - dt * 2.6);
      const flashOn = performance.now() < glowFlash.until;
      flashMat.opacity += ((flashOn ? 0.85 : 0) - flashMat.opacity) * Math.min(1, dt * (flashOn ? 40 : 7));
      if (flashOn) flashMat.color.copy(glowFlash.color);
      windowLight.intensity = lightning * 30 + flashMat.opacity * 6;
      seaMat.color.copy(seaBase).lerp(WHITE, lightning * 0.85);
      if (revealLeft > 0) {
        revealLeft -= dt;
        revealMat.opacity = Math.min(0.95, revealLeft / 0.9);
      } else {
        revealMat.opacity = 0;
      }
    },
    /** Lightning: `strength` 0..1; `reveal` shows the salt writing on the glass. */
    strike(strength, reveal) {
      lightning = Math.max(lightning, strength);
      if (reveal) revealLeft = 3;
    },
    flashWindow(ms, color = 0xfff1c4) {
      glowFlash.until = performance.now() + ms;
      glowFlash.color.set(color);
    },
    get revealOpacity() {
      return revealMat.opacity;
    },
  };
}
