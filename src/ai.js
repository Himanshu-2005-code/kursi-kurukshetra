// CPU opponent. It reads a slightly delayed view of the opponent (its
// "reaction time") and outputs virtual button presses, exactly like a player.

const LEVELS = {
  easy: { react: 24, block: 0.15, aggro: 0.35, special: 0.12, combo: 0.25, anti: 0.1, superP: 0.3, idle: 0.35 },
  normal: { react: 13, block: 0.5, aggro: 0.55, special: 0.25, combo: 0.6, anti: 0.4, superP: 0.7, idle: 0.15 },
  hard: { react: 6, block: 0.82, aggro: 0.7, special: 0.35, combo: 0.92, anti: 0.75, superP: 1, idle: 0.04 },
};
const BLANK = () => ({ left: false, right: false, up: false, down: false, punch: false, kick: false, grab: false, super: false });

export class CPU {
  constructor(level = 'normal') {
    this.L = LEVELS[level] || LEVELS.normal;
    this.queue = [];
    this.out = BLANK();
    this.hist = [];
    this.wait = 0;
  }

  dirKeys(me, which) {
    const fwd = me.facing > 0 ? 'right' : 'left', back = me.facing > 0 ? 'left' : 'right';
    const k = {};
    if (which.includes('f')) k[fwd] = true;
    if (which.includes('b')) k[back] = true;
    if (which.includes('d')) k.down = true;
    if (which.includes('u')) k.up = true;
    return k;
  }
  press(me, dir, btn, gap = 1) {
    const d = this.dirKeys(me, dir);
    this.queue.push({ k: { ...d }, f: 1 }, { k: { ...d, [btn]: true }, f: 2 }, { k: { ...d }, f: gap });
  }
  hold(me, dir, f) { this.queue.push({ k: this.dirKeys(me, dir), f }); }
  // Specials need the same motion inputs a human must do.
  qcf(me, btn, gap = 10) {
    this.queue.push({ k: this.dirKeys(me, 'd'), f: 3 }, { k: this.dirKeys(me, 'df'), f: 2 }, { k: this.dirKeys(me, 'f'), f: 2 }, { k: { ...this.dirKeys(me, 'f'), [btn]: true }, f: 2 }, { k: {}, f: gap });
  }
  dd(me, gap = 10) {
    this.queue.push({ k: this.dirKeys(me, 'd'), f: 3 }, { k: this.dirKeys(me, 'db'), f: 2 }, { k: this.dirKeys(me, 'b'), f: 2 }, { k: { ...this.dirKeys(me, 'b'), punch: true }, f: 2 }, { k: {}, f: gap });
  }
  ready(me, slot) { return me.specials[slot] && me.cool[slot] <= 0; }

  think(fight, me, opp) {
    const out = BLANK();
    this.out = out;
    this.hist.push({ x: opp.x, y: opp.y, state: opp.state, move: opp.move, vy: opp.vy, grounded: opp.grounded, stateT: opp.stateT });
    if (this.hist.length > 40) this.hist.shift();
    if (fight.phase !== 'fight') { this.queue = []; return; }
    const L = this.L;
    const seen = this.hist[Math.max(0, this.hist.length - 1 - L.react)];

    // keep executing a planned sequence
    if (this.queue.length) {
      const s = this.queue[0];
      Object.assign(out, s.k);
      if (--s.f <= 0) this.queue.shift();
      return;
    }
    if (this.wait > 0) { this.wait--; return; }

    const dist = Math.abs(opp.x - me.x);
    const R = Math.random;

    // chain into more hits while a combo is landing
    if (me.state === 'attack' && me.hasHit && me.move && !me.move.special) {
      if (R() < L.combo) {
        const m = me.move.name;
        if (m === 'jab') this.press(me, '', R() < 0.5 ? 'punch' : 'kick', 3);
        else if (m === 'jab2') this.press(me, '', R() < 0.5 ? 'punch' : 'kick', 3);
        else if (m === 'kick' || m === 'kick1') this.press(me, '', 'kick', 3);
        else if (me.meter >= 1000 && R() < L.superP) this.press(me, '', 'super');
      }
      return;
    }
    if (!['idle', 'walk', 'crouch', 'blockstun'].includes(me.state)) return;

    // defend: opponent is attacking near us, or a projectile is incoming
    const incoming = fight.proj.find((p) => p.owner === opp && Math.sign(p.vx) === Math.sign(me.x - p.x) && Math.abs(p.x - me.x) < 260);
    const oppAttacking = seen.state === 'attack' && dist < 260 || (seen.state === 'super');
    if ((oppAttacking || incoming) && R() < L.block) {
      const low = (opp.move && opp.move.lvl === 'low') || (incoming && incoming.lvl === 'low');
      if (incoming && !incoming.super && R() < 0.25 && !low) { this.hold(me, 'fu', 3); return; }
      this.hold(me, low ? 'bd' : 'b', 10 + (R() * 8 | 0));
      return;
    }

    // anti-air
    if (!seen.grounded && seen.vy > -6 && dist < 230 && R() < L.anti) {
      if (me.specials.downP?.spec.kind === 'uppercut' && this.ready(me, 'downP')) this.dd(me);
      else this.press(me, '', 'kick');
      return;
    }
    // go for a ballot box if one is reachable
    const bx = fight.ballots?.[0];
    if (bx && R() < L.aggro * 0.6) {
      const d = bx.x - me.x;
      if (Math.abs(d) > 30) { this.queue.push({ k: d > 0 ? { right: true } : { left: true }, f: 10 }); return; }
    }

    // super
    if (me.meter >= 1000 && R() < L.superP * 0.15 && !['down', 'getup', 'knockdown'].includes(opp.state)) {
      const kind = me.char.super.kind;
      const ranged = ['beam', 'rain', 'stream', 'stampede', 'trap', 'blast'].includes(kind);
      if (ranged || dist < 300) { this.press(me, '', 'super'); return; }
    }

    if (R() < L.idle) { this.wait = 8 + (R() * 20 | 0); return; }

    const sp = me.specials;
    if (dist > 330) {
      const projSlot = sp.fwdP?.spawn && this.ready(me, 'fwdP') ? 'punch' : sp.fwdK?.spawn && this.ready(me, 'fwdK') ? 'kick' : null;
      if (projSlot && R() < L.special * 1.6) { this.qcf(me, projSlot); return; }
      if (R() < 0.12 * L.aggro) { this.hold(me, 'fu', 4); this.queue.push({ k: {}, f: 14 }); this.press(me, '', R() < 0.6 ? 'kick' : 'punch'); return; }
      this.hold(me, 'f', 12 + (R() * 16 | 0));
      return;
    }
    if (dist > 150) {
      const r = R();
      const okP = this.ready(me, 'fwdP'), okK = this.ready(me, 'fwdK');
      if (sp.fwdK?.rush && okK && r < L.special) { this.qcf(me, 'kick', 12); return; }
      if (sp.fwdP?.whip && okP && r < L.special && dist < sp.fwdP.box[1] + 20) { this.qcf(me, 'punch', 12); return; }
      if (sp.fwdK?.whip && okK && r < L.special && dist < sp.fwdK.box[1] + 20) { this.qcf(me, 'kick', 12); return; }
      if (sp.fwdP?.teleport && okP && r < L.special * 0.7) { this.qcf(me, 'punch', 12); return; }
      if (sp.fwdP?.spawn && okP && r < L.special) { this.qcf(me, 'punch', 10); return; }
      if (R() < L.aggro) this.hold(me, 'f', 8 + (R() * 10 | 0));
      else this.hold(me, 'b', 8 + (R() * 10 | 0));
      return;
    }
    // close range
    const r = R();
    if (r < L.aggro) {
      const opener = R();
      if (opp.state === 'blockstun' || (R() < 0.12)) { this.press(me, '', 'grab', 6); return; }
      if (opener < 0.18) { this.press(me, 'd', 'kick', 8); return; }
      if (opener < 0.28 && this.ready(me, 'downP') && sp.downP.spec.kind !== 'counter' && R() < L.special * 2) { this.dd(me, 8); return; }
      if (opener < 0.34 && this.ready(me, 'downP') && sp.downP?.counter) { this.dd(me, 8); return; }
      this.press(me, '', opener < 0.7 ? 'punch' : 'kick', 2);
    } else if (r < L.aggro + 0.2) {
      this.hold(me, 'b', 10);
    } else {
      this.hold(me, 'bd', 10);
    }
  }
}
