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

- `src/rig.js`: procedural character renderer. Characters are skeletons with joint angles plus a "look" (skin, clothes, hair, face). Each one is drawn with cylindrical shading, cloth creases, cast shadows, and a per-fighter lighting pass with key light, ground occlusion and rim light.
- `src/roster.js`: the cast. Appearance, stats, specials, super and dialogue are all data.
- `src/fighter.js`: movement, state machine, normals, motion-input specials, cooldowns.
- `src/fight.js`: rounds, hit detection, blocking, projectiles, the seven supers, ballot pickups, HUD, speech bubbles, super cut-ins.
- `src/ai.js`: CPU opponent that reacts with a delay and has to perform the same motion inputs as a player.
- `src/stages.js`: three stages (The House, Rally Maidan, Gully Chauraha).
- `src/audio.js`: synthesized SFX and dhol music (WebAudio), plus voice lines via speech synthesis.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

It's a static site. On GitHub Pages: **Settings → Pages → Deploy from branch → `main` / root**. It also works on Render (Static Site), Netlify, or Vercel with no build command.

---

*Political satire and parody for entertainment. All characters are fictional; any resemblance to real persons is coincidental.*
