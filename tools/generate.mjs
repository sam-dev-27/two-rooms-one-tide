#!/usr/bin/env node
// Batch-generates game art through the DreamLayer CLI and logs every job.
//
//   node tools/generate.mjs --group test          # day-1 consistency test (~6 credits)
//   node tools/generate.mjs --group rooms         # rooms | characters | items | ui | story | cutscene
//   node tools/generate.mjs --only lamp_after     # regenerate specific ids (comma separated)
//   node tools/generate.mjs --all --dry-run       # print commands, spend nothing
//
// Existing outputs are skipped unless --force; forced outputs are archived first.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, appendFileSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'node_modules', '.bin', 'dreamlayer');
const LOG = join(ROOT, 'docs', 'prompt-log.csv');
const ARCHIVE = join(ROOT, 'tools', 'raw', 'archive');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const { style, assets } = JSON.parse(readFileSync(join(ROOT, 'tools', 'assets.json'), 'utf8'));
const byId = new Map(assets.map((a) => [a.id, a]));

const group = value('group');
const only = value('only')?.split(',').map((s) => s.trim());
const dryRun = flag('dry-run');
const force = flag('force');

if (!group && !only && !flag('all')) {
  console.error('Pick what to generate: --group <test|rooms|characters|items|ui|story|cutscene>, --only <ids>, or --all');
  process.exit(1);
}
if (!dryRun && !process.env.DREAMLAYER_API_KEY) {
  console.error('DREAMLAYER_API_KEY is not set. export DREAMLAYER_API_KEY=dlr_live_... (never commit it)');
  process.exit(1);
}

const selected = assets.filter((a) => {
  if (only) return only.includes(a.id);
  if (group) return a.groups.includes(group);
  return true;
});

const csv = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\s+/g, ' ')}"`;

function log(row) {
  if (!existsSync(LOG)) {
    appendFileSync(LOG, 'timestamp,id,op,reference,prompt,output,status,credits_after,verdict,notes\n');
  }
  appendFileSync(LOG, [row.timestamp, row.id, row.op, row.ref, row.prompt, row.out, row.status, row.balance, '', row.notes].map(csv).join(',') + '\n');
}

function commandFor(asset) {
  const out = join(ROOT, asset.out);
  const prompt = asset.prompt?.replace('[style]', style);
  const refPath = asset.ref ? join(ROOT, byId.get(asset.ref).out) : undefined;
  switch (asset.op) {
    case 'generate':
      return { prompt, refPath, argv: ['generate', prompt, '--aspect', asset.aspect ?? '1:1', '--out', out, '--json'] };
    case 'edit':
      return { prompt, refPath, argv: ['edit', refPath, prompt, '--out', out, '--json'] };
    case 'cutout':
      return { prompt: '(background removal)', refPath, argv: ['cutout', refPath, '--out', out, '--json'] };
    default:
      throw new Error(`Unknown op "${asset.op}" on ${asset.id}`);
  }
}

function balance() {
  const r = spawnSync(CLI, ['balance'], { encoding: 'utf8' });
  return (r.stdout || r.stderr || '').trim();
}

let spent = 0;
let failed = 0;

for (const asset of selected) {
  const out = join(ROOT, asset.out);
  const { prompt, refPath, argv } = commandFor(asset);

  if (existsSync(out) && !force) {
    console.log(`skip   ${asset.id} (exists, use --force to redo)`);
    continue;
  }
  if (refPath && !existsSync(refPath) && !dryRun) {
    console.log(`wait   ${asset.id} needs ${asset.ref} first`);
    failed++;
    continue;
  }
  if (dryRun) {
    console.log(`dry    ${asset.id}: dreamlayer ${argv.map((a) => (a.includes(' ') ? JSON.stringify(a) : a)).join(' ')}\n`);
    continue;
  }

  mkdirSync(dirname(out), { recursive: true });
  if (existsSync(out)) {
    mkdirSync(ARCHIVE, { recursive: true });
    renameSync(out, join(ARCHIVE, `${asset.id}-${Date.now()}.png`));
  }

  console.log(`run    ${asset.id} (${asset.op}${asset.ref ? ` from ${asset.ref}` : ''})`);
  const result = spawnSync(CLI, argv, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  const ok = result.status === 0 && existsSync(out);
  if (ok) spent++;
  else failed++;

  const after = balance();
  log({
    timestamp: new Date().toISOString(),
    id: asset.id,
    op: asset.op,
    ref: asset.ref ?? '',
    prompt,
    out: asset.out,
    status: ok ? 'ok' : `failed (exit ${result.status})`,
    balance: after,
    notes: (result.stdout || '').trim().slice(0, 300),
  });
  console.log(`${ok ? 'done' : 'FAIL'}   ${asset.id}  balance: ${after}`);
  if (!ok && result.stdout?.includes('conversation')) {
    console.log('       DreamLayer asked a follow-up question. Answer it with: dreamlayer answer <conversation-id> "<text>"');
  }
}

if (!dryRun) {
  console.log(`\n${spent} image(s) generated, ${failed} failed or waiting. Log: docs/prompt-log.csv`);
  console.log('Open the log and fill in the "verdict" column (kept / rejected) for each row.');
}
