/**
 * Tidewater Heat - Main Game Loop & Lifecycle Orchestrator
 * Connects Canvas rendering, input processing, traffic, combat, missions, audio, and screenshot staging.
 */

import { Input } from './input.js';
import { Camera } from './camera.js';
import { City } from './city.js';
import { Player } from './player.js';
import { TrafficManager } from './vehicles.js';
import { PedestrianManager } from './pedestrians.js';
import { WantedSystem } from './police.js';
import { CombatManager } from './combat.js';
import { MissionManager } from './missions.js';
import { ParticleSystem } from './particles.js';
import { SoundEngine } from './audio.js';
import { StorageManager } from './storage.js';
import { Renderer } from './render.js';
import { Hud } from './hud.js';
import { parseShotQuery, stageScreenshot } from './shots.js';

class GameApp {
  constructor() {
    this.canvas = document.getElementById('game');
    this.statusEl = document.getElementById('status');
    
    // Core systems
    this.input = new Input(this.canvas);
    this.camera = new Camera(window.innerWidth, window.innerHeight);
    this.renderer = new Renderer(this.canvas);
    this.hud = new Hud();
    this.sound = new SoundEngine();
    this.storage = new StorageManager();

    // Game State
    this.screen = 'title'; // 'title' or 'game'
    this.lastTime = 0;
    this.isPausedForShot = false;

    // Build World Entities
    this.initWorld(1);

    // Window events
    window.addEventListener('resize', () => this.onResize());
    this.onResize();

    // Check shot query parameter
    const { shot, seed } = parseShotQuery();
    if (shot) {
      this.initWorld(seed);
      this.isPausedForShot = true;
      stageScreenshot(shot, this.getStateWrapper(), seed);
      this.renderFrame(0.016);
      return;
    }

    // Normal play loop
    requestAnimationFrame((t) => this.loop(t));
  }

  initWorld(seed = 1) {
    this.city = new City(seed);
    this.player = new Player(860, 2210);
    this.traffic = new TrafficManager(this.city, seed);
    this.pedestrians = new PedestrianManager(this.city, seed);
    this.wantedSystem = new WantedSystem(this.city, seed);
    this.combat = new CombatManager(this.city, seed);
    this.missions = new MissionManager();
    this.particles = new ParticleSystem();
    this.camera.snapTo(this.player.x, this.player.y, 1.0);
  }

  getStateWrapper() {
    const self = this;
    return {
      get screen() { return self.screen; },
      set screen(val) { self.screen = val; },
      player: this.player,
      camera: this.camera,
      traffic: this.traffic,
      pedestrians: this.pedestrians,
      wantedSystem: this.wantedSystem,
      combat: this.combat,
      missions: this.missions,
      particles: this.particles,
    };
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.resize(w, h);
    this.camera.resize(w, h);
  }

  startNewGame() {
    this.sound.initOnGesture();
    this.sound.playClick();
    this.initWorld(1);
    this.screen = 'game';
    this.storage.saveGame(this.player, this.missions);
  }

  continueGame() {
    this.sound.initOnGesture();
    this.sound.playClick();
    this.initWorld(1);
    this.storage.loadGame(this.player, this.missions);
    this.screen = 'game';
  }

  loop(timestamp) {
    if (this.isPausedForShot) return;

    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(dt);
    this.renderFrame(dt);

    this.input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    // Sound user gesture wake-up
    if (this.input.hasUserInteracted) {
      this.sound.initOnGesture();
    }

    // Toggle Audio Mute (M key)
    if (this.input.wasPressed('KeyM')) {
      this.sound.toggleMute();
    }

    if (this.screen === 'title') {
      // Start Screen controls
      if (this.input.wasPressed('Enter') || this.input.wasPressed('Space') || this.input.wasMousePressed()) {
        this.startNewGame();
      } else if (this.input.wasPressed('KeyC') && this.storage.hasSave()) {
        this.continueGame();
      }
      return;
    }

    // Active gameplay updates
    this.hud.update(dt);
    this.particles.update(dt);
    this.sound.update(dt, this.player, this.wantedSystem);
    this.storage.update(dt, this.player, this.missions);

    // Player locomotion or driving
    this.player.update(dt, this.input, this.camera, this.city);

    // Traffic simulation
    this.traffic.update(dt, this.input, this.player, this.particles, this.camera);

    // Pedestrian simulation
    this.pedestrians.update(dt, this.player, this.traffic, this.particles, this.wantedSystem);

    // Wanted and police pursuit
    this.wantedSystem.update(dt, this.player, this.particles, this.camera);

    // Combat & weapons
    this.combat.update(dt, this.player, this.input, this.camera, this.particles, this.wantedSystem, this.pedestrians, this.traffic);

    // Missions & Story
    this.missions.update(dt, this.player, this.wantedSystem, this.combat, this.input);

    // Camera follow player / vehicle
    const camTarget = (this.player.inVehicle && this.player.vehicle) ? this.player.vehicle : this.player;
    this.camera.update(dt, camTarget, this.player.inVehicle);
  }

  renderFrame(dt) {
    const { width, height } = this.canvas;
    this.renderer.clear();

    if (this.screen === 'title') {
      const summary = this.storage.hasSave() ? this.storage.getSaveSummary() : null;
      this.renderer.renderStartScreen(this.renderer.ctx, width, height, summary);
      return;
    }

    const renderOptions = {
      traffic: this.traffic,
      pedestrians: this.pedestrians,
      wantedSystem: this.wantedSystem,
      combat: this.combat,
      missions: this.missions,
      particles: this.particles,
      hud: this.hud,
    };

    this.renderer.renderScene(dt, this.city, this.player, this.camera, renderOptions);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
