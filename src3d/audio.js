// A tiny stand-in for Phaser's sound manager, so src/systems/Sfx.js runs unchanged in 3D.
import { AUDIO } from '../src/data/assets.js';
import { url } from './assets.js';

export function createAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const context = Ctx ? new Ctx() : null;
  const out = context?.createGain();
  out?.connect(context.destination);
  const buffers = new Map();

  const playBuffer = (name, { volume = 1, loop = false } = {}) => {
    if (!context || !buffers.has(name)) return null;
    if (context.state === 'suspended') context.resume();
    const src = context.createBufferSource();
    src.buffer = buffers.get(name);
    src.loop = loop;
    const gain = context.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(out);
    src.start();
    return { src, gain };
  };

  const sound = {
    context,
    get mute() {
      return out ? out.gain.value === 0 : false;
    },
    set mute(v) {
      if (out) out.gain.value = v ? 0 : 1;
    },
    play: (name, opts) => playBuffer(name, opts),
    add(name, { loop = false, volume = 1 } = {}) {
      let node = null;
      let vol = volume;
      return {
        play() {
          node = playBuffer(name, { loop, volume: vol });
        },
        setVolume(v) {
          vol = v;
          if (node) node.gain.gain.value = v;
        },
      };
    },
  };

  const game = { sound, cache: { audio: { exists: (name) => buffers.has(name) } } };

  async function load() {
    if (!context) return;
    await Promise.all(
      Object.entries(AUDIO).map(async ([name, path]) => {
        const src = url(path);
        if (!src) return;
        try {
          const res = await fetch(src);
          if (!res.ok) return;
          buffers.set(name, await context.decodeAudioData(await res.arrayBuffer()));
        } catch {
          // Missing or undecodable audio falls back to Sfx's synthesized stand-in.
        }
      }),
    );
  }

  /** A soft footstep: a short filtered noise burst, splashier when wading. */
  function step(sfx, wet = false) {
    if (!context || sfx.muted || !sfx.master) return;
    if (context.state === 'suspended') context.resume();
    const t = context.currentTime;
    const dur = wet ? 0.32 : 0.12;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * dur), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = context.createBufferSource();
    src.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = wet ? 'bandpass' : 'lowpass';
    filter.frequency.value = wet ? 900 + Math.random() * 500 : 380 + Math.random() * 160;
    const gain = context.createGain();
    gain.gain.setValueAtTime(wet ? 0.09 : 0.11, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(sfx.master);
    src.start(t);
  }

  return { game, load, step, context };
}
