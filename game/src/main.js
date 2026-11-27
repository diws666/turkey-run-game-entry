// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play,
// paused, caught and escaped.
//
// ?seed=N fixes the run pattern. ?shot=start|play|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot. Screenshots are real renders of this code, taken with the
// shot-cdp.mjs helper over headless Chrome on file:// URLs.

import { STEP, FIELD, LIVES, ESCAPE_DISTANCE } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_HIT, EVENT_COLLECT, EVENT_OVER, EVENT_ESCAPED } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_CAUGHT, SCREEN_ESCAPED } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem('turkey-run.best') ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem('turkey-run.best', String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Running. Dodge the farmer, the oven and the knife.');
  }

  function endCaught() {
    screen = SCREEN_CAUGHT;
    if (world.state.distance > best) {
      best = Math.floor(world.state.distance);
      saveBest(best);
    }
    announce(`Caught for dinner. Distance ${best} m. Best ${best} m.`);
  }

  function endEscaped() {
    screen = SCREEN_ESCAPED;
    if (world.state.distance > best) {
      best = Math.floor(world.state.distance);
      saveBest(best);
    }
    announce(`Free bird! Escaped after ${best} m. Best ${best} m.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT || screen === SCREEN_ESCAPED)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Running.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { direction: () => 0, jumping: () => false, takeActions: () => 0 }, true);
      return;
    }
    const events = world.step(STEP, input, false);
    if (events & EVENT_OVER) endCaught();
    else if (events & EVENT_ESCAPED) endEscaped();
    else if (events & EVENT_HIT) {
      announce(world.state.lives === 1 ? 'Hit. 1 life left.' : `Hit. ${world.state.lives} lives left.`);
    } else if (events & EVENT_COLLECT) {
      // Score/distance feedback is in the HUD; keep the status quiet here.
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting dangers pass unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce(`Turkey Run. Distance to the woods: ${Math.floor(ESCAPE_DISTANCE)} m. Press Space or click to start.`);
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
