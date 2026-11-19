/**
 * Tidewater Heat - Vehicles and Traffic Simulation
 * Realistic top-down driving physics, handbrake drifting, traffic AI, collision, and carjacking.
 */

import { VEHICLE_CONFIGS, WORLD, PALETTE } from './config.js';
import { Rng } from './random.js';

export class Vehicle {
  constructor(type = 'sedan', x = 0, y = 0, angle = 0, isParked = false) {
    const config = VEHICLE_CONFIGS[type] || VEHICLE_CONFIGS.sedan;
    this.type = type;
    this.name = config.name;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.isParked = isParked;

    // Dimensions & mass
    this.width = config.width;
    this.length = config.length;
    this.radius = Math.hypot(this.width, this.length) * 0.5;
    this.mass = config.mass;

    // Performance
    this.maxSpeed = config.maxSpeed;
    this.accel = config.accel;
    this.reverseSpeed = config.reverseSpeed;
    this.turnSpeed = config.turnSpeed;

    // Health & Damage
    this.health = config.health;
    this.maxHealth = config.health;
    this.isWrecked = false;

    // Visuals
    this.bodyColor = config.bodyColor;
    this.roofColor = config.roofColor;
    this.isPolice = !!config.isPolice;
    this.sirenActive = false;
    this.sirenTimer = 0;

    // Movement state
    this.speed = 0; // forward/backward speed
    this.vx = 0;
    this.vy = 0;
    this.driftFactor = 0;
    this.driver = null; // Player or AI

    // Traffic AI state
    this.currentLane = null;
    this.targetSpeed = this.maxSpeed * 0.45;
    this.aiWaitTimer = 0;
    this.isFleeing = false;

    // Marked mission car flag
    this.isMissionCar = false;
  }

  update(dt, input, city, particles, camera) {
    this.sirenTimer += dt * 8;

    if (this.driver && !this.driver.isAI) {
      // Player Driving Controls
      this.updatePlayerDriving(dt, input, particles, camera);
    } else if (!this.isParked) {
      // Autonomous Traffic AI
      this.updateTrafficAI(dt, city);
    }

    // Apply Velocity & Drift
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Damage smoke particles
    if (this.health < this.maxHealth * 0.5) {
      const isFire = this.health < this.maxHealth * 0.2;
      const smokeChance = isFire ? 0.9 : 0.4;
      if (Math.random() < smokeChance && particles) {
        // Emit from hood (front of vehicle)
        const frontX = this.x + Math.cos(this.angle) * (this.length * 0.35);
        const frontY = this.y + Math.sin(this.angle) * (this.length * 0.35);
        particles.addSmoke(frontX, frontY, 1, isFire);
      }
    }

    // Resolve collision against city obstacles (buildings, props, water)
    const col = city.checkCircleCollision(this.x, this.y, this.radius * 0.7);
    if (col.hit) {
      this.resolveBuildingCollision(col, particles, camera);
    }

    // Clamp inside world borders
    this.x = Math.max(this.radius + 10, Math.min(WORLD.width - this.radius - 10, this.x));
    this.y = Math.max(this.radius + 10, Math.min(WORLD.height - this.radius - 10, this.y));
  }

  updatePlayerDriving(dt, input, particles, camera) {
    if (this.isWrecked) return;

    let throttle = 0;
    let steer = 0;
    const handbrake = input.isBraking();

    if (input.isDown('KeyW') || input.isDown('ArrowUp')) throttle += 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) throttle -= 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) steer -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) steer += 1;

    // Steering tightens with higher speed
    const steerTightening = 1.0 / (1.0 + Math.abs(this.speed) / 280);
    const turnRate = this.turnSpeed * steerTightening;

    if (steer !== 0 && Math.abs(this.speed) > 10) {
      const dir = this.speed >= 0 ? 1 : -1;
      this.angle += steer * turnRate * dt * dir;
    }

    // Acceleration & Braking
    if (throttle > 0) {
      this.speed = Math.min(this.maxSpeed, this.speed + this.accel * dt);
    } else if (throttle < 0) {
      if (this.speed > 10) {
        // Braking
        this.speed = Math.max(0, this.speed - this.accel * 1.6 * dt);
      } else {
        // Reversing
        this.speed = Math.max(-this.reverseSpeed, this.speed - this.accel * 0.8 * dt);
      }
    } else {
      // Natural rolling friction
      const friction = handbrake ? 4.0 : 1.2;
      const decay = Math.max(0, 1.0 - friction * dt);
      this.speed *= decay;
    }

    // Handbrake Drifting
    if (handbrake && Math.abs(this.speed) > 40) {
      this.driftFactor = Math.min(1.0, this.driftFactor + dt * 4);
      // Spawn tire skid marks and tire smoke
      if (particles) {
        const rearDist = -this.length * 0.35;
        const sideDist = this.width * 0.38;
        const rx1 = this.x + Math.cos(this.angle) * rearDist - Math.sin(this.angle) * sideDist;
        const ry1 = this.y + Math.sin(this.angle) * rearDist + Math.cos(this.angle) * sideDist;
        const rx2 = this.x + Math.cos(this.angle) * rearDist + Math.sin(this.angle) * sideDist;
        const ry2 = this.y + Math.sin(this.angle) * rearDist - Math.cos(this.angle) * sideDist;
        
        particles.addSkid(rx1, ry1, rx1 + this.vx * 0.04, ry1 + this.vy * 0.04, 5, 0.4);
        particles.addSkid(rx2, ry2, rx2 + this.vx * 0.04, ry2 + this.vy * 0.04, 5, 0.4);

        if (Math.random() < 0.35) {
          particles.addSmoke(rx1, ry1, 1, false);
          particles.addSmoke(rx2, ry2, 1, false);
        }
      }
    } else {
      this.driftFactor = Math.max(0, this.driftFactor - dt * 2.5);
    }

    // Physics Forward & Lateral Drift Vector
    const fwdX = Math.cos(this.angle);
    const fwdY = Math.sin(this.angle);
    const latX = -Math.sin(this.angle);
    const latY = Math.cos(this.angle);

    const grip = handbrake ? 0.82 : 0.94;
    const currentLatSpeed = this.vx * latX + this.vy * latY;
    const newLatSpeed = currentLatSpeed * grip;

    this.vx = fwdX * this.speed + latX * newLatSpeed;
    this.vy = fwdY * this.speed + latY * newLatSpeed;
  }

  updateTrafficAI(dt, city) {
    if (this.aiWaitTimer > 0) {
      this.aiWaitTimer -= dt;
      this.speed *= 0.8;
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
      return;
    }

    // Move along road lane
    const speedLimit = this.isFleeing ? this.maxSpeed * 0.85 : this.targetSpeed;
    if (this.speed < speedLimit) {
      this.speed = Math.min(speedLimit, this.speed + this.accel * 0.4 * dt);
    } else {
      this.speed = Math.max(speedLimit, this.speed - this.accel * 0.4 * dt);
    }

    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;

    // Check intersection turn decisions
    for (const inter of city.intersections) {
      const d = Math.hypot(this.x - inter.x, this.y - inter.y);
      if (d < 35 && Math.random() < 0.02) {
        // Occasional turn at intersection
        const turnChoice = Math.random() < 0.5 ? Math.PI * 0.5 : -Math.PI * 0.5;
        this.angle += turnChoice;
        this.speed *= 0.6;
        break;
      }
    }
  }

  setSiren(active) {
    this.sirenActive = active;
  }

  resolveBuildingCollision(col, particles, camera) {
    const impactSpeed = Math.hypot(this.vx, this.vy);
    if (impactSpeed > 70) {
      const damage = Math.floor(impactSpeed * 0.18);
      this.health = Math.max(0, this.health - damage);
      if (this.health <= 0) this.isWrecked = true;

      if (particles) {
        particles.addSparks(this.x, this.y, 8, Math.atan2(col.normalY, col.normalX), impactSpeed * 0.8);
      }
      if (camera && this.driver && !this.driver.isAI) {
        camera.shake(Math.min(12, impactSpeed * 0.04), 0.25);
      }
    }

    // Bounce & separate
    this.speed = -this.speed * 0.35;
    this.vx = -this.vx * 0.35;
    this.vy = -this.vy * 0.35;

    if (col.dist > 0.001) {
      const nx = col.normalX / col.dist;
      const ny = col.normalY / col.dist;
      this.x += nx * 4;
      this.y += ny * 4;
    }
  }
}

export class TrafficManager {
  constructor(city, seed = 1) {
    this.city = city;
    this.rng = new Rng(seed);
    this.vehicles = [];
    this.initFleet();
  }

  initFleet() {
    // 1. Mission 1 marked sports car parked at Tidewater Marina parking lot!
    const sportsCar = new Vehicle('sports', 620, 2400, -Math.PI * 0.5, true);
    sportsCar.isMissionCar = true;
    sportsCar.bodyColor = '#ff0033'; // Vibrant crimson
    this.vehicles.push(sportsCar);

    // 2. Parked cars at landmarks (Hospital, Diner, Precinct, Hideout, Curbs)
    const parkedSpots = [
      { type: 'police', x: 1650, y: 1540, angle: 0 },
      { type: 'police', x: 1720, y: 1540, angle: 0 },
      { type: 'sedan', x: 1120, y: 1540, angle: 0 },
      { type: 'muscle', x: 380, y: 460, angle: Math.PI * 0.5 },
      { type: 'taxi', x: 1650, y: 500, angle: 0 },
      { type: 'van', x: 2320, y: 500, angle: 0 },
      { type: 'muscle', x: 2700, y: 2480, angle: -Math.PI * 0.5 },
      { type: 'sedan', x: 700, y: 2400, angle: -Math.PI * 0.5 },
    ];

    for (const spot of parkedSpots) {
      const v = new Vehicle(spot.type, spot.x, spot.y, spot.angle, true);
      this.vehicles.push(v);
    }

    // 3. Active Traffic Cars roaming along lanes
    const types = ['sedan', 'sedan', 'taxi', 'muscle', 'van', 'police'];
    for (const lane of this.city.lanes) {
      for (let i = 0; i < 2; i++) {
        const type = this.rng.choice(types);
        let x, y, angle;
        if (lane.isVertical) {
          x = lane.x;
          y = this.rng.range(300, 2100);
          angle = lane.dir === 'S' ? Math.PI * 0.5 : -Math.PI * 0.5;
        } else {
          x = this.rng.range(300, 2600);
          y = lane.y;
          angle = lane.dir === 'E' ? 0 : Math.PI;
        }

        const v = new Vehicle(type, x, y, angle, false);
        v.currentLane = lane;
        this.vehicles.push(v);
      }
    }
  }

  update(dt, input, player, particles, camera) {
    // Check Car Steal / Exit (E key)
    if (input.wasPressed('KeyE')) {
      if (player.inVehicle && player.vehicle) {
        // Exit Vehicle
        const car = player.vehicle;
        const exitDist = car.width * 0.7 + player.radius + 6;
        const exitX = car.x - Math.sin(car.angle) * exitDist;
        const exitY = car.y + Math.cos(car.angle) * exitDist;
        player.exitVehicle(exitX, exitY);
      } else {
        // Find nearest car to enter
        let nearestCar = null;
        let nearestDist = 65; // interaction radius
        for (const car of this.vehicles) {
          const d = Math.hypot(player.x - car.x, player.y - car.y);
          if (d < nearestDist) {
            nearestDist = d;
            nearestCar = car;
          }
        }
        if (nearestCar && !nearestCar.isWrecked) {
          nearestCar.isParked = false;
          player.enterVehicle(nearestCar);
        }
      }
    }

    // Update all vehicles
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      v.update(dt, input, this.city, particles, camera);

      // Car-to-Car collisions
      for (let j = i + 1; j < this.vehicles.length; j++) {
        const other = this.vehicles[j];
        this.resolveVehicleCollision(v, other, particles, camera);
      }

      // Car-to-Player on foot collision (run over)
      if (!player.inVehicle && !player.isDead) {
        const pd = Math.hypot(v.x - player.x, v.y - player.y);
        if (pd < v.radius * 0.7 + player.radius) {
          const impact = Math.hypot(v.vx, v.vy);
          if (impact > 50) {
            player.takeDamage(Math.floor(impact * 0.15));
            if (particles) {
              particles.addBlood(player.x, player.y, 6, Math.atan2(v.vy, v.vx));
            }
            player.x += (v.vx / impact) * 15;
            player.y += (v.vy / impact) * 15;
          }
        }
      }
    }
  }

  resolveVehicleCollision(v1, v2, particles, camera) {
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const dist = Math.hypot(dx, dy);
    const minDist = (v1.radius + v2.radius) * 0.65;

    if (dist < minDist && dist > 0.001) {
      const nx = dx / dist;
      const ny = dy / dist;
      const relVx = v1.vx - v2.vx;
      const relVy = v1.vy - v2.vy;
      const relSpeed = Math.hypot(relVx, relVy);

      // Push apart
      const overlap = (minDist - dist) * 0.5;
      v1.x -= nx * overlap;
      v1.y -= ny * overlap;
      v2.x += nx * overlap;
      v2.y += ny * overlap;

      // Exchange momentum
      const impulse = (relVx * nx + relVy * ny);
      if (impulse > 0) {
        v1.vx -= nx * impulse * 0.5;
        v1.vy -= ny * impulse * 0.5;
        v2.vx += nx * impulse * 0.5;
        v2.vy += ny * impulse * 0.5;

        v1.speed *= 0.6;
        v2.speed *= 0.6;

        if (relSpeed > 80) {
          v1.health = Math.max(0, v1.health - Math.floor(relSpeed * 0.12));
          v2.health = Math.max(0, v2.health - Math.floor(relSpeed * 0.12));
          if (particles) {
            particles.addSparks((v1.x + v2.x) / 2, (v1.y + v2.y) / 2, 8, Math.atan2(ny, nx), relSpeed * 0.6);
          }
          if (camera && (v1.driver === camera.target || v2.driver === camera.target)) {
            camera.shake(Math.min(10, relSpeed * 0.03), 0.2);
          }
        }
      }
    }
  }
}
