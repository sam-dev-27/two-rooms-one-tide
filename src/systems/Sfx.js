// Plays a real audio file when one was loaded, otherwise synthesizes a stand-in with WebAudio.

// Gains for the real files, which are peak-normalized; quiet foley gets more, the loud sting less.
const VOLUME = { ambient: 0.4, click: 0.4, error: 0.4, send: 0.45, swap: 0.8, flood: 0.7, win: 0.45 };

const SYNTH = {
  click: [{ freq: 720, dur: 0.05, type: 'triangle', vol: 0.08 }],
  pickup: [
    { freq: 520, dur: 0.12, type: 'triangle', vol: 0.12 },
    { freq: 780, dur: 0.18, type: 'triangle', vol: 0.12, delay: 0.08 },
  ],
  send: [{ freq: 600, to: 160, dur: 0.45, type: 'sine', vol: 0.14 }],
  unlock: [
    { freq: 320, dur: 0.06, type: 'square', vol: 0.06 },
    { freq: 460, dur: 0.1, type: 'square', vol: 0.06, delay: 0.09 },
  ],
  error: [{ freq: 150, dur: 0.22, type: 'sawtooth', vol: 0.06 }],
  swap: [{ freq: 440, to: 300, dur: 0.3, type: 'sine', vol: 0.08 }],
  win: [523, 659, 784, 1047].map((freq, i) => ({ freq, dur: 0.5, type: 'triangle', vol: 0.1, delay: i * 0.14 })),
  flood: [{ noise: true, dur: 1.8, from: 200, to: 1200, vol: 0.25 }],
};

class Sfx {
  constructor() {
    this.game = null;
    this.ctx = null;
    this.master = null;
    this.ambient = null;
    this.muted = localStorage.getItem('trot-muted') === '1';
  }

  attach(game) {
    this.game = game;
    this.ctx = game.sound.context ?? null;
    if (this.ctx) {
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    this.applyMute();
  }

  hasFile(name) {
    return this.game?.cache.audio.exists(name);
  }

  play(name) {
    if (!this.game || this.muted) return;
    if (this.hasFile(name)) {
      this.game.sound.play(name, { volume: VOLUME[name] ?? 0.6 });
      return;
    }
    if (!this.ctx || !SYNTH[name]) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    for (const note of SYNTH[name]) (note.noise ? this.noise(note) : this.tone(note));
  }

  tone({ freq, to, dur, type = 'sine', vol = 0.1, delay = 0 }) {
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  noiseBuffer(seconds) {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  noise({ dur, from, to, vol }) {
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(dur);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + dur * 0.6);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
  }

  /** Starts the ambient loop. Call from a user gesture so the browser allows audio. */
  startAmbient() {
    if (this.ambient || !this.game) return;
    if (this.hasFile('ambient')) {
      this.ambient = this.game.sound.add('ambient', { loop: true, volume: VOLUME.ambient });
      this.ambient.play();
      return;
    }
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    // Synth sea: looped noise through a lowpass, with a slow swell.
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(4);
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.045;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain).connect(gain.gain);
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
    lfo.start();
    this.ambient = src;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('trot-muted', this.muted ? '1' : '0');
    this.applyMute();
    return this.muted;
  }

  applyMute() {
    if (this.game) this.game.sound.mute = this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 1;
  }
}

export const sfx = new Sfx();
