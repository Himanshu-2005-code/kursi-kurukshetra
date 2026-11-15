# Kursi Kurukshetra — The Battle for the Chair

A 2D browser fighting game of political satire. Every neta in it is **fictional**: invented names, invented faces, parodying political *types* rather than any real person or party.

Play vs CPU (Easy / Normal / Hard), or local 2-player on one keyboard. It works on phones too, with touch controls and landscape play.

## The cast

| Neta | Title | Super |
|---|---|---|
| Bhashan Singh | The Orator · 40 years in the House | **The 3-Hour Speech**: a beam of pure rhetoric |
| Manifesto Devi | Queen of Promises | **Free Everything!**: it rains freebies |
| Babu Filewala | Pending since 1987 | **Red Tape**: binds you, then stamps you REJECTED |
| Thekedar Tolani | Builder of flyovers (some still standing) | **Pothole of Doom**: the road opens under you |
| Chirag "Yuva" Kumar | Youth icon · 2M followers | **Going Viral**: a barrage of likes |
| Dal-Badlu Lal | Member of every party | **Horse Trading**: a stampede |
| High Command *(boss, unlocks after your first CPU win)* | Decides everything, says nothing | **Cabinet Reshuffle** |

### Filmy Mode

Original fighters built on movie genres and tropes, not on any actor or film character. They live in their own tab on the select screen and can fight the netas.

| Fighter | Genre | Super |
|---|---|---|
| Don Dhuaandhaar | Seventies smuggler boss | **Den Ka Dhamaka**: the whole den goes up |
| Inspector Ulta-Seedha | Loud cop hero | **Dhishoom Protocol**: slow-motion beatdown |
| The Gunslinger | Western | **High Noon**: a hail of bullets |
| Detective Noir | Trench-coat noir | **The Big Reveal**: the stage turns black-and-white in the rain |
| Kung-Fu Uncle | Old kung-fu master | **Thousand-Palm Wave** |
| Explosion Man | Action hero | **Cool Guys Don't Look**: walks away as the stage explodes |

Each character has three specials, intro, taunt, win and lose dialogue (optionally spoken aloud), and a post-match "Kursi Times" headline.

## Controls

| | Player 1 | Player 2 (local) |
|---|---|---|
| Move / jump / crouch | A D / W / S | Arrow keys |
| Block | hold back | hold back |
| Punch · Kick · Grab · Super | J · K · I · L or Space | , · . · / · ; (or Num 1/2/3/0) |

- **Specials** need a motion and have a 3s cooldown: `↓ ↘ → + Punch`, `↓ ↘ → + Kick`, `↓ ↙ ← + Punch`
- **Sweep** `↓ + Kick` · **Combos** `P,P,P` `P,P,K` `P,K,K` `K,K`
- **Super** when the VOTE BANK meter is full. Taking hits fills it faster than landing them, and faster still when you're behind. **Ballot boxes** drop in now and then: grab one for +30%.
- `Esc` pause · `M` music · `N` mute · `V` voice lines

## How it's built

Plain HTML, CSS and JavaScript (ES modules). There's no build step and there are no image or audio assets.

- `src/rig.js`: procedural character renderer, with adaptive quality that steps the lighting down on slow devices. Characters are skeletons with joint angles plus a "look" (skin, clothes, hair, face). Each one is drawn with cylindrical shading, cloth creases, cast shadows, and a per-fighter lighting pass with key light, ground occlusion and rim light.
- `src/roster.js`: the cast. Appearance, stats, specials, super and dialogue are all data.
- `src/fighter.js`: movement, state machine, normals, motion-input specials, cooldowns.
- `src/fight.js`: rounds, hit detection, blocking, projectiles, the seven supers, ballot pickups, HUD, speech bubbles, super cut-ins.
- `src/ai.js`: CPU opponent that reacts with a delay and has to perform the same motion inputs as a player.
- `src/stages.js`: four stages (The House, Rally Maidan, Gully Chauraha, Film Set).
- `src/audio.js`: synthesized SFX and dhol music (WebAudio), plus voice lines via speech synthesis.

- `server.js`: small Node server that serves the game and a results API backed by **Turso** (libSQL). Every finished match is recorded, and the title screen's **Neta Rankings** shows wins, losses and best combo per neta, plus the latest headlines.

## Run locally

```bash
npm install
npm start          # http://localhost:3000, uses a local SQLite file (local.db)
```

To use Turso locally, set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` first.

## API

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/health` | Health check for Render |
| `POST` | `/api/matches` | Record a finished match (validated, rate-limited per IP) |
| `GET` | `/api/leaderboard` | Wins and losses per neta, best combo, latest headlines |

## Deploy (Render + Turso)

1. **Turso:** create a database and an auth token:
   ```bash
   turso db create kursi-kurukshetra
   turso db show kursi-kurukshetra --url      # TURSO_DATABASE_URL
   turso db tokens create kursi-kurukshetra   # TURSO_AUTH_TOKEN
   ```
2. **Render:** New → Blueprint → pick this repo. `render.yaml` sets up a free Node web service. Paste the two Turso values when Render asks for the environment variables.
3. The table is created automatically on first start.

The game files also work as a plain static site; only the rankings need the server.

---

*Political satire and parody for entertainment. All characters are fictional; any resemblance to real persons is coincidental.*
