# Dad vs Argus — Agent Instructions

Two-player same-keyboard chase platformer (father-son fart battle). Best of 3 rounds.

## Stack (non-negotiable)

- **Plain HTML/CSS/JS only. No build step, no framework, no bundler, no CDN.**
- `<canvas>` 2D context for rendering. `requestAnimationFrame` game loop.
- `keydown`/`keyup` event listeners tracking a set of pressed keys (not `keypress`).
- Sound: `Audio` API for `.wav` files.
- Must run by opening `index.html` in a browser.

## Testing

Playtest by opening `index.html` in a browser. **Chrome blocks `file://` loading of local image/audio assets.** If assets (sprites, sounds) don't load, serve via a trivial static server: `npx serve .` or Python `http.server`.

## File structure

```
dad-vs-argus/
├── index.html
├── style.css
├── game.js
├── AGENTS.md
├── ETHOS.md
└── assets/
    ├── sounds/
    │   ├── whoopee_1.wav      (dklon, CC-BY 3.0)
    │   ├── whoopee_2.wav      (dklon, CC-BY 3.0)
    │   └── gastricdistress.wav (LFA, CC0)
    └── images/
        ├── png/                (Red Hat Boy by pzUH, CC0 — Argus)
        └── bearded_man/        (bevouliin.com, CC-BY 4.0 — Dad)
            ├── run/   (43 frames)
            ├── jump/  (25 frames)
            └── KO/    (43 frames)
```

## Key design

- **Platforms + gravity.** Jump with W/↑, move with A/D or ←/→.
- **Directional fart combat.** Only the player above deals damage — must jump on the other player. Per-player cooldown (yellow pie circle above head).
- **Characters:** Dad = bigger, slower, 15 dmg. Argus = smaller, faster, 10 dmg. Both 100 HP.
- **Match:** Best of 3. Round ends at 0 HP. Match-end screen with Space to restart.
- **Canvas-drawn characters** (always visible) with PNG sprite overlay when images load via HTTP.

## Asset crediting

- **Synthetic Farts** by dklon (CC-BY 3.0) — `whoopee_1.wav`, `whoopee_2.wav`
- **Gastric Distress** by LFA (CC0) — `gastricdistress.wav`
- **Red Hat Boy** by pzUH (CC0) — Argus sprites
- **Bearded Man** by bevouliin.com (CC-BY 4.0) — Dad sprites (credit "bevouliin.com")
