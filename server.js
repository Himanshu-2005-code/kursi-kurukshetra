// Kursi Kurukshetra server: serves the static game and a small results API
// backed by Turso (libSQL). Without Turso credentials it falls back to a
// local SQLite file, so `npm start` works on any machine.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.env.PORT) || 3000;
const CHARS = new Set(['bhashan', 'manifesto', 'babu', 'thekedar', 'yuva', 'dalbadlu', 'highcommand']);
const STAGES = new Set(['house', 'rally', 'gully']);
const MODES = new Set(['cpu', '2p']);
const LEVELS = new Set(['easy', 'normal', 'hard', '']);

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  await db.execute(`CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    winner TEXT, loser TEXT, mode TEXT NOT NULL, level TEXT,
    stage TEXT NOT NULL, rounds INTEGER NOT NULL, max_combo INTEGER NOT NULL,
    perfect INTEGER NOT NULL DEFAULT 0, player_won INTEGER, headline TEXT
  )`);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_matches_created ON matches(created_at)');
}

// ---------- tiny per-IP rate limit for writes ----------
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 20;
}

function json(res, code, body) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readBody(req, max = 4096) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > max) throw new Error('too large'); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function postMatch(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
  if (limited(ip)) return json(res, 429, { error: 'Too many results. Try again in a minute.' });
  let b;
  try { b = await readBody(req); } catch { return json(res, 400, { error: 'Invalid body' }); }
  const winner = b.winner ?? null, loser = b.loser ?? null;
  if ((winner && !CHARS.has(winner)) || (loser && !CHARS.has(loser)) || !STAGES.has(b.stage) || !MODES.has(b.mode) || !LEVELS.has(b.level ?? '')) {
    return json(res, 400, { error: 'Unknown character, stage or mode' });
  }
  const rounds = Math.max(1, Math.min(5, Number(b.rounds) | 0));
  const combo = Math.max(0, Math.min(99, Number(b.maxCombo) | 0));
  const headline = typeof b.headline === 'string' ? b.headline.slice(0, 160) : null;
  await db.execute({
    sql: `INSERT INTO matches (winner, loser, mode, level, stage, rounds, max_combo, perfect, player_won, headline)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [winner, loser, b.mode, b.level || null, b.stage, rounds, combo, b.perfect ? 1 : 0, b.playerWon == null ? null : (b.playerWon ? 1 : 0), headline],
  });
  json(res, 201, { ok: true });
}

async function getLeaderboard(res) {
  const [wins, losses, totals, recent, best] = await Promise.all([
    db.execute('SELECT winner AS id, COUNT(*) AS n FROM matches WHERE winner IS NOT NULL GROUP BY winner'),
    db.execute('SELECT loser AS id, COUNT(*) AS n FROM matches WHERE loser IS NOT NULL GROUP BY loser'),
    db.execute('SELECT COUNT(*) AS n FROM matches'),
    db.execute('SELECT headline, created_at FROM matches WHERE headline IS NOT NULL ORDER BY id DESC LIMIT 8'),
    db.execute('SELECT winner AS id, MAX(max_combo) AS combo FROM matches WHERE winner IS NOT NULL GROUP BY winner'),
  ]);
  const table = {};
  for (const id of CHARS) table[id] = { id, wins: 0, losses: 0, bestCombo: 0 };
  for (const r of wins.rows) if (table[r.id]) table[r.id].wins = Number(r.n);
  for (const r of losses.rows) if (table[r.id]) table[r.id].losses = Number(r.n);
  for (const r of best.rows) if (table[r.id]) table[r.id].bestCombo = Number(r.combo);
  const rows = Object.values(table).sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  json(res, 200, { total: Number(totals.rows[0].n), rows, recent: recent.rows.map((r) => ({ headline: r.headline, at: r.created_at })) });
}

// ---------- static files ----------
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon',
};
const PUBLIC = ['index.html', 'icon.svg', 'manifest.webmanifest', 'css/', 'src/'];

async function serveStatic(req, res) {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/index.html';
  const rel = normalize(path).replace(/^[/\\]+/, '');
  if (!PUBLIC.some((p) => rel === p || (p.endsWith('/') && rel.startsWith(p)))) { res.writeHead(404); return res.end('Not found'); }
  const file = join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try {
    const s = await stat(file);
    if (!s.isFile()) throw new Error();
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'cache-control': rel === 'index.html' ? 'no-cache' : 'public, max-age=300',
      'x-content-type-options': 'nosniff',
    });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/health') return json(res, 200, { ok: true });
    if (url.pathname === '/api/matches' && req.method === 'POST') return await postMatch(req, res);
    if (url.pathname === '/api/leaderboard' && req.method === 'GET') return await getLeaderboard(res);
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Not found' });
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    return await serveStatic(req, res);
  } catch (e) {
    console.error(e);
    json(res, 500, { error: 'Server error' });
  }
});

migrate()
  .then(() => server.listen(PORT, () => console.log(`Kursi Kurukshetra on :${PORT} (db: ${process.env.TURSO_DATABASE_URL ? 'turso' : 'local file'})`)))
  .catch((e) => { console.error('Database setup failed:', e.message); process.exit(1); });
