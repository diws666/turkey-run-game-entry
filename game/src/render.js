// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred. The camera follows
// the running turkey, so the player stays near the left third while the farmyard,
// the barn, the fence, the oven and the knife scroll past. All art is drawn with
// Canvas 2D primitives — an autumn Thanksgiving palette, no external assets.

import { ESCAPE_DISTANCE, FIELD, FARMER, KNIFE, LIVES, OVEN, CORN, FEATHER, PARTICLE, PLAYER, PALETTE, FONT } from './config.js';
import { KIND_CORN } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_ESCAPED = 'escaped';

const CENTER_X = 340;
const PANEL = { width: 700, top: 120, line: 36, bottom: 70 };
const LIFE_SIZE = 22;
const LIFE_GAP = 10;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const distLabel = cachedLabel('m');
  const bestLabel = cachedLabel('Best ');
  const hudDist = cachedLabel('Distance ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, baseline = 'alphabetic') {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = baseline;
    context.fillText(value, x, y);
  }

  function worldX(wx, cameraX) {
    return wx - cameraX + CENTER_X;
  }

  // ---------------------------------------------------------------- scenery

  function lerpColor(a, b, t) {
    const ra = parseInt(a.slice(1, 3), 16);
    const ga = parseInt(a.slice(3, 5), 16);
    const ba = parseInt(a.slice(5, 7), 16);
    const rb = parseInt(b.slice(1, 3), 16);
    const gb = parseInt(b.slice(3, 5), 16);
    const bb = parseInt(b.slice(5, 7), 16);
    const r = Math.round(ra + (rb - ra) * t);
    const g = Math.round(ga + (gb - ga) * t);
    const bb2 = Math.round(ba + (bb - ba) * t);
    return `rgb(${r},${g},${bb2})`;
  }

  function drawSky(dusk) {
    const top = lerpColor(PALETTE.skyDay, PALETTE.skyDusk, dusk);
    const bottom = lerpColor('#d7e8f5', '#2b1b22', dusk);
    const grad = context.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Sun / moon.
    context.fillStyle = dusk < 0.5 ? '#ffd966' : '#e3c2a5';
    context.beginPath();
    context.arc(1020 - dusk * 700, 110 + dusk * 60, 44 - dusk * 14, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.35)';
    context.beginPath();
    context.arc(1020 - dusk * 700 - 8, 110 + dusk * 60 - 8, 16, 0, Math.PI * 2);
    context.fill();
  }

  function drawGround(dusk) {
    const ground = lerpColor(PALETTE.groundDay, PALETTE.groundDusk, dusk);
    context.fillStyle = ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = dusk < 0.5 ? '#5c7a3d' : '#3d3a2b';
    context.fillRect(0, FIELD.groundY, FIELD.width, 10);
  }

  function drawTree(wx, cameraX, dusk, scale) {
    const x = worldX(wx, cameraX);
    if (x < -120 || x > FIELD.width + 120) return;
    const base = FIELD.groundY;
    context.fillStyle = PALETTE.treeTrunk;
    context.fillRect(x - 10 * scale, base - 120 * scale, 20 * scale, 120 * scale);
    const leaf = dusk < 0.6 ? [PALETTE.treeLeaf, PALETTE.treeLeaf2, PALETTE.treeLeaf3] : [PALETTE.treeLeaf, PALETTE.treeLeaf2];
    for (let i = 0; i < 3; i += 1) {
      context.fillStyle = leaf[i % leaf.length];
      context.beginPath();
      context.arc(x + (i - 1) * 18 * scale, base - 80 * scale - i * 10, 38 * scale, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawBarn(wx, cameraX, dusk) {
    const x = worldX(wx, cameraX);
    if (x < -220 || x > FIELD.width + 220) return;
    const base = FIELD.groundY;
    context.fillStyle = PALETTE.barn;
    context.fillRect(x - 110, base - 170, 220, 170);
    context.fillStyle = PALETTE.barnTrim;
    context.fillRect(x - 110, base - 170, 220, 14); // roof trim
    context.fillRect(x - 110, base - 30, 220, 14); // base trim
    // Door.
    context.fillStyle = 'rgba(40,30,18,0.85)';
    context.fillRect(x - 36, base - 100, 72, 100);
    context.fillStyle = PALETTE.barnTrim;
    context.fillRect(x - 10, base - 100, 4, 100);
    context.fillRect(x - 34, base - 6, 68, 6);
    // Window.
    context.fillStyle = '#fde68a';
    context.fillRect(x + 30, base - 120, 26, 22);
    context.fillStyle = PALETTE.barnTrim;
    context.fillRect(x + 30, base - 120, 3, 22);
    context.fillRect(x + 53, base - 120, 3, 22);
    context.fillRect(x + 41, base - 110, 10, 3);
    context.fillRect(x + 41, base - 100, 10, 3);
  }

  function drawFence(cameraX, dusk) {
    context.strokeStyle = PALETTE.fence;
    context.lineWidth = 5;
    context.lineCap = 'round';
    const start = Math.floor((cameraX - CENTER_X) / 40) * 40;
    for (let x = start - 40; x < cameraX + FIELD.width + 40; x += 40) {
      const sx = worldX(x, cameraX);
      if (sx < -20 || sx > FIELD.width + 20) continue;
      context.beginPath();
      context.moveTo(sx, FIELD.groundY);
      context.lineTo(sx, FIELD.groundY - 42);
      context.stroke();
    }
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(Math.max(-20, worldX(start - 40, cameraX)), FIELD.groundY - 12);
    context.lineTo(Math.min(FIELD.width + 20, worldX(start + 2000, cameraX)), FIELD.groundY - 12);
    context.stroke();
  }

  function drawHay(wx, cameraX, dusk) {
    const x = worldX(wx, cameraX);
    if (x < -40 || x > FIELD.width + 40) return;
    const base = FIELD.groundY;
    context.fillStyle = PALETTE.hay;
    context.beginPath();
    context.moveTo(x - 26, base);
    context.lineTo(x + 26, base);
    context.lineTo(x + 12, base - 22);
    context.lineTo(x - 12, base - 22);
    context.closePath();
    context.fill();
    context.fillStyle = 'rgba(160,110,40,0.35)';
    context.fillRect(x - 20, base - 4, 40, 4);
  }

  // ---------------------------------------------------------------- characters

  function drawTurkey(player, cameraX, dusk, invulnFlash) {
    const sx = CENTER_X + player.lane;
    const sy = player.y;
    const base = sy + player.height;
    const facing = player.facing;
    // Tail fan.
    for (let i = 0; i < 4; i += 1) {
      context.fillStyle = i === 0 ? PALETTE.turkeyTail : i === 1 ? '#e67e22' : i === 2 ? '#f1c40f' : '#d35400';
      context.beginPath();
      context.ellipse(sx - facing * (6 + i * 7), base - 14 - i * 4, 18 + i * 10, 14 + i * 6, 0, 0.6, 2.6);
      context.fill();
    }
    // Body.
    context.fillStyle = PALETTE.turkeyBody;
    context.beginPath();
    context.ellipse(sx, base - 16, player.width * 0.5, player.height * 0.62, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.turkeyBodyLight;
    context.beginPath();
    context.ellipse(sx - facing * 6, base - 20, player.width * 0.34, player.height * 0.4, 0, 0, Math.PI * 2);
    context.fill();
    // Wing.
    context.fillStyle = 'rgba(60,40,20,0.25)';
    context.beginPath();
    context.ellipse(sx + facing * 10, base - 10, 14, 10, 0, 0, Math.PI * 2);
    context.fill();
    // Head.
    const hx = sx + facing * 22;
    context.fillStyle = PALETTE.turkeyHead;
    context.beginPath();
    context.ellipse(hx, base - 42, 15, 17, 0, 0, Math.PI * 2);
    context.fill();
    // Eye.
    context.fillStyle = PALETTE.turkeyEye;
    context.beginPath();
    context.arc(hx + facing * 4, base - 46, 3.5, 0, Math.PI * 2);
    context.fill();
    // Wattle.
    context.fillStyle = PALETTE.turkeyWattle;
    context.fillRect(hx + facing * 16, base - 36, 10, 14);
    // Legs.
    context.strokeStyle = PALETTE.turkeyBody;
    context.lineWidth = 6;
    context.lineCap = 'round';
    const walking = Math.floor(Date.now() / 140) % 2;
    for (let l = 0; l < 2; l += 1) {
      const lx = sx + (l === 0 ? -8 : 8) * facing;
      const ly = base + (walking === 0 ? 2 : -2);
      context.beginPath();
      context.moveTo(lx, base - 4);
      context.lineTo(lx - facing * 6, ly + 16);
      context.stroke();
      context.fillRect(lx - facing * 6 - 3, ly + 12, 6, 6);
    }
    // Blink while invulnerable.
    if (invulnFlash) context.globalAlpha = 0.35;
    context.globalAlpha = 1;
  }

  function drawFarmer(farmer, cameraX, dusk, spotted) {
    const sx = worldX(farmer.x, cameraX);
    if (sx < -80 || sx > FIELD.width + 80) return;
    const sy = farmer.y;
    const base = sy + FARMER.height;
    context.fillStyle = spotted ? PALETTE.danger : PALETTE.farmerSkin;
    // Head.
    context.beginPath();
    context.arc(sx, base - 62, 19, 0, Math.PI * 2);
    context.fill();
    // Hat.
    context.fillStyle = PALETTE.farmerHat;
    context.beginPath();
    context.ellipse(sx, base - 76, 24, 10, 0, 0, Math.PI * 2);
    context.fill();
    context.fillRect(sx - 18, base - 74, 36, 14);
    // Beard.
    context.fillStyle = PALETTE.farmerBeard;
    context.beginPath();
    context.ellipse(sx, base - 46, 16, 14, 0, 0, Math.PI * 2);
    context.fill();
    // Body / overalls.
    context.fillStyle = PALETTE.farmerOveralls;
    context.fillRect(sx - 18, base - 42, 36, 40);
    context.fillStyle = PALETTE.farmerShirt;
    context.fillRect(sx - 16, base - 40, 32, 34);
    context.fillStyle = PALETTE.farmerOveralls;
    context.fillRect(sx - 14, base - 6, 10, 6);
    context.fillRect(sx + 4, base - 6, 10, 6);
    // Arms.
    context.strokeStyle = PALETTE.farmerSkin;
    context.lineWidth = 8;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(sx - 16, base - 36);
    context.lineTo(sx - 30, base - 24);
    context.stroke();
    context.beginPath();
    context.moveTo(sx + 16, base - 36);
    context.lineTo(sx + 30, base - 20);
    context.stroke();
    // Legs.
    context.fillStyle = PALETTE.farmerOveralls;
    context.fillRect(sx - 12, base - 4, 14, 4);
    context.fillRect(sx - 2, base - 4, 14, 4);
    context.fillStyle = '#2b1b10';
    context.fillRect(sx - 12, base, 14, 4);
    context.fillRect(sx - 2, base, 14, 4);
    // Exclamation when spotted.
    if (spotted) {
      context.fillStyle = PALETTE.danger;
      context.font = 'bold 24px ' + FONT;
      context.textAlign = 'center';
      context.fillText('!', sx, base - 90);
    }
  }

  // ---------------------------------------------------------------- hazards & collectibles

  function drawOven(oven, cameraX, dusk) {
    if (!oven.active) return;
    const sx = worldX(oven.x, cameraX);
    if (sx < -220 || sx > FIELD.width + 220) return;
    const base = FIELD.groundY;
    const open = oven.open;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 180);
    const glow = `rgba(255, 140, 0, ${0.45 + pulse * 0.35})`;
    // Heat waves above the oven.
    context.fillStyle = PALETTE.heatWave;
    for (let i = 0; i < 3; i += 1) {
      const wx = sx - 30 + i * 30;
      const phase = (Date.now() / 700 + i) % 1;
      context.beginPath();
      context.moveTo(wx + Math.sin(phase * Math.PI * 2) * 6, base - OVEN.height - 40 - phase * 22);
      context.quadraticCurveTo(wx + 14, base - OVEN.height - 14 - phase * 22, wx + 28 + Math.sin(phase * Math.PI * 2) * 6, base - OVEN.height - 40 - phase * 22);
      context.lineTo(wx + 28, base - OVEN.height - 18 - phase * 22);
      context.quadraticCurveTo(wx + 14, base - OVEN.height - 14 - phase * 22, wx, base - OVEN.height - 18 - phase * 22);
      context.fill();
    }
    // Oven body.
    context.fillStyle = PALETTE.ovenBody;
    context.fillRect(sx - OVEN.width / 2, base - OVEN.height, OVEN.width, OVEN.height);
    context.strokeStyle = PALETTE.ovenDoor;
    context.lineWidth = 6;
    context.strokeRect(sx - OVEN.width / 2 + 6, base - OVEN.height + 6, OVEN.width - 12, OVEN.height - 12);
    // Door.
    context.fillStyle = open ? 'rgba(30,20,15,0.9)' : PALETTE.ovenDoor;
    context.fillRect(sx - OVEN.width / 2 + 14, base - OVEN.height + 14, OVEN.width - 28, OVEN.height - 28);
    // Interior glow when open.
    if (open) {
      context.fillStyle = 'rgba(255, 90, 20, 0.55)';
      context.fillRect(sx - OVEN.width / 2 + 16, base - OVEN.height + 16, OVEN.width - 32, OVEN.height - 32);
      context.fillStyle = 'rgba(255, 217, 61, 0.35)';
      context.beginPath();
      context.arc(sx, base - OVEN.height / 2, 26 + pulse * 10, 0, Math.PI * 2);
      context.fill();
    }
    // Handle.
    context.fillStyle = PALETTE.farmerHat;
    context.fillRect(sx + OVEN.width / 2 - 14, base - OVEN.height + OVEN.height / 2 - 6, 10, 12);
    // Glow rim.
    context.strokeStyle = glow;
    context.lineWidth = 3;
    context.strokeRect(sx - OVEN.width / 2 - 4, base - OVEN.height - 4, OVEN.width + 8, OVEN.height + 8);
  }

  function drawKnife(item, cameraX, dusk) {
    const sx = worldX(item.x, cameraX);
    const sy = item.y;
    if (sx < -60 || sx > FIELD.width + 60) return;
    context.save();
    context.translate(sx + item.width / 2, sy + item.height / 2);
    context.rotate(item.angle);
    const hw = item.width / 2;
    const hh = item.height / 2;
    // Blade.
    context.fillStyle = PALETTE.knifeBlade;
    context.beginPath();
    context.moveTo(-hw, -hh + 10);
    context.lineTo(hw, -hh + 10);
    context.lineTo(0, hh);
    context.closePath();
    context.fill();
    context.strokeStyle = PALETTE.knifeEdge;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-hw + 4, -hh + 12);
    context.lineTo(hw - 4, -hh + 12);
    context.lineTo(2, hh - 4);
    context.stroke();
    // Gleam.
    context.fillStyle = PALETTE.knifeGleam;
    context.beginPath();
    context.moveTo(-hw + 8, -hh + 16);
    context.lineTo(-hw + 18, -hh + 26);
    context.lineTo(-hw + 12, -hh + 20);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawCorn(item, cameraX) {
    const sx = worldX(item.x, cameraX);
    const sy = item.y;
    if (sx < -40 || sx > FIELD.width + 40) return;
    context.fillStyle = PALETTE.corn;
    context.beginPath();
    context.ellipse(sx, sy, item.size / 2.4, item.size / 2, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.cornHusk;
    context.fillRect(sx - item.size / 3, sy + item.size / 4, item.size * 0.62, item.size * 0.42);
  }

  function drawFeather(item, cameraX) {
    const sx = worldX(item.x, cameraX);
    const sy = item.y;
    if (sx < -40 || sx > FIELD.width + 40) return;
    const t = Date.now() / 300;
    const sway = Math.sin(t) * 5;
    context.fillStyle = PALETTE.feather;
    context.beginPath();
    context.ellipse(sx + sway, sy, item.size / 2.6, item.size / 2, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.featherShaft;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(sx + sway, sy - item.size / 2);
    context.lineTo(sx + sway, sy + item.size / 2);
    context.stroke();
  }

  function drawParticle(p) {
    context.globalAlpha = Math.max(0, p.life / PARTICLE.life);
    context.fillStyle = p.color;
    context.beginPath();
    context.arc(p.x, p.y, 2 + Math.random() * 0, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- HUD & panels

  function drawHud(state, best) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 16, 30, PALETTE.text, 'left');
    text(hudDist(Math.floor(state.distance)), FIELD.width / 2, 16, 30, PALETTE.text, 'center');
    const pct = Math.min(1, state.distance / ESCAPE_DISTANCE);
    const barW = 320;
    const barX = FIELD.width - barW - 24;
    const barY = 18;
    context.fillStyle = 'rgba(30,40,30,0.55)';
    context.fillRect(barX, barY, barW, 18);
    context.fillStyle = PALETTE.escape;
    context.fillRect(barX, barY, barW * pct, 18);
    context.strokeStyle = PALETTE.text;
    context.lineWidth = 2;
    context.strokeRect(barX, barY, barW, 18);
    // Label sits below the bar (bar is 18 px tall starting at barY), never on top of it, at any bar width.
    text('WOODS', barX + barW / 2, barY + 30, 13, PALETTE.muted, 'center');
    // Lives.
    const firstLife = FIELD.width - 24 - LIVES * (LIFE_SIZE + LIFE_GAP) + LIFE_GAP;
    text('Lives', firstLife - 50, 16, 30, PALETTE.text, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      context.fillStyle = life < state.lives ? PALETTE.turkeyBody : 'rgba(40,40,40,0.35)';
      context.beginPath();
      context.ellipse(firstLife + life * (LIFE_SIZE + LIFE_GAP) + 10, 30, 10, 13, 0, 0, Math.PI * 2);
      context.fill();
    }
    // Boost indicator.
    if (state.player.boost > 0) {
      text('FEATHER BOOST', 24, 52, 16, PALETTE.feather, 'left');
    }
    // Farmer proximity warning.
    const gap = state.player.x - state.farmer.x;
    if (gap < 260 && gap > 0 && state.player.invulnerable === 0) {
      text('FARMER CLOSING', FIELD.width / 2, 52, 17, PALETTE.danger, 'center');
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelBorder;
    context.lineWidth = 3;
    context.strokeRect(x, y, PANEL.width, height);
    context.fillStyle = PALETTE.barn;
    context.fillRect(x, y, PANEL.width, 10);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 80, 50, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 24, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 42, 26, PALETTE.corn, 'center');
  }

  const TITLE_LINES = ['A turkey on the run from Thanksgiving dinner.', 'Dodge the farmer, the oven and the spinning knife.', 'Grab corn and feathers to boost your score.', ''];
  const CAUGHT_LINES = ['', ''];
  const ESCAPED_LINES = ['', ''];
  const PAUSED_LINES = ['The farmer is waiting at the fence.'];

  /** Paint one frame. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.skyDay;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);

    const cameraX = state.player.x;
    const dusk = Math.min(1, state.distance / ESCAPE_DISTANCE);

    drawSky(dusk);
    // Distant scenery (parallax).
    const back = cameraX * 0.25;
    drawTree(900 + back * 0, back, dusk, 1.1);
    drawTree(2100 + back * 0, back, dusk, 0.9);
    drawTree(3300 + back * 0, back, dusk, 1.0);
    drawBarn(1500 - back * 0.5, cameraX, dusk);
    drawBarn(3000 - back * 0.5, cameraX, dusk);
    drawHay(1200 - back * 0.3, cameraX, dusk);
    drawHay(2400 - back * 0.3, cameraX, dusk);
    drawHay(3800 - back * 0.3, cameraX, dusk);
    drawFence(cameraX, dusk);
    drawGround(dusk);

    if (screen === SCREEN_TITLE) {
      TITLE_LINES[3] = bestLabel(best);
      drawPanel('Turkey Run', TITLE_LINES, 'Press Space or click to start');
      return;
    }

    // Oven (world position).
    drawOven(state.oven, cameraX, dusk);

    // Hazards and collectibles.
    for (const item of state.knives) if (item.active) drawKnife(item, cameraX, dusk);
    for (const item of state.corns) if (item.active) drawCorn(item, cameraX);
    for (const item of state.feathers) if (item.active) drawFeather(item, cameraX);

    // Farmer.
    const spotted = state.player.invulnerable === 0 && state.player.x - state.farmer.x < 300 && state.player.x - state.farmer.x > -60;
    drawFarmer(state.farmer, cameraX, dusk, spotted);

    // Player turkey.
    const invulnFlash = state.player.invulnerable > 0 && Math.floor(state.player.invulnerable * 12) % 2 === 0;
    drawTurkey(state.player, cameraX, dusk, invulnFlash);

    // Particles (drawn after turkey so they sit on top).
    for (const p of state.particles) if (p.active) drawParticle(p);

    drawHud(state, best);

    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    } else if (screen === SCREEN_CAUGHT) {
      CAUGHT_LINES[0] = `Caught after ${Math.floor(state.distance)} m.`;
      CAUGHT_LINES[1] = bestLabel(Math.floor(state.distance > best ? state.distance : best)) + ' m';
      drawPanel('Caught for dinner', CAUGHT_LINES, 'Press Space or click to run again');
    } else if (screen === SCREEN_ESCAPED) {
      ESCAPED_LINES[0] = `Escaped to the woods after ${Math.floor(state.distance)} m!`;
      ESCAPED_LINES[1] = bestLabel(Math.floor(state.distance > best ? state.distance : best)) + ' m';
      drawPanel('Free bird', ESCAPED_LINES, 'Press Space or click to run again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
