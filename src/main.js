import { Input, Pad, isTouchDevice } from './input.js';
import { audio } from './audio.js';
import { ROSTER, altLook } from './roster.js';
import { STAGES, StageRenderer, W, H, GROUND } from './stages.js';
import { drawFighter, drawPortrait, idlePose, POSES, mkPose, setRenderScale, setQuality, getQuality } from './rig.js';
import { Fight } from './fight.js';
import { CPU } from './ai.js';

const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
const $ = (s) => document.querySelector(s);
const input = new Input();
input.bindTouch(document.getElementById('touch'));
const touch = isTouchDevice();
// Render at higher resolution for crisp characters (a bit lower on phones to keep 60fps).
const RS = touch ? 1.25 : 1.5;
canvas.width = 1280 * RS; canvas.height = 720 * RS;
setRenderScale(RS);

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const state = {
  screen: 'title',
  mode: 'cpu',
  p1: 0, p2: 1, picking: 0, tab: 'neta',
  stage: store.get('kk-stage', 0),
  level: store.get('kk-level', 'normal'),
  bossUnlocked: store.get('kk-boss', false),
  fight: null, paused: false, cpus: null, pads: null,
  t: 0,
};

const backdrop = { stage: new StageRenderer('rally') };

// ---------- screens ----------
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + id));
  state.screen = id;
  document.getElementById('touch').classList.toggle('on', touch && id === 'fight');
}
function showModal(id, on) { document.getElementById('screen-' + id).classList.toggle('active', on); }

document.addEventListener('click', (e) => {
  audio.unlock();
  const a = e.target.closest('[data-action]')?.dataset.action;
  if (!a) { if (state.screen === 'title' && !e.target.closest('.title-menu') && !e.target.closest('.screen.modal')) goSelect('cpu'); return; }
  audio.play('select');
  switch (a) {
    case 'vs-cpu': goSelect('cpu'); break;
    case 'vs-2p': goSelect('2p'); break;
    case 'how': showModal('how', true); break;
    case 'rankings': openRankings(); break;
    case 'close-rankings': showModal('rankings', false); break;
    case 'close-how': showModal('how', false); break;
    case 'back': show('title'); break;
    case 'fight': startFight(); break;
    case 'pause': pause(true); break;
    case 'resume': pause(false); break;
    case 'toggle-sound': audio.setMuted(!audio.muted); syncToggles(); break;
    case 'toggle-voice': audio.setVoice(!audio.voiceOn); syncToggles(); break;
    case 'quit': quitToSelect(); break;
    case 'rematch': showModal('results', false); startFight(); break;
  }
});

function syncToggles() {
  $('#btn-sound').textContent = 'SOUND: ' + (audio.muted ? 'OFF' : 'ON');
  $('#btn-voice').textContent = 'VOICE LINES: ' + (audio.voiceOn ? 'ON' : 'OFF');
}
syncToggles();

function goSelect(mode) {
  audio.unlock();
  if (touch && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  state.mode = mode;
  input.twoPlayer = mode === '2p';
  state.picking = 0;
  $('#select-mode').textContent = mode === 'cpu' ? '1P vs CPU' : '1P vs 2P · LOCAL';
  $('#preview-p2 .pv-tag').textContent = mode === 'cpu' ? 'CPU' : 'P2';
  $('#opt-cpu-wrap').style.display = mode === 'cpu' ? '' : 'none';
  buildSelect();
  show('select');
}

function available(i) { return !ROSTER[i].boss || state.bossUnlocked; }

function buildSelect() {
  const grid = $('#roster-grid');
  grid.innerHTML = '';
  ROSTER.forEach((c, i) => {
    if ((c.group || 'neta') !== state.tab) return;
    const cell = document.createElement('div');
    cell.dataset.i = i;
    cell.className = 'cell' + (available(i) ? '' : ' locked');
    const cv = document.createElement('canvas'); cv.width = 160; cv.height = 160;
    const cg = cv.getContext('2d');
    const bg = cg.createRadialGradient(80, 70, 10, 80, 80, 110); bg.addColorStop(0, c.color + '88'); bg.addColorStop(1, '#120804');
    cg.fillStyle = bg; cg.fillRect(0, 0, 160, 160);
    drawPortrait(cg, c.look, 74, 62, 150, {});
    cell.appendChild(cv);
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = c.boss && !state.bossUnlocked ? 'BOSS · ???' : c.name; cell.appendChild(nm);
    cell.addEventListener('click', (e) => {
      e.stopPropagation(); audio.unlock();
      if (!available(i)) { audio.play('block'); flashHint('Beat any neta in VS CPU to unlock the boss.'); return; }
      audio.play('select');
      if (state.picking === 0) { state.p1 = i; state.picking = 1; } else { state.p2 = i; state.picking = 0; }
      refreshSelect();
    });
    grid.appendChild(cell);
  });
  const seg = (el, items, cur, onPick) => {
    el.innerHTML = '';
    items.forEach(([v, label]) => {
      const b = document.createElement('button'); b.textContent = label; b.className = v === cur ? 'on' : '';
      b.addEventListener('click', (e) => { e.stopPropagation(); audio.play('select'); onPick(v); });
      el.appendChild(b);
    });
  };
  seg($('#roster-tabs'), [['neta', 'NETAS'], ['filmy', 'FILMY']], state.tab, (v) => { state.tab = v; buildSelect(); });
  seg($('#opt-stage'), STAGES.map((s, i) => [i, s.name]), state.stage, (v) => { state.stage = v; store.set('kk-stage', v); buildSelect(); });
  seg($('#opt-cpu'), [['easy', 'EASY'], ['normal', 'NORMAL'], ['hard', 'HARD']], state.level, (v) => { state.level = v; store.set('kk-level', v); buildSelect(); });
  backdrop.stage = new StageRenderer(STAGES[state.stage].id);
  refreshSelect();
}

let hintTimer;
function flashHint(t) { const h = $('#select-hint'); const old = h.dataset.orig || h.textContent; h.dataset.orig = old; h.textContent = t; h.style.opacity = 1; clearTimeout(hintTimer); hintTimer = setTimeout(() => { h.textContent = old; h.style.opacity = ''; }, 2200); }

function refreshSelect() {
  document.querySelectorAll('.cell').forEach((c) => {
    const i = Number(c.dataset.i);
    c.classList.toggle('p1', i === state.p1); c.classList.toggle('p2', i === state.p2);
    c.querySelectorAll('.badge').forEach((b) => b.remove());
    if (i === state.p1) { const b = document.createElement('div'); b.className = 'badge b1'; b.textContent = 'P1'; c.appendChild(b); }
    if (i === state.p2) { const b = document.createElement('div'); b.className = 'badge b2'; b.textContent = state.mode === 'cpu' ? 'CPU' : 'P2'; c.appendChild(b); }
  });
  [['#preview-p1', state.p1], ['#preview-p2', state.p2]].forEach(([sel, i]) => {
    const c = ROSTER[i];
    $(sel + ' .pv-name').textContent = c.name;
    $(sel + ' .pv-title').textContent = c.title;
    $(sel + ' .pv-quote').textContent = '"' + c.lines.intro[0] + '"';
    $(sel + ' .pv-name').style.color = c.color;
  });
}

function drawPreviews() {
  [['#preview-p1', state.p1, 1], ['#preview-p2', state.p2, -1]].forEach(([sel, i, facing]) => {
    const cv = $(sel + ' canvas'); const cg = cv.getContext('2d');
    cg.clearRect(0, 0, cv.width, cv.height);
    const c = ROSTER[i];
    const look = state.p1 === state.p2 && sel === '#preview-p2' ? altLook(c.look) : c.look;
    cg.fillStyle = 'rgba(0,0,0,.35)'; cg.beginPath(); cg.ellipse(180, 372, 90, 14, 0, 0, 7); cg.fill();
    drawFighter(cg, look, idlePose(state.t), 180, 370, facing, { scale: 1.38 });
  });
}

// ---------- keyboard ----------
input.onKey((code) => {
  audio.unlock();
  if (code === 'KeyM') audio.toggleMusic();
  if (code === 'KeyN') { audio.setMuted(!audio.muted); syncToggles(); }
  if (code === 'KeyV') { audio.setVoice(!audio.voiceOn); syncToggles(); }
  if (state.screen === 'title' && (code === 'Enter' || code === 'Space')) goSelect('cpu');
  else if (state.screen === 'select') {
    const n = ROSTER.length;
    const step = (cur, d) => { let v = cur; do { v = (v + d + n) % n; } while (!available(v)); return v; };
    if (code === 'ArrowLeft' || code === 'KeyA') { state.p1 = step(state.p1, -1); audio.play('select'); refreshSelect(); }
    if (code === 'ArrowRight' || code === 'KeyD') { state.p1 = step(state.p1, 1); audio.play('select'); refreshSelect(); }
    if (code === 'ArrowUp' || code === 'KeyW') { state.p2 = step(state.p2, -1); audio.play('select'); refreshSelect(); }
    if (code === 'ArrowDown' || code === 'KeyS') { state.p2 = step(state.p2, 1); audio.play('select'); refreshSelect(); }
    if (code === 'KeyT') { state.stage = (state.stage + 1) % STAGES.length; store.set('kk-stage', state.stage); buildSelect(); }
    if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') { state.level = ['easy', 'normal', 'hard'][+code.slice(-1) - 1]; store.set('kk-level', state.level); buildSelect(); }
    if (code === 'Enter') startFight();
    if (code === 'Escape') show('title');
  } else if (state.screen === 'fight') {
    if (code === 'Escape' || code === 'KeyP') pause(!state.paused);
    if (state.fight?.phase === 'intro' && (code === 'Enter' || code === 'KeyJ' || code === 'Space')) state.fight.skipIntro();
  }
});

// ---------- fight ----------
function startFight() {
  audio.unlock();
  audio.play('confirm');
  const c1 = ROSTER[state.p1], c2 = ROSTER[state.p2];
  const looks = [c1.look, state.p1 === state.p2 ? altLook(c2.look) : c2.look];
  state.pads = [new Pad(), new Pad()];
  state.cpus = [null, state.mode === 'cpu' ? new CPU(state.level) : null];
  state.fight = new Fight({
    chars: [c1, c2], looks, pads: state.pads, stage: STAGES[state.stage].id,
    cpu: state.cpus, onEnd: onMatchEnd,
  });
  state.fight.touchLayout = touch;
  state.paused = false;
  showModal('pause', false); showModal('results', false);
  show('fight');
  audio.startMusic(STAGES[state.stage].music);
}

function pause(on) {
  if (state.screen !== 'fight' || !state.fight || state.fight.phase === 'over') return;
  state.paused = on;
  showModal('pause', on);
  if (on) audio.stopMusic(); else audio.startMusic(STAGES[state.stage].music);
}

function quitToSelect() {
  state.fight = null; state.paused = false;
  showModal('pause', false); showModal('results', false);
  audio.stopMusic();
  if (window.speechSynthesis) speechSynthesis.cancel();
  buildSelect(); show('select');
}

const pick = (a) => a[(Math.random() * a.length) | 0];
function onMatchEnd(res) {
  audio.stopMusic();
  const youWon = res.winner && res.winner.side === 0;
  if (state.mode === 'cpu' && youWon && !state.bossUnlocked) { state.bossUnlocked = true; store.set('kk-boss', true); }
  const W_ = res.winner?.char.name || 'NOBODY';
  const L_ = res.loser?.char.name || 'EVERYBODY';
  const stage = STAGES.find((s) => s.id === res.stage);
  const heads = res.winner ? [
    `${W_} wins by landslide; ${L_} blames EVMs, weather and planetary positions`,
    `${L_} calls crushing defeat a "moral victory"`,
    `Shock result: ${W_} retains seat, chai stall reports record sales`,
    `${L_} demands re-fight; party spokesperson "unavailable for comment"`,
    `"Historic!" says ${W_}, for the fourth time this week`,
  ] : ['Hung verdict! Both netas claim victory, book separate resorts'];
  let head = pick(heads);
  if (res.stats.perfect) head = `${W_} wins unopposed; ${L_}'s deposit forfeited`;
  if (res.stats.timeout && res.winner) head = `Time runs out! Exit poll declares ${W_} winner on technicality`;
  if (res.stage === 'gully' && Math.random() < 0.4 && res.winner) head = `Stray cow halts traffic as ${W_} flattens ${L_} at pothole junction`;
  $('#res-head').textContent = head;
  postResult({
    winner: res.winner?.char.id ?? null, loser: res.loser?.char.id ?? null,
    mode: state.mode, level: state.mode === 'cpu' ? state.level : '', stage: res.stage,
    rounds: res.fighters[0].wins + res.fighters[1].wins, maxCombo: Math.max(...res.stats.maxCombo),
    perfect: res.stats.perfect, playerWon: state.mode === 'cpu' ? youWon : null, headline: head,
  });
  const combo = res.winner ? res.stats.maxCombo[res.winner.side] : 0;
  const supers = res.stats.supers[0] + res.stats.supers[1];
  $('#res-body').innerHTML = `
    <p><b>${stage.name.toUpperCase()} —</b> In proceedings that observers described as "exactly what we expected, but louder", ${W_} got the better of ${L_} in a ${res.fighters[0].wins + res.fighters[1].wins}-round contest.</p>
    <p>The longest combo of the evening ran to <b>${combo} hits</b>, and ${supers ? `<b>${supers}</b> super move${supers > 1 ? 's were' : ' was'} unleashed` : 'no super moves were used, disappointing the crowd'}. A committee has been formed to study the results; it will report back in 2047.</p>
    <p>${pick(['The opposition has demanded an inquiry.', 'Exit polls, as usual, were wrong.', 'A stray cow was later seen eating a campaign poster.', 'Free chai was promised; it did not arrive.'])} ${pick(['Sources say the mic is still on.', 'Both sides thanked the voters, the media, and nobody else.', 'Prime-time debates are expected to last six hours.'])}</p>`;
  $('#res-win').textContent = res.winner ? (state.mode === 'cpu' ? (youWon ? 'YOU WIN!' : 'YOU LOSE!') : `${res.winner.side === 0 ? 'P1' : 'P2'} WINS!`) : 'DRAW';
  $('#res-quote').textContent = res.winner ? `${res.winner.char.name}: "${pick(res.winner.char.lines.win)}"` : '';
  setTimeout(() => showModal('results', true), 400);
}

// ---------- online results (Turso via the server) ----------
// The static/offline build has no server; these calls then fail quietly.
function postResult(body) {
  try {
    fetch('/api/matches', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
  } catch {}
}

async function openRankings() {
  showModal('rankings', true);
  const sub = $('#rank-sub'), table = $('#rank-table'), news = $('#rank-news');
  sub.textContent = 'Counting votes…'; table.innerHTML = ''; news.innerHTML = '';
  try {
    const r = await fetch('/api/leaderboard', { cache: 'no-store' });
    if (!r.ok) throw new Error();
    const data = await r.json();
    sub.textContent = data.total ? `${data.total} match${data.total === 1 ? '' : 'es'} counted across all players` : 'No matches counted yet. Win one and top the table.';
    const byId = Object.fromEntries(ROSTER.map((c) => [c.id, c]));
    const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    table.innerHTML = '<tr><th>#</th><th>NETA</th><th>WINS</th><th>LOSSES</th><th>WIN %</th><th>BEST COMBO</th></tr>' +
      data.rows.map((row, i) => {
        const c = byId[row.id]; if (!c) return '';
        const played = row.wins + row.losses;
        const pct = played ? Math.round((row.wins / played) * 100) + '%' : '–';
        return `<tr><td class="pos">${i + 1}</td><td><span class="swatch" style="background:${c.color}"></span>${esc(c.name)}</td><td>${row.wins}</td><td>${row.losses}</td><td>${pct}</td><td>${row.bestCombo || '–'}</td></tr>`;
      }).join('');
    news.innerHTML = data.recent.map((n) => `<div>${esc(n.headline)}</div>`).join('');
  } catch {
    sub.textContent = 'Rankings are available on the online version of the game.';
  }
}

// ---------- loop ----------
let last = performance.now(), acc = 0;
const STEP = 1000 / 60;
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= STEP) { tick(); acc -= STEP; }
  render();
  requestAnimationFrame(frame);
}

function tick() {
  state.t++;
  const f = state.fight;
  if (state.screen === 'fight' && f && !state.paused && f.phase !== 'over') {
    for (let i = 0; i < 2; i++) {
      const cpu = state.cpus[i];
      let v;
      if (cpu) { cpu.think(f, f.f[i], f.f[1 - i]); v = cpu.out; } else v = input.read(i);
      state.pads[i].update(v);
    }
    if (f.phase === 'intro' && state.pads[0].pressed('punch')) f.skipIntro();
    f.update();
    const sb = document.querySelector('.tb.s');
    if (sb) sb.classList.toggle('ready', f.f[0].meter >= 1000);
  }
}

// Adaptive quality: if drawing a fight frame is consistently slow on this
// device, step the character lighting down so the game stays smooth.
const perf = { ema: 0, slow: 0 };
function render() {
  g.setTransform(RS, 0, 0, RS, 0, 0);
  if (state.screen === 'fight' && state.fight) {
    const t0 = performance.now();
    state.fight.draw(g);
    const dt = performance.now() - t0;
    perf.ema = perf.ema ? perf.ema * 0.95 + dt * 0.05 : dt;
    if (perf.ema > 13 && getQuality() > 0) {
      if (++perf.slow > 90) { setQuality(getQuality() - 1); perf.slow = 0; perf.ema = 0; }
    } else perf.slow = Math.max(0, perf.slow - 1);
    return;
  }
  // attract backdrop for menus
  backdrop.stage.draw(g, 0, 0, 0.3);
  if (state.screen === 'title') {
    const pool = ROSTER.filter((c) => !c.boss), k = Math.floor(state.t / 300);
    const a = pool[k % pool.length], b = pool[(k + 5) % pool.length];
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(330, GROUND + 2, 80, 12, 0, 0, 7); g.ellipse(950, GROUND + 2, 80, 12, 0, 0, 7); g.fill();
    const ph = state.t % 300;
    const pa = ph > 150 && ph < 175 ? POSES.jab : idlePose(state.t);
    const pb = ph > 200 && ph < 225 ? POSES.kick : idlePose(state.t + 30);
    drawFighter(g, a.look, pa, 330, GROUND, 1, { scale: 1.15 });
    drawFighter(g, b.look, pb, 950, GROUND, -1, { scale: 1.15 });
  }
  if (state.screen === 'select') { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, W, H); drawPreviews(); }
}
requestAnimationFrame(frame);

// show controls hint on touch devices
if (touch) document.querySelector('.press').textContent = 'TAP TO START';

// Expose for quick debugging in the console.
window.__kk = state;
window.__kkQuality = getQuality;
