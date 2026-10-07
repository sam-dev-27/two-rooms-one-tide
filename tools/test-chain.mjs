#!/usr/bin/env node
// Plays the whole story headlessly (no Phaser): every step of the chain, each mini-puzzle's wrong
// input, the tide clock, tampering and concealment flags, every speaking-tube choice, trust,
// the case board, the two-hands rheostat, the lightning reveal, both signals and both final lines.
//   npm test            (add --verbose to print every line)
import assert from 'node:assert/strict';
import { GameState } from '../src/systems/State.js';
import { createApi, interact, pendingTalk } from '../src/systems/Interact.js';
import { readFileSync } from 'node:fs';
import { nextHint, objective, objectiveTarget, useHint } from '../src/systems/Hints.js';
import { ROOMS } from '../src/data/rooms.js';
import { VALVE_COLORS, VALVE_ORDER, LENS_PANELS, HOLD_MS, lightningStrike, lightningPending } from '../src/data/puzzles.js';
import { HINTS, endingCard, FINAL_LINES, finalLine, HOLD_TEXT, BARKS, CROSS_ROOM, TALKS, TRUST_WARM, CLOSEUPS, ENDINGS, HOW_TO } from '../src/data/text.js';
import { CARDS, COLUMNS, REACTIONS, boardVerdict, epilogueLine, EPILOGUES } from '../src/data/board.js';
import { BEATS } from '../src/data/cutscenes.js';
import { CLOSEUP_IMAGES, CUTSCENE_IMAGES } from '../src/data/assets.js';
import { TIDE_MAX, TIDE_STEP_MS } from '../src/config.js';

const verbose = process.argv.includes('--verbose');

/** `policy` picks speaking-tube lines: a kind ('lie' | 'deflect' | 'clean') or { choiceId: kind }. */
function makeGame({ policy = 'lie' } = {}) {
  const state = new GameState();
  const log = [];
  const talks = [];
  const choices = [];
  const pending = {};
  const closeups = [];
  const cutscenes = [];
  const objectives = [];
  let ending = null;
  let finalEnd = null;
  const sample = () => {
    const step = HINTS.findIndex((h) => !h.done(state));
    objectives.push({ step, mara: objective(state, 'mara'), tobin: objective(state, 'tobin') });
  };

  const pick = (choice) => {
    const kind = typeof policy === 'string' ? policy : policy[choice.choice] ?? 'lie';
    const i = choice.options.findIndex((o) => o.kind === kind);
    assert.ok(i >= 0, `${choice.choice} has no ${kind} option`);
    return i;
  };
  const open = (kind) => (o) => {
    pending[kind] = o;
  };
  const view = {
    say: (t) => {
      log.push(t);
      if (verbose) console.log(`    ${t}`);
    },
    toast: () => {},
    cardAdded: () => {},
    sfx: () => {},
    pickup: () => {},
    sent: () => {},
    roomChanged: () => {},
    refresh: () => {},
    swapTo: (who) => state.setActive(who),
    keypad: open('keypad'),
    choice: open('choice'),
    lens: open('lens'),
    valves: open('valves'),
    morse: open('morse'),
    closeup: (id, then) => {
      closeups.push(id);
      then?.();
    },
    cutscene: (id, then) => {
      cutscenes.push(id);
      then?.();
    },
    talk: (lines, onDone, onChoose) => {
      const out = [];
      const queue = [...lines];
      while (queue.length) {
        const entry = queue.shift();
        if (Array.isArray(entry)) {
          out.push(entry);
          continue;
        }
        assert.ok(entry.options.length >= 2 && entry.options.length <= 3, `${entry.choice} offers 2-3 lines`);
        const option = entry.options[pick(entry)];
        choices.push(`${entry.choice}_${option.kind}`);
        onChoose(entry, option);
        queue.unshift(...option.lines);
      }
      talks.push(out);
      if (verbose) for (const [who, t] of out) console.log(`    ${who.toUpperCase()}: ${t}`);
      onDone?.();
    },
    ending: (id, onDone) => {
      ending = id;
      onDone();
    },
    end: (id) => (finalEnd = id),
  };
  const api = createApi(state, view);

  const find = (id) => {
    const hs = ROOMS[state.room].hotspots.find((h) => h.id === id);
    assert.ok(hs, `${id} is not in ${state.room}`);
    return hs;
  };
  const visible = (id) => {
    const hs = find(id);
    return !hs.visibleIf || hs.visibleIf(state);
  };
  const take = (kind) => {
    const o = pending[kind];
    assert.ok(o, `no ${kind} open`);
    delete pending[kind];
    return o;
  };

  return {
    state,
    api,
    log,
    talks,
    choices,
    pending,
    closeups,
    cutscenes,
    objectives,
    get ending() {
      return ending;
    },
    get finalEnd() {
      return finalEnd;
    },
    click(id, item = null) {
      assert.ok(visible(id), `${id} should be visible for ${state.active}`);
      if (item) assert.ok(state.holds(item), `${state.active} should hold ${item} to use it on ${id}`);
      if (verbose) console.log(`  ${state.active} -> ${id}${item ? ` with ${item}` : ''}`);
      interact(api, find(id), item);
      sample();
    },
    as(who) {
      return state.setActive(who);
    },
    enter(code) {
      const k = take('keypad');
      if (code === k.code) k.onSuccess();
      sample();
      return code === k.code;
    },
    choose(index) {
      const c = take('choice');
      const opt = c.options[index];
      assert.ok(opt.enabled, `option "${opt.label}" is disabled`);
      opt.onSelect();
      sample();
    },
    take,
    visible,
    lastLine: () => log.at(-1),
    tube() {
      const before = talks.length;
      this.click(state.active === 'mara' ? 'hatch_lamp' : 'hatch_cellar');
      assert.equal(talks.length, before + 1, 'a speaking-tube talk should have played');
      return talks.at(-1);
    },
  };
}

const settingsFor = (names) => names.map((n) => VALVE_COLORS.indexOf(n));
const kindOf = (policy, id) => (typeof policy === 'string' ? policy : policy[id] ?? 'lie');
const said = (talk, re) => talk.some(([, t]) => re.test(t));

/** Plays from the start to the Morse shutter. Options pick the concealment and tube choices. */
function playToSignal(g, { hideLetter = false, hideEnvelope = true, wrongValves = 0, policy = 'lie', slips = 0 } = {}) {
  const s = g.state;

  // Mara: logbook teaches flash-code names.
  g.as('mara');
  assert.ok(s.board.fall, 'the fall is on the board from the start');
  g.click('logbook');
  assert.ok(s.has('read_logbook'));
  assert.ok(s.board.flash_names && s.board.thursday, 'logbook clues become cards');
  g.click('lamp');
  assert.ok(!s.has('fuse_fitted'), 'lamp is dead without a fuse');
  g.click('balcony');
  assert.ok(!s.has('saw_wool'), 'balcony locked before full power');
  assert.equal(pendingTalk(g.api), null, 'no talk before both have looked around');

  // Tobin: chalk code and anchor.
  g.as('tobin');
  assert.ok(s.holds('diary'), 'Tobin starts with his diary');
  g.click('chalk');
  assert.ok(s.has('knows_code') && s.has('knows_anchor'));
  g.click('stairs');
  assert.ok(s.has('saw_prints') && s.board.prints);
  assert.match(g.lastLine(), /two sets of boot prints/);
  g.click('crate');
  assert.ok(s.board.glove);
  g.click('locker');
  assert.ok(!s.has('locker_open'), 'locker stays shut without the key');
  g.click('valves');
  assert.ok(!g.pending.valves, 'valves need a gasket before the wheels open');
  g.click('plate');
  assert.match(g.lastLine(), /Dark/);

  // T1 at either hatch: both alibis are player choices.
  const t1 = g.tube();
  assert.ok(s.has('talk_1'));
  const tk = kindOf(policy, 'tube_alibi_tobin');
  const mk = kindOf(policy, 'tube_alibi_mara');
  assert.ok(s.has(`tube_alibi_tobin_${tk}`) && s.has(`tube_alibi_mara_${mk}`), 'tube choices are remembered as flags');
  assert.ok(said(t1, { lie: /At my aunt/, deflect: /Does it matter/, clean: /Eleven-forty/ }[tk]), 'Tobin\'s alibi follows the choice');
  assert.ok(said(t1, { lie: /never been out here/, deflect: /Old habit/, clean: /out here Thursday too/ }[mk]), 'Mara\'s alibi follows the choice');
  assert.equal(!!s.board.alibi_tobin_aunt, tk === 'lie', 'the "aunt" card exists only if Tobin lied');
  assert.equal(!!s.board.alibi_tobin_back, tk === 'clean', 'the 11:40 admission card exists only if he came clean');
  assert.equal(!!s.board.alibi_mara_never, mk === 'lie');
  assert.equal(!!s.board.alibi_mara_here, mk === 'clean');

  // Mara: drawer keypad, wrong code then right; key + letter and a concealment choice.
  g.as('mara');
  g.click('drawer');
  assert.equal(g.enter('0000'), false);
  assert.ok(!s.has('drawer_open'));
  g.click('drawer');
  assert.equal(g.enter('1874'), true);
  assert.ok(s.holds('key') && s.holds('letter') && s.board.letter);
  g.choose(hideLetter ? 0 : 1);
  assert.ok(s.has(hideLetter ? 'letter_hidden' : 'letter_told'));
  assert.equal(s.holds('letter'), !hideLetter, 'hidden letter goes into her coat');
  g.click('hatch_lamp', 'key');
  assert.ok(s.has('key_sent') && !s.holds('key'));

  // Tobin: locker gives fuse + envelope and a choice; sends the fuse up.
  g.as('tobin');
  g.click('locker');
  assert.ok(s.holds('fuse') && s.has('locker_open') && s.board.envelope);
  g.choose(hideEnvelope ? 0 : 1);
  assert.ok(s.has(hideEnvelope ? 'envelope_hidden' : 'envelope_told'));
  g.click('hatch_cellar', 'fuse');

  // Mara fits the fuse: no power. T2 then T4.
  const back = g.as('mara');
  assert.ok(back.reactions.length === 0, 'nothing happened in the lamp room while she was away');
  g.click('lamp', 'fuse');
  assert.ok(s.has('fuse_fitted') && !s.has('lamp_lit'));
  const t2 = g.tube();
  assert.ok(t2.some(([who, t]) => who === 'tobin' && t.includes('One dash')), 'T2 teaches T = one dash');
  const t4 = g.tube();
  assert.ok(s.has('talk_4'));
  assert.ok(said(t4, hideLetter ? /A pencil stub/ : /He was alive when I left|why I came out Thursday/));
  assert.ok(said(t4, hideEnvelope ? /Just rags/ : /Crane pays people/));
  if (!hideLetter && mk === 'lie') assert.ok(said(t4, /You said you'd never been out here/), 'Tobin catches Mara\'s lie');

  // Lens dial: the lantern goes in, then wrong inputs are harmless until wiped + anchor.
  g.click('lamp');
  assert.ok(s.has('lantern_set'));
  let lens = g.take('lens');
  assert.equal(lens.wiped, false);
  assert.equal(lens.attempt(LENS_PANELS[lens.rotation]), false, 'start position is not solved');
  assert.equal(lens.attempt('anchor'), false, 'anchor alone fails while the lens is sooty');
  assert.ok(!s.has('lens_set'));

  const toTobin = g.as('tobin');
  assert.ok(toTobin.reactions.some((l) => l === CROSS_ROOM.fuse_fitted.line), 'Tobin reacts to the fuse going in upstairs');
  g.click('plate');
  assert.ok(s.has('saw_smear'));
  g.tube(); // T3
  assert.ok(s.has('talk_3'));

  g.as('mara');
  g.click('lamp');
  lens = g.take('lens');
  assert.match(lens.wipe(), /Gull grit/);
  assert.ok(s.has('lens_wiped') && s.board.soot_wipe, 'tampering: lens wiped');
  assert.equal(lens.attempt('gull'), false, 'wrong panel after wiping');
  lens.rotate(5);
  assert.equal(s.memo.lens_rot, 5, 'rotation is remembered');
  assert.equal(lens.attempt('anchor'), true);
  assert.ok(s.has('lens_set'));

  // Tobin: plate shows the mirrored order; gasket from the diary; valve wheels.
  g.as('tobin');
  g.click('plate');
  assert.ok(s.has('knows_order'));
  assert.match(g.lastLine(), /white, green, red, yellow, blue/);
  g.click('valves');
  assert.ok(!g.pending.valves, 'still leaking without a gasket');
  g.click('valves', 'diary');
  assert.ok(s.has('gasket') && s.holds('diary_torn') && !s.holds('diary'), 'tampering: diary page torn for a gasket');
  assert.ok(s.board.diary_1140 && s.board.torn_page);
  g.click('valves');
  let valves = g.take('valves');
  const tideBefore = s.tide;
  assert.equal(valves.attempt(settingsFor(['white', 'green', 'red', 'yellow', 'blue'])), false, 'plate order unmirrored is wrong');
  assert.equal(s.tide, Math.min(TIDE_MAX, tideBefore + 1), 'a wrong valve attempt raises the tide');
  for (let i = 1; i < wrongValves; i++) valves.attempt([0, 0, 0, 0, 0]);
  assert.ok(!s.has('valves_set'));
  assert.equal(s.roomStates.cellar, 'before');
  valves.change([1, 2, 3, 4, 0]);
  assert.deepEqual(s.memo.valves, [1, 2, 3, 4, 0], 'wheel settings are kept');
  assert.equal(valves.attempt(settingsFor(VALVE_ORDER)), true);
  assert.ok(s.has('valves_set') && s.has('prints_gone'), 'tampering: flood washes the prints');
  assert.equal(s.roomStates.cellar, 'after');
  g.click('stairs');
  assert.match(g.lastLine(), /prints .* gone/);

  // Evidence floats up: T5 (a trusting Tobin volunteers his own initial).
  assert.ok(g.visible('plank'));
  g.click('plank');
  assert.ok(s.holds('photo') && s.holds('ledger') && s.has('evidence_found') && s.board.photo && s.board.ledger);
  assert.ok(!g.visible('plank'));
  const trustAtT5 = s.trust;
  const t5 = g.tube();
  assert.ok(said(t5, /man with a pen/));
  assert.equal(s.has('ledger_volunteered'), trustAtT5 >= TRUST_WARM, 'Tobin volunteers the T only when trust is high');
  assert.equal(said(t5, /hear that from me/), trustAtT5 >= TRUST_WARM);

  // Mara: lamp lit but dim; T6 (a tube choice); the two-hands rheostat.
  const toMara = g.as('mara');
  assert.ok(toMara.reactions.includes(CROSS_ROOM.valves_set.line), 'Mara reacts to the flood below');
  g.click('lamp');
  assert.ok(s.has('lamp_lit') && !s.has('lamp_full'));
  assert.equal(s.roomStates.lamp, 'after');
  g.click('lamp');
  assert.ok(!g.pending.morse && !s.has('lamp_full'), 'no signalling with a dim lamp, and no latching without Tobin');
  const t6 = g.tube();
  const rk = kindOf(policy, 'tube_rheostat');
  assert.equal(!!s.board.low_orders, rk === 'clean', 'the "E\'s orders" card is unlocked only by honesty');
  assert.ok(said(t6, /hold it at FULL/), 'T6 primes the two-hands moment');

  g.as('tobin');
  assert.ok(g.visible('rheostat'), 'rheostat appears once the lamp is lit');
  g.click('rheostat');
  assert.ok(s.has('rheostat_tried') && s.board.rheostat_low);
  assert.equal(s.holding?.id, 'rheostat', 'Tobin holds the rheostat');
  assert.equal(s.holding.left, HOLD_MS);
  g.click('valves');
  assert.equal(g.lastLine(), HOLD_TEXT.busy, 'Tobin\'s hands are full while holding');
  for (let i = 0; i < slips; i++) {
    const tide = s.tide;
    assert.equal(s.tickHold(HOLD_MS - 1), null, 'still holding just before the countdown ends');
    const expired = s.tickHold(1);
    assert.ok(expired && !s.holding, 'the hold runs out');
    g.api.holdExpired(expired);
    assert.ok(!s.has('lamp_full'), 'a slip never sets full power');
    assert.equal(s.tide, i === 0 ? Math.min(TIDE_MAX, tide + 1) : tide, 'only the first slip costs a tide step');
    g.click('rheostat');
    assert.match(g.lastLine(), /hang on/, 'retry is immediate');
    assert.ok(s.holding);
  }
  const tideAtFull = s.tide;
  s.tickHold(HOLD_MS / 2);
  g.as('mara');
  g.click('lamp');
  assert.ok(s.has('lamp_full') && !s.holding, 'Mara latches the lamp while Tobin holds');
  assert.equal(s.tideBand, tideAtFull, 'tide band locks when the lamp reaches full');
  s.tick(TIDE_STEP_MS * 10);
  assert.equal(s.tide, tideAtFull, 'tide freezes once locked');

  g.click('window');
  assert.ok(s.has('saw_ship'));
  g.click('balcony');
  assert.ok(s.has('saw_wool') && s.board.wool);
}

function signal(g, word) {
  g.as('mara');
  g.click('lamp');
  const m = g.take('morse');
  const opt = m.words.find((w) => w.word === word);
  assert.ok(opt.enabled, `${word} should be enabled`);
  let p = { letter: 0, buffer: '' };
  // A wrong symbol resets only the current letter.
  if (word === 'CRANE') {
    p = m.step(word, p, '-');
    assert.equal(p.result, 'ok');
    p = m.step(word, p, '-');
    assert.equal(p.result, 'wrong');
    assert.deepEqual([p.letter, p.buffer], [0, '']);
  }
  for (const ch of word) {
    for (const sym of m.code[ch]) p = m.step(word, p, sym);
  }
  assert.equal(p.result, 'done');
  m.onDone(word);
}

function finish(g, actor) {
  const s = g.state;
  assert.ok(s.has('final_phase'));
  assert.equal(s.active, 'tobin', 'final scene starts as Tobin');
  g.click('hatch_cellar');
  assert.ok(!s.has('final_seen'), 'hatch waits for the plate');
  g.click('plate');
  assert.ok(s.has('final_plate') && s.board.projection);
  assert.match(g.log.join(' '), /IF I FALL IT WAS/);
  assert.ok(s.notes.some((n) => n.text.includes('T is one dash. M is two.')));
  if (actor === 'mara') {
    g.as('mara');
    g.click('lamp');
    assert.match(g.lastLine(), /red wool/);
  }
  g.click(actor === 'mara' ? 'hatch_lamp' : 'hatch_cellar');
  assert.ok(s.has('final_seen'));
  assert.equal(g.finalEnd, 'final');
  return g.talks.at(-1);
}

/** Plays a whole game and returns it; `truth` sends the ledger and signals CRANE. */
function fullRun({ truth = true, actor = 'tobin', ...opts } = {}) {
  const g = makeGame({ policy: opts.policy });
  playToSignal(g, opts);
  if (truth) {
    g.as('tobin');
    g.click('hatch_cellar', 'ledger');
    g.click('hatch_cellar', 'photo');
    assert.ok(g.state.has('ledger_sent'));
    const t7 = g.tube();
    assert.ok(said(t7, /we believe each other/));
    if (g.state.has('ledger_volunteered')) assert.ok(said(t7, /like you said/), 'T7 remembers that Tobin volunteered');
    assert.equal(!!g.state.board.crane_offer, g.state.has('tube_ledger_clean'));
    signal(g, 'CRANE');
    assert.equal(g.ending, 'truth');
  } else {
    signal(g, 'SOS');
    assert.equal(g.ending, 'cover');
  }
  const reactions = g.as('tobin')?.reactions ?? [];
  const last = finish(g, actor);
  return { g, last, reactions };
}

// ---- full run 1: CRANE, ledger sent, final as Tobin (canonical lies) ----
{
  const { g, last } = fullRun({ truth: true, actor: 'tobin', hideLetter: false, hideEnvelope: true, policy: 'lie' });
  assert.ok(g.state.has('signalled_truth'));
  const card = endingCard(g.state, 'truth');
  assert.match(card.text, /CRANE\. UNDERSTOOD/);
  assert.match(card.text, /envelope stays in his pocket/);
  assert.doesNotMatch(card.text, /letter stays/);
  assert.ok(g.state.trust < TRUST_WARM);
  assert.deepEqual(last, FINAL_LINES.tobin.cold);
  assert.equal(last[0][0], 'mara');
  assert.match(last[0][1], /Leave the wall\. It's only soot/);
  console.log('ok  full chain: CRANE signalled, final line as Tobin (Mara speaks, cold)');
}

// ---- full run 2: SOS without the ledger, other concealment choices, final as Mara ----
{
  const g = makeGame();
  playToSignal(g, { hideLetter: true, hideEnvelope: false, wrongValves: 3 });
  g.as('mara');
  g.click('lamp');
  const m = g.take('morse');
  assert.deepEqual(m.words.map((w) => w.enabled), [false, true], 'CRANE locked without the ledger');
  signal(g, 'SOS');
  assert.equal(g.ending, 'cover');
  const card = endingCard(g.state, 'cover');
  assert.match(card.footer, /another ending/);
  assert.match(card.text, /letter stays in her coat/);
  assert.doesNotMatch(card.text, /envelope stays/);
  const last = finish(g, 'mara');
  assert.deepEqual(last, FINAL_LINES.mara.cold);
  assert.equal(last[0][0], 'tobin');
  assert.match(last[0][1], /wash that scarf/);
  console.log('ok  full chain: SOS signalled, final line as Mara (Tobin speaks, cold)');
}

// ---- every tube-choice branch completes the chain ----
{
  const choiceIds = [];
  const walk = (entries) => entries.forEach((e) => !Array.isArray(e) && (choiceIds.push(e.choice), e.options.forEach((o) => walk(o.lines))));
  const probe = makeGame().api;
  for (const t of TALKS) walk(t.lines(probe));
  assert.ok(choiceIds.length >= 3 && choiceIds.length <= 5, `3-5 choice moments (found ${choiceIds.length})`);
  let runs = 0;
  for (const kind of ['lie', 'deflect', 'clean']) {
    for (const truth of [true, false]) {
      const { g } = fullRun({ truth, actor: truth ? 'mara' : 'tobin', policy: kind, slips: kind === 'deflect' ? 1 : 0 });
      const expected = truth ? choiceIds : choiceIds.filter((id) => id !== 'tube_ledger');
      for (const id of expected) assert.ok(g.choices.includes(`${id}_${kind}`), `${id}_${kind} was offered and taken`);
      runs++;
    }
  }
  // Mixed: Tobin honest, Mara lying.
  const mixed = { tube_alibi_tobin: 'clean', tube_rheostat: 'clean', tube_alibi_mara: 'lie', tube_ledger: 'lie' };
  fullRun({ truth: true, actor: 'tobin', policy: mixed });
  runs++;
  console.log(`ok  every speaking-tube branch completes the chain (${choiceIds.length} choices, ${runs} full runs)`);
}

// ---- trust: who volunteers, how talks land, and the delivery of the final line ----
{
  const high = fullRun({ truth: true, actor: 'tobin', policy: 'clean', hideLetter: false, hideEnvelope: false });
  assert.ok(high.g.state.trust >= TRUST_WARM, `honest run ends trusting (trust ${high.g.state.trust})`);
  assert.ok(high.g.state.has('ledger_volunteered'), 'a trusting Tobin volunteers the T in the ledger');
  assert.deepEqual(high.last, FINAL_LINES.tobin.warm);
  assert.match(high.last[0][1], /It's only soot/, 'warm delivery keeps the line');
  assert.ok(high.g.talks.some((t) => said(t, /\.\.\.Yes\.$/)), 'T7 ends warmly');

  const highMara = fullRun({ truth: false, actor: 'mara', policy: 'clean', hideLetter: false, hideEnvelope: false });
  assert.deepEqual(highMara.last, FINAL_LINES.mara.warm);
  assert.match(highMara.last[0][1], /wash that scarf/);

  const low = fullRun({ truth: true, actor: 'mara', policy: 'lie', hideLetter: true, hideEnvelope: true });
  assert.ok(low.g.state.trust <= -TRUST_WARM, `lying run ends wary (trust ${low.g.state.trust})`);
  assert.ok(!low.g.state.has('ledger_volunteered'));
  assert.deepEqual(low.last, FINAL_LINES.mara.cold);
  assert.ok(low.g.talks.some((t) => said(t, /If you like/)), 'T7 lands coldly after a lie');

  for (const actor of ['mara', 'tobin']) {
    const [w, c] = [FINAL_LINES[actor].warm[0], FINAL_LINES[actor].cold[0]];
    assert.equal(w[0], c[0], 'same speaker either way');
    assert.notEqual(w[1], c[1], 'tone differs');
    assert.equal(finalLine({ trust: TRUST_WARM }, actor), FINAL_LINES[actor].warm);
    assert.equal(finalLine({ trust: TRUST_WARM - 1 }, actor), FINAL_LINES[actor].cold);
  }
  console.log('ok  trust changes who volunteers, how T7 lands and the final line\'s delivery');
}

// ---- case board: add, pin, move back, reactions, epilogue ----
{
  const g = makeGame();
  const s = g.state;
  assert.equal(s.freshCards, 1, 'the fall starts as a new card');
  assert.equal(s.addCard('fall'), false, 'no duplicates');
  assert.equal(s.addCard('not_a_card'), false);
  assert.equal(s.addCard('glove'), true);
  assert.equal(s.freshCards, 2);
  s.seeCards();
  assert.equal(s.freshCards, 0);

  g.as('mara');
  const r = s.pinCard('glove', 'crane');
  assert.equal(s.board.glove.column, 'crane');
  assert.deepEqual(r && [r.who, r.text], ['mara', REACTIONS.find((x) => x.card === 'glove' && x.column === 'crane').mara], 'reaction in the controlled character\'s voice');
  assert.equal(s.pinCard('glove', 'crane'), null, 'no reaction when nothing moved');
  s.pinCard('glove', null);
  assert.equal(s.board.glove.column, null, 'cards move back to the tray');
  assert.equal(s.pinCard('glove', 'crane'), null, 'each reaction plays once');
  assert.equal(s.pinCard('glove', 'nowhere'), null);
  assert.equal(s.board.glove.column, null, 'unknown columns put the card back in the tray');
  assert.equal(s.pinCard('missing', 'crane'), null);

  for (const rx of REACTIONS) {
    assert.ok(CARDS[rx.card] && COLUMNS.some((c) => c.id === rx.column) && rx.mara && rx.tobin, `reaction ${rx.card}:${rx.column} is complete`);
    assert.doesNotMatch(`${rx.mara} ${rx.tobin}`, /\b(killed|murdered|did it)\b/i, 'reactions never confirm a killer');
  }
  for (const [id, c] of Object.entries(CARDS)) assert.ok(c.title && c.text && c.detail && (c.icon || c.glyph), `card ${id} is complete`);

  const pin = (map) => {
    const board = {};
    let i = 0;
    for (const [col, n] of Object.entries(map)) for (let k = 0; k < n; k++) board[`c${i++}`] = { column: col === 'tray' ? null : col };
    return boardVerdict(board);
  };
  assert.equal(pin({}), 'open');
  assert.equal(pin({ tray: 6 }), 'open');
  assert.equal(pin({ tobin: 1 }), 'open', 'one card is not a verdict');
  assert.equal(pin({ tobin: 3, mara: 1 }), 'tobin');
  assert.equal(pin({ tobin: 3, crane: 1 }), 'tobinNeverMara');
  assert.equal(pin({ mara: 4, crane: 2, tobin: 1 }), 'mara');
  assert.equal(pin({ mara: 2 }), 'maraNeverTobin');
  assert.equal(pin({ triangle: 3, crane: 1 }), 'triangle');
  assert.equal(pin({ crane: 5, mara: 1, tobin: 1 }), 'crane');
  assert.equal(pin({ crane: 2, mara: 2, tobin: 2 }), 'everyone');
  assert.equal(pin({ crane: 2, mara: 2 }), 'open', 'a two-way tie keeps an open mind');
  assert.equal(EPILOGUES.tobinNeverMara, 'You never doubted Mara.');

  const full = fullRun({ truth: true, actor: 'tobin' }).g.state;
  assert.equal(epilogueLine(full.board), 'You kept an open mind.', 'an untouched board keeps an open mind');
  for (const id of ['projection', 'envelope', 'torn_page', 'diary_1140']) full.pinCard(id, 'tobin');
  full.pinCard('glove', 'crane');
  assert.equal(epilogueLine(full.board), 'You never doubted Mara.');
  full.pinCard('letter', 'mara');
  assert.equal(epilogueLine(full.board), 'You pinned it on Tobin.');
  for (const id of ['fall', 'prints']) full.pinCard(id, 'triangle');
  for (const id of ['photo', 'ledger']) full.pinCard(id, 'crane');
  assert.equal(epilogueLine(full.board), 'You suspected everyone.');
  console.log('ok  case board adds, pins, moves back, reacts once and picks the epilogue');
}

// ---- two hands: timeout, retry, no fail state ----
{
  const g = makeGame();
  const s = g.state;
  for (const f of ['read_logbook', 'knows_code', 'fuse_fitted', 'lantern_set', 'lens_wiped', 'lens_set', 'valves_set', 'evidence_found', 'lamp_lit']) s.set(f);
  g.as('tobin');
  g.click('rheostat');
  assert.ok(s.holding);
  g.as('mara');
  const t0 = s.tide;
  g.api.holdExpired(s.tickHold(HOLD_MS));
  assert.match(g.log.join(' '), /sags back to orange/, 'a slip seen from upstairs');
  assert.equal(s.tide, t0 + 1, 'first slip: one tide step');
  g.click('lamp');
  assert.ok(!s.has('lamp_full'));
  assert.match(g.lastLine(), /hold the rheostat at FULL first/);
  const back = g.as('tobin');
  assert.ok(back.reactions.includes(HOLD_TEXT.slipReaction), 'Tobin apologises when you come back');
  for (let i = 0; i < 4; i++) {
    g.click('rheostat');
    g.api.holdExpired(s.tickHold(HOLD_MS));
  }
  assert.equal(s.tide, t0 + 1, 'later slips are free');
  g.click('rheostat');
  g.as('mara');
  g.click('lamp');
  assert.ok(s.has('lamp_full'), 'any retry still completes');
  console.log('ok  two hands: the rheostat slips back, costs one tide step once, and retries freely');
}

// ---- lightning reveal ----
{
  const g = makeGame();
  const s = g.state;
  assert.equal(lightningStrike(g.api), null, 'no reveal before the flood');
  s.set('valves_set');
  assert.ok(lightningPending(g.api));
  g.as('tobin');
  assert.equal(lightningStrike(g.api), 'missed', 'Tobin can\'t see Mara\'s window');
  assert.ok(!s.board.two_boats);
  g.as('mara');
  g.click('window');
  assert.match(g.log.join(' '), /next flash of lightning/, 'the window hints at the writing');
  assert.equal(lightningStrike(g.api), 'seen');
  assert.ok(s.has('saw_boats') && s.board.two_boats?.fresh, 'seeing it adds a case-board card');
  assert.match(g.log.join(' '), /TWO BOATS THURS/);
  assert.equal(lightningStrike(g.api), null, 'it stops once seen');
  console.log('ok  lightning: missed from the cellar, seen from the lamp room, adds a card once');
}

// ---- repeat-click barks ----
{
  const g = makeGame();
  g.as('mara');
  g.click('logbook');
  const first = [];
  for (let i = 0; i < BARKS.logbook.lines.length + 2; i++) {
    g.click('logbook');
    first.push(g.lastLine());
  }
  assert.match(first[0], /drawer code is chalked/, 'first repeat is the handler\'s own recap');
  assert.deepEqual(first.slice(1, 1 + BARKS.logbook.lines.length), BARKS.logbook.lines, 'then the barks in order');
  assert.match(first.at(-1), /drawer code is chalked/, 'and the recap comes back');
  g.as('tobin');
  g.click('chalk');
  g.click('chalk', 'diary');
  assert.ok(g.state.holds('diary') && /That|No|Not/.test(g.lastLine()), 'using an item never triggers a bark');
  console.log('ok  exhausted hotspots cycle barks without hiding the real line');
}

// ---- tide clock ----
{
  const g = makeGame();
  const s = g.state;
  assert.equal(s.tide, 0);
  s.tick(TIDE_STEP_MS - 1);
  assert.equal(s.tide, 0);
  s.tick(1);
  assert.equal(s.tide, 1, '+1 per step of active play');
  s.tick(TIDE_STEP_MS * 20);
  assert.equal(s.tide, TIDE_MAX, 'caps at 6');
  for (let i = 0; i < 5; i++) g.api.raiseTide(1);
  assert.equal(s.tide, TIDE_MAX);
  assert.ok(![...s.flags].some((f) => /fail|lose|dead/.test(f)), 'no fail state');
  g.as('mara');
  g.click('window');
  assert.match(g.lastLine(), /black water/);

  const low = makeGame();
  low.as('mara');
  low.click('window');
  assert.ok(low.state.has('saw_wreck') && low.state.board.wreck, 'low tide shows the Marigold');
  low.state.advanceTide(2);
  low.click('window');
  assert.match(low.lastLine(), /Surf/);
  console.log('ok  tide clock advances, caps at 6, never fails; window follows the tide');
}

// ---- tide bands in the ending card ----
{
  const g = makeGame();
  const s = g.state;
  s.advanceTide(1);
  s.lockTide();
  assert.match(endingCard(s, 'truth').text, /clear water/);
  const g2 = makeGame();
  g2.state.advanceTide(4);
  g2.state.lockTide();
  assert.match(endingCard(g2.state, 'cover').text, /limped home/);
  const g3 = makeGame();
  g3.state.advanceTide(6);
  g3.state.lockTide();
  assert.match(endingCard(g3.state, 'truth').text, /never collected/);
  assert.match(endingCard(g3.state, 'cover').text, /last payout/);
  console.log('ok  tide band picks the Halcyon line');
}

// ---- urgency lines from tide 4 ----
{
  const g = makeGame();
  g.state.set('read_logbook');
  g.state.set('knows_code');
  g.state.advanceTide(4);
  g.as('mara');
  const t1 = g.tube();
  assert.ok(t1.some(([, t]) => t.includes('over my boots')));
  console.log('ok  talks gain urgency from tide 4');
}

// ---- objectives: always present, short, and moving with the story on every branch ----
{
  const runs = [
    { truth: true, actor: 'tobin', policy: 'lie', hideLetter: false, hideEnvelope: true },
    { truth: false, actor: 'mara', policy: 'clean', hideLetter: true, hideEnvelope: false, wrongValves: 2 },
    { truth: true, actor: 'mara', policy: 'deflect', slips: 1 },
    { truth: false, actor: 'tobin', policy: 'lie', slips: 2 },
  ];
  for (const opts of runs) {
    const { g } = fullRun(opts);
    const label = `${opts.truth ? 'CRANE' : 'SOS'}/${opts.policy}`;
    const live = g.objectives.filter((o) => o.step >= 0);
    assert.ok(live.length > 20, `${label}: objectives sampled through the run`);
    for (const o of live) {
      for (const who of ['mara', 'tobin']) {
        assert.equal(typeof o[who], 'string', `${label} step ${o.step}: ${who} has an objective`);
        assert.ok(o[who].length >= 8 && o[who].length <= 44, `${label} step ${o.step}: "${o[who]}" fits the top bar`);
      }
    }
    for (let i = 1; i < live.length; i++) {
      const [a, b] = [live[i - 1], live[i]];
      if (a.step !== b.step) assert.ok(a.mara !== b.mara || a.tobin !== b.tobin, `${label}: objective changes from step ${a.step} to ${b.step}`);
    }
    assert.ok(new Set(live.map((o) => o.step)).size >= 12, `${label}: objectives seen across the ladder`);
    assert.equal(objective(g.state), null, `${label}: no objective once the story is done`);
    assert.deepEqual(g.cutscenes, ['lamplit'], `${label}: the lamp-lit beat plays once`);
    for (const id of ['logbook', 'chalk', 'letter', 'bootprints', 'ledger']) assert.ok(g.closeups.includes(id), `${label}: ${id} close-up shown`);
  }

  const g = makeGame();
  assert.equal(objective(g.state, 'mara'), 'Read Elias\'s logbook on the desk');
  assert.equal(objectiveTarget(g.state, 'mara'), 'logbook');
  assert.equal(objectiveTarget(g.state, 'tobin'), 'chalk');
  for (const step of HINTS) {
    assert.ok(step.objective?.mara && step.objective?.tobin, 'every hint step has an objective for both');
    for (const [who, id] of Object.entries(step.target ?? {})) {
      const room = who === 'mara' ? 'lamp' : 'cellar';
      assert.ok(ROOMS[room].hotspots.some((h) => h.id === id), `arrow target ${id} is in ${room}`);
    }
  }
  console.log(`ok  objectives exist for both leads at every step and change as the story moves (${runs.length} branches)`);
}

// ---- close-ups, beats and the how-to card ----
{
  for (const [id, c] of Object.entries(CLOSEUPS)) {
    assert.ok(CLOSEUP_IMAGES[c.image], `close-up ${id} has a registered image`);
    assert.ok(c.title && Array.isArray(c.lines), `close-up ${id} is complete`);
    assert.ok(c.lines.length || c.caption, `close-up ${id} shows some writing`);
    if (c.lines.length) assert.ok(c.area && c.ink && c.size, `close-up ${id} says where and how to write`);
  }
  for (const [id, shots] of Object.entries(BEATS)) {
    for (const shot of shots) {
      assert.ok(CUTSCENE_IMAGES[shot.image], `beat ${id} still is registered`);
      assert.ok(shot.captions.length >= 1 && shot.captions.length <= 3, `beat ${id} has 1-3 captions`);
    }
  }
  for (const e of Object.values(ENDINGS)) if (e.beat) assert.ok(BEATS[e.beat], `ending beat ${e.beat} exists`);
  assert.ok(HOW_TO.length >= 5 && HOW_TO.length <= 6 && HOW_TO.every((r) => r.icon && r.text), 'how-to card has 5-6 illustrated rows');

  const g = makeGame();
  g.state.markSeen('howto');
  g.state.markSeen('swapped');
  g.state.reset();
  assert.ok(g.state.seen.has('howto') && !g.state.seen.has('swapped'), 'replays remember the how-to card only');

  for (const file of ['src/data/puzzles.js', 'src/systems/Interact.js', 'src/systems/State.js', 'src/systems/Hints.js']) {
    const src = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /walkTo|charX|fastWalk|\bPhaser\.|from ['"]phaser/, `${file} never depends on walking or Phaser`);
  }
  console.log('ok  close-ups, beats and the how-to card are complete; story logic never depends on walking');
}

// ---- hints ----
{
  const g = makeGame();
  const s = g.state;
  assert.match(nextHint(s), /logbook/);
  s.set('read_logbook');
  s.set('knows_code');
  s.set('talk_1');
  assert.equal(useHint(s), 'The chalk said LIT 1874.');
  assert.equal(useHint(s), 'Mara: enter 1874 on the desk drawer.');
  assert.equal(useHint(s), 'Mara: enter 1874 on the desk drawer.', 'escalation stops at the last hint');
  assert.equal(s.hintsUsed, 3);
  assert.equal(HINTS.length, 19, 'one hint step per row of the design ladder');
  console.log('ok  hint ladder escalates');
}

// ---- wrong items and hatch basics ----
{
  const g = makeGame();
  g.as('tobin');
  g.click('chalk', 'diary');
  assert.ok(g.state.holds('diary'), 'wrong item is never consumed');
  g.as('mara');
  g.click('hatch_lamp');
  assert.match(g.lastLine(), /speaking tube/);
  console.log('ok  wrong items are harmless; idle hatch describes itself');
}

console.log('\nAll puzzle-chain checks passed.');
