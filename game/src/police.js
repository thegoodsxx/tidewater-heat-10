/**
 * Tidewater Heat - Wanted System & Police Pursuit AI
 * 0-5 Star alert escalation, crime witness logic, roadblocks, PIT maneuvers, Busted/Wasted handling.
 */

import { Vehicle } from './vehicles.js';
import { LANDMARKS, WORLD } from './config.js';
import { Rng } from './random.js';

export class WantedSystem {
  constructor(city, seed = 1) {
    this.city = city;
    this.rng = new Rng(seed);
    this.stars = 0;
    this.evasionTimer = 0;
    this.evasionThreshold = 14.0; // seconds hidden to lose a star
    this.isEvading = false;
    
    // Active police fleet
    this.policeSquad = [];
    this.roadblocks = [];
    this.spawnTimer = 0;

    // Busted state
    this.bustedTimer = 0;
    this.isBusted = false;
    this.isWasted = false;
    this.screenStateTimer = 0;
  }

  setStars(stars) {
    this.stars = Math.max(0, Math.min(5, stars));
    this.evasionTimer = 0;
    this.isEvading = false;
    if (this.stars >= 3) {
      this.setupRoadblocks();
    }
  }

  reportCrime(crimeType, x, y) {
    let starGain = 0;
    switch (crimeType) {
      case 'steal_car':
        starGain = this.stars < 1 ? 1 : 0;
        break;
      case 'fire_weapon':
        starGain = this.stars < 1 ? 1 : 0;
        break;
      case 'hit_pedestrian':
        starGain = this.stars < 2 ? 1 : (this.stars < 4 ? 1 : 0);
        break;
      case 'ram_police':
        starGain = 1;
        break;
      case 'shoot_police':
        starGain = 2;
        break;
      default:
        starGain = 1;
    }

    if (starGain > 0) {
      this.stars = Math.min(5, this.stars + starGain);
      this.evasionTimer = 0;
      this.isEvading = false;
      if (this.stars >= 3 && this.roadblocks.length === 0) {
        this.setupRoadblocks();
      }
    }
  }

  setupRoadblocks() {
    this.roadblocks = [];
    // Set up roadblocks on Central Blvd and Grand Ave
    const locations = [
      { x: 1440, y: 1200, angle: 0 },
      { x: 1520, y: 1200, angle: 0 },
      { x: 860, y: 720, angle: Math.PI * 0.5 },
      { x: 2100, y: 1760, angle: Math.PI * 0.5 },
    ];
    for (const loc of locations) {
      const v = new Vehicle('police', loc.x, loc.y, loc.angle, true);
      v.setSiren(true);
      this.roadblocks.push(v);
    }
  }

  update(dt, player, particles, camera) {
    // Check Wasted Condition
    if (player.isDead && !this.isWasted) {
      this.isWasted = true;
      this.screenStateTimer = 3.5;
      if (camera) camera.shake(14, 0.5);
    }

    if (this.isWasted) {
      this.screenStateTimer -= dt;
      if (this.screenStateTimer <= 0) {
        // Respawn at Hospital
        const fine = Math.min(player.cash, 200);
        player.cash -= fine;
        player.respawn(LANDMARKS.hospital.x + 100, LANDMARKS.hospital.y + 160);
        this.stars = 0;
        this.isWasted = false;
        this.policeSquad = [];
        this.roadblocks = [];
      }
      return;
    }

    // Check Busted Condition (pinned by police at low speed with 2+ stars)
    if (this.stars >= 2 && !player.isDead) {
      let nearPolice = false;
      const targetSpeed = player.inVehicle ? Math.abs(player.vehicle.speed) : player.speed;

      for (const cop of this.policeSquad) {
        const d = Math.hypot(cop.x - player.x, cop.y - player.y);
        if (d < 85) {
          nearPolice = true;
          break;
        }
      }

      if (nearPolice && targetSpeed < 20) {
        this.bustedTimer += dt;
        if (this.bustedTimer > 2.2 && !this.isBusted) {
          this.isBusted = true;
          this.screenStateTimer = 3.5;
        }
      } else {
        this.bustedTimer = Math.max(0, this.bustedTimer - dt * 2);
      }
    } else {
      this.bustedTimer = 0;
    }

    if (this.isBusted) {
      this.screenStateTimer -= dt;
      if (this.screenStateTimer <= 0) {
        // Respawn at Police Precinct
        const fine = Math.min(player.cash, 300);
        player.cash -= fine;
        player.weapon.ammo = 30; // confiscate extra ammo
        player.respawn(LANDMARKS.policeStation.x + 100, LANDMARKS.policeStation.y + 180);
        this.stars = 0;
        this.isBusted = false;
        this.policeSquad = [];
        this.roadblocks = [];
      }
      return;
    }

    if (this.stars === 0) {
      // Disengage police
      for (const cop of this.policeSquad) {
        cop.setSiren(false);
      }
      this.policeSquad = [];
      this.roadblocks = [];
      return;
    }

    // Police Spawning
    const maxCops = Math.min(6, this.stars + 1);
    this.spawnTimer += dt;
    if (this.policeSquad.length < maxCops && this.spawnTimer > 3.0) {
      this.spawnTimer = 0;
      this.spawnPursuitCar(player);
    }

    // Line of sight and evasion logic
    let spotted = false;
    for (const cop of this.policeSquad) {
      const d = Math.hypot(cop.x - player.x, cop.y - player.y);
      if (d < 450) {
        spotted = true;
        break;
      }
    }

    if (!spotted) {
      this.isEvading = true;
      this.evasionTimer += dt;
      if (this.evasionTimer > this.evasionThreshold) {
        this.evasionTimer = 0;
        this.stars = Math.max(0, this.stars - 1);
        if (this.stars === 0) {
          this.isEvading = false;
        }
      }
    } else {
      this.isEvading = false;
      this.evasionTimer = 0;
    }

    // Update Pursuit Cruisers
    for (let i = this.policeSquad.length - 1; i >= 0; i--) {
      const cop = this.policeSquad[i];
      if (cop.health <= 0) {
        this.policeSquad.splice(i, 1);
        continue;
      }

      cop.setSiren(true);
      // Steer aggressively toward player
      const dx = player.x - cop.x;
      const dy = player.y - cop.y;
      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = targetAngle - cop.angle;

      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      cop.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), cop.turnSpeed * dt * 1.4);

      // Accelerate / Ram
      cop.speed = Math.min(cop.maxSpeed, cop.speed + cop.accel * dt);
      cop.vx = Math.cos(cop.angle) * cop.speed;
      cop.vy = Math.sin(cop.angle) * cop.speed;

      cop.update(dt, null, this.city, particles, camera);

      // Ramming collision with player or player car
      const targetObj = player.inVehicle ? player.vehicle : player;
      const d = Math.hypot(cop.x - targetObj.x, cop.y - targetObj.y);
      if (d < cop.radius * 0.7 + targetObj.radius) {
        if (camera) camera.shake(7, 0.25);
        if (particles) particles.addSparks((cop.x + targetObj.x) / 2, (cop.y + targetObj.y) / 2, 8);
        if (!player.inVehicle) {
          player.takeDamage(20);
        } else {
          player.vehicle.health = Math.max(0, player.vehicle.health - 25);
        }
      }
    }
  }

  spawnPursuitCar(player) {
    // Spawn from edge of screen / nearby avenue
    const spawnDist = 700;
    const spawnAngle = Math.random() * Math.PI * 2;
    const x = Math.max(100, Math.min(WORLD.width - 100, player.x + Math.cos(spawnAngle) * spawnDist));
    const y = Math.max(100, Math.min(WORLD.height - 100, player.y + Math.sin(spawnAngle) * spawnDist));

    const cop = new Vehicle('police', x, y, spawnAngle + Math.PI, false);
    cop.setSiren(true);
    this.policeSquad.push(cop);
  }

  getAllPoliceVehicles() {
    return [...this.policeSquad, ...this.roadblocks];
  }

  isBustedActive() {
    return this.isBusted;
  }

  isWastedActive() {
    return this.isWasted;
  }

  clear() {
    this.stars = 0;
    this.isBusted = false;
    this.isWasted = false;
    this.policeSquad = [];
    this.roadblocks = [];
    this.bustedTimer = 0;
    this.evasionTimer = 0;
  }
}
