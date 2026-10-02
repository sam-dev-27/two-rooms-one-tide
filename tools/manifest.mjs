#!/usr/bin/env node
// Writes <dir>/assets/manifest.json listing every asset file that exists, so the packaged
// game only requests files it actually has.   node tools/manifest.mjs dist
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? '.');
const assetsDir = join(root, 'assets');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(assetsDir)
  .map((f) => relative(root, f).split('\\').join('/'))
  .filter((f) => /\.(png|jpe?g|webp|mp3|ogg|wav)$/i.test(f))
  .sort();

writeFileSync(join(assetsDir, 'manifest.json'), JSON.stringify(files, null, 2) + '\n');
console.log(`manifest: ${files.length} asset file(s)`);
