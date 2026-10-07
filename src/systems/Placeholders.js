// Canvas-drawn stand-ins for any image that failed to load, so the game is playable with no art.
import { WIDTH, HEIGHT } from '../config.js';
import { ROOMS } from '../data/rooms.js';
import { ITEMS } from '../data/items.js';

const SERIF = 'Georgia, serif';

function canvas(scene, key, w, h) {
  const tex = scene.textures.createCanvas(key, w, h);
  return { tex, ctx: tex.getContext() };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function lighthouse(ctx, cx, baseY, scale, lit) {
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#1b232c';
  ctx.beginPath();
  ctx.moveTo(-70, 0);
  ctx.lineTo(-45, -380);
  ctx.lineTo(45, -380);
  ctx.lineTo(70, 0);
  ctx.fill();
  ctx.fillRect(-60, -430, 120, 50);
  ctx.beginPath();
  ctx.moveTo(-70, -430);
  ctx.lineTo(0, -480);
  ctx.lineTo(70, -430);
  ctx.fill();
  if (lit) {
    ctx.fillStyle = 'rgba(255, 200, 110, 0.9)';
    ctx.fillRect(-40, -425, 80, 40);
    const beam = ctx.createLinearGradient(0, 0, 900, 0);
    beam.addColorStop(0, 'rgba(255, 210, 130, 0.45)');
    beam.addColorStop(1, 'rgba(255, 210, 130, 0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(30, -405);
    ctx.lineTo(1000, -520);
    ctx.lineTo(1000, -290);
    ctx.fill();
  }
  ctx.restore();
}

function drawRoom(scene, key) {
  const [roomId, roomState] = key.split('_');
  const room = ROOMS[roomId];
  const after = roomState === 'after';
  const { tex, ctx } = canvas(scene, key, WIDTH, HEIGHT);

  const wall = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  if (roomId === 'lamp') {
    wall.addColorStop(0, after ? '#3a3326' : '#1d2b36');
    wall.addColorStop(1, after ? '#1f1a14' : '#0f171e');
  } else {
    wall.addColorStop(0, '#2a2622');
    wall.addColorStop(1, '#141210');
  }
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 560, WIDTH, HEIGHT - 560);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  for (let x = 0; x < WIDTH; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, 560);
    ctx.lineTo(x - 60, HEIGHT);
    ctx.stroke();
  }

  if (roomId === 'lamp' && after) {
    const glow = ctx.createRadialGradient(630, 300, 20, 630, 300, 520);
    glow.addColorStop(0, 'rgba(255, 205, 120, 0.75)');
    glow.addColorStop(1, 'rgba(255, 205, 120, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  if (roomId === 'cellar' && after) {
    ctx.fillStyle = 'rgba(28, 74, 96, 0.78)';
    ctx.fillRect(0, 520, WIDTH, HEIGHT - 520);
    ctx.strokeStyle = 'rgba(170, 220, 235, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= WIDTH; x += 20) ctx.lineTo(x, 520 + Math.sin(x / 40) * 6);
    ctx.stroke();
  }

  for (const hs of room.hotspots) {
    if (hs.visibleIf && !after) continue;
    ctx.fillStyle = 'rgba(217, 164, 65, 0.10)';
    roundRect(ctx, hs.x, hs.y, hs.w, hs.h, 10);
    ctx.fill();
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(217, 164, 65, 0.55)';
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(243, 230, 200, 0.8)';
    ctx.font = `18px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hs.label, hs.x + hs.w / 2, hs.y + hs.h / 2);
  }

  ctx.fillStyle = 'rgba(243, 230, 200, 0.18)';
  ctx.font = `italic 22px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${room.name}, ${roomState} (placeholder art)`, WIDTH / 2, 80);
  tex.refresh();
}

function drawCharacter(scene, key) {
  const [id, pose, frame] = key.split('_');
  const { tex, ctx } = canvas(scene, key, 300, 620);
  const coat = id === 'mara' ? '#59626b' : '#2e3a40';
  const accent = id === 'mara' ? '#b5413a' : '#d9a441';
  const hair = id === 'mara' ? '#1c1714' : '#b4562b';

  ctx.save();
  ctx.translate(150, 620);
  if (pose === 'act') ctx.rotate(-0.12);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, -6, 90, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  if (pose === 'walk') {
    const stride = frame === 'a' ? 0.32 : -0.32;
    for (const s of [stride, -stride]) {
      ctx.save();
      ctx.translate(0, -170);
      ctx.rotate(s);
      ctx.fillRect(-17, 0, 34, 168);
      ctx.restore();
    }
  } else if (pose === 'crouch') {
    ctx.fillRect(-45, -90, 34, 85);
    ctx.fillRect(11, -90, 34, 85);
    ctx.translate(0, 80);
  } else {
    ctx.fillRect(-45, -170, 34, 165);
    ctx.fillRect(11, -170, 34, 165);
  }
  ctx.fillStyle = coat;
  roundRect(ctx, -75, -470, 150, 320, 40);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(-60, -470, 120, 40);
  ctx.fillStyle = '#e2c4a8';
  ctx.beginPath();
  ctx.arc(0, -520, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(0, -535, 52, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#f3e6c8';
  ctx.font = `bold 26px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText(id === 'mara' ? 'Mara' : 'Tobin', 150, 340);
  tex.refresh();
}

function drawItem(scene, key) {
  const item = ITEMS[key];
  const { tex, ctx } = canvas(scene, key, 128, 128);
  ctx.fillStyle = item?.color ?? '#888';
  roundRect(ctx, 8, 8, 112, 112, 22);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.stroke();
  ctx.fillStyle = '#16120c';
  ctx.font = `bold 20px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const words = (item?.name ?? key).split(' ');
  words.slice(0, 2).forEach((w, i, arr) => ctx.fillText(w, 64, 64 + (i - (arr.length - 1) / 2) * 24));
  tex.refresh();
}

function drawScreen(scene, key) {
  const { tex, ctx } = canvas(scene, key, WIDTH, HEIGHT);
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  const palettes = {
    title: ['#1a2633', '#3b3a44', '#0c1217'],
    ending_truth: ['#f0b37a', '#8a6a5c', '#2a3a44'],
    ending_cover: ['#5c646b', '#3c434a', '#1b2025'],
    ending_open: ['#0c1420', '#1a2433', '#05080c'],
    cut_storm: ['#121c22', '#2a3a3c', '#060a0d'],
    cut_fall: ['#0b1118', '#18222c', '#040608'],
    cut_rowboat: ['#0c1420', '#1a2433', '#05080c'],
    cut_barred: ['#0a0f16', '#141c26', '#040608'],
  };
  const [top, mid, bottom] = palettes[key] ?? palettes.title;
  sky.addColorStop(0, top);
  sky.addColorStop(0.55, mid);
  sky.addColorStop(1, bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'rgba(10, 20, 28, 0.85)';
  ctx.fillRect(0, 560, WIDTH, HEIGHT - 560);
  ctx.fillStyle = '#10161b';
  ctx.beginPath();
  ctx.ellipse(880, 590, 260, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  lighthouse(ctx, 880, 570, 0.9, key !== 'ending_cover' && !key.startsWith('cut_'));
  tex.refresh();
}

/** A desk, a wall or the stairs, laid out so CLOSEUPS' text areas land on the blank page or stone. */
function drawCloseup(scene, key) {
  const id = key.replace('closeup_', '');
  const { tex, ctx } = canvas(scene, key, WIDTH, HEIGHT);
  const page = (x, y, w, h, angle, color = '#e9dcbc') => {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(-w / 2 + 10, -h / 2 + 12, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  };
  if (id === 'chalk' || id === 'bootprints') {
    ctx.fillStyle = '#2c3438';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = 'rgba(10,14,16,0.7)';
    ctx.lineWidth = 6;
    if (id === 'chalk') {
      for (let row = 0; row * 90 < HEIGHT; row++) {
        for (let col = -1; col * 180 < WIDTH; col++) {
          roundRect(ctx, col * 180 + (row % 2) * 90 + 6, row * 90 + 6, 168, 78, 14);
          ctx.stroke();
        }
      }
    } else {
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? '#353e43' : '#3b454a';
        ctx.fillRect(0, i * 120, WIDTH, 120);
        ctx.beginPath();
        ctx.moveTo(0, i * 120);
        ctx.lineTo(WIDTH, i * 120);
        ctx.stroke();
      }
      const print = (x, y, s, a) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.fillStyle = 'rgba(18,22,24,0.75)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 22 * s, 44 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      for (let i = 0; i < 5; i++) {
        print(470 + (i % 2) * 70, 650 - i * 125, 1.15, -0.1);
        print(780 + (i % 2) * 55, 640 - i * 125, 0.85, 0.08);
      }
    }
  } else {
    ctx.fillStyle = '#3a2618';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (id === 'letter') {
      page(WIDTH * 0.3, HEIGHT * 0.16, WIDTH * 0.4, HEIGHT * 0.68, 0.03, '#efe4c8');
    } else {
      page(WIDTH * 0.1, HEIGHT * 0.12, WIDTH * 0.4, HEIGHT * 0.76, -0.02, '#e4d5b0');
      page(WIDTH * 0.5, HEIGHT * 0.12, WIDTH * 0.4, HEIGHT * 0.76, 0.01);
      ctx.strokeStyle = 'rgba(60,40,20,0.25)';
      ctx.lineWidth = 2;
      for (let y = HEIGHT * 0.2; y < HEIGHT * 0.84; y += 36) {
        ctx.beginPath();
        ctx.moveTo(WIDTH * 0.14, y);
        ctx.lineTo(WIDTH * 0.46, y);
        ctx.stroke();
      }
    }
  }
  ctx.fillStyle = 'rgba(243, 230, 200, 0.2)';
  ctx.font = `italic 18px ${SERIF}`;
  ctx.textAlign = 'right';
  ctx.fillText('placeholder art', WIDTH - 24, HEIGHT - 20);
  tex.refresh();
}

export function makePlaceholder(scene, key, group) {
  if (group === 'room') drawRoom(scene, key);
  else if (group === 'character') drawCharacter(scene, key);
  else if (group === 'item' || group === 'prop') drawItem(scene, key);
  else if (group === 'closeup') drawCloseup(scene, key);
  else drawScreen(scene, key);
}
