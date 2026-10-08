#!/usr/bin/env node
// Drives headless Chrome over the DevTools protocol (no dependencies; Node 22+ for WebSocket).
// Loads a page, reports console errors and failed requests, and either runs a browser module's
// run(opts) (tools/playthrough3d.browser.js) or evaluates an expression. The page may call
// window.__shot(name) to save a screenshot into --shots.
//
//   node tools/run3d.mjs --url http://localhost:8123/3d.html --script /tools/playthrough3d.browser.js \
//        --opts '{"actor":"mara"}' --shots /tmp/trot-3d --prefix mara_
//   node tools/run3d.mjs --url http://localhost:8123/index.html --wait 4000 --eval "document.title"
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const next = process.argv[i + 1];
  args[a.slice(2)] = next === undefined || next.startsWith('--') ? true : (i++, next);
}
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(args.port ?? 9333);
const W = Number(args.width ?? 1280);
const H = Number(args.height ?? 720);
const shots = args.shots ?? null;
const prefix = args.prefix ?? '';
const timeout = Number(args.timeout ?? 900000);
if (shots) mkdirSync(shots, { recursive: true });

const profile = `/tmp/trot-chrome-${PORT}`;
rmSync(profile, { recursive: true, force: true });
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    `--window-size=${W},${H}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--autoplay-policy=no-user-gesture-required',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    'about:blank',
  ],
  { stdio: 'ignore' },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const finish = (code) => {
  try {
    chrome.kill('SIGKILL');
  } catch {}
  process.exit(code);
};
setTimeout(() => {
  console.error('run3d: global timeout');
  finish(3);
}, timeout);

let version;
for (let i = 0; i < 100; i++) {
  try {
    version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
    break;
  } catch {
    await sleep(100);
  }
}
if (!version) {
  console.error('run3d: Chrome did not start');
  finish(2);
}
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

let nextId = 1;
const pending = new Map();
const handlers = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(`${msg.error.message} ${msg.error.data ?? ''}`));
    else resolve(msg.result);
  } else if (msg.method) {
    for (const h of handlers) h(msg);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

const errors = [];
const failed = [];
const requests = new Map();
handlers.push(async (msg) => {
  const p = msg.params;
  switch (msg.method) {
    case 'Runtime.consoleAPICalled':
      if (p.type === 'error' || p.type === 'assert') errors.push(`console.${p.type}: ${p.args.map((a) => a.value ?? a.description).join(' ')}`);
      if (args.verbose && p.type === 'log') console.log('[page]', p.args.map((a) => a.value ?? a.description).join(' '));
      break;
    case 'Runtime.exceptionThrown':
      errors.push(`exception: ${p.exceptionDetails.exception?.description ?? p.exceptionDetails.text}`);
      break;
    case 'Log.entryAdded':
      if (p.entry.level === 'error') errors.push(`log: ${p.entry.text} ${p.entry.url ?? ''}`);
      break;
    case 'Network.requestWillBeSent':
      requests.set(p.requestId, p.request.url);
      break;
    case 'Network.responseReceived':
      if (p.response.status >= 400) failed.push(`${p.response.status} ${p.response.url}`);
      break;
    case 'Network.loadingFailed':
      if (!p.canceled) failed.push(`failed ${requests.get(p.requestId)} ${p.errorText}`);
      break;
    case 'Runtime.bindingCalled':
      if (p.name === '__shotBinding') {
        const name = p.payload;
        if (shots) {
          const { data } = await send('Page.captureScreenshot', { format: 'png' });
          const file = join(shots, `${prefix}${name}.png`);
          writeFileSync(file, Buffer.from(data, 'base64'));
          console.log(`shot ${file}`);
        }
        await send('Runtime.evaluate', { expression: 'window.__shotResolve && window.__shotResolve()' });
      }
      break;
  }
});

await send('Runtime.enable');
await send('Log.enable');
await send('Network.enable');
await send('Page.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Runtime.addBinding', { name: '__shotBinding' });
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `window.__shot = (name) => new Promise((r) => { window.__shotResolve = r; window.__shotBinding(String(name)); });`,
});
await send('Page.navigate', { url: args.url });

const evaluate = async (expression) => {
  const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
  return res.result.value;
};

let code = 0;
try {
  await sleep(Number(args.wait ?? 1500));
  if (args.script) {
    const opts = args.opts ? JSON.parse(args.opts) : {};
    const result = await evaluate(`import(${JSON.stringify(args.script)}).then((m) => m.run(${JSON.stringify(opts)}))`);
    console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
  }
  if (args.eval) console.log(JSON.stringify(await evaluate(args.eval), null, 2));
  if (args.shot && shots) {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(shots, `${prefix}${args.shot}.png`), Buffer.from(data, 'base64'));
  }
} catch (err) {
  console.error(`run3d: ${err.message}`);
  code = 1;
}
await sleep(300);
console.log(`console errors: ${errors.length}`);
errors.forEach((e) => console.log(`  ${e}`));
console.log(`failed requests: ${failed.length}`);
failed.forEach((f) => console.log(`  ${f}`));
if (errors.length || failed.length) code = code || 4;
ws.close();
finish(code);
