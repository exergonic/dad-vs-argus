# ETHOS.md — "Dad vs Argus" Browser Game

## Overview

Build a two-player, same-keyboard, top-down 2D chase game in the spirit of
[Tag on Poki](https://poki.com/en/g/tag), reskinned as a comedic father-vs-son
fart battle called **Dad vs Argus**.

Two characters chase each other around an open arena. Whoever gets close
enough "farts" on the other, dealing HP damage. Best of 3 rounds wins the
match. Tone should be silly and lighthearted — think family-friendly toilet
humor, not gross-out horror.

## Characters

| | Dad | Argus |
|---|---|---|
| Size | Larger sprite/hitbox | Smaller sprite/hitbox |
| Move speed | Slower | Faster |
| Fart damage | Higher (offsets his speed disadvantage) | Lower |
| Controls | WASD | Arrow keys |
| Max HP | Equal starting HP for both (suggest 100) | Equal starting HP for both (suggest 100) |

Exact numbers are tunable — start with something like Dad damage 15/hit,
Argus damage 10/hit, and playtest for a fair-but-funny balance where Argus's
speed and Dad's power roughly cancel out.

## Controls

- **Left player (Dad):** WASD for movement (up/down/left/right, 4- or
  8-directional, your call — 8-directional feels smoother).
- **Right player (Argus):** Arrow keys, same movement scheme.
- No aiming/attack button needed — see Combat below.
- Movement should feel responsive with simple acceleration/deceleration or
  even direct velocity — keep it snappy, this is a silly arcade game, not a
  physics sim.

## Combat: The Fart Mechanic

- **Proximity/contact based** — no aiming or projectiles. When the two
  characters' hitboxes overlap (or come within a small "fart radius"), the
  fart triggers automatically and damages the *other* player.
- **Per-player cooldown:** After a player lands a fart hit, that player gets
  a short cooldown (~1 second) before they can deal damage again. This
  prevents one player from just sitting on top of the other and melting
  their HP instantly. Show the cooldown visually (e.g. a small icon or
  timer ring above the character) so both players can tell who's "reloaded."
- Both players can be on cooldown independently — it's tracked per-player,
  not globally, so if both are in range at once, whoever's cooldown expires
  first is who lands the next hit.
- Consider a brief (~0.3–0.5s) i-frame or knockback on the player who just
  got hit, so hits don't feel like they overlap instantly.

## Match Structure

- **Best of 3 rounds.**
- A round ends when one player's HP hits 0 — that player loses the round.
- Show a round-end screen/banner ("Dad wins round 1!" / "Argus wins round
  1!") then reset both players' HP and positions for the next round after a
  short pause (2–3 seconds, with a "Round 2 — GO!" style countdown).
- First to 2 round wins takes the match. Show a clear match-winner screen
  with a restart option.
- Track and display the round score (e.g. "1 - 0") somewhere visible during
  play.

## Arena

- Open, empty arena — pure chase, no obstacles or hazards to start.
- Simple bounded rectangle (canvas edges act as walls — clamp player
  position, don't let them run off-screen).
- Keep the arena visually simple but themed (e.g. a backyard, living room,
  or park — pick something that fits a "dad and kid" setting). A flat
  background color/texture is fine for v1; a themed background image is a
  nice stretch goal.

## Comedy / Juice — Go Big

This is the heart of the game's appeal, don't skimp on it:

- **Sound effects:** A fart sound on every hit (use varied/randomized fart
  sound clips if possible so it doesn't get stale). Bonus points for a
  distinct "whoosh" or reaction sound on the player getting hit.
- **Visual gags:** A cartoon cloud/particle puff effect at the point of
  contact when a fart lands. Consider a little green/brown cloud sprite
  that puffs and fades.
- **Screen shake:** Small screen shake on hit for impact.
- **Taunts:** Random silly text bubbles or on-screen captions when a hit
  lands (e.g. "PFFFT!", "Nailed him!", "Dad stinks!", "Argus struck first!").
  Rotate through a small pool of these so it stays funny on repeat plays.
- **Character expressions/animation:** Even simple squash-and-stretch or a
  recoil animation on hit goes a long way for comedic feel.
- Keep all of this readable and fast — the gags should punctuate the action,
  not slow it down.

## UI Elements

- HP bars for both players, clearly labeled "Dad" and "Argus," visible at
  all times during a round.
- Round score indicator (e.g. "Dad 1 — 0 Argus").
- Cooldown indicator per player (see Combat).
- Round-end banner and match-end screen with a "Play Again" button that
  fully resets the match.
- A simple start screen explaining controls before the first round begins
  (WASD = Dad, Arrows = Argus) so two players sitting at one keyboard know
  what to do immediately.

## Web Stack

- **Plain HTML/CSS/JS. No build step, no framework, no bundler.**
- Prefer a small number of files (e.g. `index.html`, `style.css`,
  `game.js`, plus an `assets/` folder for sound effects/images) — a single
  self-contained HTML file is also acceptable if that's simpler to manage.
- Use the `<canvas>` element with the 2D rendering context for
  drawing/animation — this fits the arcade-chase style and makes hit
  detection, particle effects, and screen shake straightforward.
- Use `requestAnimationFrame` for the game loop.
- Handle both players' input simultaneously via `keydown`/`keyup` event
  listeners tracking a set of currently-pressed keys (not `keypress`), so
  both WASD and arrow keys can be held down at once without conflicts.
- Keep dependencies at zero — no CDN libraries needed for a game this
  scope. Everything should run by just opening `index.html` in a browser
  (or a trivial local static server if needed for audio autoplay
  restrictions).
- Sound effects can be short `.mp3`/`.wav` files played via the `Audio` API
  or Web Audio API — either is fine, keep it simple.

## Suggested File Structure

```
dad-vs-argus/
├── index.html
├── style.css
├── game.js
└── assets/
    ├── sounds/
    │   ├── fart1.mp3
    │   ├── fart2.mp3
    │   └── hit-reaction.mp3
    └── images/        (optional — can also draw characters with canvas shapes)
```

## Stretch Goals (only after core loop is solid and fun)

- Simple sprite art/animation for Dad and Argus instead of placeholder
  shapes.
- Themed arena background.
- Power-ups (e.g. temporary speed boost, "bean burrito" damage boost).
- Local high-score / win tally across sessions (localStorage).
- Victory dance animation on the match-end screen.

## Build Priority Order

1. Canvas setup, arena bounds, both characters rendered as simple
   shapes/rectangles.
2. Movement for both players (WASD + arrows) with correct relative speeds.
3. Proximity-based hit detection + per-player cooldown + HP damage.
4. HP bars, round win/loss detection, round reset.
5. Best-of-3 match tracking and match-end screen.
6. Layer in the comedy: fart sound, particle cloud, screen shake, taunt
   text.
7. Start screen with control instructions, polish, playtest for balance.
