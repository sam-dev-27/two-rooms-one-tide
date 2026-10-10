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
  thunder: [
    { noise: true, dur: 2.6, from: 900, to: 90, vol: 0.32 },
    { freq: 55, to: 32, dur: 1.6, type: 'sine', vol: 0.12 },
  ],
  tick: [{ freq: 1180, dur: 0.04, type: 'square', vol: 0.03 }],
  // Captain Hale: a cold breathy whisper over two low, slightly sour tones.
  ghost: [
    { noise: true, filter: 'bandpass', dur: 2.4, from: 2600, to: 900, vol: 0.12 },
    { freq: 196, to: 185, dur: 2.6, type: 'sine', vol: 0.05 },
    { freq: 277, to: 262, dur: 2.2, type: 'sine', vol: 0.035, delay: 0.4 },
  ],
  vision: [
    { noise: true, filter: 'bandpass', dur: 3, from: 400, to: 1800, vol: 0.08 },
    { freq: 392, dur: 2.8, type: 'sine', vol: 0.04 },
    { freq: 587, dur: 2.4, type: 'sine', vol: 0.025, delay: 0.5 },
  ],
  door: [
    { freq: 90, to: 60, dur: 0.5, type: 'sawtooth', vol: 0.05 },
    { noise: true, dur: 0.6, from: 600, to: 120, vol: 0.12 },
  ],
  // The floor hatch: old hinges, then the boards settling.
  creak: [
    { freq: 210, to: 330, dur: 0.55, type: 'sawtooth', vol: 0.035 },
    { freq: 300, to: 180, dur: 0.45, type: 'sawtooth', vol: 0.03, delay: 0.5 },
    { noise: true, dur: 0.5, from: 500, to: 90, vol: 0.12 },
  ],
  // The raid.
  splash: [
    { noise: true, dur: 0.9, from: 2400, to: 300, vol: 0.22 },
    { freq: 140, to: 60, dur: 0.3, type: 'sine', vol: 0.08 },
  ],
  thud: [
    { freq: 110, to: 45, dur: 0.22, type: 'sine', vol: 0.2 },
    { noise: true, dur: 0.18, from: 900, to: 150, vol: 0.12 },
  ],
  shove: [
    { freq: 180, to: 90, dur: 0.12, type: 'square', vol: 0.06 },
    { noise: true, dur: 0.25, from: 1500, to: 300, vol: 0.1 },
  ],
  flashbeam: [{ freq: 900, to: 1800, dur: 0.18, type: 'triangle', vol: 0.06 }],
  shout: [
    { freq: 170, to: 120, dur: 0.35, type: 'sawtooth', vol: 0.035 },
    { noise: true, filter: 'bandpass', dur: 0.35, from: 900, to: 600, vol: 0.05 },
  ],
  horn: [
    { freq: 147, dur: 1.4, type: 'sawtooth', vol: 0.05 },
    { freq: 220, dur: 1.4, type: 'triangle', vol: 0.04 },
  ],
};

class Sfx {
  constructor() {
    this.game = null;
    this.ctx = null;
    this.master = null;
    this.ambient = null;
    this.ambientGain = null;
    this.storm = 0;
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

  noise({ dur, from, to, vol, filter: type = 'lowpass' }) {
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(dur);
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    if (type === 'bandpass') filter.Q.value = 6;
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
      this.setStorm(this.storm);
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
    this.ambientGain = gain;
    this.setStorm(this.storm);
  }

  /** Storm intensity 0..1 (the tide): the sea loop gets louder as it rises. Mute still wins. */
  setStorm(level) {
    this.storm = Math.max(0, Math.min(1, level));
    if (this.ambient?.setVolume) this.ambient.setVolume(VOLUME.ambient * (1 + this.storm * 0.9));
    if (this.ambientGain) this.ambientGain.gain.value = 0.045 * (1 + this.storm * 1.2);
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
