/**
 * Tidewater Heat - Pedestrian Simulation
 * Sidewalk navigation, social chatting in pairs, panic and fleeing AI, drops, and collision.
 */

import { Rng } from './random.js';
import { WORLD, PALETTE } from './config.js';

export class Pedestrian {
  constructor(x, y, seed = 1) {
    this.x = x;
    this.y = y;
    this.rng = new Rng(seed);
    this.angle = this.rng.angle();
    this.radius = 10;
    this.health = 40;
    this.isDead = false;

    // Movement
    this.walkSpeed = 55 + this.rng.range(-10, 10);
    this.runSpeed = 185 + this.rng.range(-15, 15);
    this.speed = this.walkSpeed;
    this.vx = 0;
    this.vy = 0;
    this.walkCycle = this.rng.range(0, Math.PI * 2);

    // AI states: 'walk', 'chat', 'flee'
    this.state = 'walk';
    this.chatTimer = 0;
    this.chatPartner = null;
    this.panicTimer = 0;
    this.panicSource = null;

    // Appearance
    this.shirtColor = this.rng.choice(['#ff6b6b', '#4ecdc4', '#ffe66d', '#1a535c', '#f7fff7', '#a8dadc', '#e63946']);
    this.pantsColor = this.rng.choice(['#2b2d42', '#8d99ae', '#4a4e69', '#22223b', '#1d3557']);
    this.skinColor = this.rng.choice(['#fadcbe', '#e0ac69', '#c68642', '#8d5524', '#ffdbac']);
    this.hairColor = this.rng.choice(['#1c1917', '#451a03', '#78350f', '#d97706']);
  }

  update(dt, city, player, traffic, particles) {
    if (this.isDead) return;

    this.walkCycle += (this.state === 'flee' ? 18 : 8) * dt;

    if (this.panicTimer > 0) {
      this.panicTimer -= dt;
      if (this.panicTimer <= 0) {
        this.state = 'walk';
        this.panicSource = null;
      }
    }

    if (this.state === 'chat') {
      this.chatTimer -= dt;
      this.speed = 0;
      this.vx = 0;
      this.vy = 0;
      if (this.chatPartner && !this.chatPartner.isDead) {
        // Face partner
        this.angle = Math.atan2(this.chatPartner.y - this.y, this.chatPartner.x - this.x);
      }
      if (this.chatTimer <= 0) {
        this.state = 'walk';
        this.chatPartner = null;
      }
    } else if (this.state === 'flee') {
      this.speed = this.runSpeed;
      if (this.panicSource) {
        // Run away from panic source
        this.angle = Math.atan2(this.y - this.panicSource.y, this.x - this.panicSource.x);
      }
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
    } else {
      // Normal walk
      this.speed = this.walkSpeed;
      // Wander slightly
      if (this.rng.bool(0.015)) {
        this.angle += this.rng.range(-0.8, 0.8);
      }
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // City collision
    city.resolveCollision(this, this.radius);

    // Keep pedestrians mostly on sidewalks and park
    if (this.state === 'walk') {
      const onSidewalk = city.isPointOnSidewalk(this.x, this.y);
      const inPark = city.park &&
        this.x >= city.park.x && this.x <= city.park.x + city.park.w &&
        this.y >= city.park.y && this.y <= city.park.y + city.park.h;
      const onBeach = city.beach && this.y >= city.beach.y && this.y <= WORLD.waterY;

      if (!onSidewalk && !inPark && !onBeach && city.isPointOnRoad(this.x, this.y)) {
        // Step back toward nearest sidewalk
        this.angle += Math.PI * 0.5;
      }
    }
  }

  scare(sourceX, sourceY, duration = 6.0) {
    if (this.isDead) return;
    this.state = 'flee';
    this.panicTimer = duration;
    this.panicSource = { x: sourceX, y: sourceY };
    this.chatPartner = null;
  }

  takeDamage(amount, fromX = 0, fromY = 0, particles = null) {
    if (this.isDead) return;
    this.health -= amount;
    if (particles) {
      particles.addBlood(this.x, this.y, 6, Math.atan2(this.y - fromY, this.x - fromX));
    }
    if (this.health <= 0) {
      this.isDead = true;
      this.speed = 0;
      this.vx = 0;
      this.vy = 0;
    } else {
      this.scare(fromX, fromY, 8.0);
    }
  }
}

export class PedestrianManager {
  constructor(city, seed = 1) {
    this.city = city;
    this.rng = new Rng(seed);
    this.peds = [];
    this.drops = []; // cash and ammo drops
    this.spawnPeds();
  }

  spawnPeds() {
    // 1. Sidewalk pedestrians
    for (const sw of this.city.sidewalks) {
      const count = Math.max(2, Math.floor((sw.w * sw.h) / 20000));
      for (let i = 0; i < count; i++) {
        const px = this.rng.range(sw.x + 4, sw.x + sw.w - 4);
        const py = this.rng.range(sw.y + 4, sw.y + sw.h - 4);
        const ped = new Pedestrian(px, py, this.rng.rangeInt(1, 999999));
        this.peds.push(ped);
      }
    }

    // 2. Park pedestrians
    if (this.city.park) {
      for (let i = 0; i < 14; i++) {
        const px = this.rng.range(this.city.park.x + 20, this.city.park.x + this.city.park.w - 20);
        const py = this.rng.range(this.city.park.y + 20, this.city.park.y + this.city.park.h - 20);
        const ped = new Pedestrian(px, py, this.rng.rangeInt(1, 999999));
        this.peds.push(ped);
      }
    }

    // 3. Form chatting pairs
    for (let i = 0; i < this.peds.length - 1; i += 6) {
      const p1 = this.peds[i];
      const p2 = this.peds[i + 1];
      p2.x = p1.x + 18;
      p2.y = p1.y + 4;
      p1.state = 'chat';
      p2.state = 'chat';
      p1.chatPartner = p2;
      p2.chatPartner = p1;
      p1.chatTimer = this.rng.range(15, 45);
      p2.chatTimer = p1.chatTimer;
    }
  }

  alertNearby(sourceX, sourceY, radius = 450) {
    for (const ped of this.peds) {
      if (ped.isDead) continue;
      const d = Math.hypot(ped.x - sourceX, ped.y - sourceY);
      if (d < radius) {
        ped.scare(sourceX, sourceY, 8.0);
      }
    }
  }

  update(dt, player, traffic, particles, wantedSystem) {
    for (const ped of this.peds) {
      ped.update(dt, this.city, player, traffic, particles);

      // Check collision with vehicles (reckless driving hit)
      if (!ped.isDead && traffic && traffic.vehicles) {
        for (const v of traffic.vehicles) {
          const d = Math.hypot(ped.x - v.x, ped.y - v.y);
          if (d < v.radius * 0.65 + ped.radius) {
            const vSpeed = Math.hypot(v.vx, v.vy);
            if (vSpeed > 45) {
              ped.takeDamage(100, v.x, v.y, particles);
              // Spawn drop
              this.spawnDrop(ped.x, ped.y);
              // Report crime if player was driving
              if (v.driver === player && wantedSystem) {
                wantedSystem.reportCrime('hit_pedestrian', ped.x, ped.y);
              }
              // Alert other peds
              this.alertNearby(ped.x, ped.y, 350);
            }
          }
        }
      }
    }

    // Update pickups
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      const pd = Math.hypot(player.x - drop.x, player.y - drop.y);
      if (pd < player.radius + 16) {
        if (drop.type === 'cash') {
          player.addCash(drop.amount);
        } else if (drop.type === 'ammo') {
          player.addAmmo(drop.amount);
        }
        this.drops.splice(i, 1);
      }
    }
  }

  spawnDrop(x, y) {
    const isCash = Math.random() < 0.65;
    this.drops.push({
      type: isCash ? 'cash' : 'ammo',
      x, y,
      amount: isCash ? 80 + Math.floor(Math.random() * 80) : 15,
      timer: 0,
    });
  }

  getDrops() {
    return this.drops;
  }

  getPeds() {
    return this.peds;
  }
}
