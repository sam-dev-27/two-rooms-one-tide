// The finale raid's rules, with no Phaser: spawn schedule, climbing and wading, the beam and the
// timing ring, the two meters with their scuffle refills, the cutter timer and the result tier.
// RaidScene draws it and feeds it input; tools/test-chain.mjs plays it with scripted bots.
import { RAID, RAID_TEXT } from '../data/raid.js';

/** Small deterministic generator so a run (and a test) can be replayed from its seed. */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

/** Spawn times and lanes for both fronts: [{ at, front, lane }], sorted by time. */
export function schedule(t = RAID, seed = t.seed) {
  const rand = rng(seed);
  const out = [];
  for (const front of ['gallery', 'cellar']) {
    const f = t[front];
    let at = f.firstMs;
    while (at < t.durationMs - 4000) {
      out.push({ at, front, lane: front === 'gallery' ? f.lanes[0] + rand() * (f.lanes[1] - f.lanes[0]) : rand() });
      const k = at / t.durationMs;
      const gap = f.everyMs[0] + (f.everyMs[1] - f.everyMs[0]) * k;
      at += gap * (0.8 + rand() * 0.4);
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Result tier from total damage and scuffles. */
export function tierFor({ damage, scuffles }, t = RAID.tiers) {
  if (scuffles >= t.batteredScuffles || damage >= t.batteredMinDamage) return 'battered';
  if (scuffles === 0 && damage <= t.cleanMaxDamage) return 'clean';
  return 'bruised';
}

const ORDER = ['clean', 'bruised', 'battered'];

export class RaidSim {
  constructor(tuning = RAID, seed = tuning.seed) {
    this.t = tuning;
    this.time = 0;
    this.queue = schedule(tuning, seed);
    this.rand = rng(seed + 1);
    this.wreckers = [];
    this.nextId = 1;
    this.meters = { lamp: tuning.meterMax, cellar: tuning.meterMax };
    this.damage = { lamp: 0, cellar: 0 };
    this.scuffles = { lamp: 0, cellar: 0 };
    this.done = false;
    this.skipped = false;
  }

  /** 0..1 progress of the cutter toward the rock. */
  get cutter() {
    return Math.min(1, this.time / this.t.durationMs);
  }

  get totalDamage() {
    return this.damage.lamp + this.damage.cellar;
  }

  get totalScuffles() {
    return this.scuffles.lamp + this.scuffles.cellar;
  }

  get tier() {
    return tierFor({ damage: this.totalDamage, scuffles: this.totalScuffles }, this.t.tiers);
  }

  /** Wreckers still in play on a front. */
  active(front) {
    return this.wreckers.filter((w) => w.front === front && (w.state === 'climbing' || w.state === 'top' || w.state === 'wading' || w.state === 'brawl'));
  }

  /** What the off-screen warning says about a front, or null when it is quiet. */
  pressure(front) {
    const list = this.active(front);
    if (!list.length) return null;
    if (front === 'gallery') {
      const over = list.filter((w) => w.state === 'top').length;
      return over ? { level: 2, text: `Gallery: ${over} over the rail!` } : { level: 1, text: `Gallery: ${list.length} climbing!` };
    }
    const close = list.filter((w) => w.state === 'brawl').length;
    return close ? { level: 2, text: `Cellar: ${close} at the hatch!` } : { level: 1, text: `Cellar: ${list.length} wading in!` };
  }

  /**
   * Advances the fight by `dt` ms. `beam` is the set of gallery wrecker ids inside the lamp beam
   * this frame (empty while the player is in the cellar). Returns events for the presentation:
   * spawn, top, brawl, hit, scuffle, gone, end.
   */
  update(dt, { beam = new Set() } = {}) {
    const events = [];
    if (this.done) return events;
    this.time += dt;
    const { gallery: g, cellar: c } = this.t;
    while (this.queue.length && this.queue[0].at <= this.time) {
      const s = this.queue.shift();
      const w = { id: this.nextId++, front: s.front, lane: s.lane, born: s.at, progress: 0, light: 0, blind: false, shoves: 0, lastShove: -1e9, nextHit: 0, gone: 0 };
      w.state = s.front === 'gallery' ? 'climbing' : 'wading';
      // Waders enter from the stairs or the dark under the hatch shaft, and make for the floor hatch or the valves.
      if (s.front === 'cellar') {
        w.from = s.lane < 0.6 ? 'stairs' : 'side';
        w.to = this.rand() < 0.55 ? 'hatch' : 'valves';
      }
      this.wreckers.push(w);
      events.push({ type: 'spawn', front: w.front, id: w.id });
    }
    for (const w of this.wreckers) {
      // Someone who arrived part-way through this step only moves for the part he was there.
      const step = Math.min(dt, this.time - w.born);
      if (w.state === 'climbing') {
        const lit = beam.has(w.id);
        w.light = lit ? w.light + step : Math.max(0, w.light - step * 2);
        w.blind = w.light >= g.blindMs;
        w.progress += (step / g.climbMs) * (lit ? g.beamSlow : 1);
        if (w.progress >= 1) {
          w.progress = 1;
          w.state = 'top';
          w.blind = false;
          w.nextHit = this.time + g.hitMs * 0.6;
          events.push({ type: 'top', front: 'gallery', id: w.id });
        }
      } else if (w.state === 'wading') {
        w.progress += step / c.wadeMs;
        if (w.progress >= 1) {
          w.progress = 1;
          w.state = 'brawl';
          w.nextHit = this.time + c.hitMs * 0.4;
          events.push({ type: 'brawl', front: 'cellar', id: w.id });
        }
      } else if (w.state === 'falling' || w.state === 'staggered') {
        w.gone -= dt;
        if (w.gone <= 0) {
          w.state = 'gone';
          events.push({ type: 'gone', front: w.front, id: w.id });
        }
      }
      if ((w.state === 'top' || w.state === 'brawl') && this.time >= w.nextHit) {
        const f = w.front === 'gallery' ? g : c;
        w.nextHit = this.time + f.hitMs;
        this.hit(w.front, f.damage, events, w.id);
      }
    }
    this.wreckers = this.wreckers.filter((w) => w.state !== 'gone');
    if (this.time >= this.t.durationMs) this.finish(events);
    return events;
  }

  hit(front, amount, events, id) {
    const meter = front === 'gallery' ? 'lamp' : 'cellar';
    this.meters[meter] = Math.max(0, this.meters[meter] - amount);
    this.damage[meter] += amount;
    events.push({ type: 'hit', front, meter, id, amount });
    if (this.meters[meter] > 0) return;
    // No fail state: a short scuffle clears the front and the meter comes partly back.
    this.scuffles[meter]++;
    this.meters[meter] = this.t.refill;
    for (const w of this.active(front)) this.knockOff(w, front === 'gallery' ? 'falling' : 'staggered');
    events.push({ type: 'scuffle', front, meter, text: RAID_TEXT.scuffle[front] });
  }

  knockOff(w, state) {
    w.state = state;
    w.gone = state === 'falling' ? 900 : 800;
  }

  /** Is the cellar wrecker's ring inside the green window right now? */
  ringValue(w) {
    const p = ((this.time - w.born) % this.t.cellar.ringMs) / this.t.cellar.ringMs;
    return 1 - p;
  }

  inGreen(w) {
    const r = this.ringValue(w);
    const [lo, hi] = this.t.cellar.green;
    return r >= lo && r <= hi;
  }

  /**
   * The player clicks wrecker `id`. Gallery: a blinded climber is flashed off; one over the rail
   * needs `shoves` quick clicks. Cellar: a click in the green window shoves him back; anything else
   * is ignored. Returns 'flash' | 'shove' | 'push' | 'stagger' | 'early' | 'miss' | null.
   */
  click(id) {
    if (this.done) return null;
    const w = this.wreckers.find((x) => x.id === id);
    if (!w) return null;
    if (w.state === 'climbing') {
      if (!w.blind) return 'early';
      this.knockOff(w, 'falling');
      return 'flash';
    }
    if (w.state === 'top') {
      const g = this.t.gallery;
      w.shoves = this.time - w.lastShove <= g.shoveGapMs ? w.shoves + 1 : 1;
      w.lastShove = this.time;
      if (w.shoves < g.shoves) return 'push';
      this.knockOff(w, 'falling');
      return 'shove';
    }
    if (w.state === 'wading' || w.state === 'brawl') {
      if (!this.inGreen(w)) return 'miss';
      this.knockOff(w, 'staggered');
      return 'stagger';
    }
    return null;
  }

  /** Ends the fight now (the skip button): the tier is at least bruised. */
  skip() {
    if (this.done) return;
    this.skipped = true;
    this.finish([]);
  }

  finish(events) {
    this.done = true;
    for (const w of this.active('gallery')) this.knockOff(w, 'falling');
    for (const w of this.active('cellar')) this.knockOff(w, 'staggered');
    events.push({ type: 'end' });
  }

  /** What the story keeps: { tier, damage, scuffles, skipped }. */
  result() {
    let tier = this.tier;
    if (this.skipped && ORDER.indexOf(tier) < 1) tier = 'bruised';
    return { tier, damage: this.totalDamage, scuffles: this.totalScuffles, skipped: this.skipped };
  }
}

/** Records the raid in the story: flags, memo, and the result line in the log. */
export function recordRaid(state, result) {
  if (state.has('raid_done')) return;
  state.memo.raid = { ...result };
  state.set(`raid_${result.tier}`);
  if (result.skipped) state.set('raid_skipped');
  state.logLine('narration', null, result.skipped ? RAID_TEXT.skipped : RAID_TEXT.cutter);
  state.logLine('narration', null, `${RAID_TEXT.tierLabel[result.tier]}.`);
  state.set('raid_done');
}
