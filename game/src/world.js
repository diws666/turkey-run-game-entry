// The game's rules and state, with no drawing and no browser in it: the running
// turkey, the chasing farmer, the oven and spinning knife hazards, corn and
// feather collectibles, particles, collisions, score, distance and lives.
// All positions are absolute world pixels; the camera follows player.x.
// step() advances one fixed step and returns what happened as bit flags, so the
// caller can react without the world knowing about screens or sound. Nothing
// here allocates after createWorld returns.

import { ESCAPE_DISTANCE, FIELD, LIVES, PLAYER, DIFFICULTY, FARMER, OVEN, KNIFE, CORN, FEATHER, PARTICLE, PALETTE } from './config.js';

export const KIND_KNIFE = 0;
export const KIND_CORN = 1;
export const KIND_FEATHER = 2;

export const EVENT_HIT = 1;
export const EVENT_COLLECT = 2;
export const EVENT_OVER = 4;
export const EVENT_ESCAPED = 8;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const player = {
    x: 0,
    y: FIELD.groundY - PLAYER.height,
    vx: 0,
    vy: 0,
    width: PLAYER.width,
    height: PLAYER.height,
    lane: 0,
    onGround: true,
    invulnerable: 0,
    boost: 0,
    facing: 1,
  };
  const farmer = { x: -FIELD.width / 2, y: FIELD.groundY - FARMER.height, active: true };
  const oven = { x: ESCAPE_DISTANCE - 560, y: FIELD.groundY - OVEN.height, active: false, open: false, timer: 0 };
  const knives = [];
  for (let index = 0; index < 16; index += 1) knives.push({ active: false, x: 0, y: 0, vx: 0, angle: 0, width: KNIFE.width, height: KNIFE.height });
  const corns = [];
  for (let index = 0; index < 8; index += 1) corns.push({ active: false, x: 0, y: 0, size: CORN.size });
  const feathers = [];
  for (let index = 0; index < 4; index += 1) feathers.push({ active: false, x: 0, y: 0, size: FEATHER.size });
  const particles = [];
  for (let index = 0; index < PARTICLE.max; index += 1) particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, type: 0, color: '#000' });

  const state = {
    player,
    farmer,
    oven,
    knives,
    corns,
    feathers,
    particles,
    score: 0,
    distance: 0,
    lives: LIVES,
    speed: PLAYER.runSpeed,
    spawnTimer: 0,
    spawnInterval: 1.1,
    ovenActiveDistance: ESCAPE_DISTANCE - 900,
    caught: false,
    escaped: false,
  };

  function reset() {
    player.x = 0;
    player.y = FIELD.groundY - PLAYER.height;
    player.vx = 0;
    player.vy = 0;
    player.lane = 0;
    player.onGround = true;
    player.invulnerable = 0;
    player.boost = 0;
    player.facing = 1;
    farmer.x = -FIELD.width / 2;
    farmer.y = FIELD.groundY - FARMER.height;
    farmer.active = true;
    oven.active = false;
    oven.open = false;
    oven.timer = 0;
    for (const item of knives) item.active = false;
    for (const item of corns) item.active = false;
    for (const item of feathers) item.active = false;
    for (const item of particles) item.active = false;
    state.score = 0;
    state.distance = 0;
    state.lives = LIVES;
    state.speed = PLAYER.runSpeed;
    state.spawnTimer = 0;
    state.spawnInterval = 1.1;
    state.caught = false;
    state.escaped = false;
  }

  function freeOf(list) {
    for (let index = 0; index < list.length; index += 1) if (!list[index].active) return list[index];
    return null;
  }

  function spawnParticle(x, y, color) {
    const p = freeOf(particles);
    if (p === null) return;
    p.active = true;
    p.x = x;
    p.y = y;
    const angle = random() * Math.PI * 2;
    const speed = 60 + random() * 140;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - 60;
    p.life = PARTICLE.life + random() * 0.4;
    p.color = color;
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) spawnParticle(x, y, color);
  }

  function spawnKnife() {
    const item = freeOf(knives);
    if (item === null) return;
    item.active = true;
    item.x = player.x + FIELD.width + 60;
    item.y = FIELD.groundY - item.height - KNIFE.spawnHeight * random();
    item.vx = -state.speed * 0.9;
    item.angle = random() * Math.PI * 2;
    item.width = KNIFE.width;
    item.height = KNIFE.height;
  }

  function spawnCollectible() {
    const roll = random();
    if (roll < 0.7) {
      const item = freeOf(corns);
      if (item === null) return;
      item.active = true;
      item.x = player.x + FIELD.width + 40;
      item.y = FIELD.groundY - 150 - random() * 220;
    } else {
      const item = freeOf(feathers);
      if (item === null) return;
      item.active = true;
      item.x = player.x + FIELD.width + 40;
      item.y = FIELD.groundY - 260 - random() * 140;
    }
  }

  function hitPlayer() {
    if (player.invulnerable > 0) return;
    state.lives -= 1;
    player.invulnerable = PLAYER.invulnerable;
    player.boost = 0;
    burst(player.x + player.width / 2, player.y + player.height / 2, PALETTE.danger, 14);
    farmer.x = player.x - FIELD.width / 3;
    if (state.lives <= 0) {
      state.lives = 0;
      state.caught = true;
    }
  }

  /** One fixed step. `input` supplies direction(), jumping(), takeActions(). */
  function step(dt, input) {
    let events = 0;

    // Auto-run forward; steering moves the strafing lane.
    player.x += state.speed * dt;
    state.distance = player.x;
    state.speed = PLAYER.runSpeed + DIFFICULTY.speedPerMetre * state.distance;

    state.spawnInterval = Math.max(0.45, 1.1 - DIFFICULTY.spawnPerMetre * state.distance);
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      if (random() < 0.75) spawnKnife();
      else spawnCollectible();
      state.spawnTimer += state.spawnInterval + random() * 0.6;
    }

    const dir = input.direction();
    const targetLane = dir * 130;
    player.lane += (targetLane - player.lane) * PLAYER.accel * dt;
    player.lane = Math.min(130, Math.max(-130, player.lane));
    player.facing = dir !== 0 ? dir : player.facing;

    if (input.jumping() && player.onGround && player.invulnerable === 0) {
      player.vy = -PLAYER.jump;
      player.onGround = false;
      burst(player.x + player.width / 2, FIELD.groundY, PALETTE.particleDust, 6);
    }
    if (!input.jumping()) player.vy = Math.min(player.vy, -PLAYER.jump * 0.5);
    player.vy += PLAYER.gravity * dt;
    if (player.vy > PLAYER.maxFall) player.vy = PLAYER.maxFall;
    player.y += player.vy * dt;
    if (player.y > FIELD.groundY - PLAYER.height) {
      player.y = FIELD.groundY - PLAYER.height;
      player.vy = 0;
      player.onGround = true;
    }
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (player.boost > 0) player.boost = Math.max(0, player.boost - dt);

    // Farmer chase.
    const farmerSpeed = FARMER.baseSpeed + DIFFICULTY.speedPerMetre * state.distance * 1.4;
    farmer.x += farmerSpeed * dt;
    if (!state.caught && !state.escaped && player.invulnerable === 0 && overlaps(farmer, player)) {
      hitPlayer();
      events |= EVENT_HIT;
    }

    // Oven activates in the kitchen section.
    if (!oven.active && player.x >= state.ovenActiveDistance) oven.active = true;
    if (oven.active) {
      oven.timer -= dt;
      if (oven.timer <= 0) {
        oven.open = !oven.open;
        oven.timer = oven.open ? OVEN.openSeconds : OVEN.closedSeconds;
      }
      if (!state.caught && !state.escaped && player.invulnerable === 0 && overlaps(player, oven)) {
        hitPlayer();
        events |= EVENT_HIT;
      }
    }

    // Knives move across the screen (leftwards relative to the run).
    for (let index = 0; index < knives.length; index += 1) {
      const item = knives[index];
      if (!item.active) continue;
      item.x += item.vx * dt;
      item.angle += KNIFE.spin;
      if (item.x + item.width < player.x - 120) {
        item.active = false;
        state.score += 2;
        events |= EVENT_COLLECT;
        continue;
      }
      if (!state.caught && !state.escaped && player.invulnerable === 0 && overlaps(player, item)) {
        hitPlayer();
        item.active = false;
        events |= EVENT_HIT;
      }
    }

    // Collectibles.
    for (let index = 0; index < corns.length; index += 1) {
      const item = corns[index];
      if (!item.active) continue;
      item.x -= state.speed * dt;
      if (item.x + item.size < player.x - 120) { item.active = false; continue; }
      if (!state.caught && !state.escaped && overlaps(item, player)) {
        item.active = false;
        const mult = player.boost > 0 ? FEATHER.boostMultiplier : 1;
        state.score += Math.floor(CORN.points * mult);
        burst(item.x + item.size / 2, item.y + item.size / 2, PALETTE.corn, 8);
        events |= EVENT_COLLECT;
      }
    }
    for (let index = 0; index < feathers.length; index += 1) {
      const item = feathers[index];
      if (!item.active) continue;
      item.x -= state.speed * dt;
      if (item.x + item.size < player.x - 120) { item.active = false; continue; }
      if (!state.caught && !state.escaped && overlaps(item, player)) {
        item.active = false;
        state.score += FEATHER.points;
        player.boost = FEATHER.boostSeconds;
        burst(item.x + item.size / 2, item.y + item.size / 2, PALETTE.feather, 10);
        events |= EVENT_COLLECT;
      }
    }

    // Particles.
    for (let index = 0; index < particles.length; index += 1) {
      const p = particles[index];
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += PLAYER.gravity * 0.35 * dt;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }

    if (!state.caught && !state.escaped && player.x >= ESCAPE_DISTANCE) {
      state.escaped = true;
      events |= EVENT_ESCAPED;
    }
    if (state.caught) events |= EVENT_OVER;

    return events;
  }

  reset();
  return { state, reset, step };
}
