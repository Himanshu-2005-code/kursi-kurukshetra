// Procedural, shaded 2D character rig.
// Every fighter is drawn from a skeleton (joint angles) plus a "look"
// description (skin, clothes, hair, face). Nothing is a bitmap, so any pose
// can be animated smoothly and new characters are just data.
//
// Angles are in radians, in the fighter's own space (facing right):
// 0 = limb pointing straight down, +PI/2 = pointing forward, PI = straight up.

// ---------- colour helpers ----------
const cache = new Map();
export function shade(hex, f) {
  const key = hex + f;
  if (cache.has(key)) return cache.get(key);
  let r, g, b;
  if (hex.startsWith('rgb')) {
    [r, g, b] = hex.match(/[\d.]+/g).map(Number);
  } else {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    r = parseInt(c.slice(0, 2), 16); g = parseInt(c.slice(2, 4), 16); b = parseInt(c.slice(4, 6), 16);
  }
  if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  const out = `rgb(${r | 0},${g | 0},${b | 0})`;
  cache.set(key, out);
  return out;
}

const dir = (a) => [Math.sin(a), Math.cos(a)]; // canvas space, y down
const add = (p, a, len) => { const [dx, dy] = dir(a); return [p[0] + dx * len, p[1] + dy * len]; };
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- poses ----------
export const BASE_POSE = {
  lean: 0.08, head: -0.04, rot: 0, lift: 0,
  uaF: 0.5, faF: 2.45, uaB: 0.25, faB: 2.25,
  thF: 0.3, shF: 0.02, thB: -0.18, shB: -0.38,
  mouth: 0, eyes: 'open', fistF: 1, fistB: 1, prop: 1,
};

export function mkPose(o) { return { ...BASE_POSE, ...o }; }

export function lerpPose(a, b, t) {
  const out = {};
  for (const k in BASE_POSE) {
    const va = a[k] ?? BASE_POSE[k], vb = b[k] ?? BASE_POSE[k];
    out[k] = typeof va === 'number' ? lerp(va, vb, t) : (t < 0.5 ? va : vb);
  }
  return out;
}

export const POSES = {
  stance: mkPose({}),
  crouch: mkPose({ lean: 0.32, head: -0.2, thF: 1.32, shF: -0.22, thB: 0.72, shB: -0.95, uaF: 0.7, faF: 2.55, uaB: 0.45, faB: 2.4 }),
  jump: mkPose({ lean: 0.05, thF: 1.45, shF: -0.1, thB: 0.55, shB: -0.75, uaF: 1.2, faF: 2.6, uaB: 0.9, faB: 2.3 }),
  jab: mkPose({ lean: 0.2, head: -0.05, uaF: 1.57, faF: 1.6, uaB: 0.35, faB: 2.4, mouth: 0.3, eyes: 'angry' }),
  jabWind: mkPose({ lean: 0.1, uaF: 0.35, faF: 2.5, eyes: 'angry' }),
  cross: mkPose({ lean: 0.38, head: 0.05, uaB: 1.55, faB: 1.58, uaF: 0.4, faF: 2.3, thF: 0.45, shF: 0.1, thB: -0.4, shB: -0.45, mouth: 0.6, eyes: 'angry' }),
  crossWind: mkPose({ lean: 0.0, uaB: 0.1, faB: 2.6, eyes: 'angry' }),
  kick: mkPose({ lean: -0.28, head: 0.1, thF: 1.55, shF: 1.6, thB: -0.05, shB: -0.08, uaF: 0.9, faF: 2.6, uaB: -0.2, faB: 1.8, mouth: 0.5, eyes: 'angry' }),
  kickWind: mkPose({ lean: -0.05, thF: 1.2, shF: -0.4, thB: -0.05, shB: -0.08, eyes: 'angry' }),
  highKick: mkPose({ lean: -0.45, head: 0.25, thF: 2.05, shF: 2.15, thB: 0.0, shB: -0.05, uaF: 0.6, faF: 2.2, uaB: -0.4, faB: 1.2, mouth: 0.7, eyes: 'angry' }),
  sweep: mkPose({ lean: 0.55, head: -0.25, thF: 1.42, shF: 1.5, thB: 1.25, shB: -0.4, uaF: 0.1, faF: 0.2, uaB: 0.6, faB: 2.2, mouth: 0.4, eyes: 'angry' }),
  lowPunch: mkPose({ lean: 0.4, head: -0.15, thF: 1.32, shF: -0.22, thB: 0.72, shB: -0.95, uaF: 1.45, faF: 1.5, uaB: 0.45, faB: 2.4, mouth: 0.4, eyes: 'angry' }),
  jumpKick: mkPose({ lean: -0.15, thF: 1.3, shF: 1.38, thB: 0.45, shB: -1.0, uaF: 1.0, faF: 2.4, uaB: 0.2, faB: 1.5, mouth: 0.6, eyes: 'angry' }),
  jumpPunch: mkPose({ lean: 0.25, thF: 1.2, shF: 0.0, thB: 0.4, shB: -0.8, uaF: 1.35, faF: 1.0, uaB: 0.5, faB: 2.3, mouth: 0.5, eyes: 'angry' }),
  hurt: mkPose({ lean: -0.38, head: -0.45, uaF: -0.35, faF: 0.15, uaB: -0.55, faB: -0.25, thF: 0.4, shF: 0.1, thB: -0.25, shB: -0.3, mouth: 0.8, eyes: 'shut', fistF: 0, fistB: 0 }),
  hurtLow: mkPose({ lean: 0.55, head: 0.3, uaF: 0.2, faF: 0.6, uaB: 0.3, faB: 0.5, thF: 0.5, shF: -0.2, thB: 0.1, shB: -0.5, mouth: 0.8, eyes: 'shut', fistF: 0, fistB: 0 }),
  block: mkPose({ lean: -0.06, head: 0.15, uaF: 1.0, faF: 2.95, uaB: 0.75, faB: 2.85, eyes: 'shut', mouth: 0.1 }),
  crouchBlock: mkPose({ lean: 0.25, head: 0.0, thF: 1.32, shF: -0.22, thB: 0.72, shB: -0.95, uaF: 1.0, faF: 2.95, uaB: 0.75, faB: 2.85, eyes: 'shut' }),
  down: mkPose({ rot: -1.52, lift: 16, lean: 0, head: -0.3, uaF: 2.6, faF: 2.9, uaB: 2.2, faB: 2.6, thF: 0.15, shF: 0.0, thB: 0.25, shB: 0.1, eyes: 'shut', mouth: 0.4, fistF: 0, fistB: 0 }),
  fall: mkPose({ rot: -0.8, lift: 70, lean: -0.2, head: -0.5, uaF: 2.2, faF: 2.6, uaB: 1.9, faB: 2.4, thF: 0.9, shF: 0.4, thB: 0.6, shB: 0.1, eyes: 'shut', mouth: 0.9, fistF: 0, fistB: 0 }),
  grab: mkPose({ lean: 0.3, uaF: 1.45, faF: 1.25, uaB: 1.35, faB: 1.15, thF: 0.45, shF: 0.1, thB: -0.35, shB: -0.4, mouth: 0.5, eyes: 'angry', fistF: 0, fistB: 0 }),
  throw: mkPose({ lean: -0.35, head: 0.2, uaF: 2.8, faF: 3.0, uaB: 2.6, faB: 2.9, thF: 0.2, shF: 0.0, thB: -0.3, shB: -0.4, mouth: 0.9, eyes: 'angry', fistF: 0, fistB: 0 }),
  cast: mkPose({ lean: 0.18, uaF: 1.55, faF: 1.55, uaB: 0.9, faB: 1.7, thF: 0.5, shF: 0.1, thB: -0.35, shB: -0.45, mouth: 0.9, eyes: 'wide', fistF: 0 }),
  castWind: mkPose({ lean: -0.1, uaF: 0.4, faF: 1.2, uaB: 0.2, faB: 1.0, mouth: 0.2, eyes: 'angry' }),
  overhand: mkPose({ lean: 0.35, uaF: 1.7, faF: 1.3, uaB: 0.2, faB: 1.9, thF: 0.5, shF: 0.15, thB: -0.4, shB: -0.5, mouth: 0.7, eyes: 'angry', fistF: 0 }),
  overWind: mkPose({ lean: -0.25, uaF: 2.9, faF: 3.1, uaB: 1.0, faB: 2.0, mouth: 0.3, eyes: 'angry' }),
  dash: mkPose({ lean: 0.6, head: -0.3, uaF: 1.6, faF: 1.6, uaB: -0.5, faB: 0.2, thF: 0.9, shF: 0.2, thB: -0.6, shB: -0.9, mouth: 0.8, eyes: 'angry' }),
  uppercut: mkPose({ lean: 0.05, head: 0.3, uaF: 2.7, faF: 3.0, uaB: 0.3, faB: 2.0, thF: 0.4, shF: 0.0, thB: -0.1, shB: -0.3, mouth: 0.8, eyes: 'angry' }),
  win: mkPose({ lean: -0.05, head: 0.2, uaF: 2.75, faF: 3.0, uaB: 2.55, faB: 2.9, thF: 0.12, shF: 0.0, thB: -0.12, shB: 0.0, mouth: 0.7, eyes: 'open', fistF: 1, fistB: 1 }),
  wave: mkPose({ lean: -0.05, head: 0.15, uaF: 2.4, faF: 3.1, uaB: 0.35, faB: -0.9, thF: 0.12, shF: 0.0, thB: -0.12, shB: 0.0, mouth: 0.4, fistF: 0, fistB: 1 }),
  namaste: mkPose({ lean: 0.12, head: -0.1, uaF: 0.75, faF: 2.75, uaB: 0.6, faB: 2.75, thF: 0.08, shF: 0.0, thB: -0.08, shB: 0.0, mouth: 0.1, fistF: 0, fistB: 0 }),
  point: mkPose({ lean: 0.1, head: 0.05, uaF: 1.75, faF: 1.85, uaB: 0.3, faB: -0.8, thF: 0.25, shF: 0.0, thB: -0.15, shB: -0.1, mouth: 0.8, eyes: 'angry', fistF: 0 }),
  dizzy: mkPose({ lean: 0.25, head: 0.5, uaF: 0.1, faF: 0.15, uaB: -0.1, faB: 0.0, thF: 0.35, shF: -0.15, thB: -0.1, shB: -0.4, mouth: 0.6, eyes: 'shut', fistF: 0, fistB: 0 }),
  speech: mkPose({ lean: -0.02, head: 0.2, uaF: 2.1, faF: 2.9, uaB: 0.9, faB: 1.9, thF: 0.15, shF: 0.0, thB: -0.15, shB: 0.0, mouth: 0.9, eyes: 'wide', fistF: 1, fistB: 0 }),
};

export function walkPose(phase, back = false) {
  const s = Math.sin(phase), c = Math.cos(phase);
  const sgn = back ? -1 : 1;
  return mkPose({
    lean: 0.1 + 0.03 * c, head: -0.04,
    thF: 0.12 + 0.38 * s * sgn, shF: 0.12 + 0.38 * s * sgn - 0.45 * Math.max(0, -c),
    thB: 0.12 - 0.38 * s * sgn, shB: 0.12 - 0.38 * s * sgn - 0.45 * Math.max(0, c),
    uaF: 0.5 - 0.12 * s, faF: 2.4, uaB: 0.3 + 0.12 * s, faB: 2.2,
  });
}

export function idlePose(t) {
  const b = Math.sin(t * 0.075);
  return mkPose({ lean: 0.08 + 0.02 * b, head: -0.04 + 0.02 * b, uaF: 0.5 + 0.04 * b, faF: 2.45 + 0.05 * b, uaB: 0.25 - 0.03 * b, faB: 2.25 + 0.04 * b,
    thF: 0.3 + 0.03 * b, shF: 0.02 - 0.03 * b, thB: -0.18 + 0.02 * b, shB: -0.38 - 0.02 * b });
}

// ---------- skeleton ----------
const BONES = { thigh: 54, shin: 54, torso: 80, neck: 12, ua: 40, fa: 38, headR: 21 };

function skeleton(pose, look) {
  const k = look.height || 1;
  const L = { thigh: BONES.thigh * k, shin: BONES.shin * k, torso: BONES.torso * k, neck: BONES.neck * k, ua: BONES.ua * k, fa: BONES.fa * k };
  // leg vectors from hip at origin
  const kneeF0 = add([0, 0], pose.thF, L.thigh), footF0 = add(kneeF0, pose.shF, L.shin);
  const kneeB0 = add([0, 0], pose.thB, L.thigh), footB0 = add(kneeB0, pose.shB, L.shin);
  const hipH = pose.rot ? 0 : Math.max(footF0[1], footB0[1], 10);
  const hip = [0, -hipH];
  const hipF = [hip[0] + 6, hip[1]], hipB = [hip[0] - 6, hip[1]];
  const kneeF = add(hipF, pose.thF, L.thigh), footF = add(kneeF, pose.shF, L.shin);
  const kneeB = add(hipB, pose.thB, L.thigh), footB = add(kneeB, pose.shB, L.shin);
  const up = Math.PI - pose.lean; // torso direction (pointing up, leaning forward)
  const neck = add(hip, up, L.torso);
  const shC = add(hip, up, L.torso * 0.88);
  const fwd = [Math.cos(pose.lean), Math.sin(pose.lean)];
  const shF = [shC[0] + fwd[0] * 5, shC[1] + fwd[1] * 5];
  const shB = [shC[0] - fwd[0] * 9, shC[1] - fwd[1] * 9];
  const elF = add(shF, pose.uaF, L.ua), hdF = add(elF, pose.faF, L.fa);
  const elB = add(shB, pose.uaB, L.ua), hdB = add(elB, pose.faB, L.fa);
  const headAng = up + pose.head * -1;
  const headC = add(neck, headAng, L.neck + BONES.headR * k * 0.95);
  return { k, L, hip, hipF, hipB, kneeF, footF, kneeB, footB, neck, shC, shF, shB, elF, hdF, elB, hdB, headC, up, headAng };
}

// ---------- primitives ----------
function capsule(ctx, a, b, w1, w2, color, light = 0.18, outline = true) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 0.001;
  const nx = -dy / len, ny = dx / len;
  // cylindrical shading: core shadow, mid tone, specular band, bounce light at the edge
  const g = ctx.createLinearGradient(a[0] + nx * w1, a[1] + ny * w1, a[0] - nx * w1, a[1] - ny * w1);
  g.addColorStop(0, shade(color, -0.5));
  g.addColorStop(0.18, shade(color, -0.22));
  g.addColorStop(0.45, color);
  g.addColorStop(0.66, shade(color, light + 0.1));
  g.addColorStop(0.74, shade(color, light * 0.6));
  g.addColorStop(0.92, shade(color, -0.2));
  g.addColorStop(1, shade(color, -0.05));
  ctx.beginPath();
  const ang = Math.atan2(dy, dx);
  ctx.arc(a[0], a[1], w1, ang + Math.PI / 2, ang - Math.PI / 2);
  ctx.arc(b[0], b[1], w2, ang - Math.PI / 2, ang + Math.PI / 2);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  if (outline) { ctx.strokeStyle = shade(color, -0.55); ctx.lineWidth = 1.4; ctx.stroke(); }
}

function blob(ctx, x, y, rx, ry, color, rot = 0, light = 0.25) {
  const g = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.35, 1, x, y, Math.max(rx, ry) * 1.1);
  g.addColorStop(0, shade(color, light));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.35));
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = shade(color, -0.55); ctx.lineWidth = 1.3; ctx.stroke();
}

// local frame helper: point at (r forward, u up) relative to origin o with torso rotation
function frame(o, lean) {
  const c = Math.cos(lean), s = Math.sin(lean);
  return (r, u) => [o[0] + r * c + u * s, o[1] + r * s - u * c];
}

// ---------- body parts ----------
function drawHand(ctx, p, angle, skin, fist, look, prop) {
  ctx.save();
  ctx.translate(p[0], p[1]);
  ctx.rotate(-angle);
  if (fist) {
    blob(ctx, 0, 3, 9, 8.5, skin, 0, 0.2);
    ctx.strokeStyle = shade(skin, -0.45); ctx.lineWidth = 1;
    ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(i * 3.5, 7); ctx.lineTo(i * 3.5, 10); } ctx.stroke();
  } else {
    blob(ctx, 0, 6, 7.5, 11, skin, 0, 0.2);
    blob(ctx, 6, 2, 3, 6, skin, -0.6, 0.15);
  }
  if (prop && look.prop) drawProp(ctx, look.prop, look);
  ctx.restore();
}

function drawProp(ctx, kind, look) {
  ctx.save();
  switch (kind) {
    case 'mic':
      ctx.rotate(-0.3);
      capsule(ctx, [0, 4], [0, 34], 3.5, 3, '#2b2b2b', 0.3);
      blob(ctx, 0, 0, 7, 7, '#9a9a9a', 0, 0.5);
      ctx.strokeStyle = '#555'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
      break;
    case 'file':
      ctx.rotate(0.2);
      ctx.fillStyle = '#d9b26a'; ctx.strokeStyle = '#7a5a20'; ctx.lineWidth = 1.2;
      ctx.fillRect(-14, 4, 28, 36); ctx.strokeRect(-14, 4, 28, 36);
      ctx.fillStyle = '#c0392b'; ctx.fillRect(-14, 18, 28, 4);
      ctx.fillStyle = '#7a5a20'; ctx.font = 'bold 6px sans-serif'; ctx.fillText('FILE', -8, 34);
      break;
    case 'phone':
      ctx.rotate(-0.2);
      ctx.fillStyle = '#111'; ctx.fillRect(-6, -6, 12, 22);
      ctx.fillStyle = '#4fc3ff'; ctx.fillRect(-4.5, -4, 9, 17);
      break;
    case 'scroll':
      ctx.fillStyle = '#f6e6bd'; ctx.strokeStyle = '#8a6b30'; ctx.lineWidth = 1;
      ctx.fillRect(-4, -10, 8, 32); ctx.strokeRect(-4, -10, 8, 32);
      blob(ctx, 0, -10, 6, 3, '#c79a3b'); blob(ctx, 0, 22, 6, 3, '#c79a3b');
      break;
    case 'trowel':
      ctx.rotate(0.4);
      capsule(ctx, [0, 0], [0, 14], 3, 3, '#6b3b1a', 0.2);
      ctx.fillStyle = '#b8bec4'; ctx.strokeStyle = '#555'; ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(-10, 34); ctx.lineTo(10, 34); ctx.closePath(); ctx.fill(); ctx.stroke();
      break;
    case 'stamp':
      capsule(ctx, [0, -6], [0, 8], 4, 4, '#7b1f1f', 0.3);
      ctx.fillStyle = '#333'; ctx.fillRect(-9, 8, 18, 7);
      break;
    case 'briefcase': {
      const bg = ctx.createLinearGradient(-16, 8, 16, 30);
      bg.addColorStop(0, '#5a3a20'); bg.addColorStop(1, '#2a180c');
      ctx.fillStyle = bg; ctx.strokeStyle = '#1a0e06'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.roundRect(-17, 8, 34, 24, 3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#c9a23a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(-6, 3); ctx.lineTo(6, 3); ctx.lineTo(6, 8); ctx.stroke();
      ctx.fillStyle = '#d4af37'; ctx.fillRect(-12, 14, 5, 3); ctx.fillRect(7, 14, 5, 3);
      break;
    }
    case 'baton':
      ctx.rotate(-0.5);
      capsule(ctx, [0, -4], [0, 40], 3.2, 3.6, '#6b3d1c', 0.3);
      ctx.fillStyle = '#c9a23a'; ctx.fillRect(-3.5, 34, 7, 4);
      break;
    case 'revolver':
      ctx.rotate(-1.5);
      ctx.fillStyle = '#5a3418'; ctx.beginPath(); ctx.roundRect(-4, -2, 8, 14, 3); ctx.fill();
      ctx.fillStyle = '#6e7378'; ctx.fillRect(-5, -8, 26, 6); ctx.fillRect(-4, -9, 10, 9);
      ctx.fillStyle = '#9aa0a6'; ctx.fillRect(-5, -8, 26, 2);
      ctx.fillStyle = '#3a3e42'; ctx.beginPath(); ctx.arc(1, -4, 4, 0, 7); ctx.fill();
      break;
  }
  ctx.restore();
}

// Fabric creases bunching at a bent joint (elbow / knee).
function creases(ctx, a, j, b, w, color) {
  const a1 = Math.atan2(j[1] - a[1], j[0] - a[0]), a2 = Math.atan2(b[1] - j[1], b[0] - j[0]);
  let bend = a2 - a1; while (bend > Math.PI) bend -= Math.PI * 2; while (bend < -Math.PI) bend += Math.PI * 2;
  const amt = Math.min(1, Math.abs(bend) / 1.6);
  if (amt < 0.18) return;
  ctx.save();
  ctx.translate(j[0], j[1]); ctx.rotate(a1 + bend / 2);
  // ambient occlusion in the fold
  const ao = ctx.createRadialGradient(0, 0, 1, 0, 0, w * 1.4);
  ao.addColorStop(0, `rgba(0,0,0,${0.12 + amt * 0.2})`); ao.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ao; ctx.beginPath(); ctx.arc(0, 0, w * 1.4, 0, 7); ctx.fill();
  ctx.strokeStyle = shade(color, -0.42); ctx.lineWidth = 1.1; ctx.globalAlpha = amt;
  const s = bend > 0 ? 1 : -1;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const off = (i - 1) * w * 0.32;
    ctx.moveTo(off - 3, -w * 0.75 * s); ctx.quadraticCurveTo(off + 2, -w * 0.15 * s, off - 1, w * 0.35 * s);
  }
  ctx.stroke();
  ctx.strokeStyle = shade(color, 0.25); ctx.globalAlpha *= 0.6; ctx.beginPath(); ctx.moveTo(-w * 0.2 + 2, -w * 0.7 * s); ctx.quadraticCurveTo(w * 0.1 + 3, -w * 0.1 * s, 1, w * 0.3 * s); ctx.stroke();
  ctx.restore();
}

function drawShoe(ctx, foot, shinAng, color) {
  const fwd = [Math.cos(shinAng), -Math.sin(shinAng)];
  ctx.save();
  ctx.translate(foot[0], foot[1]);
  ctx.rotate(Math.atan2(fwd[1], fwd[0]));
  const g = ctx.createLinearGradient(0, -8, 0, 8);
  g.addColorStop(0, shade(color, 0.25)); g.addColorStop(1, shade(color, -0.4));
  ctx.beginPath();
  ctx.moveTo(-8, -6); ctx.quadraticCurveTo(10, -9, 20, -2); ctx.quadraticCurveTo(24, 4, 18, 6); ctx.lineTo(-9, 6); ctx.quadraticCurveTo(-12, 0, -8, -6);
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = shade(color, -0.6); ctx.lineWidth = 1.3; ctx.stroke();
  ctx.fillStyle = shade(color, -0.65); ctx.fillRect(-9, 4, 29, 2.5);
  ctx.restore();
}

function drawLeg(ctx, S, front, look, pose) {
  const hip = front ? S.hipF : S.hipB, knee = front ? S.kneeF : S.kneeB, foot = front ? S.footF : S.footB;
  const shAng = front ? pose.shF : pose.shB;
  const k = S.k * (look.build || 1);
  const col = front ? look.bottom.color : shade(look.bottom.color, -0.22);
  const shoe = front ? look.shoes : shade(look.shoes, -0.2);
  if (look.bottom.type === 'saree') {
    // legs mostly hidden by the drape, draw only ankles
    capsule(ctx, knee, foot, 7 * k, 6 * k, front ? look.skin : shade(look.skin, -0.2));
    drawShoe(ctx, foot, shAng, shoe);
    return;
  }
  const loose = look.bottom.type === 'pajama' ? 1.25 : look.bottom.type === 'dhoti' ? 1.4 : 1;
  capsule(ctx, hip, knee, 14 * k * loose, 11.5 * k * loose, col, 0.2);
  capsule(ctx, knee, foot, 11.5 * k * loose, (look.bottom.type === 'pajama' ? 9 : 9.5) * k, col, 0.2);
  creases(ctx, hip, knee, foot, 11 * k * loose, col);
  if (look.bottom.type === 'jeans') {
    ctx.strokeStyle = shade(col, 0.25); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(knee[0], knee[1]); ctx.lineTo(foot[0], foot[1]); ctx.stroke(); ctx.setLineDash([]);
  }
  if (look.bottom.type === 'trousers') {
    ctx.strokeStyle = shade(col, -0.35); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(knee[0], knee[1]); ctx.lineTo(foot[0], foot[1]); ctx.stroke();
  }
  drawShoe(ctx, foot, shAng, shoe);
}

function drawArm(ctx, S, front, look, pose) {
  const sh = front ? S.shF : S.shB, el = front ? S.elF : S.elB, hd = front ? S.hdF : S.hdB;
  const k = S.k * (look.build || 1);
  const sleeve = look.sleeve || look.top.color;
  const col = front ? sleeve : shade(sleeve, -0.25);
  const skin = front ? look.skin : shade(look.skin, -0.2);
  const full = look.top.sleeves !== 'short';
  if (front) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.32)'; ctx.shadowBlur = 9; ctx.shadowOffsetX = -3; ctx.shadowOffsetY = 4; }
  capsule(ctx, sh, el, 11.5 * k, 9.5 * k, col, 0.22);
  if (full) capsule(ctx, el, hd, 9.5 * k, 8 * k, col, 0.22);
  if (front) ctx.restore();
  if (full) {
    capsule(ctx, sh, el, 11.5 * k, 9.5 * k, col, 0.22);
    capsule(ctx, el, hd, 9.5 * k, 8 * k, col, 0.22);
    creases(ctx, sh, el, hd, 9 * k, col);
    // cuff
    const cuffStart = [lerp(el[0], hd[0], 0.85), lerp(el[1], hd[1], 0.85)];
    capsule(ctx, cuffStart, hd, 8.4 * k, 8.4 * k, shade(look.top.trim || col, front ? 0 : -0.2), 0.2);
  } else {
    capsule(ctx, el, hd, 7.5 * k, 6.5 * k, skin, 0.18);
  }
  if (look.watch && front) {
    const w = [lerp(el[0], hd[0], 0.82), lerp(el[1], hd[1], 0.82)];
    blob(ctx, w[0], w[1], 5, 5, '#d4af37', 0, 0.6);
  }
  const ang = front ? pose.faF : pose.faB;
  drawHand(ctx, hd, ang, skin, (front ? pose.fistF : pose.fistB) > 0.5, look, front && pose.prop > 0.5);
}

function drawTorso(ctx, S, look, pose) {
  const k = S.k * (look.build || 1);
  const T = S.L.torso;
  const belly = (look.belly || 0) * 20;
  const P = frame(S.hip, pose.lean);
  const top = look.top;
  const hem = top.type === 'kurta' ? 46 : top.type === 'saree' ? 4 : 10;
  const sway = Math.sin(pose.thF) * 8;
  const front = 22 * k, back = -21 * k;

  // ----- main garment silhouette -----
  ctx.beginPath();
  const pts = [
    P(back - 2, T + 2), P(back - 6, T * 0.82), P(back - 2, T * 0.45), P(back, 0),
  ];
  ctx.moveTo(...P(back * 0.7, T + 6));
  ctx.quadraticCurveTo(...pts[0], ...pts[1]);
  ctx.quadraticCurveTo(...P(back - 5, T * 0.6), ...pts[2]);
  ctx.quadraticCurveTo(...P(back - 1, T * 0.2), ...P(back - 4 - hem * 0.15, -hem));
  ctx.lineTo(...P(front + belly * 0.8 + 6 + hem * 0.2 + sway, -hem));
  ctx.quadraticCurveTo(...P(front + belly + 4, T * 0.05), ...P(front + belly, T * 0.32));
  ctx.quadraticCurveTo(...P(front + belly * 0.8, T * 0.55), ...P(front, T * 0.72));
  ctx.quadraticCurveTo(...P(front + 2, T * 0.95), ...P(front * 0.5, T + 6));
  ctx.closePath();
  const g = ctx.createLinearGradient(...P(back - 8, T * 0.5), ...P(front + belly + 6, T * 0.5));
  g.addColorStop(0, shade(top.color, -0.4)); g.addColorStop(0.55, top.color); g.addColorStop(0.85, shade(top.color, 0.2)); g.addColorStop(1, shade(top.color, -0.12));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = shade(top.color, -0.6); ctx.lineWidth = 1.5; ctx.stroke();

  // fabric folds
  ctx.strokeStyle = shade(top.color, -0.25); ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(...P(back + 6, T * 0.3)); ctx.quadraticCurveTo(...P(0, T * 0.2), ...P(front * 0.5 + belly * 0.5, T * 0.28));
  if (hem > 20) { ctx.moveTo(...P(back + 4, -6)); ctx.quadraticCurveTo(...P(4, -20), ...P(2, -hem + 4)); ctx.moveTo(...P(front * 0.6 + belly * 0.6, -4)); ctx.lineTo(...P(front * 0.9 + belly * 0.6 + sway, -hem + 3)); }
  ctx.stroke();

  if (top.type === 'kurta') {
    // placket + buttons
    ctx.strokeStyle = shade(top.color, -0.35); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(...P(front * 0.65, T + 2)); ctx.lineTo(...P(front * 0.8 + belly * 0.25, T * 0.55)); ctx.stroke();
    ctx.fillStyle = top.trim || shade(top.color, -0.4);
    for (let i = 0; i < 3; i++) { const p = P(front * 0.7 + i * 1.5 + belly * 0.08 * i, T - 6 - i * 9); ctx.beginPath(); ctx.arc(p[0], p[1], 1.8, 0, 7); ctx.fill(); }
  }
  if (top.type === 'shirt' || top.type === 'safari') {
    ctx.strokeStyle = shade(top.color, -0.35); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(...P(front * 0.75, T)); ctx.lineTo(...P(front + belly * 0.9, 0)); ctx.stroke();
    ctx.fillStyle = shade(top.color, -0.45);
    for (let i = 0; i < 4; i++) { const p = P(front * 0.78 + belly * 0.22 * i + 1, T - 10 - i * 17); ctx.beginPath(); ctx.arc(p[0], p[1], 1.6, 0, 7); ctx.fill(); }
    // collar
    ctx.fillStyle = shade(top.color, 0.15); ctx.beginPath(); ctx.moveTo(...P(front * 0.2, T + 6)); ctx.lineTo(...P(front * 0.95, T - 6)); ctx.lineTo(...P(front * 0.55, T - 14)); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (top.type === 'safari') {
    ctx.strokeStyle = shade(top.color, -0.4); ctx.lineWidth = 1.2;
    const pk = P(front * 0.05, T * 0.62); ctx.strokeRect(pk[0] - 6, pk[1] - 4, 14, 12);
    // belt
    ctx.fillStyle = shade(top.color, -0.3); ctx.beginPath(); ctx.moveTo(...P(back - 2, 6)); ctx.lineTo(...P(front + belly * 0.95, 6)); ctx.lineTo(...P(front + belly * 0.95, 0)); ctx.lineTo(...P(back, 0)); ctx.closePath(); ctx.fill();
  }
  if (top.type === 'saree') {
    // blouse band + bare midriff hint
    ctx.fillStyle = look.skin; ctx.beginPath(); ctx.moveTo(...P(back + 2, T * 0.3)); ctx.lineTo(...P(front + belly * 0.9, T * 0.32)); ctx.lineTo(...P(front + belly * 0.85, T * 0.18)); ctx.lineTo(...P(back + 2, T * 0.18)); ctx.closePath(); ctx.fill();
  }

  // ----- jacket / vest -----
  if (look.vest) {
    const v = look.vest;
    const vg = ctx.createLinearGradient(...P(back - 8, T * 0.5), ...P(front + belly + 6, T * 0.5));
    vg.addColorStop(0, shade(v.color, -0.45)); vg.addColorStop(0.6, v.color); vg.addColorStop(0.9, shade(v.color, 0.18)); vg.addColorStop(1, shade(v.color, -0.1));
    const vh = v.long ? -24 : -4;
    ctx.beginPath();
    ctx.moveTo(...P(back * 0.6, T + 4));
    ctx.quadraticCurveTo(...P(back - 5, T * 0.9), ...P(back - 4, T * 0.6));
    ctx.quadraticCurveTo(...P(back - 1, T * 0.2), ...P(back - 3, vh));
    ctx.lineTo(...P(front + belly * 0.85 + 4, vh));
    ctx.quadraticCurveTo(...P(front + belly + 4, T * 0.1), ...P(front + belly + 1, T * 0.33));
    ctx.quadraticCurveTo(...P(front + belly * 0.8 + 1, T * 0.55), ...P(front + 1, T * 0.72));
    ctx.quadraticCurveTo(...P(front + 3, T * 0.95), ...P(front * 0.45, T + 5));
    ctx.closePath();
    ctx.fillStyle = vg; ctx.fill(); ctx.strokeStyle = shade(v.color, -0.6); ctx.lineWidth = 1.5; ctx.stroke();
    if (v.style === 'nehru') {
      ctx.fillStyle = shade(v.color, -0.5);
      for (let i = 0; i < 5; i++) { const p = P(front * 0.9 + belly * (0.15 * i), T - 8 - i * 15); ctx.beginPath(); ctx.arc(p[0], p[1], 2, 0, 7); ctx.fill(); }
      ctx.strokeStyle = shade(v.color, 0.25); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(...P(back + 10, T * 0.55)); ctx.lineTo(...P(back + 22, T * 0.55)); ctx.stroke();
    } else if (v.style === 'suit') {
      // shirt V + tie + lapels
      ctx.fillStyle = v.shirt || '#f2f2f2';
      ctx.beginPath(); ctx.moveTo(...P(front * 0.15, T + 5)); ctx.lineTo(...P(front * 0.95, T + 1)); ctx.lineTo(...P(front + belly * 0.4, T * 0.5)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = v.tie || '#8b1a1a';
      ctx.beginPath(); ctx.moveTo(...P(front * 0.7, T)); ctx.lineTo(...P(front * 0.95, T - 3)); ctx.lineTo(...P(front + belly * 0.45, T * 0.55)); ctx.lineTo(...P(front * 0.85 + belly * 0.3, T * 0.5)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shade(v.color, -0.6); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(...P(front * 0.2, T + 4)); ctx.lineTo(...P(front * 0.55, T * 0.62)); ctx.lineTo(...P(front + belly * 0.4, T * 0.45)); ctx.stroke();
      const pk = P(back + 14, T * 0.68); ctx.fillStyle = '#eee'; ctx.fillRect(pk[0] - 2, pk[1] - 2, 9, 3);
    } else if (v.style === 'reversible') {
      // half and half colours: the turncoat jacket
      ctx.save(); ctx.clip();
      ctx.fillStyle = v.color2; ctx.beginPath(); ctx.moveTo(...P(0, T + 10)); ctx.lineTo(...P(60, T + 10)); ctx.lineTo(...P(60, -60)); ctx.lineTo(...P(6, -60)); ctx.closePath(); ctx.globalAlpha = 0.9; ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#fff6'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(...P(0, T + 4)); ctx.lineTo(...P(6, vh)); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  // ----- saree drape over the lower body -----
  if (look.bottom.type === 'saree') drawSareeSkirt(ctx, S, look, pose);
  if (look.top.type === 'saree') {
    // pallu: diagonal band over the shoulder
    const pc = look.top.pallu || shade(top.color, -0.15);
    ctx.beginPath();
    ctx.moveTo(...P(back - 4, T + 2)); ctx.lineTo(...P(back + 14, T + 6));
    ctx.lineTo(...P(front + belly + 2, T * 0.2)); ctx.lineTo(...P(front + belly * 0.6, -6)); ctx.lineTo(...P(front * 0.4, T * 0.1));
    ctx.closePath();
    const pg = ctx.createLinearGradient(...P(back, T), ...P(front, 0));
    pg.addColorStop(0, shade(pc, -0.3)); pg.addColorStop(0.5, pc); pg.addColorStop(1, shade(pc, 0.15));
    ctx.fillStyle = pg; ctx.fill(); ctx.strokeStyle = shade(pc, -0.55); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = look.top.trim || '#d4af37'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(...P(back + 14, T + 5)); ctx.lineTo(...P(front + belly + 1, T * 0.22)); ctx.stroke();
    // trailing pallu behind the back shoulder
    ctx.beginPath(); ctx.moveTo(...P(back - 3, T + 2)); ctx.quadraticCurveTo(...P(back - 18 - Math.sin(pose.lean * 3) * 6, T * 0.5), ...P(back - 14, T * 0.1)); ctx.lineTo(...P(back - 2, T * 0.2)); ctx.closePath();
    ctx.fillStyle = shade(pc, -0.2); ctx.fill(); ctx.strokeStyle = shade(pc, -0.55); ctx.lineWidth = 1; ctx.stroke();
  }

  // ----- neck accessories -----
  if (look.garland) {
    ctx.save();
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const r = lerp(back * 0.5, front + belly * 0.4, t);
      const u = T + 2 - Math.sin(t * Math.PI) * (T * 0.55);
      const p = P(r, u);
      blob(ctx, p[0], p[1], 5.2, 5.2, i % 3 === 0 ? '#ffd23f' : '#ff8c1a', 0, 0.35);
    }
    ctx.restore();
  }
  if (look.chain) {
    ctx.strokeStyle = '#e8c547'; ctx.lineWidth = 3.2; ctx.beginPath();
    for (let i = 0; i <= 10; i++) { const t = i / 10; const p = P(lerp(front * 0.1, front * 0.95, t), T + 2 - Math.sin(t * Math.PI) * 22); i ? ctx.lineTo(...p) : ctx.moveTo(...p); }
    ctx.stroke(); ctx.strokeStyle = '#a8862a'; ctx.lineWidth = 1; ctx.stroke();
    const pend = P(front * 0.6, T - 20); blob(ctx, pend[0], pend[1], 4, 5, '#e8c547', 0, 0.6);
  }
  if (look.pens) {
    const p = P(front * 0.35, T * 0.72);
    ['#1f4fbf', '#c0392b', '#111'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(p[0] + i * 3, p[1] - 10, 2, 10); });
  }
  if (look.lanyard) {
    ctx.strokeStyle = look.lanyard; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(...P(front * 0.2, T + 4)); ctx.lineTo(...P(front * 0.7, T * 0.45)); ctx.stroke();
    const id = P(front * 0.72, T * 0.42); ctx.fillStyle = '#fff'; ctx.fillRect(id[0] - 5, id[1] - 2, 11, 14); ctx.fillStyle = look.lanyard; ctx.fillRect(id[0] - 5, id[1] - 2, 11, 4);
  }
  if (look.badge) {
    const p = P(front * 0.45, T * 0.7); blob(ctx, p[0], p[1], 5, 5, look.badge, 0, 0.5);
  }
}

function drawSareeSkirt(ctx, S, look, pose) {
  const c = look.bottom.color;
  const hb = [S.hip[0] - 22, S.hip[1] - 2], hf = [S.hip[0] + 24 + (look.belly || 0) * 16, S.hip[1] - 2];
  const ankleB = [S.footB[0] - 14, S.footB[1] - 4], ankleF = [S.footF[0] + 14, S.footF[1] - 4];
  ctx.beginPath();
  ctx.moveTo(...hb);
  ctx.quadraticCurveTo(S.kneeB[0] - 22, S.kneeB[1], ankleB[0], ankleB[1]);
  ctx.quadraticCurveTo((ankleB[0] + ankleF[0]) / 2, Math.max(ankleB[1], ankleF[1]) + 4, ankleF[0], ankleF[1]);
  ctx.quadraticCurveTo(S.kneeF[0] + 22, S.kneeF[1], hf[0], hf[1]);
  ctx.closePath();
  const g = ctx.createLinearGradient(hb[0], 0, hf[0], 0);
  g.addColorStop(0, shade(c, -0.35)); g.addColorStop(0.6, c); g.addColorStop(1, shade(c, 0.15));
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = shade(c, -0.55); ctx.lineWidth = 1.4; ctx.stroke();
  // pleats
  ctx.strokeStyle = shade(c, -0.25); ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i = 0; i < 4; i++) { const t = 0.35 + i * 0.12; ctx.moveTo(lerp(hb[0], hf[0], t), hb[1] + 4); ctx.lineTo(lerp(ankleB[0], ankleF[0], t + 0.05), lerp(ankleB[1], ankleF[1], t) - 4); }
  ctx.stroke();
  // gold border at hem
  ctx.strokeStyle = look.top.trim || '#d4af37'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(ankleB[0], ankleB[1] - 2); ctx.quadraticCurveTo((ankleB[0] + ankleF[0]) / 2, Math.max(ankleB[1], ankleF[1]) + 2, ankleF[0], ankleF[1] - 2); ctx.stroke();
}

function drawHead(ctx, S, look, pose, opts) {
  const k = S.k;
  const R = BONES.headR * k;
  const [hx, hy] = S.headC;
  const tilt = -(S.headAng - Math.PI); // rotation of head frame
  const skin = look.skin;
  // neck
  capsule(ctx, S.neck, [hx - 3, hy + R * 0.6], 8.5 * k * (look.build || 1), 8 * k, shade(skin, -0.12), 0.1);
  const ns = ctx.createRadialGradient(hx, hy + R * 0.85, 1, hx, hy + R * 0.85, R * 0.7);
  ns.addColorStop(0, 'rgba(30,10,5,0.4)'); ns.addColorStop(1, 'rgba(30,10,5,0)');
  ctx.fillStyle = ns; ctx.beginPath(); ctx.arc(hx, hy + R * 0.85, R * 0.7, 0, 7); ctx.fill();

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tilt);
  const age = look.age || 0;

  // hair behind (bun / long)
  if (look.hair.style === 'bun') { blob(ctx, -R * 0.95, -R * 0.35, R * 0.48, R * 0.45, look.hair.color, 0, 0.15); }
  if (look.hair.style === 'long') { ctx.fillStyle = shade(look.hair.color, -0.1); ctx.beginPath(); ctx.ellipse(-R * 0.35, R * 0.3, R * 0.85, R * 1.2, 0.15, 0, 7); ctx.fill(); }

  // ear
  blob(ctx, -R * 0.12, R * 0.08, R * 0.2, R * 0.3, shade(skin, -0.05), 0, 0.1);
  ctx.strokeStyle = shade(skin, -0.4); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-R * 0.1, R * 0.08, R * 0.12, -1.2, 1.4); ctx.stroke();

  // skull + face
  const fg = ctx.createRadialGradient(R * 0.35, -R * 0.35, R * 0.1, 0, 0, R * 1.25);
  fg.addColorStop(0, shade(skin, 0.18)); fg.addColorStop(0.55, skin); fg.addColorStop(1, shade(skin, -0.38));
  ctx.beginPath();
  ctx.moveTo(-R * 0.85, -R * 0.2);
  ctx.bezierCurveTo(-R * 0.9, -R * 1.25, R * 0.75, -R * 1.35, R * 0.9, -R * 0.35); // cranium to brow
  ctx.lineTo(R * 0.93, -R * 0.12); // brow ridge
  ctx.quadraticCurveTo(R * 0.86, -R * 0.02, R * 0.95, R * 0.05); // eye socket dip
  ctx.lineTo(R * 1.18, R * 0.32); // nose tip
  ctx.quadraticCurveTo(R * 1.06, R * 0.42, R * 0.95, R * 0.42); // under nose
  ctx.quadraticCurveTo(R * 1.0, R * 0.55, R * 0.95, R * 0.62); // lips
  ctx.quadraticCurveTo(R * 0.96, R * 0.78, R * 0.86, R * 0.86); // chin
  ctx.quadraticCurveTo(R * 0.7, R * (1.0 + (look.jowl || 0) * 0.15), R * 0.25, R * (0.98 + (look.jowl || 0) * 0.12)); // jaw
  ctx.quadraticCurveTo(-R * 0.35, R * 0.95, -R * 0.62, R * 0.5);
  ctx.quadraticCurveTo(-R * 0.92, R * 0.15, -R * 0.85, -R * 0.2);
  ctx.closePath();
  ctx.fillStyle = fg; ctx.fill();
  ctx.strokeStyle = shade(skin, -0.5); ctx.lineWidth = 1.4; ctx.stroke();

  // facial volume: eye socket shadow, cheekbone highlight, warm cheek, jaw shadow
  ctx.save(); ctx.clip();
  const sock = ctx.createRadialGradient(R * 0.62, -R * 0.08, 1, R * 0.62, -R * 0.08, R * 0.42);
  sock.addColorStop(0, 'rgba(60,25,15,0.22)'); sock.addColorStop(1, 'rgba(60,25,15,0)');
  ctx.fillStyle = sock; ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4);
  const cheek = ctx.createRadialGradient(R * 0.5, R * 0.32, 1, R * 0.5, R * 0.32, R * 0.4);
  cheek.addColorStop(0, 'rgba(220,90,70,0.16)'); cheek.addColorStop(1, 'rgba(220,90,70,0)');
  ctx.fillStyle = cheek; ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4);
  const bone = ctx.createRadialGradient(R * 0.62, R * 0.16, 1, R * 0.62, R * 0.16, R * 0.22);
  bone.addColorStop(0, 'rgba(255,240,220,0.28)'); bone.addColorStop(1, 'rgba(255,240,220,0)');
  ctx.fillStyle = bone; ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4);
  const jaw = ctx.createLinearGradient(0, R * 0.55, -R * 0.2, R * 1.05);
  jaw.addColorStop(0, 'rgba(40,15,10,0)'); jaw.addColorStop(1, 'rgba(40,15,10,0.3)');
  ctx.fillStyle = jaw; ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4);
  const back = ctx.createLinearGradient(-R, 0, R * 0.2, 0);
  back.addColorStop(0, 'rgba(30,10,10,0.32)'); back.addColorStop(1, 'rgba(30,10,10,0)');
  ctx.fillStyle = back; ctx.fillRect(-R * 2, -R * 2, R * 4, R * 4);
  ctx.restore();

  // cheek shading + nasolabial fold
  ctx.strokeStyle = shade(skin, -0.28); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(R * 0.92, R * 0.36); ctx.quadraticCurveTo(R * 0.72, R * 0.5, R * 0.78, R * 0.7); ctx.stroke();
  if (age > 0.4) {
    ctx.strokeStyle = shade(skin, -0.25); ctx.lineWidth = 0.9;
    ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(R * 0.2, -R * (0.55 + i * 0.1)); ctx.quadraticCurveTo(R * 0.5, -R * (0.6 + i * 0.1), R * 0.78, -R * (0.5 + i * 0.1)); } ctx.stroke();
    ctx.beginPath(); ctx.moveTo(R * 0.55, R * 0.05); ctx.lineTo(R * 0.45, R * 0.12); ctx.stroke(); // crow's feet
  }

  // stubble / beard
  if (look.beard === 'stubble' || look.beard === 'full' || look.beard === 'goatee') {
    ctx.save(); ctx.clip();
    ctx.fillStyle = look.beard === 'stubble' ? 'rgba(30,20,15,.28)' : look.hair.beard || look.hair.color;
    ctx.beginPath();
    if (look.beard === 'goatee') ctx.ellipse(R * 0.85, R * 0.78, R * 0.22, R * 0.2, 0, 0, 7);
    else { ctx.moveTo(-R * 0.3, R * 0.2); ctx.quadraticCurveTo(R * 0.4, R * 0.25, R * 1.0, R * 0.48); ctx.lineTo(R * 1.1, R * 1.2); ctx.lineTo(-R * 0.6, R * 1.2); ctx.closePath(); }
    ctx.fill(); ctx.restore();
    if (look.beard === 'full') { ctx.fillStyle = look.hair.beard || look.hair.color; ctx.beginPath(); ctx.ellipse(R * 0.62, R * 0.92, R * 0.42, R * 0.28, 0.2, 0, 7); ctx.fill(); }
  }

  // eyes (near eye + far eye peeking past the nose bridge for a 3/4 look)
  const eyes = opts.eyes || pose.eyes;
  const ex = R * 0.55, ey = -R * 0.04;
  ctx.lineCap = 'round';
  if (eyes === 'shut') {
    ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ex - 6, ey); ctx.quadraticCurveTo(ex, ey + 3, ex + 6, ey - 1); ctx.stroke();
  } else {
    const h = eyes === 'wide' ? 5.5 : eyes === 'angry' ? 3.2 : 4.2;
    ctx.fillStyle = '#f7f2ea';
    ctx.beginPath(); ctx.moveTo(ex - 6.5, ey); ctx.quadraticCurveTo(ex, ey - h * 1.4, ex + 6, ey - 0.5); ctx.quadraticCurveTo(ex, ey + h, ex - 6.5, ey); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.moveTo(ex - 6.5, ey); ctx.quadraticCurveTo(ex, ey - h * 1.4, ex + 6, ey - 0.5); ctx.quadraticCurveTo(ex, ey + h, ex - 6.5, ey); ctx.clip();
    const ig = ctx.createRadialGradient(ex + 2, ey - 0.4, 0.5, ex + 2, ey - 0.4, 3.6);
    ig.addColorStop(0, '#000'); ig.addColorStop(0.35, '#1a0e08'); ig.addColorStop(0.55, look.eyeColor || '#5a3418'); ig.addColorStop(1, '#22140c');
    ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(ex + 2, ey - 0.4, 3.6, 0, 7); ctx.fill();
    // upper-lid shadow on the eyeball
    ctx.fillStyle = 'rgba(40,20,15,0.35)'; ctx.fillRect(ex - 7, ey - h * 1.4, 14, h * 0.7);
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 1, ey - 1.8, 1, 0, 7); ctx.fill();
    // lids and lashes
    ctx.strokeStyle = '#1a0f0a'; ctx.lineWidth = 2.1;
    ctx.beginPath(); ctx.moveTo(ex - 6.5, ey); ctx.quadraticCurveTo(ex, ey - h * 1.4, ex + 6.5, ey - 0.8); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex + 6.5, ey - 0.8); ctx.lineTo(ex + 8.5, ey - 2.2); ctx.stroke();
    ctx.strokeStyle = shade(skin, -0.35); ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(ex - 5.5, ey - h * 1.3 - 2); ctx.quadraticCurveTo(ex, ey - h * 1.9 - 2, ex + 5.5, ey - h * 1.2 - 2); ctx.stroke(); // lid crease
    ctx.beginPath(); ctx.moveTo(ex - 5, ey + 1.2); ctx.quadraticCurveTo(ex, ey + h * 0.9, ex + 5.5, ey + 0.4); ctx.stroke(); // lower lid
    // far eye
    ctx.fillStyle = '#efe7dc'; ctx.beginPath(); ctx.ellipse(R * 1.0, ey - 0.5, 1.8, h * 0.6, 0, 0, 7); ctx.fill();
  }
  // eye bags
  if (age > 0.3) { ctx.strokeStyle = shade(skin, -0.3); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ex - 5, ey + 5); ctx.quadraticCurveTo(ex, ey + 8, ex + 5, ey + 4.5); ctx.stroke(); }
  // brows
  ctx.strokeStyle = look.hair.brow || shade(look.hair.color, -0.1); ctx.lineWidth = 3.2;
  const angry = eyes === 'angry' || opts.angry;
  ctx.beginPath(); ctx.moveTo(ex - 7, ey - 8 - (angry ? -1 : 1)); ctx.quadraticCurveTo(ex, ey - 11, ex + 8, ey - (angry ? 5 : 9)); ctx.stroke();
  ctx.lineCap = 'butt';

  // mouth
  const mo = opts.mouth ?? pose.mouth;
  const mx = R * 0.88, my = R * 0.6;
  if (mo > 0.15) {
    ctx.fillStyle = '#3a0d0d';
    ctx.beginPath(); ctx.ellipse(mx - 2, my, 5, 1.5 + mo * 5, -0.15, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(mx - 6, my - 1.5 - mo * 4, 7, 2);
  } else {
    // lips: upper lip in shadow, fuller lower lip catching light
    const lip = look.lip || shade(skin, -0.22);
    ctx.fillStyle = shade(lip, -0.15);
    ctx.beginPath(); ctx.moveTo(mx - 7, my); ctx.quadraticCurveTo(mx - 3, my - 3.2, mx, my - 2.4); ctx.quadraticCurveTo(mx + 2, my - 3, mx + 3, my - 0.5); ctx.closePath(); ctx.fill();
    const lg = ctx.createLinearGradient(0, my, 0, my + 4); lg.addColorStop(0, lip); lg.addColorStop(1, shade(lip, 0.15));
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(mx - 6.5, my + 0.2); ctx.quadraticCurveTo(mx - 2, my + 4.2, mx + 2.6, my + 0.2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = shade(skin, -0.6); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(mx - 7, my); ctx.quadraticCurveTo(mx - 2, my + (look.smirk ? -1.5 : 0.8), mx + 3, my - (look.smirk ? 2 : 0.3)); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(mx - 2, my + 2, 1.8, 0.7, 0, 0, 7); ctx.fill();
  }

  // moustache
  if (look.moustache) {
    ctx.fillStyle = look.hair.beard || look.hair.color;
    ctx.beginPath();
    const big = look.moustache === 'thick' ? 1.4 : look.moustache === 'handlebar' ? 1.2 : 0.8;
    ctx.moveTo(R * 1.02, R * 0.44);
    ctx.quadraticCurveTo(R * 0.85, R * (0.42 + 0.06 * big), R * 0.55, R * (0.52 + 0.1 * big));
    if (look.moustache === 'handlebar') ctx.quadraticCurveTo(R * 0.45, R * 0.4, R * 0.5, R * 0.34);
    ctx.quadraticCurveTo(R * 0.8, R * 0.38, R * 1.02, R * 0.4);
    ctx.closePath(); ctx.fill();
  }

  // nose highlight
  ctx.strokeStyle = shade(skin, 0.25); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(R * 0.98, R * 0.05); ctx.lineTo(R * 1.1, R * 0.28); ctx.stroke();
  ctx.fillStyle = shade(skin, -0.45); ctx.beginPath(); ctx.ellipse(R * 0.98, R * 0.36, 2, 1.2, 0.4, 0, 7); ctx.fill();

  drawHair(ctx, R, look);

  // glasses
  if (look.glasses) {
    const gx = ex + 1, gy = ey - 0.5;
    ctx.lineWidth = 1.8;
    if (look.glasses === 'shades') {
      ctx.fillStyle = 'rgba(10,10,14,.92)';
      ctx.beginPath(); ctx.ellipse(gx, gy, 9, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(120,160,255,.35)'; ctx.beginPath(); ctx.ellipse(gx + 2, gy - 2, 4, 1.5, -0.3, 0, 7); ctx.fill();
      ctx.strokeStyle = '#111';
    } else {
      ctx.strokeStyle = look.glasses === 'gold' ? '#c9a23a' : '#1b1b1b';
      ctx.fillStyle = 'rgba(200,230,255,.18)';
      ctx.beginPath();
      if (look.glasses === 'round' || look.glasses === 'gold') ctx.arc(gx, gy, 7.5, 0, 7); else ctx.rect(gx - 8, gy - 5.5, 16, 11);
      ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(gx - 8, gy); ctx.lineTo(-R * 0.15, -R * 0.02); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx + 7.5, gy); ctx.lineTo(R * 1.02, gy); ctx.stroke();
  }

  // headwear
  if (look.headwear === 'hardhat') {
    const hg = ctx.createLinearGradient(0, -R * 1.4, 0, -R * 0.3);
    hg.addColorStop(0, '#ffe066'); hg.addColorStop(1, '#d99a00');
    ctx.fillStyle = hg; ctx.strokeStyle = '#8a5d00'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, -R * 0.5, R * 1.02, R * 0.85, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(R * 0.1, -R * 0.48, R * 1.3, R * 0.16, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ffef9e'; ctx.beginPath(); ctx.moveTo(0, -R * 1.33); ctx.lineTo(0, -R * 0.6); ctx.stroke();
  } else if (look.headwear === 'cap') {
    ctx.fillStyle = look.capColor || '#f4f4f4'; ctx.strokeStyle = '#888'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-R * 0.8, -R * 0.55); ctx.lineTo(-R * 0.6, -R * 1.18); ctx.lineTo(R * 0.75, -R * 1.05); ctx.lineTo(R * 0.85, -R * 0.45); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (look.headwear === 'policecap') {
    // peaked uniform cap with badge
    const pc = '#a8955e';
    const cg = ctx.createLinearGradient(0, -R * 1.45, 0, -R * 0.5);
    cg.addColorStop(0, shade(pc, 0.2)); cg.addColorStop(1, shade(pc, -0.25));
    ctx.fillStyle = cg; ctx.strokeStyle = shade(pc, -0.55); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-R * 0.9, -R * 0.6); ctx.quadraticCurveTo(-R * 1.0, -R * 1.45, R * 0.2, -R * 1.42); ctx.quadraticCurveTo(R * 1.05, -R * 1.35, R * 0.95, -R * 0.62); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1b1b1b'; ctx.fillRect(-R * 0.88, -R * 0.72, R * 1.82, R * 0.16);
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(R * 0.95, -R * 0.58, R * 0.55, R * 0.12, 0.12, 0, 7); ctx.fill();
    blob(ctx, R * 0.42, -R * 1.0, R * 0.16, R * 0.18, '#d4af37', 0, 0.6);
  } else if (look.headwear === 'cowboy') {
    const hc = '#7a4a26';
    const cg = ctx.createLinearGradient(0, -R * 1.8, 0, -R * 0.5);
    cg.addColorStop(0, shade(hc, 0.2)); cg.addColorStop(1, shade(hc, -0.3));
    ctx.fillStyle = cg; ctx.strokeStyle = shade(hc, -0.55); ctx.lineWidth = 1.4;
    // brim
    ctx.beginPath(); ctx.ellipse(R * 0.05, -R * 0.62, R * 1.65, R * 0.3, 0.05, 0, 7); ctx.fill(); ctx.stroke();
    // crown with a pinch
    ctx.beginPath(); ctx.moveTo(-R * 0.85, -R * 0.68); ctx.quadraticCurveTo(-R * 0.95, -R * 1.65, -R * 0.2, -R * 1.55); ctx.quadraticCurveTo(0, -R * 1.35, R * 0.25, -R * 1.58); ctx.quadraticCurveTo(R * 0.95, -R * 1.65, R * 0.88, -R * 0.68); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(-R * 0.86, -R * 0.86, R * 1.74, R * 0.16);
  } else if (look.headwear === 'fedora') {
    const hc = '#4a4238';
    const cg = ctx.createLinearGradient(0, -R * 1.6, 0, -R * 0.5);
    cg.addColorStop(0, shade(hc, 0.18)); cg.addColorStop(1, shade(hc, -0.3));
    ctx.fillStyle = cg; ctx.strokeStyle = shade(hc, -0.6); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-R * 1.25, -R * 0.62); ctx.quadraticCurveTo(R * 0.1, -R * 0.82, R * 1.35, -R * 0.48); ctx.quadraticCurveTo(R * 0.1, -R * 0.5, -R * 1.25, -R * 0.62); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-R * 0.82, -R * 0.68); ctx.quadraticCurveTo(-R * 0.85, -R * 1.45, -R * 0.1, -R * 1.42); ctx.lineTo(R * 0.1, -R * 1.3); ctx.quadraticCurveTo(R * 0.85, -R * 1.42, R * 0.85, -R * 0.66); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a1612'; ctx.fillRect(-R * 0.84, -R * 0.84, R * 1.7, R * 0.14);
  } else if (look.headwear === 'bandana') {
    const bc = look.capColor || '#b3121b';
    ctx.fillStyle = bc; ctx.strokeStyle = shade(bc, -0.5); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-R * 0.9, -R * 0.45); ctx.quadraticCurveTo(0, -R * 0.82, R * 0.92, -R * 0.42); ctx.lineTo(R * 0.9, -R * 0.24); ctx.quadraticCurveTo(0, -R * 0.62, -R * 0.88, -R * 0.24); ctx.closePath(); ctx.fill(); ctx.stroke();
    // knot tails at the back
    ctx.beginPath(); ctx.moveTo(-R * 0.88, -R * 0.36); ctx.lineTo(-R * 1.45, -R * 0.1); ctx.lineTo(-R * 1.3, R * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-R * 0.88, -R * 0.3); ctx.lineTo(-R * 1.25, R * 0.25); ctx.lineTo(-R * 1.08, R * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

function drawHair(ctx, R, look) {
  const h = look.hair, c = h.color;
  const hg = ctx.createLinearGradient(0, -R * 1.3, 0, R * 0.2);
  hg.addColorStop(0, shade(c, 0.22)); hg.addColorStop(0.6, c); hg.addColorStop(1, shade(c, -0.3));
  ctx.fillStyle = hg; ctx.strokeStyle = shade(c, -0.45); ctx.lineWidth = 1.2;
  ctx.beginPath();
  switch (h.style) {
    case 'baldSides': // shiny scalp, hair only around the sides/back
      ctx.moveTo(-R * 0.88, -R * 0.15); ctx.quadraticCurveTo(-R * 0.95, -R * 0.7, -R * 0.55, -R * 0.82);
      ctx.quadraticCurveTo(-R * 0.4, -R * 0.4, -R * 0.2, -R * 0.25); ctx.quadraticCurveTo(-R * 0.45, R * 0.15, -R * 0.62, R * 0.45); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(R * 0.15, -R * 0.95, R * 0.35, R * 0.12, -0.2, 0, 7); ctx.fill();
      ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(R * 0.25, -R * 0.55); ctx.quadraticCurveTo(R * 0.15, -R * 0.25, R * 0.28, -R * 0.15); ctx.lineTo(R * 0.12, -R * 0.2); ctx.closePath(); ctx.fill();
      return;
    case 'sidePart':
      ctx.moveTo(-R * 0.86, R * 0.25); ctx.quadraticCurveTo(-R * 1.05, -R * 1.0, R * 0.1, -R * 1.2);
      ctx.quadraticCurveTo(R * 0.85, -R * 1.15, R * 0.95, -R * 0.45); ctx.quadraticCurveTo(R * 0.55, -R * 0.75, R * 0.05, -R * 0.68);
      ctx.quadraticCurveTo(-R * 0.25, -R * 0.4, -R * 0.2, -R * 0.15); ctx.quadraticCurveTo(-R * 0.5, R * 0.1, -R * 0.55, R * 0.4); ctx.closePath();
      break;
    case 'slick':
      ctx.moveTo(-R * 0.86, R * 0.2); ctx.quadraticCurveTo(-R * 1.0, -R * 1.05, R * 0.2, -R * 1.18);
      ctx.quadraticCurveTo(R * 0.8, -R * 1.1, R * 0.88, -R * 0.55); ctx.quadraticCurveTo(R * 0.4, -R * 0.85, -R * 0.1, -R * 0.6);
      ctx.quadraticCurveTo(-R * 0.2, -R * 0.2, -R * 0.15, -R * 0.12); ctx.quadraticCurveTo(-R * 0.55, R * 0.1, -R * 0.6, R * 0.35); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i < 3; i++) { ctx.moveTo(-R * 0.7 + i * 5, -R * 0.6 - i * 3); ctx.quadraticCurveTo(0, -R * (1.05 - i * 0.08), R * 0.6, -R * (0.95 - i * 0.12)); } ctx.stroke();
      return;
    case 'quiff':
      ctx.moveTo(-R * 0.86, R * 0.25); ctx.quadraticCurveTo(-R * 1.1, -R * 1.1, R * 0.1, -R * 1.45);
      ctx.quadraticCurveTo(R * 1.05, -R * 1.55, R * 1.0, -R * 0.65); ctx.quadraticCurveTo(R * 0.6, -R * 0.8, R * 0.15, -R * 0.7);
      ctx.quadraticCurveTo(-R * 0.2, -R * 0.35, -R * 0.2, -R * 0.15); ctx.quadraticCurveTo(-R * 0.5, R * 0.1, -R * 0.55, R * 0.45); ctx.closePath();
      break;
    case 'bun': case 'long':
      ctx.moveTo(-R * 0.9, R * 0.35); ctx.quadraticCurveTo(-R * 1.05, -R * 1.05, R * 0.15, -R * 1.18);
      ctx.quadraticCurveTo(R * 0.9, -R * 1.1, R * 0.95, -R * 0.35); ctx.quadraticCurveTo(R * 0.55, -R * 0.82, -R * 0.05, -R * 0.75);
      ctx.quadraticCurveTo(-R * 0.3, -R * 0.35, -R * 0.25, -R * 0.1); ctx.quadraticCurveTo(-R * 0.5, R * 0.15, -R * 0.55, R * 0.45); ctx.closePath();
      ctx.fill(); ctx.stroke();
      if (look.bindi) { ctx.fillStyle = '#c0141b'; ctx.beginPath(); ctx.arc(R * 0.86, -R * 0.33, 2.2, 0, 7); ctx.fill(); }
      ctx.strokeStyle = shade(c, 0.3); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-R * 0.2, -R * 0.9); ctx.quadraticCurveTo(R * 0.3, -R * 1.05, R * 0.75, -R * 0.75); ctx.stroke();
      return;
    case 'silver':
      ctx.moveTo(-R * 0.86, R * 0.2); ctx.quadraticCurveTo(-R * 1.08, -R * 1.15, R * 0.25, -R * 1.22);
      ctx.quadraticCurveTo(R * 0.95, -R * 1.15, R * 0.9, -R * 0.55); ctx.lineTo(R * 0.6, -R * 0.75); ctx.lineTo(R * 0.35, -R * 0.62);
      ctx.quadraticCurveTo(-R * 0.15, -R * 0.4, -R * 0.15, -R * 0.15); ctx.quadraticCurveTo(-R * 0.5, R * 0.05, -R * 0.6, R * 0.4); ctx.closePath();
      break;
    case 'short': default:
      ctx.moveTo(-R * 0.86, R * 0.15); ctx.quadraticCurveTo(-R * 1.0, -R * 1.05, R * 0.2, -R * 1.15);
      ctx.quadraticCurveTo(R * 0.85, -R * 1.05, R * 0.88, -R * 0.5); ctx.quadraticCurveTo(R * 0.4, -R * 0.72, -R * 0.1, -R * 0.62);
      ctx.quadraticCurveTo(-R * 0.25, -R * 0.3, -R * 0.2, -R * 0.12); ctx.quadraticCurveTo(-R * 0.5, R * 0.05, -R * 0.6, R * 0.35); ctx.closePath();
  }
  ctx.fill(); ctx.stroke();
  hairStrands(ctx, R, c);
}

// Individual strands and a sheen band, clipped to the current hair shape.
function hairStrands(ctx, R, c) {
  ctx.save(); ctx.clip();
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    ctx.strokeStyle = i % 4 ? shade(c, -0.3) : shade(c, 0.2);
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(-R * 0.9 + t * R * 0.4, R * 0.3 - t * R * 0.2);
    ctx.quadraticCurveTo(-R * 0.6 + t * R * 0.9, -R * 1.25 + t * 0.2 * R, R * 0.95, -R * 0.75 + t * R * 0.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.18;
  const sh = ctx.createLinearGradient(-R * 0.3, -R * 1.2, R * 0.3, -R * 0.6);
  sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.7)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; ctx.fillRect(-R * 1.2, -R * 1.5, R * 2.4, R * 1.2);
  ctx.restore();
}

// ---------- public draw ----------
/**
 * Draw a fighter.
 * @param look  appearance data
 * @param pose  pose object
 * @param x,y   world position of the feet
 * @param facing 1 = right, -1 = left
 * @param opts  { scale, flash, alpha, tint, eyes, mouth }
 */
// ---------- lighting pipeline ----------
// Each fighter is rendered on its own high-resolution layer, then lit:
// a warm key light from the upper front, ground occlusion near the feet,
// and a coloured rim light along the back edge. That gives the flat vector
// shapes a solid, three-dimensional read.
let RES = 1.5;
export function setRenderScale(r) { RES = r; }
// 2 = full lighting with rim light, 1 = lighting without rim, 0 = flat shading only.
let QUALITY = 2;
export function setQuality(q) { QUALITY = q; }
export function getQuality() { return QUALITY; }
const layers = {};
function layer(name, w, h) {
  let c = layers[name];
  if (!c) c = layers[name] = document.createElement('canvas');
  if (c.width < w || c.height < h) { c.width = w; c.height = h; }
  return c;
}

export function drawFighter(ctx, look, pose, x, y, facing, opts = {}) {
  if (opts.raw || (QUALITY === 0 && !(opts.flash > 0.01))) return drawFighterRaw(ctx, look, pose, x, y, facing, opts);
  const sc = opts.scale || 1;
  // Keep the layer just big enough for the body: lighting cost scales with its area.
  const wideU = pose.rot ? 560 : 400, tallU = 370 * (look.height || 1);
  const LW = Math.ceil(wideU * sc * RES), LH = Math.ceil(tallU * sc * RES);
  const L = layer('main', LW, LH), fc = L.getContext('2d');
  fc.setTransform(1, 0, 0, 1, 0, 0);
  fc.globalCompositeOperation = 'source-over'; fc.globalAlpha = 1;
  fc.clearRect(0, 0, LW, LH);
  const ox = (wideU / 2) * sc, oy = (tallU - 34) * sc; // feet position inside the layer (unscaled units)
  fc.setTransform(RES, 0, 0, RES, 0, 0);
  drawFighterRaw(fc, look, pose, ox, oy, facing, { ...opts, alpha: 1 });
  fc.setTransform(1, 0, 0, 1, 0, 0);
  const top = (oy - 260 * sc * (look.height || 1)) * RES, feet = oy * RES;

  // key light + ground occlusion
  fc.globalCompositeOperation = 'source-atop';
  const vg = fc.createLinearGradient(0, top, 0, feet);
  vg.addColorStop(0, 'rgba(255,236,205,0.16)');
  vg.addColorStop(0.45, 'rgba(255,236,205,0)');
  vg.addColorStop(0.8, 'rgba(10,5,20,0.10)');
  vg.addColorStop(1, 'rgba(10,5,20,0.38)');
  fc.fillStyle = vg; fc.fillRect(0, 0, LW, LH);
  const cx = ox * RES;
  const hg = fc.createLinearGradient(cx - 90 * sc * RES * facing, 0, cx + 90 * sc * RES * facing, 0);
  hg.addColorStop(0, 'rgba(0,0,10,0.22)'); hg.addColorStop(0.55, 'rgba(0,0,0,0)'); hg.addColorStop(1, 'rgba(255,245,225,0.10)');
  fc.fillStyle = hg; fc.fillRect(0, 0, LW, LH);

  // rim light: silhouette minus a shifted silhouette leaves a thin edge
  if (opts.rim !== false && QUALITY >= 2) {
    const R = layer('rim', LW, LH), rc = R.getContext('2d');
    rc.setTransform(1, 0, 0, 1, 0, 0);
    rc.globalCompositeOperation = 'source-over'; rc.clearRect(0, 0, LW, LH);
    rc.drawImage(L, 0, 0, LW, LH, 0, 0, LW, LH);
    rc.globalCompositeOperation = 'source-in';
    rc.fillStyle = opts.rimColor || 'rgba(255,214,150,0.85)'; rc.fillRect(0, 0, LW, LH);
    rc.globalCompositeOperation = 'destination-out';
    const sh = 2.4 * RES * Math.min(1, sc);
    rc.drawImage(L, 0, 0, LW, LH, sh * facing, -sh * 0.6, LW, LH);
    fc.globalCompositeOperation = 'source-atop';
    fc.globalAlpha = 0.6;
    fc.drawImage(R, 0, 0, LW, LH, 0, 0, LW, LH);
    fc.globalAlpha = 1;
  }
  if (opts.flash > 0.01) {
    fc.globalCompositeOperation = 'source-atop';
    fc.globalAlpha = Math.min(1, opts.flash);
    fc.fillStyle = opts.flashColor || '#fff';
    fc.fillRect(0, 0, LW, LH);
    fc.globalAlpha = 1;
  }
  fc.globalCompositeOperation = 'source-over';
  ctx.save();
  if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
  ctx.drawImage(L, 0, 0, LW, LH, x - ox, y - oy, LW / RES, LH / RES);
  ctx.restore();
  return null;
}

function drawFighterRaw(ctx, look, pose, x, y, facing, opts = {}) {
  const S = skeleton(pose, look);
  ctx.save();
  ctx.translate(x, y);
  const sc = opts.scale || 1;
  ctx.scale(facing * sc, sc);
  if (pose.rot) { ctx.translate(0, -pose.lift); ctx.rotate(pose.rot); }
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;

  drawArm(ctx, S, false, look, pose);
  drawLeg(ctx, S, false, look, pose);
  drawLeg(ctx, S, true, look, pose);
  drawTorso(ctx, S, look, pose);
  drawHead(ctx, S, look, pose, opts);
  drawArm(ctx, S, true, look, pose);
  ctx.restore();
  return S;
}

// Bust portrait for select screen & super cut-ins.
export function drawPortrait(ctx, look, cx, cy, size, opts = {}) {
  const pose = opts.pose || mkPose({ lean: 0.02, head: 0.05, uaF: 0.15, faF: 0.4, uaB: 0.1, faB: 0.3, mouth: opts.mouth || 0, eyes: opts.eyes || 'open', prop: 0 });
  const s = size / 140;
  drawFighter(ctx, look, pose, cx, cy + 205 * s * (look.height || 1), opts.facing || 1, { scale: s * 1.0, eyes: opts.eyes, mouth: opts.mouth });
}
