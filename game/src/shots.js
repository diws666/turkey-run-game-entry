// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world, steered by a simple autopilot, so the frame
// is what a short game really looks like and the same seed always gives the same
// frame. Screenshots taken this way are real renders of this code.

import { FIELD, PLAYER, STEP } from './config.js';
import { createWorld } from './world.js';
import { EVENT_OVER, EVENT_ESCAPED } from './world.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_CAUGHT, SCREEN_ESCAPED } from './render.js';

const START_SECONDS = 0;   // a clean, static title screen: no hazards mid-crossing
const PLAY_SECONDS = 6;    // mid-run: oven just lit ahead, escape not yet reached
const END_LIMIT_SECONDS = 90;
const SAMPLE = 1 / 30;
const NULL_INPUT = { direction: () => 0, jumping: () => false, takeActions: () => 0 };

/** Seconds until moving in `direction` (-1, 0, 1) runs the turkey into a knife; Infinity when it never does. */
function timeToHit(state, direction, horizon) {
  const player = state.player;
  const lane = player.lane + direction * 130;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const x = player.x + PLAYER.runSpeed * t;
    const yBase = FIELD.groundY - PLAYER.height;
    const y = player.y; // approximate: on ground
    for (let index = 0; index < state.knives.length; index += 1) {
      const item = state.knives[index];
      if (!item.active) continue;
      const kx = item.x + item.vx * t;
      if (kx + item.width < x - 20 || kx > x + player.width + 20) continue;
      const tHit = (item.x - x) / Math.max(1, -item.vx);
      if (tHit <= horizon && tHit >= t - SAMPLE) return tHit;
    }
  }
  return Infinity;
}

/** Steer to keep clear of knives and jump over ones that cannot be dodged. */
function autopilot(state) {
  const player = state.player;
  let dir = 0;
  let jump = false;
  let nearest = null;
  let nearestT = Infinity;
  for (let index = 0; index < state.knives.length; index += 1) {
    const item = state.knives[index];
    if (!item.active || item.x <= player.x) continue;
    const t = (item.x - player.x) / Math.max(1, -item.vx);
    if (t < nearestT) { nearestT = t; nearest = item; }
  }
  if (nearest) {
    // The knife's horizontal span at the player's arrival time.
    const arrival = nearestT;
    const kx = nearest.x + nearest.vx * arrival;
    const playerCx = player.x + player.width / 2 + player.lane;
    const knifeCx = kx + nearest.width / 2;
    if (arrival < 0.9) {
      if (player.onGround && Math.abs(knifeCx - playerCx) < player.width + 22) jump = true;
      else if (knifeCx > playerCx) dir = -1;
      else dir = 1;
    } else {
      // Drift back toward centre lane.
      if (player.lane > 10) dir = -1;
      else if (player.lane < -10) dir = 1;
    }
  } else {
    if (player.lane > 10) dir = -1;
    else if (player.lane < -10) dir = 1;
  }
  return { direction: () => dir, jumping: () => jump && player.onGround, takeActions: () => 0 };
}

/** Set `world` to the named scene (start, play or end; any other name is start) and return the screen to draw over it and the best distance. */
export function stageShot(name, world) {
  world.reset();
  const input = NULL_INPUT;
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, input, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  for (let index = 0; index < limit / STEP; index += 1) {
    const events = world.step(STEP, autopilot(world.state), false);
    if (events & (EVENT_OVER | EVENT_ESCAPED)) break;
  }
  if (world.state.escaped) return { screen: SCREEN_ESCAPED, best: world.state.distance };
  if (world.state.caught) return { screen: SCREEN_CAUGHT, best: world.state.distance };
  return { screen: SCREEN_PLAY, best: world.state.distance };
}
