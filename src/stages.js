// Stage backdrops. Static layers are painted once into an offscreen canvas
// (with a slight blur for depth), and a few animated elements are drawn on top
// every frame.
import { shade } from './rig.js';

export const W = 1280, H = 720, GROUND = 640;

function off(w = W, h = H) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const rnd = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

function crowdStrip(colors, seed, w = 1500, h = 120, scale = 1) {
  const c = off(w, h); const g = c.getContext('2d'); const r = rnd(seed);
  for (let i = 0; i < w / (18 * scale); i++) {
    const x = i * 18 * scale + r() * 8, y = h - 40 * scale - r() * 20 * scale;
    const col = colors[(r() * colors.length) | 0];
    g.fillStyle = col; g.beginPath(); g.ellipse(x, y + 40 * scale, 16 * scale, 34 * scale, 0, 0, 7); g.fill();
    g.fillStyle = shade('#6b4a35', -0.2 - r() * 0.4); g.beginPath(); g.arc(x, y + 2 * scale, 9 * scale, 0, 7); g.fill();
    if (r() < 0.3) { g.fillStyle = '#111'; g.beginPath(); g.arc(x, y - 2 * scale, 9.5 * scale, Math.PI, 0); g.fill(); }
  }
  return c;
}

function vignette(g) {
  const v = g.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, H * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
}

// ---------------- THE HOUSE ----------------
function paintHouse() {
  const c = off(); const g = c.getContext('2d');
  // back wall
  const wall = g.createLinearGradient(0, 0, 0, 420);
  wall.addColorStop(0, '#2a1a0e'); wall.addColorStop(1, '#6b4523');
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  // wood panels
  for (let i = 0; i < 26; i++) {
    const x = i * 52;
    g.fillStyle = i % 2 ? 'rgba(0,0,0,.12)' : 'rgba(255,220,160,.05)'; g.fillRect(x, 60, 50, 300);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.strokeRect(x + 6, 80, 38, 120); g.strokeRect(x + 6, 215, 38, 130);
  }
  // dome arches
  for (let i = 0; i < 7; i++) {
    const x = 90 + i * 185;
    const ag = g.createLinearGradient(x, 0, x, 160);
    ag.addColorStop(0, '#f6d48a'); ag.addColorStop(1, '#a8752f');
    g.fillStyle = ag; g.beginPath(); g.moveTo(x - 60, 160); g.quadraticCurveTo(x, -10, x + 60, 160); g.lineTo(x + 48, 160); g.quadraticCurveTo(x, 20, x - 48, 160); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,240,200,.15)'; g.beginPath(); g.moveTo(x - 48, 160); g.quadraticCurveTo(x, 20, x + 48, 160); g.closePath(); g.fill();
  }
  // speaker's chair & canopy
  const sx = W / 2;
  g.fillStyle = '#3b210f'; g.fillRect(sx - 130, 200, 260, 170);
  g.fillStyle = '#5a3418'; g.fillRect(sx - 120, 190, 240, 20);
  const cg = g.createLinearGradient(sx - 70, 120, sx + 70, 120); cg.addColorStop(0, '#5a1010'); cg.addColorStop(0.5, '#a51e1e'); cg.addColorStop(1, '#5a1010');
  g.fillStyle = cg; g.beginPath(); g.moveTo(sx - 80, 260); g.lineTo(sx - 70, 140); g.quadraticCurveTo(sx, 100, sx + 70, 140); g.lineTo(sx + 80, 260); g.closePath(); g.fill();
  g.fillStyle = '#d4a63c'; g.beginPath(); g.arc(sx, 128, 18, 0, 7); g.fill();
  g.fillStyle = '#2a1306'; g.fillRect(sx - 40, 190, 80, 110);
  g.fillStyle = '#7a1d1d'; g.fillRect(sx - 32, 198, 64, 60);
  g.font = 'bold 14px Teko, sans-serif'; g.fillStyle = '#e8c070'; g.textAlign = 'center'; g.fillText('ORDER! ORDER!', sx, 330);
  // tiered benches
  const tiers = [{ y: 330, h: 40, c: '#1e5a3a' }, { y: 380, h: 44, c: '#22673f' }, { y: 435, h: 50, c: '#277647' }];
  tiers.forEach((t, ti) => {
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 6; i++) {
        const x0 = sx + side * (180 + i * 95) - (side < 0 ? 90 : 0);
        const bg = g.createLinearGradient(0, t.y, 0, t.y + t.h); bg.addColorStop(0, shade(t.c, 0.2)); bg.addColorStop(1, shade(t.c, -0.35));
        g.fillStyle = bg; g.beginPath(); g.roundRect(x0, t.y + ti * 2, 88, t.h, 6); g.fill();
        g.fillStyle = '#3a2412'; g.fillRect(x0, t.y + t.h - 6, 88, 10);
      }
    }
  });
  // members silhouettes behind benches (static ones; animated ones drawn later)
  g.fillStyle = 'rgba(0,0,0,.0)';
  // floor
  const fl = g.createLinearGradient(0, 470, 0, H);
  fl.addColorStop(0, '#4a2a18'); fl.addColorStop(1, '#2a160c');
  g.fillStyle = fl; g.fillRect(0, 470, W, H - 470);
  // carpet runner with perspective
  g.fillStyle = '#7a1c1c'; g.beginPath(); g.moveTo(sx - 160, 480); g.lineTo(sx + 160, 480); g.lineTo(sx + 520, H); g.lineTo(sx - 520, H); g.closePath(); g.fill();
  g.strokeStyle = '#d4a63c'; g.lineWidth = 4; g.beginPath(); g.moveTo(sx - 150, 480); g.lineTo(sx - 500, H); g.moveTo(sx + 150, 480); g.lineTo(sx + 500, H); g.stroke();
  // central table with mace
  g.fillStyle = '#2b1709'; g.fillRect(sx - 120, 470, 240, 40); g.fillStyle = '#4b2a14'; g.fillRect(sx - 130, 462, 260, 12);
  g.fillStyle = '#e1b23a'; g.fillRect(sx - 70, 452, 140, 8); g.beginPath(); g.arc(sx + 75, 456, 10, 0, 7); g.fill();
  // papers on floor
  const r = rnd(7);
  for (let i = 0; i < 26; i++) { g.save(); g.translate(r() * W, 520 + r() * 190); g.rotate(r() * 3); g.fillStyle = 'rgba(245,240,225,.85)'; g.fillRect(-9, -6, 18, 12); g.restore(); }
  vignette(g);
  return c;
}

// ---------------- RALLY MAIDAN ----------------
function paintRally() {
  const c = off(); const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 450);
  sky.addColorStop(0, '#060818'); sky.addColorStop(0.6, '#1c1640'); sky.addColorStop(1, '#4a2a3a');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  const r = rnd(3);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`; g.fillRect(r() * W, r() * 260, 1.5, 1.5); }
  // truss stage
  g.strokeStyle = '#5b5f6b'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(120, 470); g.lineTo(120, 70); g.lineTo(1160, 70); g.lineTo(1160, 470); g.stroke();
  g.lineWidth = 2; g.beginPath();
  for (let x = 120; x < 1160; x += 26) { g.moveTo(x, 70); g.lineTo(x + 13, 86); g.lineTo(x + 26, 70); }
  g.stroke();
  // LED screen
  const lg = g.createLinearGradient(380, 110, 900, 330); lg.addColorStop(0, '#2b0f4a'); lg.addColorStop(1, '#a8204a');
  g.fillStyle = '#111'; g.fillRect(372, 102, 536, 236);
  g.fillStyle = lg; g.fillRect(380, 110, 520, 220);
  g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 110; y < 330; y += 4) g.fillRect(380, y, 520, 1);
  g.textAlign = 'center'; g.fillStyle = '#ffd34d'; g.font = '64px Anton, Impact, sans-serif'; g.fillText('VOTE FOR ME', 640, 210);
  g.font = '28px Teko, sans-serif'; g.fillStyle = '#fff'; g.fillText('(NOT HIM)  ·  FREE CHAI AFTER RALLY  ·  (NOT HER)', 640, 260);
  g.font = '22px Teko'; g.fillStyle = '#ffd34d'; g.fillText('★ ★ ★  JANATA KA FAISLA  ★ ★ ★', 640, 300);
  // side banners in neutral invented colours
  const banners = ['#e84b3c', '#2d9cdb', '#9b51e0', '#27ae60', '#f2c94c', '#eb5757'];
  banners.forEach((col, i) => {
    const x = 150 + i * 35 + (i > 2 ? 760 : 0);
    g.fillStyle = col; g.fillRect(x, 100, 26, 160); g.beginPath(); g.moveTo(x, 260); g.lineTo(x + 13, 280); g.lineTo(x + 26, 260); g.fill();
  });
  // marigold strings
  for (let s = 0; s < 3; s++) {
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, x = 120 + t * 1040, y = 92 + s * 8 + Math.sin(t * Math.PI) * (30 + s * 12);
      g.fillStyle = i % 2 ? '#ff8c1a' : '#ffd23f'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill();
    }
  }
  // stage platform
  const pg = g.createLinearGradient(0, 400, 0, 470); pg.addColorStop(0, '#5a3a2a'); pg.addColorStop(1, '#2a1a12');
  g.fillStyle = pg; g.fillRect(100, 400, 1080, 70);
  g.fillStyle = '#c99a3a'; g.fillRect(100, 396, 1080, 6);
  // speakers
  [70, 1150].forEach((x) => { g.fillStyle = '#1a1a1e'; g.fillRect(x, 260, 70, 160); for (let k = 0; k < 3; k++) { g.fillStyle = '#333'; g.beginPath(); g.arc(x + 35, 290 + k * 44, 17, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(x + 35, 290 + k * 44, 7, 0, 7); g.fill(); } });
  // ground
  const gr = g.createLinearGradient(0, 470, 0, H); gr.addColorStop(0, '#6b5038'); gr.addColorStop(1, '#3a2a1c');
  g.fillStyle = gr; g.fillRect(0, 470, W, H);
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.2})`; g.fillRect(r() * W, 470 + r() * 250, 3, 2); }
  vignette(g);
  return c;
}

// ---------------- GULLY CHAURAHA ----------------
function paintGully() {
  const c = off(); const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 400);
  sky.addColorStop(0, '#2c3e6b'); sky.addColorStop(0.5, '#e07a4a'); sky.addColorStop(1, '#f6c27a');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,230,170,.9)'; g.beginPath(); g.arc(980, 210, 40, 0, 7); g.fill();
  const r = rnd(11);
  // buildings
  const cols = ['#c9a27e', '#d98f6a', '#8fb3a5', '#e3c56f', '#b88aa8', '#a3a7b8', '#d4b090'];
  let x = -20;
  while (x < W + 40) {
    const w = 120 + r() * 90, h = 220 + r() * 170, col = cols[(r() * cols.length) | 0];
    const bg = g.createLinearGradient(x, 0, x + w, 0); bg.addColorStop(0, shade(col, -0.25)); bg.addColorStop(0.3, col); bg.addColorStop(1, shade(col, -0.15));
    g.fillStyle = bg; g.fillRect(x, 470 - h, w, h);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, 470 - h, w, 8);
    for (let fy = 470 - h + 30; fy < 420; fy += 60) {
      for (let fx = x + 15; fx < x + w - 30; fx += 42) {
        g.fillStyle = r() < 0.35 ? '#ffd88a' : '#2b2b3a'; g.fillRect(fx, fy, 22, 30);
        g.strokeStyle = shade(col, -0.45); g.lineWidth = 2; g.strokeRect(fx, fy, 22, 30);
      }
      g.fillStyle = shade(col, -0.4); g.fillRect(x + 8, fy + 34, w - 16, 5);
      g.strokeStyle = shade(col, -0.5); g.lineWidth = 1.5; g.beginPath(); for (let bx = x + 10; bx < x + w - 10; bx += 7) { g.moveTo(bx, fy + 34); g.lineTo(bx, fy + 22); } g.stroke();
    }
    x += w + 2;
  }
  // tangled wires
  g.strokeStyle = 'rgba(20,20,20,.75)'; g.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(0, 120 + i * 12); g.quadraticCurveTo(W / 2, 180 + i * 18 + r() * 30, W, 110 + i * 14); g.stroke(); }
  // posters
  const posters = [['VOTE FOR', '???'], ['VIKAS', 'COMING SOON'], ['ROAD WORK', 'SINCE 2009'], ['FREE', 'LAPTOP*'], ['HAPPY', 'BIRTHDAY NETAJI']];
  posters.forEach((p, i) => {
    const px = 60 + i * 250, py = 300 + (i % 2) * 40;
    g.save(); g.translate(px, py); g.rotate((r() - 0.5) * 0.1);
    g.fillStyle = ['#f6e8c3', '#ffd1d1', '#d1f0ff', '#fff3a8', '#e1ffd1'][i]; g.fillRect(0, 0, 110, 70);
    g.strokeStyle = '#0005'; g.strokeRect(0, 0, 110, 70);
    g.fillStyle = '#222'; g.font = '24px Anton, Impact'; g.textAlign = 'center'; g.fillText(p[0], 55, 32); g.font = '18px Teko'; g.fillText(p[1], 55, 56);
    g.restore();
  });
  // chai stall
  g.fillStyle = '#5a3a20'; g.fillRect(1040, 360, 170, 110);
  g.fillStyle = '#c0392b'; g.beginPath(); g.moveTo(1025, 360); g.lineTo(1225, 360); g.lineTo(1205, 330); g.lineTo(1045, 330); g.closePath(); g.fill();
  g.fillStyle = '#fff'; g.font = '22px Teko'; g.textAlign = 'center'; g.fillText('CUTTING CHAI ₹10', 1125, 352);
  g.fillStyle = '#ccc'; g.beginPath(); g.arc(1080, 395, 14, 0, 7); g.fill();
  // road
  const rd = g.createLinearGradient(0, 470, 0, H); rd.addColorStop(0, '#5b5550'); rd.addColorStop(1, '#2f2c2a');
  g.fillStyle = rd; g.fillRect(0, 470, W, H);
  g.fillStyle = '#8a8070'; g.fillRect(0, 466, W, 8);
  for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(240,240,220,.55)'; g.fillRect(i * 160 + 30, 690, 80, 6); }
  for (let i = 0; i < 7; i++) {
    const px = 80 + r() * (W - 160), py = 520 + r() * 170, w = 40 + r() * 50;
    g.fillStyle = '#1e1b19'; g.beginPath(); g.ellipse(px, py, w, w * 0.22, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(120,160,190,.35)'; g.beginPath(); g.ellipse(px, py + 1, w * 0.75, w * 0.12, 0, 0, 7); g.fill();
  }
  // parked auto-rickshaw
  g.save(); g.translate(170, 440);
  g.fillStyle = '#1d6b3a'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(10, -60, 70, -64); g.lineTo(120, -64); g.lineTo(130, 0); g.closePath(); g.fill();
  g.fillStyle = '#f2c230'; g.fillRect(0, -10, 140, 22);
  g.fillStyle = '#111'; [10, 120].forEach((wx) => { g.beginPath(); g.arc(wx, 16, 13, 0, 7); g.fill(); });
  g.restore();
  vignette(g);
  return c;
}

const PAINTERS = { house: paintHouse, rally: paintRally, gully: paintGully };
export const STAGES = [
  { id: 'house', name: 'THE HOUSE', sub: 'SESSION STALLED', music: 100 },
  { id: 'rally', name: 'RALLY MAIDAN', sub: 'NIGHT RALLY · FREE CHAI', music: 112 },
  { id: 'gully', name: 'GULLY CHAURAHA', sub: 'POTHOLE JUNCTION', music: 106 },
];

export class StageRenderer {
  constructor(id) {
    this.id = id;
    this.bg = PAINTERS[id]();
    this.t = 0;
    this.crowd = crowdStrip(['#e8e2d0', '#c8b48a', '#f0f0f0', '#d9c39a', '#8a6a4a'], 5);
    this.rallyCrowd = crowdStrip(['#c0392b', '#2980b9', '#f1c40f', '#8e44ad', '#16a085', '#ecf0f1'], 9, 1500, 160, 1.3);
    this.cow = { x: -200, active: false, wait: 900 };
  }
  draw(g, shakeX = 0, shakeY = 0, excite = 0) {
    this.t++;
    g.drawImage(this.bg, shakeX * 0.4, shakeY * 0.4);
    if (this.id === 'house') {
      // members bobbing and waving papers in the tiers
      for (let row = 0; row < 2; row++) {
        const y = 300 + row * 50;
        for (let i = 0; i < 18; i++) {
          const x = 70 + i * 66 + (row * 30);
          if (Math.abs(x - 640) < 150) continue;
          const bob = Math.sin(this.t * (0.08 + excite * 0.12) + i * 1.7 + row) * (2 + excite * 6);
          g.fillStyle = row ? '#e9e2cf' : '#d7ccb2';
          g.beginPath(); g.ellipse(x, y + 22 + bob, 14, 20, 0, 0, 7); g.fill();
          g.fillStyle = '#6a4630'; g.beginPath(); g.arc(x, y + bob, 9, 0, 7); g.fill();
          if ((i + row) % 3 === 0) { g.save(); g.translate(x + 14, y - 8 + bob); g.rotate(Math.sin(this.t * 0.2 + i) * 0.5); g.fillStyle = '#fff'; g.fillRect(-2, -14, 14, 18); g.restore(); }
        }
      }
    } else if (this.id === 'rally') {
      // sweeping spotlights
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const a = Math.sin(this.t * 0.012 + i * 2) * 0.5;
        const sx = 260 + i * 380;
        const lg = g.createLinearGradient(sx, 0, sx, 640); lg.addColorStop(0, 'rgba(255,240,200,.18)'); lg.addColorStop(1, 'rgba(255,240,200,0)');
        g.fillStyle = lg; g.beginPath(); g.moveTo(sx, 70); g.lineTo(sx + Math.sin(a) * 600 - 90, 680); g.lineTo(sx + Math.sin(a) * 600 + 90, 680); g.closePath(); g.fill();
      }
      g.restore();
      const off = (this.t * 0.4) % 300;
      const bob = Math.sin(this.t * (0.15 + excite * 0.2)) * (3 + excite * 8);
      g.drawImage(this.rallyCrowd, -off, 360 + bob);
      g.drawImage(this.rallyCrowd, -off + 1500, 360 + bob);
    } else if (this.id === 'gully') {
      // a wandering cow, the true ruler of the road
      const cw = this.cow;
      if (!cw.active && --cw.wait <= 0) { cw.active = true; cw.x = -160; }
      if (cw.active) { cw.x += 0.9; if (cw.x > W + 200) { cw.active = false; cw.wait = 1400; } drawCow(g, cw.x, 470, this.t); }
    }
  }
}

function drawCow(g, x, y, t) {
  g.save(); g.translate(x, y); g.scale(0.85, 0.85);
  const leg = Math.sin(t * 0.12) * 6;
  g.fillStyle = '#ece6da';
  g.beginPath(); g.ellipse(0, -60, 70, 34, 0, 0, 7); g.fill();
  g.strokeStyle = '#8a7f70'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#6b5a48'; g.beginPath(); g.ellipse(-20, -66, 18, 12, 0.3, 0, 7); g.fill();
  [[-45, leg], [-25, -leg], [35, -leg], [52, leg]].forEach(([lx, d]) => { g.fillStyle = '#ddd6c8'; g.fillRect(lx + d * 0.3, -34, 10, 34); g.fillStyle = '#333'; g.fillRect(lx + d * 0.3, -4, 10, 5); });
  g.fillStyle = '#ece6da'; g.beginPath(); g.ellipse(76, -76, 22, 16, 0.4, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#d9a1a1'; g.beginPath(); g.ellipse(92, -68, 9, 7, 0.4, 0, 7); g.fill();
  g.strokeStyle = '#9a8a6a'; g.lineWidth = 4; g.beginPath(); g.moveTo(70, -90); g.quadraticCurveTo(66, -104, 58, -104); g.moveTo(80, -90); g.quadraticCurveTo(84, -106, 92, -104); g.stroke();
  g.fillStyle = '#111'; g.beginPath(); g.arc(80, -80, 2.5, 0, 7); g.fill();
  g.strokeStyle = '#ece6da'; g.lineWidth = 3; g.beginPath(); g.moveTo(-68, -66); g.quadraticCurveTo(-82, -40 + leg, -76, -24); g.stroke();
  g.fillStyle = '#ff8c1a'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(62 + i * 3, -60 + i * 3, 4, 0, 7); g.fill(); }
  g.restore();
}
