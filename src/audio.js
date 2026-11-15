// All sound is synthesized with WebAudio, so there are no asset files to load.
// Voice lines use the browser's speech synthesis when available.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicOn = true;
    this.voiceOn = true;
    this.musicTimer = null;
    this.step = 0;
    try { this.muted = localStorage.getItem('kk-mute') === '1'; this.voiceOn = localStorage.getItem('kk-voice') !== '0'; } catch {}
  }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0.22; this.musicBus.connect(this.master);
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('kk-mute', m ? '1' : '0'); } catch {}
    if (this.master) this.master.gain.value = m ? 0 : 0.8;
    if (m && window.speechSynthesis) speechSynthesis.cancel();
  }
  setVoice(v) { this.voiceOn = v; try { localStorage.setItem('kk-voice', v ? '1' : '0'); } catch {} if (!v && window.speechSynthesis) speechSynthesis.cancel(); }

  _noise(t, dur, freq, q, gain, type = 'bandpass') {
    const src = this.ctx.createBufferSource(); src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxBus); src.start(t); src.stop(t + dur + 0.02);
    return f;
  }
  _tone(t, dur, f0, f1, gain, type = 'sine', bus) {
    const o = this.ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus); o.start(t); o.stop(t + dur + 0.02);
  }
  play(name, power = 1) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'whoosh': { const f = this._noise(t, 0.16, 900, 1.2, 0.18); f.frequency.exponentialRampToValueAtTime(2600, t + 0.14); break; }
      case 'hit': this._noise(t, 0.12 + 0.05 * power, 1400, 0.8, 0.5 * power, 'lowpass'); this._tone(t, 0.18, 160 + 40 * power, 50, 0.55 * power); break;
      case 'heavy': this._noise(t, 0.25, 900, 0.7, 0.7, 'lowpass'); this._tone(t, 0.35, 120, 35, 0.8); break;
      case 'block': this._tone(t, 0.12, 900, 600, 0.15, 'square'); this._noise(t, 0.06, 3200, 3, 0.25); break;
      case 'jump': this._tone(t, 0.12, 220, 420, 0.08, 'triangle'); break;
      case 'land': this._noise(t, 0.08, 300, 1, 0.2, 'lowpass'); break;
      case 'grab': this._noise(t, 0.1, 600, 2, 0.3); this._tone(t, 0.2, 300, 90, 0.4, 'triangle'); break;
      case 'super': this._tone(t, 0.7, 200, 1200, 0.25, 'sawtooth'); this._tone(t + 0.05, 0.7, 300, 1600, 0.15, 'square'); break;
      case 'ko': this._tone(t, 1.2, 140, 30, 0.9); this._noise(t, 0.9, 500, 0.6, 0.8, 'lowpass'); break;
      case 'select': this._tone(t, 0.08, 660, 880, 0.15, 'square'); break;
      case 'confirm': this._tone(t, 0.12, 440, 880, 0.2, 'square'); this._tone(t + 0.1, 0.18, 660, 1320, 0.2, 'square'); break;
      case 'shot': this._tone(t, 0.25, 700, 200, 0.2, 'sawtooth'); break;
      case 'stamp': this._tone(t, 0.15, 90, 40, 0.8); this._noise(t, 0.08, 2000, 1, 0.4); break;
      case 'crowd': { const f = this._noise(t, 1.4, 700, 0.5, 0.25); f.frequency.linearRampToValueAtTime(1100, t + 0.5); break; }
      case 'bell': for (let i = 0; i < 3; i++) this._tone(t + i * 0.16, 0.5, 1046, 1040, 0.18, 'triangle'); break;
      case 'horn': this._tone(t, 0.5, 300, 290, 0.25, 'square'); this._tone(t, 0.5, 377, 370, 0.2, 'square'); break;
    }
  }

  // Simple dhol + drone loop. Scheduled ahead in small chunks.
  startMusic(tempo = 104) {
    if (!this.ctx) return;
    this.stopMusic();
    if (!this.musicOn) return;
    const spb = 60 / tempo / 2; // eighth notes
    let next = this.ctx.currentTime + 0.1;
    this.step = 0;
    const scale = [146.8, 164.8, 185, 220, 246.9, 293.7, 329.6]; // D-ish raga-flavoured scale
    const melody = [0, 2, 3, 4, 3, 2, 4, 5, 4, 3, 2, 0, 1, 2, 0, -1];
    const tick = () => {
      while (next < this.ctx.currentTime + 0.3) {
        const s = this.step % 16;
        const t = next;
        // dhol: low "dha" on 0,3,6,10,12 ; high "na" on others
        if ([0, 3, 6, 10, 12].includes(s)) { this._tone(t, 0.22, 110, 45, 0.7, 'sine', this.musicBus); this._noiseMusic(t, 0.05, 200, 0.4); }
        if ([2, 5, 8, 11, 14, 15].includes(s)) { this._noiseMusic(t, 0.07, 2600, 0.35); this._tone(t, 0.08, 520, 380, 0.12, 'triangle', this.musicBus); }
        if (s % 4 === 0) this._tone(t, spb * 4.2, 73.4, 73.2, 0.12, 'sawtooth', this.musicBus);
        const m = melody[(this.step >> 1) % 16];
        if (this.step % 2 === 0 && m >= 0) this._tone(t, spb * 1.8, scale[m] * 2, scale[m] * 2 * 0.995, 0.08, 'triangle', this.musicBus);
        this.step++;
        next += spb;
      }
    };
    this.musicTimer = setInterval(tick, 50);
    tick();
  }
  _noiseMusic(t, dur, freq, gain) {
    const src = this.ctx.createBufferSource(); src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.5;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.musicBus); src.start(t); src.stop(t + dur + 0.02);
  }
  stopMusic() { if (this.musicTimer) clearInterval(this.musicTimer); this.musicTimer = null; }
  toggleMusic() { this.musicOn = !this.musicOn; if (this.musicOn) this.startMusic(); else this.stopMusic(); }

  say(text, voice = {}) {
    if (!this.voiceOn || this.muted || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[*_]/g, ''));
      const voices = speechSynthesis.getVoices();
      const pick = voices.find((v) => /en-IN|hi-IN/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
      if (pick) u.voice = pick;
      u.pitch = voice.pitch ?? 1; u.rate = voice.rate ?? 1.05; u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch {}
  }
}

export const audio = new AudioEngine();
