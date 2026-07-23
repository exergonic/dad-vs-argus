const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const W = 960;
const H = 640;
canvas.width = W;
canvas.height = H;

const GRAVITY = 0.45;
const JUMP_VEL = -11;
const COOLDOWN_DUR = 60;
const IFRAME_DUR = 20;
const DAD_DMG = 15;
const ARGUS_DMG = 10;
const MAX_HP = 100;
const ACCEL = 0.55;
const FRICTION = 0.82;
const AIR_ACCEL = 0.3;
const AIR_FRICTION = 0.88;

const ground = { x: 0, y: 568, w: 960, h: 72 };
const LAYOUTS = [
  { // Open — two edge platforms + wide center high
    name: 'Open',
    platforms: [
      { x: 10,  y: 470, w: 240, h: 14 },   // low left
      { x: 710, y: 470, w: 240, h: 14 },   // low right
      { x: 330, y: 340, w: 300, h: 14 },   // high center
    ]
  },
  { // Stadium — two tiers at edges
    name: 'Stadium',
    platforms: [
      { x: 10,  y: 465, w: 240, h: 14 },   // low left
      { x: 710, y: 465, w: 240, h: 14 },   // low right
      { x: 70,  y: 360, w: 200, h: 14 },   // mid left
      { x: 690, y: 360, w: 200, h: 14 },   // mid right
    ]
  },
  { // Arena — two low edges + one wide high
    name: 'Arena',
    platforms: [
      { x: 10,  y: 460, w: 240, h: 14 },   // low left
      { x: 710, y: 460, w: 240, h: 14 },   // low right
      { x: 340, y: 350, w: 280, h: 14 },   // high center
    ]
  },
  { // Plaza — ground only with two low edges
    name: 'Plaza',
    platforms: [
      { x: 10,  y: 460, w: 240, h: 14 },   // low left
      { x: 710, y: 460, w: 240, h: 14 },   // low right
    ]
  },
];

let platforms = [ground];

// ---------- Sprite loading ----------
const WAD = {  // Wad of sprites
  dad: { run: [], jump: [], ko: [] },
  argus: { idle: [], run: [], jump: [], hurt: [], dead: [] }
};

const SPRITE_CFG = {
  dad: {
    run:  { path: 'assets/images/bearded_man/run/run_', count: 43, pad: true },
    jump: { path: 'assets/images/bearded_man/jump/j_',   count: 25, pad: true },
    ko:   { path: 'assets/images/bearded_man/KO/ko_',     count: 43, pad: true },
  },
  argus: {
    idle: { path: 'assets/images/png/Idle (', count: 10, pad: false },
    run:  { path: 'assets/images/png/Run (',  count: 8,  pad: false },
    jump: { path: 'assets/images/png/Jump (', count: 12, pad: false },
    hurt: { path: 'assets/images/png/Hurt (', count: 8,  pad: false },
    dead: { path: 'assets/images/png/Dead (', count: 10, pad: false },
  }
};

let spritesLoaded = false;

function loadSprites() {
  let total = 0, loaded = 0;
  for (const char of ['dad', 'argus']) {
    for (const [name, cfg] of Object.entries(SPRITE_CFG[char])) {
      total += cfg.count;
      const arr = WAD[char][name];
      for (let i = 0; i < cfg.count; i++) {
        const idx = cfg.pad ? String(i).padStart(3, '0') : (i + 1);
        const img = new Image();
        img.onload = () => { loaded++; if (loaded >= total) spritesLoaded = true; };
        img.src = cfg.path + idx + '.png';
        arr.push(img);
      }
    }
  }
}

// ---------- Players ----------
function makePlayer(x, y, w, h, speed, color, label, jumpKey, scale) {
  return {
    x, y, w, h, speed, color, label, jumpKey, scale,
    hp: MAX_HP,
    cooldown: 0, iframe: 0,
    knockbackX: 0, knockbackY: 0,
    squash: 0,
    vx: 0, vy: 0, onGround: false,
    facing: 1,
    anim: 'idle', animFrame: 0, animTimer: 0
  };
}

const DAD = makePlayer(160, 400, 44, 44, 2.0, '#2266cc', 'Dad', 'w', 0.3);
const ARGUS = makePlayer(760, 400, 32, 32, 4.0, '#cc4422', 'Argus', 'arrowup', 0.5);

const keys = new Set();

document.addEventListener('keydown', e => {
  keys.add(e.key.toLowerCase());
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});

document.addEventListener('keyup', e => {
  keys.delete(e.key.toLowerCase());
});

// ---------- Audio ----------
// Add new fart files to assets/sounds/ and add the path here
const fartSounds = [
  // User-provided splats
  'assets/sounds/fart-sound.wav',
  'assets/sounds/fart-quick-splat-2890.wav',
  'assets/sounds/fart-or-splat.wav',
  'assets/sounds/fart-fast-splat-2889.wav',
  'assets/sounds/fart-accident-fart-3041.wav',
  // dklon (CC-BY 3.0)
  'assets/sounds/whoopee_1.wav',
  'assets/sounds/whoopee_2.wav',
  // Tsoding / Pixabay (Unlicense)
  'assets/sounds/fart-4-228244-fixed-crit.flac',
  'assets/sounds/fart-83471-fixed-regular.flac',
  'assets/sounds/fart-paulstretched.flac',
  'assets/sounds/fart-paulstretched-evil.flac',
];

function playRandom(list) {
  const src = list[Math.floor(Math.random() * list.length)];
  const a = new Audio(src);
  a.volume = 0.4 + Math.random() * 0.2;
  a.play().catch(() => {});
}

function playFart() { playRandom(fartSounds); }

// ---------- Particles ----------
const particles = [];
const fartRings = [];

function spawnFartCloud(cx, cy, color) {
  for (let i = 0; i < 35; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3.5;
    particles.push({
      x: cx + (Math.random() - 0.5) * 8, y: cy + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 50 + Math.random() * 30, maxLife: 80,
      size: 7 + Math.random() * 12, color
    });
  }
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    particles.push({
      x: cx + (Math.random() - 0.5) * 10, y: cy + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * (0.2 + Math.random() * 0.5),
      vy: Math.sin(angle) * (0.2 + Math.random() * 0.5) - 0.3,
      life: 90 + Math.random() * 40, maxLife: 130,
      size: 16 + Math.random() * 18, color
    });
  }
}

function spawnFartRing(cx, cy, color) {
  fartRings.push({ x: cx, y: cy, radius: 8, maxRadius: 110 + Math.random() * 30, life: 40, maxLife: 40, color, lw: 5 });
  fartRings.push({ x: cx, y: cy, radius: 4, maxRadius: 80 + Math.random() * 20, life: 28, maxLife: 28, color: '#ff6', lw: 2 });
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.02;
    if (p.life < p.maxLife * 0.3) p.vx *= 0.97;
    if (--p.life <= 0) particles.splice(i, 1);
  }
  for (let i = fartRings.length - 1; i >= 0; i--) {
    const r = fartRings[i];
    r.radius += (r.maxRadius - r.radius) * 0.18;
    if (--r.life <= 0) fartRings.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    const a = p.life / p.maxLife;
    ctx.globalAlpha = Math.min(a * 0.8, 0.7);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.3 + 0.7 * a), 0, Math.PI * 2);
    ctx.fill();
  }
  for (const r of fartRings) {
    const a = r.life / r.maxLife;
    ctx.globalAlpha = Math.min(a * 1.2, 0.6);
    ctx.strokeStyle = r.color;
    ctx.lineWidth = r.lw || 3;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ---------- Screen shake ----------
let shakeX = 0, shakeY = 0, shakeDur = 0;
function triggerShake() { shakeDur = 14; }
function updateShake() {
  if (shakeDur > 0) {
    const intensity = shakeDur / 14;
    shakeX = (Math.random() - 0.5) * 12 * intensity;
    shakeY = (Math.random() - 0.5) * 12 * intensity;
    shakeDur--;
  } else { shakeX = 0; shakeY = 0; }
}

// ---------- Taunts ----------
const taunts = [
  'PFFFT!', 'Nailed him!', 'Dad stinks!', 'Argus struck first!',
  'Whoa!', 'Eww!', 'Right in the face!', 'Too slow!',
  'Bean burrito!', 'Silent but deadly!', 'Blam!', 'Gotcha!'
];
let activeTaunt = null;
let tauntTimer = 0;
function showTaunt() {
  activeTaunt = taunts[Math.floor(Math.random() * taunts.length)];
  tauntTimer = 60;
}

// ---------- Helpers ----------
function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---------- Sprite rendering ----------
const ANIM_SPEED = {
  dad:  { run: 4, jump: 5, ko: 8 },
  argus: { idle: 10, run: 5, jump: 6, hurt: 4, dead: 10 }
};

function getAnimState(p, key) {
  if (key === 'dad') {
    if (p.hp <= 0) return 'ko';
    if (!p.onGround) return 'jump';
    if (keys.has(p.jumpKey === 'w' ? 'a' : 'arrowleft') || keys.has(p.jumpKey === 'w' ? 'd' : 'arrowright')) return 'run';
    return 'run';
  }
  if (p.hp <= 0) return 'dead';
  if (p.squash > 0) return 'hurt';
  if (!p.onGround) return 'jump';
  if (keys.has('a') || keys.has('d') || keys.has('arrowleft') || keys.has('arrowright')) return 'run';
  return 'idle';
}

function updateAnim(p, character) {
  const key = character === DAD ? 'dad' : 'argus';
  const state = getAnimState(p, key);
  const frames = WAD[key][state];
  const speed = ANIM_SPEED[key][state] || 6;

  if (state !== p.anim) {
    p.anim = state;
    p.animFrame = 0;
    p.animTimer = 0;
  }

  p.animTimer++;
  if (frames && p.animTimer >= speed) {
    p.animTimer = 0;
    p.animFrame = (p.animFrame + 1) % (frames.length || 1);
  }
}

function drawCanvasCharacter(p, label) {
  const w = p.w, h = p.h;
  const legBob = Math.sin(p.animFrame * 0.5) * 2;

  // Body / torso
  const bodyColor = label === 'Dad' ? '#2266cc' : '#cc4422';
  const pantsColor = label === 'Dad' ? '#1a3366' : '#335';
  const skinColor = '#e8b88a';
  const shoeColor = '#333';

  // Shadow / outline
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(-w / 2, -h / 2, w, h);

  // Legs (animated walk cycle)
  ctx.fillStyle = pantsColor;
  const legW = w * 0.28;
  const legH = h * 0.25;
  const legY = h * 0.2;
  ctx.save();
  ctx.translate(-w * 0.18, legY);
  ctx.rotate(legBob * 0.06);
  ctx.fillRect(-legW / 2, 0, legW, legH);
  ctx.restore();
  ctx.save();
  ctx.translate(w * 0.18, legY);
  ctx.rotate(-legBob * 0.06);
  ctx.fillRect(-legW / 2, 0, legW, legH);
  ctx.restore();

  // Shoes
  ctx.fillStyle = shoeColor;
  ctx.fillRect(-w * 0.28, h * 0.42, w * 0.2, h * 0.08);
  ctx.fillRect(w * 0.08, h * 0.42, w * 0.2, h * 0.08);

  // Body
  ctx.fillStyle = bodyColor;
  const bodyW = w * 0.7;
  const bodyH = h * 0.45;
  const bodyY = -h * 0.15;
  ctx.beginPath();
  ctx.roundRect(-bodyW / 2, bodyY, bodyW, bodyH, 3);
  ctx.fill();

  // Arms
  const armSwing = Math.sin(p.animFrame * 0.5) * 3;
  ctx.fillStyle = skinColor;
  ctx.save();
  ctx.translate(-w * 0.4, -h * 0.05);
  ctx.rotate((-0.3 + armSwing * 0.02));
  ctx.fillRect(-3, 0, 5, h * 0.3);
  ctx.restore();
  ctx.save();
  ctx.translate(w * 0.4, -h * 0.05);
  ctx.rotate((0.3 - armSwing * 0.02));
  ctx.fillRect(-2, 0, 5, h * 0.3);
  ctx.restore();

  // Head
  const headR = w * 0.32;
  const headY = -h * 0.4;
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  if (label === 'Dad') {
    // Beard
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(-w * 0.25, headY + headR * 0.2);
    ctx.quadraticCurveTo(0, headY + headR * 1.1, w * 0.25, headY + headR * 0.2);
    ctx.fill();
    // Mustache
    ctx.fillStyle = '#444';
    ctx.fillRect(-w * 0.2, headY + headR * 0.3, w * 0.4, 3);
  } else {
    // Red cap (Argus)
    ctx.fillStyle = '#dd3322';
    ctx.beginPath();
    ctx.moveTo(-w * 0.4, headY - headR * 0.1);
    ctx.quadraticCurveTo(0, headY - headR * 1.3, w * 0.4, headY - headR * 0.1);
    ctx.fill();
    ctx.fillStyle = '#bb2211';
    ctx.fillRect(-w * 0.1, headY - headR * 1.2, w * 0.2, h * 0.04);
  }

  // Eyes
  ctx.fillStyle = '#222';
  const eyeY = headY + headR * 0.1;
  const eyeOff = w * 0.1;
  const eyeS = p.iframe > 0 ? 2 : 3;
  ctx.fillRect(-eyeOff - eyeS / 2, eyeY - eyeS / 2, eyeS, eyeS);
  ctx.fillRect(eyeOff - eyeS / 2, eyeY - eyeS / 2, eyeS, eyeS);
}

function drawSprite(p, character) {
  const key = character === DAD ? 'dad' : 'argus';
  const state = p.anim;
  const frames = WAD[key][state];
  const frame = frames && frames.length ? frames[p.animFrame] : null;

  ctx.save();
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;

  const sq = p.squash > 0 ? 1 + (p.squash / 8) * 0.3 : 1;
  const sqY = p.squash > 0 ? 1 - (p.squash / 8) * 0.2 : 1;

  ctx.translate(cx, cy);
  ctx.scale(p.facing * sq, sqY);

  // Canvas-drawn character (always visible, no file loading needed)
  if (p.iframe > 0 && Math.floor(p.iframe / 4) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }
  drawCanvasCharacter(p, p.label);
  ctx.restore();

  // PNG sprite overlay (renders on top if images loaded)
  if (spritesLoaded && frame && frame.complete && frame.naturalWidth > 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(p.facing * sq, sqY);
    const s = p.scale;
    const sw = Math.round(frame.naturalWidth * s);
    const sh = Math.round(frame.naturalHeight * s);
    ctx.drawImage(frame, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();
  }

  if (p.cooldown > 0) {
    const pct = p.cooldown / COOLDOWN_DUR;
    const rr = 8;
    const rx = p.x + p.w / 2;
    const ry = p.y - 12;
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff0';
    ctx.beginPath(); ctx.moveTo(rx, ry);
    ctx.arc(rx, ry, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - pct));
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.stroke();
  }
}

// ---------- Physics ----------
function applyPhysics(p) {
  let dx = 0;
  if (keys.has(p.jumpKey === 'w' ? 'a' : 'arrowleft')) dx = -1;
  if (keys.has(p.jumpKey === 'w' ? 'd' : 'arrowright')) dx = 1;

  if (dx < 0) p.facing = -1;
  else if (dx > 0) p.facing = 1;

  // Smooth acceleration / friction
  const onGround = p.onGround;
  const accel = onGround ? ACCEL : AIR_ACCEL;
  const friction = onGround ? FRICTION : AIR_FRICTION;
  const targetVx = dx * p.speed;
  if (targetVx !== 0) {
    if (p.vx < targetVx) p.vx = Math.min(p.vx + accel, targetVx);
    else if (p.vx > targetVx) p.vx = Math.max(p.vx - accel, targetVx);
  } else {
    p.vx *= friction;
    if (Math.abs(p.vx) < 0.05) p.vx = 0;
  }

  p.knockbackX *= 0.85;
  p.knockbackY *= 0.85;
  if (Math.abs(p.knockbackX) < 0.1) p.knockbackX = 0;
  if (Math.abs(p.knockbackY) < 0.1) p.knockbackY = 0;

  if (keys.has(p.jumpKey) && p.onGround) {
    p.vy = JUMP_VEL;
    p.onGround = false;
  }

  p.vy += GRAVITY;
  if (p.vy > 12) p.vy = 12;

  const mx = p.vx + p.knockbackX;
  p.x += mx;
  if (p.x < 0) p.x = 0;
  if (p.x + p.w > W) p.x = W - p.w;
  for (const plat of platforms) {
    if (rectOverlap(p, plat)) {
      if (mx > 0) p.x = plat.x - p.w;
      else if (mx < 0) p.x = plat.x + plat.w;
    }
  }

  const my = p.vy + p.knockbackY;
  p.y += my;
  p.onGround = false;
  for (const plat of platforms) {
    if (rectOverlap(p, plat)) {
      if (my >= 0) { p.y = plat.y - p.h; p.vy = 0; p.onGround = true; }
      else { p.y = plat.y + plat.h; p.vy = 0; }
    }
  }
  if (p.y + p.h > H) { p.y = H - p.h; p.vy = 0; p.onGround = true; }
  if (p.y < 0) { p.y = 0; p.vy = 0; }

  if (p.cooldown > 0) p.cooldown--;
  if (p.iframe > 0) p.iframe--;
  if (p.squash > 0) p.squash--;
}

// ---------- Combat ----------
function applyHit(attacker, defender) {
  defender.hp = Math.max(0, defender.hp - (attacker === DAD ? DAD_DMG : ARGUS_DMG));
  attacker.cooldown = COOLDOWN_DUR;
  defender.iframe = IFRAME_DUR;

  const dx = defender.x - attacker.x || 1;
  const dy = defender.y - attacker.y || 1;
  const d = Math.hypot(dx, dy) || 1;
  defender.knockbackX = (dx / d) * 7;
  defender.knockbackY = -4;
  defender.squash = 8;

  const dcx = defender.x + defender.w / 2;
  const dcy = defender.y + defender.h / 2;
  const color = attacker === DAD ? '#6b8f3a' : '#8a6f2a';
  spawnFartCloud(dcx, dcy, color);
  spawnFartRing(dcx, dcy, color);

  playFart();
  triggerShake();
  showTaunt();
}

function checkHits() {
  if (!rectOverlap(DAD, ARGUS)) return;

  const dadAbove = DAD.y + DAD.h < ARGUS.y + ARGUS.h * 0.6;
  const argusAbove = ARGUS.y + ARGUS.h < DAD.y + DAD.h * 0.6;

  if (dadAbove && DAD.cooldown === 0 && ARGUS.iframe === 0) applyHit(DAD, ARGUS);
  else if (argusAbove && ARGUS.cooldown === 0 && DAD.iframe === 0) applyHit(ARGUS, DAD);
}

// ---------- Round / match ----------
let dadRounds = 0;
let argusRounds = 0;
let gameState = 'start';
let roundTimer = 0;
let currentLayout = null;

function pickLayout() {
  const layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)];
  currentLayout = layout;
  currentBg = BGS[Math.floor(Math.random() * BGS.length)];
  platforms = [ground, ...layout.platforms];
}

function resetRound() {
  pickLayout();
  DAD.x = 160; DAD.y = 400;
  ARGUS.x = 760; ARGUS.y = 400;
  DAD.vx = 0; ARGUS.vx = 0;
  DAD.vy = 0; ARGUS.vy = 0;
  DAD.onGround = false; ARGUS.onGround = false;
  DAD.hp = MAX_HP; ARGUS.hp = MAX_HP;
  DAD.cooldown = 0; ARGUS.cooldown = 0;
  DAD.iframe = 0; ARGUS.iframe = 0;
  DAD.knockbackX = 0; DAD.knockbackY = 0;
  ARGUS.knockbackX = 0; ARGUS.knockbackY = 0;
  DAD.squash = 0; ARGUS.squash = 0;
  gameState = 'playing';
  particles.length = 0;
  fartRings.length = 0;
}

function update() {
  if (gameState === 'playing') {
    applyPhysics(DAD);
    applyPhysics(ARGUS);
    updateAnim(DAD, DAD);
    updateAnim(ARGUS, ARGUS);
    checkHits();
    updateParticles();
    updateShake();
    if (tauntTimer > 0) tauntTimer--;

    if (DAD.hp === 0 || ARGUS.hp === 0) {
      roundTimer = 120;
      if (DAD.hp === 0) argusRounds++; else dadRounds++;
      gameState = 'roundEnd';
    }
  } else if (gameState === 'roundEnd') {
    updateParticles();
    updateShake();
    if (--roundTimer <= 0) {
      if (dadRounds >= 2 || argusRounds >= 2) gameState = 'matchEnd';
      else resetRound();
    }
  }
}

// ---------- Backgrounds ----------
const BGS = [
  { // Park — green grass
    sky: '#3a7d44', ground: '#4a3520', groundTop: '#5a4530',
    plat: '#5a3a1a', platTop: '#7a5a2a', platBorder: '#3a2a0a',
    name: 'Park', decor(ctx) {
      ctx.fillStyle = '#4a8a54';
      for (let i = 0; i < 14; i++) {
        const bx = (i * 70 + 13) % W;
        ctx.fillRect(bx, 480 + (i % 3) * 28, 2, 6 + (i % 4) * 2);
      }
    }
  },
  { // Backyard — darker earth
    sky: '#5a6b3a', ground: '#4a3520', groundTop: '#6b5030',
    plat: '#4a3020', platTop: '#6a4a30', platBorder: '#2a1a0a',
    name: 'Backyard', decor(ctx) {
      ctx.fillStyle = '#3a5a2a';
      for (let i = 0; i < 6; i++) {
        const bx = (i * 160 + 40) % W;
        ctx.beginPath(); ctx.arc(bx + 15, 460, 14, Math.PI, 0); ctx.fill();
      }
      ctx.fillStyle = '#6a5040';
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(40 + i * 120, 470, 30, 2);
      }
    }
  },
  { // Beach — sand & sea
    sky: '#87ceeb', ground: '#d4a95a', groundTop: '#e8c878',
    plat: '#a07840', platTop: '#c09850', platBorder: '#705828',
    name: 'Beach', decor(ctx) {
      ctx.fillStyle = '#6ab0d0';
      ctx.fillRect(0, 0, W, 60);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(40, 20, 30, 4); ctx.fillRect(160, 35, 25, 3);
      ctx.fillRect(800, 25, 35, 4); ctx.fillRect(600, 45, 20, 3);
      ctx.fillStyle = '#c09850';
      ctx.font = '18px serif';
      for (let i = 0; i < 3; i++) ctx.fillText('~', 60 + i * 300, 440 + i * 8);
    }
  },
  { // Playground — colorful rubber mats
    sky: '#b8d4e8', ground: '#6a4a8a', groundTop: '#8a6aaa',
    plat: '#d04040', platTop: '#e86060', platBorder: '#902828',
    name: 'Playground', decor(ctx) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath(); ctx.arc(160, 520, 60, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(400, 540, 45, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(640, 510, 70, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(880, 550, 35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8c040';
      ctx.font = '30px sans-serif';
      ctx.fillText('★', 60, 440);
      ctx.fillText('★', 500, 410);
      ctx.fillText('★', 880, 430);
    }
  },
  { // Living room — wood floor indoors
    sky: '#e8d8c8', ground: '#b8885a', groundTop: '#d4a870',
    plat: '#604030', platTop: '#805040', platBorder: '#382018',
    name: 'Living Room', decor(ctx) {
      ctx.strokeStyle = '#c8a070';
      ctx.lineWidth = 1;
      for (let i = 0; i < 16; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 64, ground.y);
        ctx.lineTo(i * 64, H);
        ctx.stroke();
      }
      ctx.fillStyle = '#d0b090';
      ctx.fillRect(0, 0, W, 30);
      ctx.fillStyle = '#c0a080';
      ctx.fillRect(0, 30, W, 8);
    }
  },
  { // Moon — gray lunar surface
    sky: '#0a0818', ground: '#6a6070', groundTop: '#8a8090',
    plat: '#4a4850', platTop: '#6a6870', platBorder: '#2a2830',
    name: 'Moon', decor(ctx) {
      ctx.fillStyle = '#e8e8f0';
      ctx.beginPath(); ctx.arc(840, 80, 50, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c8c8d8';
      ctx.beginPath(); ctx.arc(820, 70, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(855, 95, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 30; i++) {
        const sx = (i * 137 + 43) % W;
        const sy = (i * 89 + 17) % (ground.y - 20);
        const ss = 1 + (i % 3);
        ctx.fillRect(sx, sy, ss, ss);
      }
      ctx.fillStyle = '#5a5870';
      for (let i = 0; i < 4; i++) {
        const cx = 60 + i * 260;
        const cy = 570 + (i % 2) * 8;
        ctx.beginPath(); ctx.arc(cx, cy, 6 + (i % 3) * 3, 0, Math.PI * 2); ctx.fill();
      }
    }
  },
];

let currentBg = null;

function drawPlatforms() {
  const bg = currentBg || BGS[0];
  for (const p of platforms) {
    if (p === ground) continue;
    ctx.fillStyle = bg.plat;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = bg.platTop;
    ctx.fillRect(p.x, p.y, p.w, 3);
    ctx.strokeStyle = bg.platBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  }
}

function drawHpBar(p, leftSide) {
  const barW = 180, barH = 16;
  const x = leftSide ? 20 : W - 20 - barW;
  const y = 16;
  const pct = p.hp / MAX_HP;

  ctx.fillStyle = '#222';
  ctx.fillRect(x, y, barW, barH);
  ctx.fillStyle = pct > 0.3 ? '#2a2' : '#a22';
  ctx.fillRect(x + 1, y + 1, (barW - 2) * pct, barH - 2);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, barW, barH);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = leftSide ? 'left' : 'right';
  ctx.fillText(p.label, leftSide ? x : x + barW, y - 4);
  ctx.font = '11px monospace';
  ctx.fillText(`${p.hp} / ${MAX_HP}`, leftSide ? x + 4 : x + barW - 4, y + 12);
}

function drawMatchScore() {
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`Dad ${dadRounds} — ${argusRounds} Argus`, W / 2, 18);
  if (currentLayout) {
    ctx.fillStyle = '#888';
    ctx.font = '11px monospace';
    const bgName = currentBg ? currentBg.name : '';
    ctx.fillText(`${currentLayout.name} / ${bgName}`, W / 2, 34);
  }
}

function drawArena() {
  const bg = currentBg || BGS[0];
  ctx.fillStyle = bg.sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = bg.ground;
  ctx.fillRect(ground.x, ground.y, ground.w, ground.h);
  ctx.fillStyle = bg.groundTop;
  ctx.fillRect(ground.x, ground.y, ground.w, 4);
  bg.decor(ctx);
  drawPlatforms();
}

function draw() {
  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawArena();

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Jump on the other player to fart!', W / 2, H - 10);

  drawHpBar(DAD, true);
  drawHpBar(ARGUS, false);
  drawMatchScore();

  drawSprite(DAD, DAD);
  drawSprite(ARGUS, ARGUS);
  drawParticles();

  if (activeTaunt && tauntTimer > 0) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeText(activeTaunt, W / 2, H / 2 - 70);
    ctx.fillText(activeTaunt, W / 2, H / 2 - 70);
  }

  if (gameState === 'roundEnd') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${DAD.hp === 0 ? 'Argus' : 'Dad'} wins round!`, W / 2, H / 2 - 20);
    ctx.font = '20px monospace';
    ctx.fillText(`Round ${dadRounds + argusRounds + 1} starting…`, W / 2, H / 2 + 30);
  }

  if (gameState === 'matchEnd') {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 56px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${dadRounds >= 2 ? 'Dad' : 'Argus'} wins the match!`, W / 2, H / 2 - 30);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`Dad ${dadRounds} — ${argusRounds} Argus`, W / 2, H / 2 + 30);
    ctx.fillStyle = '#aaa';
    ctx.font = '18px monospace';
    ctx.fillText('Press Space to play again', W / 2, H / 2 + 80);
  }

  if (gameState === 'start') {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 52px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Dad vs Argus', W / 2, H / 2 - 100);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('Dad', W / 2 - 150, H / 2 - 30);
    ctx.fillStyle = '#2266cc';
    ctx.fillRect(W / 2 - 177, H / 2 - 62, 44, 44);
    ctx.fillStyle = '#ccc';
    ctx.font = '14px monospace';
    ctx.fillText('A / D  move    W  jump', W / 2 - 150, H / 2);
    ctx.font = '12px monospace';
    ctx.fillText('Big · Slow · 15 dmg', W / 2 - 150, H / 2 + 20);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('Argus', W / 2 + 150, H / 2 - 30);
    ctx.fillStyle = '#cc4422';
    ctx.fillRect(W / 2 + 123, H / 2 - 62, 32, 32);
    ctx.fillStyle = '#ccc';
    ctx.font = '14px monospace';
    ctx.fillText('← / →  move    ↑  jump', W / 2 + 150, H / 2);
    ctx.font = '12px monospace';
    ctx.fillText('Small · Fast · 10 dmg', W / 2 + 150, H / 2 + 20);

    ctx.fillStyle = '#aaa';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('Press SPACE to start', W / 2, H / 2 + 80);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#8f8';
    ctx.fillText('Jump on the other player to fart!', W / 2, H / 2 + 110);
  }

  ctx.restore();
}

// ---------- Loop ----------
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loadSprites();
loop();

document.addEventListener('keydown', e => {
  if (e.key === ' ') {
    if (gameState === 'start') {
      pickLayout();
      gameState = 'playing';
    } else if (gameState === 'matchEnd') {
      dadRounds = 0;
      argusRounds = 0;
      resetRound();
    }
    e.preventDefault();
  }
});
