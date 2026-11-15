// A single combatant: movement, state machine, normals, specials and pose
// selection. Supers are orchestrated by the Fight (they need the whole stage).
import { POSES, lerpPose, idlePose, walkPose, mkPose } from './rig.js';
import { GROUND, W } from './stages.js';
import { audio } from './audio.js';

export const GRAV = 0.85;
export const SPECIAL_COOLDOWN = 180; // 3 seconds per special
const ease = (t) => 1 - (1 - t) * (1 - t);

// Normal moves. box = [x0, x1, y0, y1]: forward distance from the fighter's
// centre and height above their feet.
export const NORMALS = {
  jab: { name: 'jab', pose: 'jab', wind: 'jabWind', s: 4, a: 3, r: 8, dmg: 38, box: [15, 98, 128, 178], lvl: 'high', hs: 13, bs: 9, kb: 3, chain: { P: 'jab2', K: 'kick1' } },
  jab2: { name: 'jab2', pose: 'cross', wind: 'crossWind', s: 5, a: 3, r: 10, dmg: 44, box: [15, 110, 122, 178], lvl: 'high', hs: 15, bs: 10, kb: 3.5, chain: { P: 'cross', K: 'kickKD' } },
  cross: { name: 'cross', pose: 'uppercut', wind: 'jabWind', s: 6, a: 4, r: 18, dmg: 70, box: [5, 92, 140, 240], lvl: 'high', hs: 22, bs: 12, kb: 7, kd: true, heavy: true },
  kick: { name: 'kick', pose: 'kick', wind: 'kickWind', s: 7, a: 4, r: 14, dmg: 58, box: [30, 142, 82, 140], lvl: 'mid', hs: 16, bs: 11, kb: 5, chain: { K: 'highKick' } },
  kick1: { name: 'kick1', pose: 'kick', wind: 'kickWind', s: 6, a: 4, r: 14, dmg: 55, box: [30, 142, 82, 140], lvl: 'mid', hs: 16, bs: 11, kb: 4, chain: { K: 'highKick' } },
  kickKD: { name: 'kickKD', pose: 'kick', wind: 'kickWind', s: 6, a: 4, r: 18, dmg: 66, box: [30, 145, 82, 140], lvl: 'mid', hs: 18, bs: 12, kb: 7, kd: true, heavy: true },
  highKick: { name: 'highKick', pose: 'highKick', wind: 'kickWind', s: 7, a: 4, r: 18, dmg: 72, box: [30, 140, 140, 215], lvl: 'high', hs: 20, bs: 12, kb: 7, kd: true, heavy: true },
  sweep: { name: 'sweep', pose: 'sweep', wind: 'crouch', s: 8, a: 4, r: 20, dmg: 62, box: [20, 168, 0, 40], lvl: 'low', hs: 18, bs: 12, kb: 4, kd: true, crouch: true },
  jP: { name: 'jP', pose: 'jumpPunch', wind: 'jump', s: 4, a: 7, r: 4, dmg: 52, box: [5, 88, 10, 95], lvl: 'overhead', air: true, hs: 15, bs: 10, kb: 3 },
  jK: { name: 'jK', pose: 'jumpKick', wind: 'jump', s: 5, a: 8, r: 4, dmg: 62, box: [20, 118, 15, 85], lvl: 'overhead', air: true, hs: 17, bs: 11, kb: 4 },
  grab: { name: 'grab', pose: 'grab', wind: 'stance', s: 4, a: 3, r: 22, box: [0, 78, 60, 200], grab: true },
};

// Turn a roster special description into a move definition.
function buildSpecial(spec, slot) {
  const base = { name: spec.name, special: true, slot, spec, dmg: spec.dmg, chip: 0.15, hs: 20, bs: 14, kb: 6, lvl: spec.low ? 'low' : 'mid' };
  switch (spec.kind) {
    case 'projectile':
      return { ...base, pose: spec.arc ? 'overhand' : 'cast', wind: spec.arc ? 'overWind' : 'castWind', s: spec.startup, a: 2, r: spec.recovery, spawn: true };
    case 'rush':
      return { ...base, pose: spec.pose || 'dash', wind: 'stance', s: spec.startup, a: spec.frames, r: spec.recovery, box: spec.low ? [0, 110, 0, 60] : [0, 95, 40, 190], rush: spec.speed, armor: spec.armor, kd: true, lvl: spec.low ? 'low' : 'mid' };
    case 'uppercut':
      return { ...base, pose: 'uppercut', wind: 'crouch', s: spec.startup, a: 9, r: spec.recovery, box: [0, 85, 90, 270], lvl: 'high', kd: true, rise: true, invuln: spec.startup + 5 };
    case 'whip':
      return { ...base, pose: 'cast', wind: 'castWind', s: spec.startup, a: 5, r: spec.recovery, box: [30, spec.reach, 112, 170], whip: spec.color || '#f6e6bd', kb: 7 };
    case 'teleport':
      return { ...base, pose: 'cross', wind: 'stance', s: spec.startup, a: 4, r: spec.recovery, box: [10, 105, 110, 200], teleport: true, kd: true, lvl: 'high' };
    case 'counter':
      return { ...base, pose: 'namaste', wind: 'stance', s: 2, a: spec.window, r: spec.recovery, counter: true };
    case 'overhead':
      return { ...base, pose: 'overhand', wind: 'overWind', s: spec.startup, a: 4, r: spec.recovery, box: [15, 115, 0, 200], lvl: 'overhead', stamp: true, kd: true };
  }
  return base;
}

export class Fighter {
  constructor(char, look, side, pad) {
    this.char = char;
    this.look = look;
    this.side = side;
    this.pad = pad;
    this.maxHp = char.stats.health;
    this.specials = {};
    for (const [slot, spec] of Object.entries(char.specials)) this.specials[slot] = buildSpecial(spec, slot);
    this.reset(true);
  }

  reset(full) {
    this.x = this.side === 0 ? 400 : 880;
    this.y = GROUND;
    this.vx = 0; this.vy = 0;
    this.facing = this.side === 0 ? 1 : -1;
    this.hp = this.maxHp;
    this.ghostHp = this.maxHp;
    if (full) { this.meter = 0; this.wins = 0; }
    this.state = 'idle'; this.t = 0; this.stateT = 0;
    this.move = null; this.moveT = 0; this.hasHit = false;
    this.combo = 0; this.flash = 0; this.invuln = 0; this.stun = 0;
    this.walkPhase = 0; this.alpha = 1; this.bubble = null;
    this.armorUsed = false; this.lastPose = POSES.stance;
    this.poseOverride = null;
    this.cool = { fwdP: 0, fwdK: 0, downP: 0 };
  }

  get grounded() { return this.y >= GROUND - 0.01; }
  get k() { return this.look.height || 1; }
  get crouching() { return this.state === 'crouch' || (this.state === 'blockstun' && this.blockLow) || (this.state === 'attack' && this.move?.crouch); }

  hurtbox() {
    if (['down', 'getup'].includes(this.state) || this.invuln > 0 || this.alpha < 0.5) return null;
    const b = (this.look.build || 1);
    if (this.state === 'knockdown') return [this.x - 40, this.x + 40, this.y - 90, this.y];
    if (this.crouching) return [this.x - 34 * b, this.x + 34 * b, this.y - 140 * this.k, this.y];
    if (!this.grounded) return [this.x - 28 * b, this.x + 28 * b, this.y - 200 * this.k, this.y - 15];
    return [this.x - 29 * b, this.x + 29 * b, this.y - 222 * this.k, this.y];
  }

  // world-space rectangle for a move box
  worldBox(box) {
    const [x0, x1, y0, y1] = box;
    const k = this.k;
    const xa = this.facing > 0 ? this.x + x0 : this.x - x1;
    const xb = this.facing > 0 ? this.x + x1 : this.x - x0;
    return [xa, xb, this.y - y1 * k, this.y - y0 * k];
  }

  input() {
    const p = this.pad;
    const fwd = this.facing > 0 ? p.held.right : p.held.left;
    const back = this.facing > 0 ? p.held.left : p.held.right;
    return { p, fwd, back, up: p.held.up, down: p.held.down };
  }

  canAct() { return ['idle', 'walk', 'crouch'].includes(this.state); }
  isBlocking(attackerX) {
    if (!this.grounded) return false;
    if (!['idle', 'walk', 'crouch', 'blockstun'].includes(this.state)) return false;
    const awayRight = attackerX < this.x; // attacker on the left -> back is right
    const p = this.pad.held;
    return awayRight ? p.right : p.left;
  }

  setState(s) { this.state = s; this.stateT = 0; }

  // Specials need a proper motion input and are on a cooldown, so they are
  // earned rather than spammed. ↓↘→ + P / K, and ↓↙← + P.
  trySpecial(btn) {
    const p = this.pad;
    let slot = null;
    if (btn === 'P' && this.specials.downP && p.qcb(this.facing)) slot = 'downP';
    else if (p.qcf(this.facing)) slot = btn === 'P' ? 'fwdP' : 'fwdK';
    if (!slot || !this.specials[slot]) return null;
    if (this.cool[slot] > 0) { this.fight?.popup(this, 'COOLDOWN'); return null; }
    this.cool[slot] = SPECIAL_COOLDOWN;
    p.hist.length = 0;
    return this.specials[slot];
  }

  startMove(def) {
    this.move = def; this.moveT = 0; this.hasHit = false; this.armorUsed = false;
    this.setState('attack');
    if (def.invuln) this.invuln = def.invuln;
    if (def.special) this.fight?.popup(this, def.name);
    if (!def.grab) audio.play('whoosh');
  }

  // Called every simulation frame by the Fight.
  update(fight, opp) {
    this.fight = fight;
    this.t++; this.stateT++;
    if (this.flash > 0) this.flash -= 0.12;
    if (this.invuln > 0) this.invuln--;
    for (const k in this.cool) if (this.cool[k] > 0) this.cool[k]--;
    if (this.bubble && --this.bubble.t <= 0) this.bubble = null;
    const inp = this.input();
    const { p } = inp;

    // face the opponent whenever neutral on the ground
    if (this.grounded && ['idle', 'walk', 'crouch'].includes(this.state)) this.facing = opp.x >= this.x ? 1 : -1;

    switch (this.state) {
      case 'idle': case 'walk': case 'crouch': this.neutral(fight, opp, inp); break;
      case 'jump': this.airborne(fight, opp, inp); break;
      case 'attack': this.attacking(fight, opp, inp); break;
      case 'hitstun': case 'blockstun':
        this.vx *= 0.82;
        if (this.stateT >= this.stun) this.setState(this.state === 'blockstun' && this.blockLow ? 'crouch' : 'idle');
        break;
      case 'dizzy':
        this.vx *= 0.8;
        if (this.stateT >= this.stun) this.setState('idle');
        if (this.stateT % 20 === 0) fight.fx.stars(this);
        break;
      case 'bound':
        this.vx = 0;
        if (this.stateT >= this.stun) this.setState('idle');
        break;
      case 'knockdown':
        if (this.grounded && this.vy >= 0 && this.stateT > 3) {
          this.setState('down'); this.vx = 0; fight.fx.dust(this.x, GROUND, 18); audio.play('land'); fight.shake(6);
        }
        break;
      case 'down':
        if (this.stateT >= (this.hp <= 0 ? 99999 : 38)) { this.setState('getup'); this.invuln = 24; }
        break;
      case 'getup':
        if (this.stateT >= 18) this.setState('idle');
        break;
      case 'grabbed': case 'throwing': case 'super': case 'win': case 'lose': case 'intro': case 'pothole':
        break;
    }

    // physics
    if (!['grabbed', 'bound', 'pothole'].includes(this.state)) {
      this.x += this.vx;
      if (!this.grounded || this.vy < 0) { this.vy += GRAV; this.y += this.vy; }
      if (this.y > GROUND) {
        this.y = GROUND;
        const wasAir = this.vy > 2;
        this.vy = 0;
        if (this.state === 'jump' || (this.state === 'attack' && this.move?.air)) { this.setState('idle'); this.move = null; this.vx = 0; if (wasAir) { audio.play('land'); fight.fx.dust(this.x, GROUND, 6); } }
        if (this.state === 'attack' && this.move?.rise && this.moveT > this.move.s + 2) { /* landing from uppercut handled in attacking */ }
      }
    }
    this.x = Math.max(45, Math.min(W - 45, this.x));
    if (this.ghostHp > this.hp) this.ghostHp = Math.max(this.hp, this.ghostHp - 6);
  }

  neutral(fight, opp, inp) {
    const { p, fwd, back, up, down } = inp;
    const spd = this.char.stats.speed;
    // super
    if (p.pressed('super') && this.meter >= 1000) { p.consume('super'); fight.startSuper(this, opp); return; }
    if (p.pressed('grab') || (p.held.punch && p.held.kick && (p.pressed('punch') || p.pressed('kick')))) {
      p.consume('grab'); p.consume('punch'); p.consume('kick');
      this.startMove(NORMALS.grab); return;
    }
    if (p.pressed('punch')) {
      p.consume('punch');
      const sp = this.trySpecial('P');
      if (sp) return this.startMove(sp);
      return this.startMove(NORMALS.jab);
    }
    if (p.pressed('kick')) {
      p.consume('kick');
      const sp = this.trySpecial('K');
      if (sp) return this.startMove(sp);
      if (down) return this.startMove(NORMALS.sweep);
      return this.startMove(NORMALS.kick);
    }
    if (up && this.grounded) {
      p.consume('up');
      this.vy = -18.5; this.vx = (fwd ? 4.8 : back ? -4.2 : 0) * this.facing * spd;
      this.setState('jump'); audio.play('jump'); return;
    }
    if (down) { this.vx = 0; if (this.state !== 'crouch') this.setState('crouch'); return; }
    if (fwd || back) {
      this.vx = (fwd ? 4.4 : -3.4) * this.facing * spd;
      this.walkPhase += (fwd ? 0.17 : -0.15) * spd;
      if (this.state !== 'walk') this.setState('walk');
      this.walkBack = back;
    } else {
      this.vx = 0;
      if (this.state !== 'idle') this.setState('idle');
    }
  }

  airborne(fight, opp, inp) {
    const { p } = inp;
    if (p.pressed('punch')) { p.consume('punch'); this.startMove(NORMALS.jP); }
    else if (p.pressed('kick')) { p.consume('kick'); this.startMove(NORMALS.jK); }
  }

  attacking(fight, opp, inp) {
    const m = this.move; const { p, fwd, down } = inp;
    this.moveT++;
    const t = this.moveT;
    const activeStart = m.s, activeEnd = m.s + m.a;
    if (!m.air && !m.rise && !m.rush && this.grounded) this.vx *= 0.7;

    // special behaviours
    if (m.rush && t >= activeStart && t < activeEnd) this.vx = m.rush * this.facing * this.char.stats.speed;
    if (m.rush && t === activeEnd) this.vx = 0;
    if (m.rise && t === activeStart) { this.vy = -12.5; this.vx = 2.5 * this.facing; }
    if (m.spawn && t === activeStart) fight.spawnProjectile(this, m.spec);
    if (m.teleport) {
      if (t === 2) { this.alpha = 0.15; fight.fx.smoke(this.x, this.y - 100); }
      if (t === m.s - 4) {
        const behind = opp.x - opp.facing * 95;
        this.x = Math.max(60, Math.min(W - 60, behind));
        this.facing = opp.x >= this.x ? 1 : -1;
        this.alpha = 1; fight.fx.smoke(this.x, this.y - 100);
      }
    }
    if (m.whip && t >= activeStart && t < activeEnd + 3) fight.fx.whip(this, m);

    if (t >= activeStart && t < activeEnd && !this.hasHit) {
      if (m.grab) fight.tryGrab(this, opp);
      else if (m.box) fight.tryHit(this, opp, m);
    }

    // chains & special cancels (on hit or block)
    if (this.hasHit && t >= activeStart && !m.special) {
      if (p.pressed('punch')) {
        const sp = this.trySpecial('P');
        if (sp) { p.consume('punch'); return this.startMove(sp); }
        if (m.chain?.P) { p.consume('punch'); return this.startMove(NORMALS[m.chain.P]); }
      }
      if (p.pressed('kick')) {
        const sp = this.trySpecial('K');
        if (sp) { p.consume('kick'); return this.startMove(sp); }
        if (m.chain?.K) { p.consume('kick'); return this.startMove(NORMALS[m.chain.K]); }
      }
      if (p.pressed('super') && this.meter >= 1000) { p.consume('super'); fight.startSuper(this, opp); return; }
    }

    if (m.air) return; // ends on landing
    const total = m.s + m.a + m.r;
    if (t >= total && this.grounded) {
      this.alpha = 1;
      this.move = null;
      this.setState(m.crouch && down ? 'crouch' : 'idle');
    }
  }

  // ---------- pose ----------
  pose() {
    if (this.poseOverride) return this.poseOverride;
    const s = this.state;
    const crouchBase = POSES.crouch;
    switch (s) {
      case 'idle': return idlePose(this.t);
      case 'walk': return walkPose(this.walkPhase, this.walkBack);
      case 'crouch': return lerpPose(POSES.stance, crouchBase, Math.min(1, this.stateT / 4));
      case 'jump': {
        const tuck = Math.min(1, this.stateT / 8);
        return lerpPose(POSES.stance, POSES.jump, tuck * (this.vy < 6 ? 1 : 0.6));
      }
      case 'attack': {
        const m = this.move, t = this.moveT;
        const base = m.air ? POSES.jump : m.crouch ? crouchBase : POSES.stance;
        const wind = POSES[m.wind] || base, act = POSES[m.pose] || base;
        if (m.counter) return lerpPose(POSES.namaste, mkPose({ ...POSES.namaste, eyes: 'angry' }), Math.sin(t * 0.3) * 0.5 + 0.5);
        if (t < m.s) return lerpPose(base, wind, ease(t / Math.max(1, m.s)));
        if (t < m.s + m.a) return lerpPose(wind, act, Math.min(1, (t - m.s + 1) / 2));
        return lerpPose(act, base, ease(Math.min(1, (t - m.s - m.a) / Math.max(1, m.r))));
      }
      case 'hitstun': return this.blockLow ? POSES.hurtLow : lerpPose(POSES.hurt, POSES.stance, Math.max(0, (this.stateT - this.stun * 0.6) / (this.stun * 0.4)));
      case 'blockstun': return this.blockLow ? POSES.crouchBlock : POSES.block;
      case 'knockdown': return POSES.fall;
      case 'down': return POSES.down;
      case 'getup': return lerpPose(POSES.down, POSES.crouch, Math.min(1, this.stateT / 14));
      case 'grabbed': case 'bound': return mkPose({ ...POSES.hurt, lean: -0.2 + Math.sin(this.t * 0.6) * 0.08 });
      case 'throwing': return this.stateT < 16 ? POSES.grab : POSES.throw;
      case 'dizzy': return mkPose({ ...POSES.dizzy, head: 0.5 + Math.sin(this.t * 0.15) * 0.25, lean: 0.25 + Math.sin(this.t * 0.1) * 0.1 });
      case 'super': return this.superPose || POSES.speech;
      case 'win': {
        const wv = Math.sin(this.stateT * 0.12);
        if (this.char.id === 'bhashan' || this.char.id === 'manifesto') return mkPose({ ...POSES.namaste, head: -0.1 + wv * 0.05, mouth: 0.1 });
        if (this.char.id === 'yuva') return mkPose({ ...POSES.wave, faF: 3.1 + wv * 0.3 });
        if (this.char.id === 'highcommand') return mkPose({ ...POSES.stance, uaF: 0.2, faF: 0.4, uaB: 0.15, faB: 0.3, lean: -0.05, head: 0.15, eyes: 'open', mouth: 0 });
        return mkPose({ ...POSES.win, uaF: 2.75 + wv * 0.15, uaB: 2.55 - wv * 0.15 });
      }
      case 'lose': return this.hp <= 0 ? POSES.down : POSES.dizzy;
      case 'intro': return this.stateT % 120 < 60 ? POSES.speech : POSES.point;
      case 'pothole': return mkPose({ ...POSES.hurt, uaF: 2.8, faF: 3.0, uaB: 2.6, faB: 2.9 });
    }
    return POSES.stance;
  }

  say(text, frames = 150) { this.bubble = { text, t: frames, max: frames }; }
}
