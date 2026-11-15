// A match: two fighters, a stage, rounds, projectiles, supers, effects, HUD.
import { Fighter } from './fighter.js';
import { drawFighter, drawPortrait, POSES, mkPose, shade, walkPose } from './rig.js';
import { StageRenderer, GROUND, W, H } from './stages.js';
import { FX } from './fx.js';
import { audio } from './audio.js';

const pick = (a) => a[(Math.random() * a.length) | 0];
const overlap = (a, b) => a && b && a[0] < b[1] && a[1] > b[0] && a[2] < b[3] && a[3] > b[2];
const ROUND_TIME = 60;
const METER = { hitAtt: 0.28, hitDef: 0.58, blockAtt: 0.06, blockDef: 0.3, comeback: 1.6, ballot: 300 };

export class Fight {
  constructor({ chars, looks, pads, stage, cpu, onEnd }) {
    this.f = [new Fighter(chars[0], looks[0], 0, pads[0]), new Fighter(chars[1], looks[1], 1, pads[1])];
    this.stage = new StageRenderer(stage);
    this.stageId = stage;
    this.cpu = cpu; // array of AI controllers or null
    this.onEnd = onEnd;
    this.fx = new FX();
    this.proj = [];
    this.round = 1;
    this.frame = 0;
    this.hitstop = 0; this.freeze = 0; this.shakeAmt = 0; this.dark = 0; this.excite = 0;
    this.cutin = null; this.popups = [];
    this.stats = { maxCombo: [0, 0], supers: [0, 0], perfect: false, timeout: false };
    this.startRound(true);
  }

  startRound(first) {
    this.f.forEach((f) => f.reset(false));
    this.proj = [];
    this.timer = ROUND_TIME; this.timerFrames = 0;
    this.phase = first ? 'intro' : 'ready'; this.phaseT = 0;
    this.koWinner = null; this.dark = 0;
    this.ballots = []; this.ballotTimer = 480 + Math.random() * 240;
    if (first) this.f.forEach((f) => f.setState('intro'));
  }

  shake(n) { this.shakeAmt = Math.max(this.shakeAmt, n); }
  popup(f, text) { this.popups.push({ x: f.x, y: f.y - 260 * f.k, text, t: 50, color: f.char.color }); }
  sayLine(f, text, frames = 160) { f.say(text, frames); audio.say(text, f.char.voice); }

  skipIntro() { if (this.phase === 'intro') { this.phase = 'ready'; this.phaseT = 0; this.f.forEach((f) => { f.setState('idle'); f.bubble = null; }); if (window.speechSynthesis) speechSynthesis.cancel(); } }

  // ---------------- simulation ----------------
  update() {
    this.frame++;
    this.fx.update();
    this.popups = this.popups.filter((p) => (p.y -= 0.7, --p.t > 0));
    this.shakeAmt *= 0.85; if (this.shakeAmt < 0.3) this.shakeAmt = 0;
    this.excite *= 0.995;
    const [a, b] = this.f;

    if (this.cutin) { this.cutin.t++; if (this.cutin.t > 70) this.cutin = null; }
    if (this.freeze > 0) { this.freeze--; return; }
    if (this.hitstop > 0) { this.hitstop--; return; }

    this.phaseT++;
    switch (this.phase) {
      case 'intro': {
        if (this.phaseT === 10) this.sayLine(a, pick(a.char.lines.intro), 150);
        if (this.phaseT === 165) this.sayLine(b, pick(b.char.lines.intro), 150);
        a.t++; b.t++; a.stateT++; b.stateT++;
        a.facing = 1; b.facing = -1;
        if (a.bubble && --a.bubble.t <= 0) a.bubble = null;
        if (b.bubble && --b.bubble.t <= 0) b.bubble = null;
        if (this.phaseT > 330) this.skipIntro();
        return;
      }
      case 'ready':
        a.t++; b.t++;
        if (this.phaseT === 1) audio.play('horn');
        if (this.phaseT === 75) { audio.play('bell'); audio.play('crowd'); }
        if (this.phaseT > 110) { this.phase = 'fight'; this.phaseT = 0; }
        return;
      case 'ko': case 'timeup':
        if (this.phaseT < 70 && this.phaseT % 3 !== 0) return; // slow motion
        break;
    }

    for (let i = 0; i < 2; i++) {
      const f = this.f[i], o = this.f[1 - i];
      if (this.phase !== 'fight' && !['knockdown', 'down', 'win', 'lose'].includes(f.state)) { f.vx *= 0.8; f.t++; f.stateT++; if (f.bubble && --f.bubble.t <= 0) f.bubble = null; this.physicsOnly(f); continue; }
      f.update(this, o);
      if (f.state === 'super') this.updateSuper(f, o);
      if (f.state === 'throwing') this.updateThrow(f, o);
    }
    this.pushApart();
    this.updateProjectiles();
    if (this.phase === 'fight') this.updateBallots();

    if (this.phase === 'fight') {
      if (++this.timerFrames >= 60) { this.timerFrames = 0; this.timer--; if (this.timer <= 0) this.endRound('time'); }
      if (a.hp <= 0 || b.hp <= 0) this.endRound('ko');
    } else if (this.phase === 'ko' || this.phase === 'timeup') {
      this.afterRound();
    }
  }

  physicsOnly(f) {
    f.x += f.vx;
    if (f.y < GROUND || f.vy < 0) { f.vy += 0.85; f.y += f.vy; if (f.y > GROUND) { f.y = GROUND; f.vy = 0; } }
    f.x = Math.max(45, Math.min(W - 45, f.x));
  }

  pushApart() {
    const [a, b] = this.f;
    if (['down', 'knockdown'].includes(a.state) || ['down', 'knockdown'].includes(b.state)) return;
    if (a.alpha < 0.5 || b.alpha < 0.5) return;
    const minD = 30 * (a.look.build || 1) + 30 * (b.look.build || 1);
    const dx = b.x - a.x;
    const vertical = Math.abs(a.y - b.y) < 150;
    if (vertical && Math.abs(dx) < minD) {
      const push = (minD - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1);
      a.x -= push; b.x += push;
      if (a.x < 45) { b.x += 45 - a.x; a.x = 45; } if (b.x > W - 45) { a.x -= b.x - (W - 45); b.x = W - 45; }
      if (a.x > W - 45) { b.x -= a.x - (W - 45); a.x = W - 45; } if (b.x < 45) { a.x += 45 - b.x; b.x = 45; }
    }
  }

  // ---------------- hits ----------------
  tryHit(att, def, m) {
    const box = att.worldBox(m.box);
    if (!overlap(box, def.hurtbox())) return;
    att.hasHit = true;
    const powerDmg = (m.dmg || 40) * att.char.stats.power;
    const r = this.applyHit(att, def, { ...m, dmg: powerDmg }, { x: (Math.max(box[0], def.x - 30) + Math.min(box[1], def.x + 30)) / 2, y: (box[2] + box[3]) / 2 });
    if (m.stamp && r === 'hit') this.fx.text(def.x, def.y - 240, m.spec?.stampText || 'REJECTED', '#d0262b', 1.4);
  }

  applyHit(att, def, hit, at) {
    if (def.invuln > 0 || ['down', 'getup'].includes(def.state)) return 'none';
    if (def.state === 'super' && def.invuln > 0) return 'none';
    const px = at?.x ?? (att.x + def.x) / 2, py = at?.y ?? def.y - 140;
    const dir = def.x >= att.x ? 1 : -1;

    // Counter stance (Fence Sitter)
    if (def.state === 'attack' && def.move?.counter && def.moveT >= def.move.s && def.moveT < def.move.s + def.move.a && !hit.super) {
      this.counterHit(def, att); return 'counter';
    }
    // Armoured rush absorbs one hit
    if (def.state === 'attack' && def.move?.armor && def.moveT >= def.move.s && def.moveT < def.move.s + def.move.a && !def.armorUsed && !hit.super) {
      def.armorUsed = true; def.hp -= hit.dmg * 0.5; def.flash = 0.8; def.flashColor = '#ffd34d';
      this.fx.spark(px, py, '#ffd34d', 10); audio.play('block'); this.hitstop = 4; return 'armor';
    }

    // Block?
    const lowOk = !(hit.lvl === 'low') || def.pad.held.down;
    const highOk = !(hit.lvl === 'overhead') || !def.pad.held.down;
    if (def.isBlocking(att.x) && lowOk && highOk && !hit.unblockable) {
      const chip = hit.chip ? hit.dmg * hit.chip : 0;
      def.hp = Math.max(def.hp > 1 ? 1 : 0, def.hp - chip);
      if (def.hp <= 0 && chip > 0) def.hp = 0;
      def.blockLow = def.pad.held.down;
      def.setState('blockstun'); def.stun = hit.bs || 10;
      def.vx = dir * (hit.kb || 3) * 1.2;
      if (def.x <= 50 || def.x >= W - 50) att.vx = -dir * 3;
      att.meter = Math.min(1000, att.meter + hit.dmg * METER.blockAtt);
      def.meter = Math.min(1000, def.meter + hit.dmg * METER.blockDef);
      this.fx.spark(px, py, '#9fd8ff', 6, true);
      audio.play('block'); this.hitstop = 3;
      return 'block';
    }

    // Hit!
    const inCombo = ['hitstun', 'knockdown', 'bound', 'dizzy', 'grabbed'].includes(def.state);
    att.combo = inCombo ? att.combo + 1 : 1;
    const scale = Math.max(0.45, 1 - 0.09 * (att.combo - 1));
    const dmg = hit.dmg * scale;
    def.hp = Math.max(0, def.hp - dmg);
    def.flash = 0.9; def.flashColor = '#fff';
    // Attacking earns little; getting hit earns more, so the player who is
    // behind gets their chance at a super. Supers themselves earn nothing.
    if (!hit.super) att.meter = Math.min(1000, att.meter + dmg * METER.hitAtt);
    const behind = def.hp < att.hp ? METER.comeback : 1;
    def.meter = Math.min(1000, def.meter + dmg * METER.hitDef * behind);
    this.stats.maxCombo[att.side] = Math.max(this.stats.maxCombo[att.side], att.combo);
    def.blockLow = def.crouching;
    def.move = null; def.alpha = 1;
    const heavy = hit.heavy || hit.kd || dmg > 80;
    this.fx.spark(px, py, heavy ? '#ffd34d' : '#fff', heavy ? 16 : 9);
    if (heavy) this.fx.ring(px, py, att.char.color);
    audio.play(heavy ? 'heavy' : 'hit', Math.min(1.4, dmg / 60));
    this.hitstop = heavy ? 7 : 5;
    this.shake(heavy ? 9 : 4);
    this.excite = Math.min(1, this.excite + 0.15);

    if (def.state === 'bound' && !hit.kd) { def.stun = Math.max(def.stun, def.stateT + 10); return 'hit'; }
    if (hit.kd || !def.grounded || def.hp <= 0) {
      def.setState('knockdown');
      def.vx = dir * (hit.kb ? 4 + hit.kb * 0.6 : 6); def.vy = -(hit.launch || 10);
      def.y = Math.min(def.y, GROUND - 1);
    } else if (hit.stun) {
      def.setState('dizzy'); def.stun = hit.stun; def.vx = dir * 2;
      this.fx.stars(def);
    } else {
      def.setState('hitstun'); def.stun = hit.hs || 14;
      def.vx = dir * (hit.kb || 3);
      if (def.x <= 50 || def.x >= W - 50) att.vx = -dir * (hit.kb || 3) * 0.7;
    }

    // Banter
    if (att.combo === 4 || (att.combo >= 3 && Math.random() < 0.25)) this.sayLine(att, pick(att.char.lines.taunt), 70);
    return 'hit';
  }

  counterHit(def, att) {
    this.popup(def, 'COUNTER!');
    this.fx.smoke(def.x, def.y - 100);
    const behind = att.x - att.facing * 90;
    def.x = Math.max(60, Math.min(W - 60, behind));
    def.facing = att.x >= def.x ? 1 : -1;
    def.move = null; def.setState('idle'); def.invuln = 10;
    att.move = null; att.setState('idle');
    this.applyHit(def, att, { dmg: def.specials.downP.dmg * def.char.stats.power, kd: true, kb: 7, heavy: true, lvl: 'mid', unblockable: true }, { x: att.x, y: att.y - 150 });
    this.sayLine(def, pick(['Surprise! New side.', 'I switched. Again.', 'Thank you for the opening!']), 90);
  }

  tryGrab(att, def) {
    const box = att.worldBox(NORMALS_GRAB_BOX);
    if (!def.grounded || def.invuln > 0 || ['down', 'getup', 'knockdown', 'grabbed'].includes(def.state)) return;
    if (!overlap(box, def.hurtbox())) return;
    att.hasHit = true;
    def.setState('grabbed'); def.move = null; def.vx = 0;
    att.setState('throwing'); att.move = null; att.vx = 0;
    att.grabTarget = def;
    audio.play('grab');
    this.popup(att, 'GRAB!');
  }

  updateThrow(att, def) {
    const t = att.stateT;
    if (def.state !== 'grabbed') { att.setState('idle'); return; }
    def.x = att.x + att.facing * (t < 16 ? 62 : 30);
    def.y = GROUND - (t < 16 ? 10 : 60);
    if (t === 18) {
      def.y = GROUND - 80;
      def.setState('idle');
      // throw over the shoulder: land on the other side
      def.x = att.x - att.facing * 40;
      this.applyHit(att, def, { dmg: 105 * att.char.stats.power, kd: true, kb: 4, launch: 12, heavy: true, unblockable: true }, { x: def.x, y: def.y - 60 });
      def.vx = -att.facing * 7;
    }
    if (t > 32) att.setState('idle');
  }

  // ---------------- projectiles ----------------
  spawnProjectile(f, spec, extra = {}) {
    if (!extra.super && this.proj.some((p) => p.owner === f && !p.super)) return;
    const k = f.k;
    const kinds = {
      wave: { w: 60, h: 100, yh: 150, life: 140 },
      gift: { w: 34, h: 34, yh: 190, vy: -10.5, grav: 0.45, life: 200 },
      file: { w: 46, h: 34, yh: 150, life: 140 },
      cement: { w: 46, h: 36, yh: 190, vy: -9.5, grav: 0.42, life: 200 },
      crack: { w: 70, h: 34, yh: 17, life: 120 },
      flash: { w: 110, h: 120, yh: 150, life: spec.life || 18 },
      ticket: { w: 44, h: 22, yh: 160, life: 120 },
      bullet: { w: 30, h: 14, yh: 165, life: 90 },
      briefcase: { w: 40, h: 30, yh: 190, vy: -10, grav: 0.42, life: 200 },
      grenade: { w: 26, h: 26, yh: 190, vy: -11, grav: 0.45, life: 200 },
      evidence: { w: 40, h: 32, yh: 150, life: 140 },
      chi: { w: 70, h: 90, yh: 150, life: 140 },
    };
    const kd = kinds[spec.proj] || kinds.wave;
    this.proj.push({
      owner: f, kind: spec.proj, x: f.x + f.facing * 60, y: f.y - kd.yh * k,
      vx: spec.speed * f.facing, vy: kd.vy || 0, grav: kd.grav || 0, w: kd.w, h: kd.h,
      dmg: spec.dmg * f.char.stats.power, life: kd.life, t: 0, lvl: spec.low ? 'low' : 'mid',
      stun: spec.stun, chip: 0.15, kd: ['cement', 'briefcase', 'grenade'].includes(spec.proj), ...extra,
    });
    audio.play('shot');
  }

  updateProjectiles() {
    for (const p of this.proj) {
      p.t++; p.x += p.vx; p.vy += p.grav; p.y += p.vy;
      if (p.grav && p.y > GROUND - p.h / 2) { p.dead = true; this.fx.dust(p.x, GROUND, 10); if (p.kind === 'cement') { this.fx.dust(p.x, GROUND, 16); audio.play('land'); }
        if (p.kind === 'grenade' || p.kind === 'briefcase') { this.fx.explosion(p.x, GROUND - 30, 0.6); audio.play('heavy'); this.shake(6); } }
      if (p.x < -200 || p.x > W + 200 || p.t > p.life) p.dead = true;
      if (p.kind === 'crack' && p.t % 4 === 0) this.fx.dust(p.x, GROUND, 2);
      if (p.dead) continue;
      const target = this.f[1 - p.owner.side];
      const box = [p.x - p.w / 2, p.x + p.w / 2, p.y - p.h / 2, p.y + p.h / 2];
      if (p.pierce && p.hitTargets?.has(target)) continue;
      if (overlap(box, target.hurtbox())) {
        const r = this.applyHit(p.owner, target, { dmg: p.dmg, hs: 18, bs: 12, kb: p.kb || 5, lvl: p.lvl, chip: p.chip, stun: p.stun, kd: p.kd, heavy: p.heavy, super: p.super }, { x: p.x, y: p.y });
        if (r === 'hit' && p.bind) this.onBindHit(p.owner, target);
        if (r !== 'none') {
          if (p.pierce) { p.hitTargets = p.hitTargets || new Set(); p.hitTargets.add(target); }
          else p.dead = true;
          if (p.super && r === 'hit' && (p.kind === 'like' || p.hitText)) this.fx.text(p.x, p.y - 30, p.hitText || '+1 LIKE', p.kind === 'like' ? '#ff4f7a' : '#ffcc33', 0.8);
        }
      }
    }
    // normal projectiles cancel each other
    for (const p of this.proj) for (const q of this.proj) {
      if (p === q || p.dead || q.dead || p.owner === q.owner || p.super || q.super) continue;
      if (Math.abs(p.x - q.x) < (p.w + q.w) / 2 && Math.abs(p.y - q.y) < (p.h + q.h) / 2) { p.dead = q.dead = true; this.fx.spark((p.x + q.x) / 2, p.y, '#fff', 14); audio.play('block'); }
    }
    this.proj = this.proj.filter((p) => !p.dead);
  }

  // ---------------- ballot box pickups ----------------
  // A ballot box drops in now and then; whoever reaches it first gets a big
  // chunk of VOTE BANK. It tends to land nearer whoever is behind.
  updateBallots() {
    if (--this.ballotTimer <= 0 && this.ballots.length === 0) {
      this.ballotTimer = 540 + Math.random() * 360;
      const [a, b] = this.f;
      const under = a.hp / a.maxHp < b.hp / b.maxHp ? a : b;
      const x = Math.random() < 0.6 ? under.x + (Math.random() - 0.5) * 300 : 200 + Math.random() * (W - 400);
      this.ballots.push({ x: Math.max(120, Math.min(W - 120, x)), y: -60, vy: 0, life: 480, t: 0 });
      this.fx.text(W / 2, 170, 'BALLOT BOX INCOMING!', '#ffc94a', 1);
      audio.play('horn');
    }
    for (const bx of this.ballots) {
      bx.t++;
      if (bx.y < GROUND - 26) { bx.vy += 0.5; bx.y = Math.min(GROUND - 26, bx.y + bx.vy); if (bx.y >= GROUND - 26) { this.fx.dust(bx.x, GROUND, 8); audio.play('land'); } }
      for (const f of this.f) {
        if (bx.dead) break;
        if (['down', 'knockdown', 'getup', 'grabbed', 'bound', 'pothole'].includes(f.state)) continue;
        if (Math.abs(f.x - bx.x) < 55 && Math.abs((f.y - 40) - bx.y) < 90) {
          bx.dead = true;
          f.meter = Math.min(1000, f.meter + METER.ballot);
          this.fx.text(bx.x, bx.y - 70, 'VOTES COUNTED! +30%', f.char.color, 1);
          this.fx.spark(bx.x, bx.y, '#ffc94a', 14);
          audio.play('confirm');
          if (Math.random() < 0.5) this.sayLine(f, pick(['My vote bank!', 'Counting is complete!', 'Booth captured!']), 70);
        }
      }
      if (bx.t > bx.life) bx.dead = true;
    }
    this.ballots = this.ballots.filter((b) => !b.dead);
  }

  drawBallots(g) {
    for (const bx of this.ballots) {
      const blink = bx.life - bx.t < 90 && bx.t % 10 < 5;
      if (blink) continue;
      g.save(); g.translate(bx.x, bx.y + Math.sin(bx.t * 0.1) * (bx.y >= GROUND - 27 ? 0 : 0));
      g.shadowColor = '#ffc94a'; g.shadowBlur = 18 + Math.sin(bx.t * 0.15) * 8;
      const gr = g.createLinearGradient(0, -26, 0, 26); gr.addColorStop(0, '#5b6b7a'); gr.addColorStop(1, '#2a3440');
      g.fillStyle = gr; g.fillRect(-28, -26, 56, 52);
      g.shadowBlur = 0;
      g.strokeStyle = '#141a20'; g.lineWidth = 2; g.strokeRect(-28, -26, 56, 52);
      g.fillStyle = '#111'; g.fillRect(-14, -24, 28, 5);
      g.fillStyle = '#fff'; g.fillRect(-9, -36 + Math.sin(bx.t * 0.2) * 3, 18, 14);
      g.fillStyle = '#ffc94a'; g.font = '16px Anton, Impact'; g.textAlign = 'center'; g.fillText('VOTE', 0, 10);
      g.restore();
    }
  }

  // ---------------- supers ----------------
  startSuper(f, opp) {
    f.meter = 0; f.move = null; f.vx = 0;
    f.setState('super'); f.superT = 0; f.superPhase = 'go'; f.invuln = 40;
    f.superPose = POSES.speech;
    this.freeze = 62; this.cutin = { f, t: 0 };
    this.stats.supers[f.side]++;
    this.excite = 1;
    this.sayLine(f, f.char.lines.super, 110);
    audio.play('super');
    this.trapX = opp.x; this.blastX = opp.x;
    this.dark = 0;
  }

  endSuper(f) { f.setState('idle'); f.superPose = null; f.alpha = 1; this.dark = 0; }

  superHit(f, opp, part, last, extra = {}) {
    const dmg = f.char.super.dmg * f.char.stats.power * part;
    return this.applyHit(f, opp, { dmg, hs: 16, bs: 10, kb: last ? 8 : 1.5, kd: last, chip: 0.22, super: true, lvl: 'mid', heavy: last, ...extra }, extra.at);
  }

  updateSuper(f, opp) {
    const t = ++f.superT;
    const kind = f.char.super.kind;
    const fwd = f.facing;
    switch (kind) {
      case 'beam': {
        f.superPose = mkPose({ ...POSES.cast, mouth: 0.5 + Math.sin(t * 0.8) * 0.4, eyes: 'wide', uaB: 2.4, faB: 2.9 });
        f.beam = t > 4 && t < 78 ? { t } : null;
        if (t > 6 && t < 78 && t % 7 === 0) {
          const hb = opp.hurtbox();
          const by0 = f.y - 205 * f.k, by1 = f.y - 105 * f.k;
          const inFront = (opp.x - f.x) * fwd > 0;
          if (hb && inFront && hb[2] < by1 && hb[3] > by0) this.superHit(f, opp, 1 / 10, t >= 70, { at: { x: opp.x - fwd * 20, y: f.y - 155 * f.k } });
        }
        if (t >= 86) { f.beam = null; this.endSuper(f); }
        break;
      }
      case 'rain': {
        f.superPose = mkPose({ ...POSES.win, mouth: 0.8 });
        if (t > 4 && t <= 88 && t % 7 === 0) {
          const last = t >= 84;
          this.proj.push({ owner: f, kind: 'gift', x: opp.x + (Math.random() - 0.5) * 120, y: -40, vx: 0, vy: 6, grav: 0.35, w: 44, h: 44, dmg: f.char.super.dmg * f.char.stats.power / 12, life: 120, t: 0, lvl: 'overhead', chip: 0.22, super: true, kd: last, kb: last ? 8 : 1 });
        }
        if (t >= 100) this.endSuper(f);
        break;
      }
      case 'bind': {
        if (f.superPhase === 'go') {
          f.superPose = POSES.overhand;
          if (t === 3) this.proj.push({ owner: f, kind: 'tape', x: f.x + fwd * 60, y: f.y - 150 * f.k, vx: 17 * fwd, vy: 0, grav: 0, w: 60, h: 160, dmg: 20, life: 70, t: 0, lvl: 'mid', chip: 0.2, super: true, bind: true });
          if (t > 60) this.endSuper(f);
        } else if (f.superPhase === 'stamp') {
          const st = t - f.bindStart;
          f.superPose = st % 14 < 7 ? POSES.overWind : POSES.overhand;
          if (st % 14 === 7 && st <= 7 + 14 * 5) {
            const last = st >= 7 + 14 * 5;
            this.superHit(f, opp, 1 / 6, last, { unblockable: true, at: { x: opp.x, y: opp.y - 200 } });
            this.fx.text(opp.x + (Math.random() - 0.5) * 80, opp.y - 200 - Math.random() * 60, pick(['REJECTED', 'PENDING', 'NOT APPROVED', 'RETURNED']), '#d0262b', 1.3);
            audio.play('stamp');
          }
          if (st > 7 + 14 * 5 + 18) this.endSuper(f);
        }
        break;
      }
      case 'trap': {
        f.superPose = mkPose({ ...POSES.point, mouth: Math.sin(t * 0.4) > 0 ? 0.8 : 0.2 });
        if (t < 42) { if (t % 6 === 0) this.fx.dust(this.trapX + (Math.random() - 0.5) * 120, GROUND, 3); }
        if (t === 42) {
          this.fx.crater(this.trapX);
          this.shake(14); audio.play('ko');
          if (Math.abs(opp.x - this.trapX) < 95 && opp.grounded && opp.invuln <= 0 && !['down', 'getup'].includes(opp.state)) {
            opp.setState('pothole'); opp.potholeT = 0; opp.x = this.trapX; opp.move = null;
            this.fx.text(opp.x, GROUND - 240, 'UNDER CONSTRUCTION', '#ffcc00', 1.2);
          }
        }
        if (opp.state === 'pothole') {
          opp.potholeT++;
          opp.y = GROUND + Math.min(140, opp.potholeT * 7);
          if (opp.potholeT === 36) {
            opp.y = GROUND;
            opp.setState('idle');
            this.superHit(f, opp, 1, true, { unblockable: true, launch: 16, at: { x: opp.x, y: GROUND - 60 } });
          }
        }
        if (t >= 96 && opp.state !== 'pothole') this.endSuper(f);
        break;
      }
      case 'stream': {
        f.superPose = mkPose({ ...POSES.cast, uaF: 1.9, faF: 2.1, mouth: 0.6, eyes: 'wide' });
        if (t > 4 && t <= 74 && t % 5 === 0) {
          const last = t >= 72;
          this.proj.push({ owner: f, kind: f.char.super.proj || 'like', hitText: f.char.super.hitText, x: f.x + fwd * 60, y: f.y - (120 + Math.random() * 90) * f.k, vx: 15 * fwd, vy: (Math.random() - 0.5) * 1.2, grav: 0, w: 40, h: 40, dmg: f.char.super.dmg * f.char.stats.power / 14, life: 100, t: 0, lvl: 'mid', chip: 0.22, super: true, kd: last, kb: last ? 7 : 1.2 });
        }
        if (t >= 86) this.endSuper(f);
        break;
      }
      case 'stampede': {
        f.superPose = mkPose({ ...POSES.win, mouth: 0.9, eyes: 'wide' });
        if (t > 2 && t <= 62 && t % 12 === 3) {
          const last = t >= 50;
          const startX = fwd > 0 ? -140 : W + 140;
          this.proj.push({ owner: f, kind: 'horse', x: startX, y: GROUND - 62, vx: 15 * fwd, vy: 0, grav: 0, w: 150, h: 120, dmg: f.char.super.dmg * f.char.stats.power / 5, life: 160, t: 0, lvl: 'mid', chip: 0.22, super: true, kd: last, kb: last ? 9 : 4, pierce: true });
          audio.play('heavy');
        }
        if (t % 8 === 0 && t < 80) this.shake(4);
        if (t >= 100) this.endSuper(f);
        break;
      }
      case 'blast': {
        // A fuse is lit at the opponent's position (or the whole screen for
        // walk-away blasts); step out of the warning zone to dodge it.
        const sp = f.char.super;
        if (t === 1) { this.blastX = sp.walkAway ? W / 2 : opp.x; }
        if (sp.walkAway) {
          // turn and stroll away from the opponent, cool as anything
          f.facing = opp.x >= f.x ? -1 : 1;
          f.superPose = mkPose({ ...walkPose(t * 0.12), head: -0.05, mouth: 0 });
          if (t < 46) f.x = Math.max(60, Math.min(W - 60, f.x + f.facing * 1.4));
        } else f.superPose = mkPose({ ...POSES.point, mouth: Math.sin(t * 0.4) > 0 ? 0.7 : 0.1 });
        if (t < 46 && t % 5 === 0) this.fx.spark(this.blastX + (Math.random() - 0.5) * 60, GROUND - 10, '#ffcc33', 2, true);
        if (t === 46) {
          const r = sp.radius || 140;
          this.fx.explosion(sp.walkAway ? opp.x : this.blastX, GROUND - 90, sp.walkAway ? 1.8 : 1.3);
          if (sp.walkAway) { this.fx.explosion(W * 0.25, GROUND - 60, 1); this.fx.explosion(W * 0.75, GROUND - 60, 1); }
          this.shake(18); audio.play('ko'); this.fx.flashScreen();
          this.fx.text(opp.x, GROUND - 270, pick(sp.texts || ['KABOOM!']), '#ff6a1a', 1.5);
          if (Math.abs(opp.x - this.blastX) < r && !['down', 'getup'].includes(opp.state) && opp.invuln <= 0) {
            this.superHit(f, opp, 1, true, { launch: 17, at: { x: opp.x, y: opp.y - 120 } });
          }
        }
        if (t >= 90) { this.endSuper(f); if (sp.walkAway) f.facing = opp.x >= f.x ? 1 : -1; }
        break;
      }
      case 'cinematic': {
        if (t === 1) {
          if (Math.abs(opp.x - f.x) < 520 && opp.invuln <= 0 && !['down', 'getup'].includes(opp.state)) { f.superPhase = 'go'; opp.setState('bound'); opp.stun = 999; opp.move = null; opp.vx = 0; }
          else { f.superPhase = 'miss'; }
        }
        if (f.superPhase === 'miss') { f.superPose = POSES.stance; if (t > 30) this.endSuper(f); break; }
        this.dark = Math.min(0.8, this.dark + 0.08);
        if (t % 10 === 0 && t <= 70) {
          const side = (t / 10) % 2 ? 1 : -1;
          f.x = Math.max(60, Math.min(W - 60, opp.x + side * 90));
          f.facing = opp.x >= f.x ? 1 : -1;
          f.superPose = (t / 10) % 2 ? POSES.cross : POSES.highKick;
          this.fx.smoke(f.x, f.y - 100);
          this.fx.slash(opp.x, opp.y - 140, f.char.super.slash);
          const last = t >= 70;
          if (last) opp.setState('hitstun');
          this.superHit(f, opp, 1 / 7, last, { unblockable: true, at: { x: opp.x, y: opp.y - 150 } });
          this.fx.text(opp.x + (Math.random() - 0.5) * 120, opp.y - 230 - Math.random() * 40, pick(f.char.super.texts || ['RESHUFFLED', 'TRANSFERRED', 'DROPPED', 'NO TICKET']), f.char.color, 1.1);
        }
        if (t >= 92) { if (opp.state === 'bound') opp.setState('idle'); this.endSuper(f); }
        break;
      }
    }
  }

  onBindHit(f, opp) {
    opp.setState('bound'); opp.stun = 120; opp.move = null;
    f.superPhase = 'stamp'; f.bindStart = f.superT;
    f.x = Math.max(60, Math.min(W - 60, opp.x - f.facing * 95));
    f.facing = opp.x >= f.x ? 1 : -1;
    this.fx.text(opp.x, opp.y - 260, 'TIED UP IN RED TAPE', '#d0262b', 1.1);
  }

  // ---------------- rounds ----------------
  endRound(why) {
    const [a, b] = this.f;
    let winner;
    if (why === 'time') { winner = a.hp === b.hp ? null : a.hp > b.hp ? a : b; this.stats.timeout = true; }
    else winner = a.hp <= 0 && b.hp <= 0 ? null : a.hp <= 0 ? b : a;
    this.koWinner = winner;
    this.phase = why === 'time' ? 'timeup' : 'ko'; this.phaseT = 0;
    if (why === 'ko') { audio.play('ko'); this.shake(16); this.fx.flashScreen(); }
    else audio.play('bell');
    if (winner) winner.wins++;
    this.proj = [];
    this.f.forEach((f) => { f.beam = null; if (f.state === 'super') { f.setState('idle'); f.superPose = null; f.alpha = 1; } });
    this.dark = 0;
  }

  afterRound() {
    const t = this.phaseT;
    const w = this.koWinner;
    const l = w ? this.f[1 - w.side] : null;
    if (t === 80) {
      if (w) { w.setState('win'); w.vx = 0; this.sayLine(w, pick(w.char.lines.win), 170); }
      if (l && l.hp > 0) l.setState('lose');
      if (l && l.hp <= 0 && l.state !== 'down') l.setState('down');
    }
    if (t === 200 && l) l.say(pick(l.char.lines.lose), 90);
    if (t >= 300) {
      const [a, b] = this.f;
      if (a.wins >= 2 || b.wins >= 2 || this.round >= 5) {
        const champ = a.wins === b.wins ? null : a.wins > b.wins ? a : b;
        this.stats.perfect = champ ? champ.hp >= champ.maxHp : false;
        this.phase = 'over';
        this.onEnd?.({ winner: champ, loser: champ ? this.f[1 - champ.side] : null, stats: this.stats, stage: this.stageId, fighters: this.f });
      } else {
        this.round++;
        this.startRound(false);
      }
    }
  }

  // ---------------- rendering ----------------
  draw(g) {
    const sx = (Math.random() - 0.5) * this.shakeAmt, sy = (Math.random() - 0.5) * this.shakeAmt;
    g.save();
    const noir = this.f.some((f) => f.state === 'super' && f.char.super.gray && this.freeze <= 0);
    if (noir) g.filter = 'grayscale(1) contrast(1.15)';
    this.stage.draw(g, sx, sy, this.excite);
    g.translate(sx, sy);

    if (this.dark > 0) { g.fillStyle = `rgba(0,0,0,${this.dark})`; g.fillRect(-20, -20, W + 40, H + 40); }

    // trap warning
    for (const f of this.f) {
      if (f.state === 'super' && f.char.super.kind === 'trap' && f.superT < 42) {
        const a = 0.4 + 0.4 * Math.sin(f.superT * 0.6);
        g.strokeStyle = `rgba(255,204,0,${a})`; g.lineWidth = 4; g.setLineDash([12, 8]);
        g.beginPath(); g.ellipse(this.trapX, GROUND + 4, 95, 18, 0, 0, 7); g.stroke(); g.setLineDash([]);
        g.fillStyle = `rgba(255,204,0,${a})`; g.font = '22px Anton'; g.textAlign = 'center'; g.fillText('⚠ ROAD WORK ⚠', this.trapX, GROUND - 6);
      }
    }
    this.fx.drawUnder(g);
    this.drawBallots(g);

    // shadows
    for (const f of this.f) {
      if (f.state === 'pothole') continue;
      const hgt = Math.max(0, GROUND - f.y);
      const s = Math.max(0.35, 1 - hgt / 400);
      g.fillStyle = `rgba(0,0,0,${0.38 * s * f.alpha})`;
      g.beginPath(); g.ellipse(f.x, GROUND + 2, (f.state === 'down' ? 110 : 62) * s * (f.look.build || 1), 12 * s, 0, 0, 7); g.fill();
    }

    // beams under fighters
    for (const f of this.f) if (f.beam) this.drawBeam(g, f);

    // fighters: the attacker on top
    const order = [...this.f].sort((a, b) => (a.state === 'attack' || a.state === 'super' ? 1 : 0) - (b.state === 'attack' || b.state === 'super' ? 1 : 0));
    for (const f of order) {
      if (f.state === 'pothole') {
        g.save(); g.beginPath(); g.rect(0, 0, W, GROUND + 6); g.clip();
        drawFighter(g, f.look, f.pose(), f.x, f.y, f.facing, { flash: Math.max(0, f.flash), flashColor: f.flashColor });
        g.restore(); continue;
      }
      const flash = Math.max(0, f.flash) || (f.state === 'super' && this.freeze > 0 ? 0.35 + 0.25 * Math.sin(this.frame * 0.8) : 0);
      const alpha = f.invuln > 0 && f.state === 'getup' ? (this.frame % 4 < 2 ? 0.55 : 1) : f.alpha;
      if (f.state === 'super' || (f.move?.special && f.state === 'attack')) {
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25;
        g.shadowColor = f.char.color; g.shadowBlur = 30;
        drawFighter(g, f.look, f.pose(), f.x, f.y, f.facing, { alpha: 0.4 });
        g.restore();
      }
      drawFighter(g, f.look, f.pose(), f.x, f.y, f.facing, { flash, flashColor: f.flash > 0 ? f.flashColor : f.char.color, alpha });
      if (f.state === 'dizzy') this.fx.drawStars(g, f);
      if (f.state === 'bound') this.drawTape(g, f);
    }

    for (const p of this.proj) this.drawProjectile(g, p);
    this.fx.draw(g);

    g.restore();

    this.drawHUD(g);
    for (const f of this.f) if (f.bubble) this.drawBubble(g, f);
    for (const p of this.popups) {
      g.save(); g.globalAlpha = Math.min(1, p.t / 15); g.font = '30px Anton, Impact'; g.textAlign = 'center';
      g.lineWidth = 6; g.strokeStyle = '#000'; g.strokeText(p.text, p.x, p.y); g.fillStyle = p.color; g.fillText(p.text, p.x, p.y); g.restore();
    }
    if (noir) {
      g.filter = 'none';
      g.save(); g.strokeStyle = 'rgba(220,225,235,.35)'; g.lineWidth = 1.2;
      for (let i = 0; i < 90; i++) { const x = (i * 97 + this.frame * 13) % (W + 100) - 50, y = (i * 53 + this.frame * 22) % H; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 6, y + 22); g.stroke(); }
      g.restore();
    }
    this.drawAnnouncer(g);
    if (this.cutin) this.drawCutin(g);
    this.fx.drawScreen(g);
  }

  drawBeam(g, f) {
    const y0 = f.y - 205 * f.k, y1 = f.y - 105 * f.k;
    const x0 = f.x + f.facing * 50, x1 = f.facing > 0 ? W + 50 : -50;
    const t = f.beam.t;
    g.save();
    const grad = g.createLinearGradient(0, y0, 0, y1);
    const cyan = f.char.super.color === 'cyan';
    const edge = cyan ? 'rgba(60,200,255,0)' : 'rgba(255,154,31,0)', mid = cyan ? 'rgba(120,230,255,.75)' : 'rgba(255,200,80,.75)', core = cyan ? 'rgba(235,255,255,.95)' : 'rgba(255,255,230,.95)';
    grad.addColorStop(0, edge); grad.addColorStop(0.3, mid); grad.addColorStop(0.5, core); grad.addColorStop(0.7, mid); grad.addColorStop(1, edge);
    g.fillStyle = grad;
    const wob = Math.sin(t * 0.7) * 6;
    g.fillRect(Math.min(x0, x1), y0 - wob, Math.abs(x1 - x0), y1 - y0 + wob * 2);
    const words = f.char.super.words || ['BHAIYON', 'AUR', 'BEHNO', 'VIKAS', 'NAYA', 'SAPNA', 'MERE', 'PYAARE', 'VOTERS', 'TAALIYAN', 'ZINDABAD', 'BLAH', 'BLAH', 'BLAH'];
    g.font = '26px Anton, Impact'; g.textAlign = 'center';
    for (let i = 0; i < 8; i++) {
      const prog = ((t * 14 + i * 140) % 1300);
      const x = f.x + f.facing * (60 + prog);
      g.fillStyle = cyan ? '#003a4a' : '#4a1a00'; g.fillText(words[(i + (t >> 4)) % words.length], x, (y0 + y1) / 2 + 9 + Math.sin(i * 2 + t * 0.3) * 18);
    }
    g.restore();
  }

  drawTape(g, f) {
    g.save(); g.strokeStyle = '#d0262b'; g.lineWidth = 7;
    for (let i = 0; i < 4; i++) {
      const y = f.y - 50 - i * 45 * f.k;
      g.beginPath(); g.ellipse(f.x, y, 40, 10, 0.15 * (i % 2 ? 1 : -1), 0, 7); g.stroke();
    }
    g.restore();
  }

  drawProjectile(g, p) {
    g.save(); g.translate(p.x, p.y);
    const dir = Math.sign(p.vx) || 1;
    switch (p.kind) {
      case 'wave':
        for (let i = 0; i < 4; i++) {
          g.strokeStyle = `rgba(255,${180 + i * 15},80,${0.9 - i * 0.2})`; g.lineWidth = 6 - i;
          g.beginPath(); g.arc(-dir * i * 16, 0, 26 + i * 10 + Math.sin(p.t * 0.5) * 3, -0.9, 0.9); if (dir < 0) { g.beginPath(); g.arc(-dir * i * 16, 0, 26 + i * 10, Math.PI - 0.9, Math.PI + 0.9); } g.stroke();
        }
        g.fillStyle = '#ffd34d'; g.font = '20px Anton'; g.textAlign = 'center'; g.fillText('BLAH!', 0, 6);
        break;
      case 'gift': {
        g.rotate(p.t * 0.12 * dir);
        const gg = g.createLinearGradient(-p.w / 2, -p.h / 2, p.w / 2, p.h / 2);
        const hue = ['#e84b3c', '#2d9cdb', '#9b51e0', '#27ae60'][(p.x | 0) % 4 < 0 ? 0 : (p.x | 0) % 4];
        gg.addColorStop(0, shade(hue, 0.3)); gg.addColorStop(1, shade(hue, -0.3));
        g.fillStyle = gg; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        g.fillStyle = '#ffd34d'; g.fillRect(-3, -p.h / 2, 6, p.h); g.fillRect(-p.w / 2, -3, p.w, 6);
        g.beginPath(); g.ellipse(-6, -p.h / 2 - 4, 7, 5, -0.5, 0, 7); g.ellipse(6, -p.h / 2 - 4, 7, 5, 0.5, 0, 7); g.fill();
        g.font = '10px Anton'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('FREE', 0, p.h / 2 - 3);
        break;
      }
      case 'file':
        g.rotate(p.t * 0.35 * dir);
        g.fillStyle = '#d9b26a'; g.strokeStyle = '#7a5a20'; g.lineWidth = 2;
        g.fillRect(-22, -15, 44, 30); g.strokeRect(-22, -15, 44, 30);
        g.fillStyle = '#c0392b'; g.fillRect(-22, -3, 44, 6);
        for (let i = 0; i < 3; i++) { g.fillStyle = '#fff'; g.fillRect(-18 + i * 2, -13 - i * 2, 36, 4); }
        break;
      case 'cement':
        g.rotate(p.t * 0.1 * dir);
        g.fillStyle = '#b8b2a6'; g.strokeStyle = '#5e5850'; g.lineWidth = 2;
        g.beginPath(); g.roundRect(-23, -18, 46, 36, 8); g.fill(); g.stroke();
        g.fillStyle = '#c0392b'; g.font = '11px Anton'; g.textAlign = 'center'; g.fillText('CEMENT', 0, 4);
        g.fillStyle = 'rgba(220,215,205,.6)'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-dir * (28 + i * 10), (i - 1) * 6, 6 - i, 0, 7); g.fill(); }
        break;
      case 'crack':
        g.strokeStyle = '#2a1a10'; g.lineWidth = 4; g.beginPath();
        for (let i = 0; i < 6; i++) { g.moveTo(-dir * i * 12, 14); g.lineTo(-dir * i * 12 + 6, 14 - 8 - (i % 2) * 10); }
        g.stroke();
        g.fillStyle = '#7a5a40'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc((Math.random() - 0.5) * 50, -Math.random() * 30, 4, 0, 7); g.fill(); }
        break;
      case 'flash': {
        const a = 1 - p.t / p.life;
        const rg = g.createRadialGradient(0, 0, 4, 0, 0, 80);
        rg.addColorStop(0, `rgba(255,255,255,${a})`); rg.addColorStop(0.4, `rgba(180,230,255,${a * 0.7})`); rg.addColorStop(1, 'rgba(180,230,255,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 80, 0, 7); g.fill();
        g.fillStyle = `rgba(0,0,0,${a})`; g.font = '18px Anton'; g.textAlign = 'center'; g.fillText('📸 CLICK!', 0, 6);
        break;
      }
      case 'ticket':
        g.rotate(Math.sin(p.t * 0.4) * 0.2);
        g.fillStyle = '#f5f0e0'; g.fillRect(-22, -11, 44, 22);
        g.strokeStyle = '#e33b3b'; g.lineWidth = 3; g.beginPath(); g.moveTo(-18, -8); g.lineTo(18, 8); g.moveTo(18, -8); g.lineTo(-18, 8); g.stroke();
        g.fillStyle = '#111'; g.font = '9px Anton'; g.textAlign = 'center'; g.fillText('TICKET', 0, 3);
        break;
      case 'tape':
        g.strokeStyle = '#d0262b'; g.lineWidth = 10;
        g.beginPath(); for (let i = 0; i < 6; i++) { const yy = -70 + i * 28; g.moveTo(-dir * 50, yy + Math.sin(p.t * 0.5 + i) * 10); g.quadraticCurveTo(0, yy - 12, dir * 30, yy); } g.stroke();
        g.fillStyle = '#fff'; g.font = '16px Anton'; g.textAlign = 'center'; g.fillText('RED TAPE', 0, 0);
        break;
      case 'like':
        g.rotate(Math.sin(p.t * 0.3) * 0.3);
        g.fillStyle = p.t % 10 < 5 ? '#ff4f7a' : '#4fc3ff';
        g.beginPath(); g.moveTo(0, 12); g.bezierCurveTo(-22, -4, -10, -20, 0, -8); g.bezierCurveTo(10, -20, 22, -4, 0, 12); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
        break;
      case 'horse': drawHorse(g, dir, p.t); break;
      case 'bullet':
        g.fillStyle = 'rgba(255,220,120,.35)'; g.fillRect(-dir * 46, -2, dir * 40, 4);
        g.fillStyle = '#d9b44a'; g.beginPath(); g.ellipse(0, 0, 9, 4, 0, 0, 7); g.fill();
        g.fillStyle = '#8a6a20'; g.fillRect(-dir * 9 - (dir < 0 ? 0 : 0), -4, dir * 4, 8);
        break;
      case 'briefcase':
        g.rotate(p.t * 0.12 * dir);
        g.fillStyle = '#4a2e16'; g.strokeStyle = '#1a0e06'; g.lineWidth = 2;
        g.beginPath(); g.roundRect(-20, -14, 40, 28, 4); g.fill(); g.stroke();
        g.fillStyle = '#d4af37'; g.fillRect(-14, -4, 6, 4); g.fillRect(8, -4, 6, 4);
        g.strokeStyle = '#ffcc33'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -14); g.quadraticCurveTo(6, -24, 2, -30); g.stroke();
        g.fillStyle = p.t % 6 < 3 ? '#fff4a0' : '#ff8a1a'; g.beginPath(); g.arc(2, -30, 3, 0, 7); g.fill();
        break;
      case 'grenade':
        g.rotate(p.t * 0.2 * dir);
        g.fillStyle = '#4b5320'; g.beginPath(); g.ellipse(0, 2, 11, 13, 0, 0, 7); g.fill();
        g.strokeStyle = '#2a3010'; g.lineWidth = 1.2; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-10, i * 6 + 2); g.lineTo(10, i * 6 + 2); g.stroke(); }
        g.fillStyle = '#7a7f84'; g.fillRect(-4, -15, 8, 6);
        g.strokeStyle = '#9aa0a6'; g.lineWidth = 2; g.beginPath(); g.arc(7, -14, 4, 0, 7); g.stroke();
        break;
      case 'evidence':
        g.rotate(Math.sin(p.t * 0.3) * 0.3);
        g.fillStyle = '#f2efe6'; g.fillRect(-20, -16, 40, 32);
        g.fillStyle = '#3a3a44'; g.fillRect(-16, -12, 32, 20);
        g.fillStyle = '#c9c4b8'; g.beginPath(); g.arc(0, -4, 5, 0, 7); g.fill(); g.fillRect(-7, 2, 14, 6);
        g.fillStyle = '#d0262b'; g.font = '9px Anton'; g.textAlign = 'center'; g.fillText('EXHIBIT A', 0, 14);
        break;
      case 'chi': {
        g.globalCompositeOperation = 'lighter';
        const rg = g.createRadialGradient(0, 0, 4, 0, 0, 46);
        rg.addColorStop(0, 'rgba(255,255,255,.95)'); rg.addColorStop(0.4, 'rgba(90,210,255,.75)'); rg.addColorStop(1, 'rgba(90,210,255,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 46, 0, 7); g.fill();
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = 'rgba(0,60,90,.8)'; g.font = '20px Anton'; g.textAlign = 'center'; g.fillText('HAI-YA!', 0, 7);
        break;
      }
    }
    g.restore();
  }

  drawBubble(g, f) {
    const b = f.bubble;
    const a = Math.min(1, b.t / 12, (b.max - b.t + 1) / 6);
    const hx = Math.max(160, Math.min(W - 160, f.x));
    const hy = Math.max(120, f.y - 270 * f.k);
    g.save(); g.globalAlpha = a;
    g.font = '600 17px Inter, sans-serif';
    const words = b.text.split(' '); const lines = []; let cur = '';
    for (const w of words) { const test = cur ? cur + ' ' + w : w; if (g.measureText(test).width > 250) { lines.push(cur); cur = w; } else cur = test; }
    lines.push(cur);
    const wdt = Math.max(...lines.map((l) => g.measureText(l).width)) + 28, hgt = lines.length * 22 + 16;
    const bx = hx - wdt / 2, by = hy - hgt;
    g.fillStyle = '#fffaf0'; g.strokeStyle = '#1a0f08'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(bx, by, wdt, hgt, 12); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(f.x - 10, by + hgt - 1); g.lineTo(f.x + 4, by + hgt + 18); g.lineTo(f.x + 14, by + hgt - 1); g.closePath();
    g.fill(); g.beginPath(); g.moveTo(f.x - 10, by + hgt); g.lineTo(f.x + 4, by + hgt + 18); g.lineTo(f.x + 14, by + hgt); g.stroke();
    g.fillStyle = '#1a0f08'; g.textAlign = 'center';
    lines.forEach((l, i) => g.fillText(l, hx, by + 28 + i * 22));
    g.restore();
  }

  drawHUD(g) {
    const [a, b] = this.f;
    const barW = 470, barH = 26, top = 30;
    for (const f of this.f) {
      const left = f.side === 0;
      const x = left ? 70 : W - 70 - barW;
      // frame
      g.fillStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.roundRect(x - 4, top - 4, barW + 8, barH + 8, 6); g.fill();
      const pct = Math.max(0, f.hp / f.maxHp), gp = Math.max(0, f.ghostHp / f.maxHp);
      g.fillStyle = '#7a1010';
      if (left) g.fillRect(x + barW * (1 - gp), top, barW * gp, barH); else g.fillRect(x, top, barW * gp, barH);
      const hg = g.createLinearGradient(0, top, 0, top + barH);
      const col = pct > 0.5 ? ['#ffe27a', '#f2a11f'] : pct > 0.25 ? ['#ffb36b', '#e0661a'] : ['#ff7a6b', '#c62222'];
      hg.addColorStop(0, col[0]); hg.addColorStop(1, col[1]);
      g.fillStyle = hg;
      if (left) g.fillRect(x + barW * (1 - pct), top, barW * pct, barH); else g.fillRect(x, top, barW * pct, barH);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x, top, barW, 6);
      // portrait
      const pxc = left ? 34 : W - 34;
      g.save(); g.beginPath(); g.arc(pxc, top + 14, 30, 0, 7); g.fillStyle = shade(f.char.color, -0.5); g.fill(); g.clip();
      g.drawImage(this.hudPortrait(f), pxc - 32, top + 14 - 32, 64, 64);
      g.restore();
      g.strokeStyle = f.char.color; g.lineWidth = 3; g.beginPath(); g.arc(pxc, top + 14, 30, 0, 7); g.stroke();
      // name
      g.font = '24px Teko, sans-serif'; g.fillStyle = '#fff'; g.textAlign = left ? 'left' : 'right';
      g.lineWidth = 4; g.strokeStyle = '#000';
      const nm = f.char.name + (this.cpu?.[f.side] ? '  · CPU' : '');
      g.strokeText(nm, left ? x : x + barW, top + barH + 24); g.fillText(nm, left ? x : x + barW, top + barH + 24);
      // round wins as little chairs
      for (let i = 0; i < 2; i++) {
        const cx = left ? x + barW - 14 - i * 26 : x + 14 + i * 26, cy = top + barH + 16;
        drawChair(g, cx, cy, i < f.wins);
      }
      // special cooldown pips: ↓↘→P · ↓↘→K · ↓↓P
      ['fwdP', 'fwdK', 'downP'].forEach((slot, i) => {
        if (!f.specials[slot]) return;
        const cx = left ? x + 12 + i * 32 : x + barW - 12 - i * 32, cy = top + barH + 46;
        const cd = f.cool[slot] / 180;
        g.beginPath(); g.arc(cx, cy, 11, 0, 7); g.fillStyle = cd > 0 ? 'rgba(0,0,0,.6)' : f.char.color; g.fill();
        if (cd > 0) { g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cd)); g.closePath(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fill(); }
        g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 11, 0, 7); g.stroke();
        g.font = '13px Teko'; g.textAlign = 'center'; g.fillStyle = cd > 0 ? '#aaa' : '#000';
        g.fillText(['↘P', '↘K', '↙P'][i], cx, cy + 4);
      });
      // meter
      // on phones the joystick and buttons own the bottom corners, so the meter moves up under the name
      const mW = this.touchLayout ? 260 : 300, mx = left ? 70 : W - 70 - mW, my = this.touchLayout ? top + barH + 86 : H - 44;
      g.fillStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.roundRect(mx - 3, my - 3, mW + 6, 20, 5); g.fill();
      const full = f.meter >= 1000;
      const mg = g.createLinearGradient(mx, 0, mx + mW, 0);
      mg.addColorStop(0, '#3a8dff'); mg.addColorStop(1, full ? '#ffe27a' : '#7dd3ff');
      g.fillStyle = full ? (this.frame % 20 < 10 ? '#ffe27a' : '#ff9a1f') : mg;
      const mp = Math.min(1, f.meter / 1000);
      if (left) g.fillRect(mx, my, mW * mp, 14); else g.fillRect(mx + mW * (1 - mp), my, mW * mp, 14);
      g.font = '20px Teko'; g.fillStyle = full ? '#ffe27a' : '#fff'; g.textAlign = left ? 'left' : 'right';
      g.strokeStyle = '#000'; g.lineWidth = 4;
      const label = full ? `VOTE BANK FULL · ${f.char.super.name}!` : 'VOTE BANK';
      g.strokeText(label, left ? mx : mx + mW, my - 6); g.fillText(label, left ? mx : mx + mW, my - 6);
      // combo
      if (f.combo >= 2 && this.f[1 - f.side].state !== 'idle' && ['hitstun', 'knockdown', 'bound', 'dizzy', 'down'].includes(this.f[1 - f.side].state)) {
        g.save(); g.font = '46px Anton, Impact'; g.textAlign = left ? 'left' : 'right';
        g.lineWidth = 7; g.strokeStyle = '#000'; g.fillStyle = f.char.color;
        const tx = left ? 40 : W - 40;
        g.strokeText(`${f.combo} HITS`, tx, 200); g.fillText(`${f.combo} HITS`, tx, 200);
        g.font = '22px Teko'; g.fillStyle = '#fff'; g.strokeText(f.combo >= 5 ? 'LANDSLIDE!' : f.combo >= 3 ? 'MAJORITY!' : 'LEAD!', tx, 226); g.fillText(f.combo >= 5 ? 'LANDSLIDE!' : f.combo >= 3 ? 'MAJORITY!' : 'LEAD!', tx, 226);
        g.restore();
      }
    }
    // timer
    g.fillStyle = 'rgba(0,0,0,.7)'; g.beginPath(); g.roundRect(W / 2 - 42, 18, 84, 62, 8); g.fill();
    g.strokeStyle = '#ffc94a'; g.lineWidth = 2; g.stroke();
    g.font = '52px Anton, Impact'; g.textAlign = 'center'; g.fillStyle = this.timer <= 10 ? '#ff6b5e' : '#fff';
    g.fillText(String(Math.max(0, this.timer)), W / 2, 72);
    g.font = '16px Teko'; g.fillStyle = '#ffc94a'; g.fillText(`ROUND ${this.round}`, W / 2, 96);
    // live ticker
    g.fillStyle = 'rgba(160,20,20,.85)'; g.fillRect(0, H - 18, W, 18);
    g.fillStyle = '#fff'; g.font = '15px Teko'; g.textAlign = 'left';
    const tick = `● LIVE  ·  ${a.char.name} vs ${b.char.name}  ·  Opposition walks out  ·  Exit polls predict "something will happen"  ·  Chai rate unchanged  ·  `;
    const off = (this.frame * 1.2) % 900;
    g.fillText(tick + tick, -off, H - 4);
  }

  // The HUD portraits never change during a match, so render each once.
  hudPortrait(f) {
    if (f._hud) return f._hud;
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const cg = c.getContext('2d'); cg.scale(2, 2);
    const left = f.side === 0;
    drawPortrait(cg, f.look, 32 - 2 * (left ? 1 : -1), 40, 90, { facing: left ? 1 : -1 });
    f._hud = c;
    return c;
  }

  drawAnnouncer(g) {
    let text = null, sub = null, col = '#ffc94a';
    if (this.phase === 'intro') { text = null; sub = 'PRESS PUNCH / ENTER TO SKIP'; }
    if (this.phase === 'ready') {
      if (this.phaseT < 75) { text = this.round >= 3 && this.f[0].wins === 1 && this.f[1].wins === 1 ? 'FINAL ROUND' : `ROUND ${this.round}`; }
      else { text = 'FIGHT!'; col = '#ff6b3a'; }
    }
    if (this.phase === 'ko' && this.phaseT < 140) { text = this.koWinner ? 'K.O.' : 'DOUBLE K.O.'; col = '#ff3b3b'; sub = this.phaseT > 40 && this.koWinner?.hp >= this.koWinner?.maxHp ? 'PERFECT · UNOPPOSED!' : null; }
    if (this.phase === 'timeup' && this.phaseT < 140) { text = 'TIME!'; sub = this.koWinner ? 'DECIDED BY EXIT POLL' : 'HUNG ASSEMBLY'; }
    if ((this.phase === 'ko' || this.phase === 'timeup') && this.phaseT >= 140 && this.koWinner) { text = `${this.koWinner.char.name.split(' ')[0]} WINS`; col = this.koWinner.char.color; }
    if (text) {
      const pulse = 1 + Math.max(0, 0.4 - (this.phase === 'ready' ? (this.phaseT % 75) : this.phaseT) * 0.03);
      g.save(); g.translate(W / 2, H / 2 - 40); g.scale(pulse, pulse);
      g.font = '110px Anton, Impact'; g.textAlign = 'center';
      g.lineWidth = 14; g.strokeStyle = '#1a0805'; g.strokeText(text, 0, 30);
      const tg = g.createLinearGradient(0, -60, 0, 30); tg.addColorStop(0, '#fff6d8'); tg.addColorStop(0.5, col); tg.addColorStop(1, shade(col, -0.4));
      g.fillStyle = tg; g.fillText(text, 0, 30);
      g.restore();
    }
    if (sub) {
      g.font = '28px Teko'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 5;
      g.strokeText(sub, W / 2, this.phase === 'intro' ? H - 60 : H / 2 + 40); g.fillText(sub, W / 2, this.phase === 'intro' ? H - 60 : H / 2 + 40);
    }
  }

  drawCutin(g) {
    const c = this.cutin, f = c.f, t = c.t;
    const inT = Math.min(1, t / 10), outT = t > 58 ? (t - 58) / 12 : 0;
    const left = f.side === 0;
    g.save();
    g.fillStyle = `rgba(0,0,0,${0.55 * (1 - outT)})`; g.fillRect(0, 0, W, H);
    const bandY = 220, bandH = 250;
    const slide = (1 - inT) * W * (left ? -1 : 1) + outT * W * (left ? 1 : -1);
    g.translate(slide, 0);
    g.save();
    g.beginPath(); g.moveTo(0, bandY + 40); g.lineTo(W, bandY); g.lineTo(W, bandY + bandH - 40); g.lineTo(0, bandY + bandH); g.closePath();
    const bg = g.createLinearGradient(0, bandY, 0, bandY + bandH);
    bg.addColorStop(0, shade(f.char.color, -0.2)); bg.addColorStop(1, shade(f.char.color, -0.65));
    g.fillStyle = bg; g.fill(); g.clip();
    // speed lines
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 3;
    for (let i = 0; i < 26; i++) { const y = bandY + ((i * 37 + t * 9) % bandH); g.beginPath(); g.moveTo(((i * 131 + t * 40) % (W + 400)) - 200, y); g.lineTo(((i * 131 + t * 40) % (W + 400)) - 20, y); g.stroke(); }
    // big portrait
    const px = left ? 260 : W - 260;
    drawPortrait(g, f.look, px, bandY + 125, 330, { facing: left ? 1 : -1, mouth: 0.6 + Math.sin(t * 0.7) * 0.3, eyes: 'wide' });
    g.restore();
    g.font = '72px Anton, Impact'; g.textAlign = left ? 'left' : 'right';
    const tx = left ? 520 : W - 520;
    g.lineWidth = 10; g.strokeStyle = '#1a0805'; g.strokeText(f.char.super.name, tx, bandY + 130);
    g.fillStyle = '#fff6d8'; g.fillText(f.char.super.name, tx, bandY + 130);
    g.font = '28px Teko'; g.fillStyle = '#ffe27a'; g.fillText('SUPER · VOTE BANK UNLEASHED', tx, bandY + 168);
    g.restore();
  }
}

const NORMALS_GRAB_BOX = [0, 80, 60, 200];

function drawChair(g, x, y, filled) {
  g.save(); g.translate(x, y);
  g.fillStyle = filled ? '#ffc94a' : 'rgba(255,255,255,.18)'; g.strokeStyle = filled ? '#7a4a0a' : 'rgba(255,255,255,.4)'; g.lineWidth = 1.5;
  g.beginPath(); g.roundRect(-8, -12, 16, 12, 2); g.fill(); g.stroke();
  g.fillRect(-9, 0, 18, 4); g.strokeRect(-9, 0, 18, 4);
  g.fillRect(-8, 4, 3, 7); g.fillRect(5, 4, 3, 7);
  g.restore();
}

function drawHorse(g, dir, t) {
  g.scale(dir, 1);
  const leg = Math.sin(t * 0.6) * 18;
  const body = g.createLinearGradient(0, -50, 0, 30); body.addColorStop(0, '#8a5a32'); body.addColorStop(1, '#4a2a14');
  g.fillStyle = body; g.strokeStyle = '#2a170a'; g.lineWidth = 2;
  [[-40, leg], [-25, -leg], [35, -leg], [50, leg]].forEach(([lx, d]) => { g.save(); g.translate(lx, 10); g.rotate(d * 0.02); g.fillRect(-5, 0, 10, 50); g.fillStyle = '#222'; g.fillRect(-6, 46, 12, 8); g.restore(); g.fillStyle = body; });
  g.beginPath(); g.ellipse(0, 0, 66, 32, 0, 0, 7); g.fill(); g.stroke();
  g.save(); g.translate(56, -24); g.rotate(-0.7);
  g.beginPath(); g.ellipse(0, -18, 15, 32, 0, 0, 7); g.fill(); g.stroke(); g.restore();
  g.beginPath(); g.ellipse(84, -56, 26, 13, 0.4, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#1a0f08'; g.beginPath(); g.moveTo(40, -40); g.quadraticCurveTo(60, -80, 76, -66); g.lineTo(60, -40); g.fill();
  g.beginPath(); g.moveTo(-62, -8); g.quadraticCurveTo(-90, 0 + leg * 0.3, -84, 30); g.lineWidth = 7; g.strokeStyle = '#1a0f08'; g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(86, -60, 3, 0, 7); g.fill();
  // a bag of cash on the saddle, naturally
  g.fillStyle = '#c9a23a'; g.beginPath(); g.ellipse(-6, -36, 16, 14, 0, 0, 7); g.fill(); g.strokeStyle = '#6b4a10'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#2a7a2a'; g.font = '16px Anton'; g.textAlign = 'center'; g.fillText('₹', -6, -30);
}
