/**
 * Tidewater Heat - Configuration & Game Constants
 * Golden-hour coastal crime open-world palette and physics tuning.
 */

export const WORLD = {
  width: 3200,
  height: 2800,
  tileSize: 40,
  beachY: 2360,
  waterY: 2520,
};

export const PALETTE = {
  sky: '#f6aa6a',
  sunlight: '#ffe8c2',
  shadow: 'rgba(20, 18, 30, 0.38)',
  shadowAngle: Math.PI * 0.28,
  shadowDist: 22,
  
  asphalt: '#2c2e35',
  asphaltDark: '#23252a',
  roadLineYellow: '#f5b027',
  roadLineWhite: '#eaecef',
  crosswalk: '#d8dee9',
  sidewalk: '#9ea6ae',
  sidewalkEdge: '#7b838c',
  
  sand: '#e8c98d',
  sandWet: '#cbab70',
  waterDeep: '#185675',
  waterShallow: '#2b849c',
  waterFoam: '#d2f2f7',
  boardwalk: '#9c6f44',
  boardwalkPlank: '#845c34',
  
  grass: '#538243',
  grassDark: '#416634',
  parkPath: '#d6c196',
  treeLeaves: '#2e6129',
  treeLeavesLight: '#3d7c36',
  treeTrunk: '#5a3821',

  hudBg: 'rgba(18, 22, 30, 0.88)',
  hudBorder: '#ff9838',
  hudText: '#f0f4f8',
  hudMuted: '#9aa5b1',
  starActive: '#ffb703',
  starEmpty: '#485260',
  healthRed: '#e63946',
  healthBg: '#3d161a',
  armorBlue: '#457b9d',
  cashGreen: '#2ec4b6',
  accentGold: '#f4a261',
};

export const CAMERA = {
  smoothing: 0.1,
  lookaheadFoot: 80,
  lookaheadCar: 220,
  zoomFoot: 1.0,
  zoomCar: 0.82,
};

export const PLAYER_CONFIG = {
  radius: 14,
  walkSpeed: 170,
  sprintSpeed: 290,
  accel: 1400,
  friction: 10,
  maxHealth: 100,
  startCash: 500,
};

export const WEAPON_CONFIG = {
  pistol: {
    name: '9mm Pistol',
    damage: 34,
    fireRate: 0.26,
    range: 650,
    speed: 1200,
    magSize: 15,
    maxAmmo: 120,
    spread: 0.04,
  },
};

export const VEHICLE_CONFIGS = {
  sedan: {
    name: 'Oceanview Sedan',
    width: 38,
    length: 74,
    maxSpeed: 380,
    accel: 360,
    reverseSpeed: 140,
    turnSpeed: 3.2,
    mass: 1200,
    health: 220,
    bodyColor: '#457b9d',
    roofColor: '#2b5066',
  },
  sports: {
    name: 'Cheetah GT',
    width: 40,
    length: 78,
    maxSpeed: 540,
    accel: 520,
    reverseSpeed: 180,
    turnSpeed: 3.8,
    mass: 1100,
    health: 260,
    bodyColor: '#e63946',
    roofColor: '#1d2a44',
  },
  police: {
    name: 'Tidewater Cruiser',
    width: 39,
    length: 76,
    maxSpeed: 470,
    accel: 440,
    reverseSpeed: 160,
    turnSpeed: 3.5,
    mass: 1400,
    health: 300,
    bodyColor: '#1e2530',
    roofColor: '#f1f5f9',
    isPolice: true,
  },
  muscle: {
    name: 'V8 Stallion',
    width: 40,
    length: 76,
    maxSpeed: 490,
    accel: 480,
    reverseSpeed: 150,
    turnSpeed: 3.1,
    mass: 1350,
    health: 280,
    bodyColor: '#f4a261',
    roofColor: '#264653',
  },
  taxi: {
    name: 'Metro Cab',
    width: 38,
    length: 74,
    maxSpeed: 390,
    accel: 370,
    reverseSpeed: 140,
    turnSpeed: 3.3,
    mass: 1250,
    health: 240,
    bodyColor: '#ffb703',
    roofColor: '#d69400',
  },
  van: {
    name: 'Cargo Hauler',
    width: 42,
    length: 82,
    maxSpeed: 330,
    accel: 290,
    reverseSpeed: 110,
    turnSpeed: 2.7,
    mass: 1800,
    health: 380,
    bodyColor: '#6c757d',
    roofColor: '#495057',
  },
};

export const LANDMARKS = {
  marisolGarage: { x: 500, y: 440, w: 160, h: 120, name: "Marisol's Garage", type: 'garage' },
  hospital: { x: 1700, y: 440, w: 200, h: 140, name: 'Tidewater Memorial Hospital', type: 'hospital' },
  policeStation: { x: 1700, y: 1440, w: 200, h: 140, name: 'Tidewater Police Precinct #1', type: 'police' },
  diner: { x: 1100, y: 1440, w: 140, h: 100, name: 'The Rusty Anchor Diner', type: 'diner' },
  gunShop: { x: 2300, y: 940, w: 140, h: 100, name: 'Guns & Ammo', type: 'gunshop' },
  marinaPier: { x: 550, y: 2500, w: 220, h: 180, name: 'Tidewater Marina & Yacht Club', type: 'marina' },
  beachHideout: { x: 2650, y: 2420, w: 160, h: 120, name: 'Oceanfront Beach Hideout', type: 'hideout' },
  warehouses: { x: 2300, y: 440, w: 220, h: 140, name: 'Northside Warehouses', type: 'warehouse' },
};
