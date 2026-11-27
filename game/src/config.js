// Every tuning number, colour and font in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below
// depends on the screen size. All art is drawn with Canvas 2D primitives — no
// external images, fonts or sounds.

export const FIELD = { width: 1280, height: 720, groundY: 624 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** How many pixels the turkey must run to reach the woods and escape. */
export const ESCAPE_DISTANCE = 4200;

/** The player turkey. */
export const PLAYER = {
  width: 44,
  height: 52,
  runSpeed: 560,
  accel: 1400,
  friction: 900,
  jump: 1180,
  gravity: 2700,
  maxFall: 1400,
  invulnerable: 1.4,
  jumpHold: 0.16,
};

/** Lives and distance-based difficulty. */
export const LIVES = 3;
export const DIFFICULTY = { speedPerMetre: 0.00009, spawnPerMetre: 0.000018 };

/** The farmer chasing from behind. */
export const FARMER = { width: 46, height: 68, baseSpeed: 380, closeGap: 90 };

/** The oven hazard: a glowing zone in the kitchen section. */
export const OVEN = { width: 150, height: 130, openSeconds: 6, closedSeconds: 4 };

/** The spinning carving knife hazard. */
export const KNIFE = { width: 30, height: 150, speed: 300, spin: 0.22, spawnHeight: 80 };

/** Collectibles. */
export const CORN = { size: 20, points: 10 };
export const FEATHER = { size: 18, points: 25, boostSeconds: 4, boostMultiplier: 1.6 };

/** Particles. */
export const PARTICLE = { max: 220, life: 0.7 };

/** Colours: an autumn Thanksgiving palette. */
export const PALETTE = {
  skyDay: '#7aa8d4',
  skyDusk: '#5b2d3a',
  groundDay: '#6b8e54',
  groundDusk: '#3d3a2b',
  barn: '#b02a20',
  barnTrim: '#f2e8d4',
  fence: '#5d402e',
  hay: '#f0c96b',
  treeTrunk: '#5c3a1e',
  treeLeaf: '#c0392b',
  treeLeaf2: '#e67e22',
  treeLeaf3: '#f1c40f',
  turkeyBody: '#8d4e1a',
  turkeyBodyLight: '#c47a45',
  turkeyTail: '#d35400',
  turkeyHead: '#c9a66b',
  turkeyWattle: '#e74c3c',
  turkeyEye: '#1a1a1a',
  farmerSkin: '#e3b87c',
  farmerOveralls: '#3d5a41',
  farmerShirt: '#d4a017',
  farmerHat: '#4a321a',
  farmerBeard: '#e8e8e0',
  ovenBody: '#2b2b2b',
  ovenGlow: '#ff4500',
  ovenDoor: '#e67e22',
  ovenLight: '#ffd93d',
  knifeBlade: '#bdc3c7',
  knifeEdge: '#ecf0f1',
  knifeGleam: '#ffffff',
  corn: '#f1c40f',
  cornHusk: '#2e7d1e',
  feather: '#9b59b6',
  featherShaft: '#ecf0f1',
  particleDust: '#d4c7a8',
  particleLeaf: '#e67e22',
  panel: '#222a1e',
  panelBorder: '#8a9a6e',
  text: '#f4f6f0',
  muted: '#b9c6a8',
  danger: '#e74c3c',
  escape: '#2ecc71',
  heatWave: 'rgba(255, 140, 0, 0.35)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best distance is kept between visits (this browser only). */
export const BEST_KEY = 'turkey-run.best';
