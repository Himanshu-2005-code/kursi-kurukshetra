// Particles and screen effects.
import { GROUND } from './stages.js';

export class FX {
  constructor() { this.p = []; this.under = []; this.screenFlash = 0; }

  update() {
    for (const p of this.p) {
      p.t++; p.x += p.vx || 0; p.y += p.vy || 0; p.vy = (p.vy || 0) + (p.g || 0);
      if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; }
    }
    this.p = this.p.filter((p) => p.t < p.life);
    for (const u of this.under) u.t++;
    this.under = this.under.filter((u) => u.t < u.life);
    if (this.screenFlash > 0) this.screenFlash -= 0.05;
  }

  spark(x, y, color, n = 10, blocked = false) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * (blocked ? 5 : 10);
      this.p.push({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 10 + Math.random() * 8, t: 0, color, drag: 0.86 });
    }
    this.p.push({ type: 'burst', x, y, life: 8, t: 0, color, r: blocked ? 26 : 40 });
  }
  ring(x, y, color) { this.p.push({ type: 'ring', x, y, life: 18, t: 0, color }); }
  dust(x, y, n = 8) {
    for (let i = 0; i < n; i++) this.p.push({ type: 'dust', x: x + (Math.random() - 0.5) * 50, y: y - 4, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 2.5, life: 26 + Math.random() * 18, t: 0, r: 6 + Math.random() * 10, drag: 0.95 });
  }
  smoke(x, y) {
    for (let i = 0; i < 18; i++) { const a = Math.random() * 7, s = 1 + Math.random() * 4; this.p.push({ type: 'smoke', x, y: y + (Math.random() - 0.5) * 120, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.5, life: 30, t: 0, r: 14 + Math.random() * 12, drag: 0.92 }); }
  }
  stars(f) { this.p.push({ type: 'starpop', x: f.x, y: f.y - 240 * f.k, life: 20, t: 0 }); }
  text(x, y, text, color, scale = 1) { this.p.push({ type: 'text', x, y, vy: -1.2, text, color, scale, life: 55, t: 0, rot: (Math.random() - 0.5) * 0.4 }); }
  slash(x, y) { this.p.push({ type: 'slash', x, y, a: Math.random() * Math.PI, life: 12, t: 0 }); }
  crater(x) { this.under.push({ type: 'crater', x, life: 200, t: 0 }); this.dust(x, GROUND, 30); }
  whip(f, m) {
    const k = f.k;
    const x0 = f.x + f.facing * 40, x1 = f.x + f.facing * m.box[1];
    this.p.push({ type: 'whip', x0, x1, y: f.y - 140 * k, life: 2, t: 0, color: m.whip });
  }
  flashScreen() { this.screenFlash = 1; }

  drawUnder(g) {
    for (const u of this.under) {
      if (u.type === 'crater') {
        const a = Math.min(1, (u.life - u.t) / 40);
        g.save(); g.globalAlpha = a;
        g.fillStyle = '#120b07'; g.beginPath(); g.ellipse(u.x, GROUND + 6, 105, 22, 0, 0, 7); g.fill();
        g.strokeStyle = '#5a4030'; g.lineWidth = 5; g.stroke();
        g.fillStyle = '#6b4a30'; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(u.x - 110 + i * 31, GROUND + (i % 2 ? -6 : 0), 8, 0, 7); g.fill(); }
        g.restore();
      }
    }
  }

  draw(g) {
    for (const p of this.p) {
      const k = p.t / p.life;
      g.save();
      switch (p.type) {
        case 'spark':
          g.strokeStyle = p.color; g.globalAlpha = 1 - k; g.lineWidth = 3;
          g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); g.stroke();
          break;
        case 'burst': {
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - k;
          const rg = g.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r * (0.6 + k));
          rg.addColorStop(0, '#fff'); rg.addColorStop(0.4, p.color); rg.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = rg; g.beginPath(); g.arc(p.x, p.y, p.r * (0.6 + k), 0, 7); g.fill();
          // star burst shape
          g.fillStyle = '#fff'; g.beginPath();
          for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? p.r * 0.35 : p.r * (0.9 - k * 0.5); g.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); }
          g.closePath(); g.globalAlpha = (1 - k) * 0.8; g.fill();
          break;
        }
        case 'ring':
          g.strokeStyle = p.color; g.globalAlpha = 1 - k; g.lineWidth = 6 * (1 - k);
          g.beginPath(); g.ellipse(p.x, p.y, 20 + k * 90, (20 + k * 90) * 0.6, 0, 0, 7); g.stroke();
          break;
        case 'dust':
          g.fillStyle = `rgba(190,170,140,${0.5 * (1 - k)})`; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + k), 0, 7); g.fill();
          break;
        case 'smoke':
          g.fillStyle = `rgba(80,70,90,${0.6 * (1 - k)})`; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + k * 0.8), 0, 7); g.fill();
          break;
        case 'starpop':
          break;
        case 'text':
          g.translate(p.x, p.y); g.rotate(p.rot); g.scale(p.scale * (k < 0.15 ? 0.6 + k * 2.7 : 1), p.scale * (k < 0.15 ? 0.6 + k * 2.7 : 1));
          g.globalAlpha = Math.min(1, (1 - k) * 2.5);
          g.font = '34px Anton, Impact'; g.textAlign = 'center';
          g.lineWidth = 3; g.strokeStyle = p.color; g.strokeRect(-g.measureText(p.text).width / 2 - 8, -32, g.measureText(p.text).width + 16, 42);
          g.lineWidth = 6; g.strokeStyle = '#fff'; g.strokeText(p.text, 0, 0);
          g.fillStyle = p.color; g.fillText(p.text, 0, 0);
          break;
        case 'slash':
          g.translate(p.x, p.y); g.rotate(p.a); g.globalAlpha = 1 - k;
          g.strokeStyle = '#fff'; g.lineWidth = 8 * (1 - k); g.shadowColor = '#e33b3b'; g.shadowBlur = 20;
          g.beginPath(); g.moveTo(-120 * (0.3 + k), 0); g.lineTo(120 * (0.3 + k), 0); g.stroke();
          break;
        case 'whip': {
          g.strokeStyle = p.color; g.lineWidth = 7; g.lineCap = 'round';
          g.shadowColor = '#000'; g.shadowBlur = 4;
          g.beginPath(); g.moveTo(p.x0, p.y);
          const mid = (p.x0 + p.x1) / 2;
          g.quadraticCurveTo(mid, p.y - 18 + Math.random() * 10, p.x1, p.y + 4); g.stroke();
          g.fillStyle = p.color; g.beginPath(); g.arc(p.x1, p.y + 4, 8, 0, 7); g.fill();
          break;
        }
      }
      g.restore();
    }
  }

  drawStars(g, f) {
    const t = f.t * 0.12;
    for (let i = 0; i < 4; i++) {
      const a = t + (i * Math.PI) / 2;
      const x = f.x + Math.cos(a) * 34, y = f.y - 252 * f.k + Math.sin(a) * 9;
      g.save(); g.translate(x, y); g.rotate(t * 2);
      g.fillStyle = i % 2 ? '#ffd34d' : '#fff';
      g.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? 4 : 10, aa = (j / 10) * Math.PI * 2; g.lineTo(Math.cos(aa) * r, Math.sin(aa) * r); } g.closePath(); g.fill();
      g.restore();
    }
  }

  drawScreen(g) {
    if (this.screenFlash > 0) { g.fillStyle = `rgba(255,255,255,${this.screenFlash * 0.7})`; g.fillRect(0, 0, 1280, 720); }
  }
}
