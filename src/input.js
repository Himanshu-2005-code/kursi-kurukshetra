// Keyboard + touch input, abstracted into per-player "pads".
// A pad exposes held buttons and edge-triggered presses with a short buffer
// so combos and specials feel forgiving.

const BUFFER = 8; // frames a press stays "fresh"

export class Pad {
  constructor() {
    this.held = { left: false, right: false, up: false, down: false, punch: false, kick: false, grab: false, super: false };
    this.prev = { ...this.held };
    this.pressAge = { up: 99, punch: 99, kick: 99, grab: 99, super: 99 };
    this.hist = []; // recent directions, newest last, for motion inputs
  }
  // virtual = state from a source (keyboard / touch / AI) for this frame
  update(virtual) {
    this.prev = { ...this.held };
    this.held = { ...virtual };
    this.hist.push({ l: !!virtual.left, r: !!virtual.right, d: !!virtual.down });
    if (this.hist.length > 30) this.hist.shift();
    for (const k of Object.keys(this.pressAge)) {
      if (this.held[k] && !this.prev[k]) this.pressAge[k] = 0;
      else this.pressAge[k]++;
    }
  }
  pressed(k) { return this.pressAge[k] < BUFFER; }

  // Quarter-circle forward: ↓ then (↘) then → within a short window.
  qcf(facing, win = 16) {
    const h = this.hist.slice(-win);
    const fwd = (s) => (facing > 0 ? s.r : s.l);
    let stage = 0;
    for (const s of h) {
      if (stage === 0 && s.d && !fwd(s)) stage = 1;
      else if (stage >= 1 && fwd(s) && !s.d) stage = 2;
    }
    if (stage < 2) return false;
    return h.slice(-6).some((s) => fwd(s) && !s.d); // finished the motion recently
  }
  // Quarter-circle back: ↓ then ↙ then ←
  qcb(facing, win = 16) { return this.qcf(-facing, win); }
  // Double tap down: ↓, release, ↓
  dd(win = 20) {
    const h = this.hist.slice(-win);
    let stage = 0;
    for (const s of h) {
      if (stage === 0 && s.d) stage = 1;
      else if (stage === 1 && !s.d) stage = 2;
      else if (stage === 2 && s.d) stage = 3;
    }
    return stage === 3 && h[h.length - 1].d;
  }
  consume(k) { this.pressAge[k] = 99; }
  clear() { for (const k of Object.keys(this.pressAge)) this.pressAge[k] = 99; }
}

const P1_KEYS = {
  KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down',
  KeyJ: 'punch', KeyK: 'kick', KeyI: 'grab', KeyL: 'super', Space: 'super',
};
const P1_ARROWS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
const P2_KEYS = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  Comma: 'punch', Period: 'kick', Slash: 'grab', Semicolon: 'super',
  Numpad1: 'punch', Numpad2: 'kick', Numpad3: 'grab', Numpad0: 'super',
};

export class Input {
  constructor() {
    this.down = new Set();
    this.listeners = [];
    this.touch = { left: false, right: false, up: false, down: false, punch: false, kick: false, grab: false, super: false };
    this.twoPlayer = false;
    this.tapped = [new Set(), new Set()]; // keys pressed since last read, so quick taps are never lost
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.listeners.forEach((fn) => fn(e.code));
      this.down.add(e.code);
      if (!e.repeat) { this.tapped[0].add(e.code); this.tapped[1].add(e.code); }
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }
  onKey(fn) { this.listeners.push(fn); }

  read(player) {
    const out = { left: false, right: false, up: false, down: false, punch: false, kick: false, grab: false, super: false };
    const map = player === 0 ? P1_KEYS : P2_KEYS;
    const tap = this.tapped[player];
    const on = (code) => this.down.has(code) || tap.has(code);
    for (const [code, act] of Object.entries(map)) if (on(code)) out[act] = true;
    if (player === 0) {
      if (!this.twoPlayer) for (const [code, act] of Object.entries(P1_ARROWS)) if (on(code)) out[act] = true;
      for (const k of Object.keys(out)) out[k] = out[k] || this.touch[k];
    }
    tap.clear();
    if (player === 0 && !this.twoPlayer) this.tapped[1].clear();
    return out;
  }

  bindTouch(root) {
    const stick = root.querySelector('#stick');
    const knob = root.querySelector('#knob');
    let sid = null;
    const setStick = (dx, dy) => {
      const r = stick.clientWidth / 2;
      const len = Math.hypot(dx, dy);
      const cl = Math.min(len, r * 0.75);
      const nx = len ? (dx / len) * cl : 0, ny = len ? (dy / len) * cl : 0;
      knob.style.transform = `translate(${nx}px, ${ny}px)`;
      const t = r * 0.3;
      this.touch.left = dx < -t; this.touch.right = dx > t;
      this.touch.up = dy < -t * 1.3; this.touch.down = dy > t * 1.3;
    };
    const center = () => { const b = stick.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; };
    stick.addEventListener('pointerdown', (e) => { sid = e.pointerId; stick.setPointerCapture(sid); const [cx, cy] = center(); setStick(e.clientX - cx, e.clientY - cy); });
    stick.addEventListener('pointermove', (e) => { if (e.pointerId !== sid) return; const [cx, cy] = center(); setStick(e.clientX - cx, e.clientY - cy); });
    const end = (e) => { if (e.pointerId !== sid) return; sid = null; setStick(0, 0); };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);

    root.querySelectorAll('.tb').forEach((b) => {
      const k = b.dataset.b;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.touch[k] = true; b.classList.add('down'); });
      const up = () => { this.touch[k] = false; b.classList.remove('down'); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    });
  }
}

export const isTouchDevice = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
