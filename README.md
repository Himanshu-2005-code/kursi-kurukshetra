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

## Design decisions

- **Original characters only.** Every fighter is an invented archetype (the orator, the bureaucrat, the turncoat, the action hero) rather than a real politician, actor or film character. The satire targets types of behaviour, so it lands with anyone and keeps the project free of likeness and copyright issues.
- **Everything is code, no assets.** Characters are drawn procedurally from a skeleton plus appearance data, stages are painted on canvas, and all sound is synthesized with WebAudio. Adding a fighter means adding one entry to `src/roster.js`.
- **Fixed-timestep simulation.** The game logic runs at a constant 60 ticks per second, separate from rendering, so gameplay behaves the same on fast and slow devices.
- **Specials are earned.** Specials need quarter-circle motions and have a cooldown, so they can't be spammed.
- **Comeback mechanics.** Taking damage fills the super meter faster than dealing it, more so when you're behind, and ballot boxes drop closer to the losing player, so matches stay close.
- **Fair CPU.** The AI reacts to a slightly delayed view of the opponent and has to perform the same motion inputs as a human, with difficulty controlling its reaction time and accuracy.
- **Adaptive quality.** The renderer measures its own frame time and steps down the lighting on slow phones to keep play smooth.

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
