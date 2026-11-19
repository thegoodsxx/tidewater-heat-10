/**
 * Tidewater Heat - Combat System
 * Weapon projectiles, bullet tracers, hit sparks, enemy rivals AI, and return fire.
 */

import { WEAPON_CONFIG, LANDMARKS } from './config.js';
import { Rng } from './random.js';

export class Bullet {
  constructor(x, y, angle, shooter, isEnemy = false, damage = 34) {
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    this.angle = angle;
    this.speed = WEAPON_CONFIG.pistol.speed;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.damage = damage;
    this.maxRange = WEAPON_CONFIG.pistol.range;
    this.shooter = shooter;
    this.isEnemy = isEnemy;
    this.isAlive = true;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const traveled = Math.hypot(this.x - this.startX, this.y - this.startY);
    if (traveled >= this.maxRange) {
      this.isAlive = false;
    }
  }
}

export class EnemyRival {
  constructor(x, y, seed = 1) {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.radius = 12;
    this.health = 60;
    this.maxHealth = 60;
    this.isDead = false;
    this.rng = new Rng(seed);

    // AI timing
    this.fireCooldown = this.rng.range(0.4, 1.2);
    this.speed = 100;
    this.walkCycle = 0;
    this.damageFlash = 0;
  }

  update(dt, player, city, bullets, particles, camera) {
    if (this.isDead) return;

    if (this.damageFlash > 0) this.damageFlash -= dt;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    this.angle = Math.atan2(dy, dx);

    // If player within sight (550px), advance and shoot
    if (dist < 550 && !player.isDead) {
      if (dist > 160) {
        // Move towards player
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;
        this.walkCycle += 12 * dt;
        city.resolveCollision(this, this.radius);
      }

      // Shoot
      this.fireCooldown -= dt;
      if (this.fireCooldown <= 0) {
        this.fireCooldown = this.rng.range(0.6, 1.4);
        const spread = this.rng.range(-0.08, 0.08);
        const bullet = new Bullet(
          this.x + Math.cos(this.angle) * 16,
          this.y + Math.sin(this.angle) * 16,
          this.angle + spread,
          this,
          true,
          20
        );
        bullets.push(bullet);
      }
    }
  }

  takeDamage(amount, particles) {
    if (this.isDead) return;
    this.health -= amount;
    this.damageFlash = 0.2;
    if (particles) {
      particles.addBlood(this.x, this.y, 8, this.angle + Math.PI);
    }
    if (this.health <= 0) {
      this.isDead = true;
    }
  }
}

export class CombatManager {
  constructor(city, seed = 1) {
    this.city = city;
    this.rng = new Rng(seed);
    this.bullets = [];
    this.rivals = [];
    this.policeShootTimer = 0;

    // Gun shop ammo pickup cooldown
    this.ammoPickupCooldown = 0;
  }

  spawnRivalGang(x, y, count = 6) {
    this.rivals = [];
    for (let i = 0; i < count; i++) {
      const rx = x + this.rng.range(-120, 120);
      const ry = y + this.rng.range(-80, 80);
      this.rivals.push(new EnemyRival(rx, ry, this.rng.rangeInt(1, 999999)));
    }
  }

  firePlayerWeapon(player, camera) {
    if (player.isDead || player.inVehicle) return false;
    if (player.weapon.ammo <= 0) return false;

    const now = performance.now();
    if (now - player.weapon.lastFireTime < player.weapon.fireRate * 1000) return false;

    player.weapon.lastFireTime = now;
    player.weapon.ammo -= 1;
    player.muzzleFlashTimer = 0.08;

    const spread = (Math.random() - 0.5) * player.weapon.spread;
    const barrelX = player.x + Math.cos(player.angle) * 22;
    const barrelY = player.y + Math.sin(player.angle) * 22;

    const bullet = new Bullet(barrelX, barrelY, player.angle + spread, player, false, player.weapon.damage);
    this.bullets.push(bullet);

    if (camera) camera.shake(3, 0.1);
    return true;
  }

  update(dt, player, input, camera, particles, wantedSystem, pedestrians, traffic) {
    // 1. Check Player Fire Input (Mouse Click or F key)
    if (input.wasMousePressed() || input.wasPressed('KeyF')) {
      const fired = this.firePlayerWeapon(player, camera);
      if (fired) {
        // Alert nearby peds & report crime if witnessed
        if (pedestrians) pedestrians.alertNearby(player.x, player.y, 500);
        if (wantedSystem && wantedSystem.stars === 0) {
          wantedSystem.reportCrime('fire_weapon', player.x, player.y);
        }
      }
    }

    // 2. Gun Shop Ammo Pickup replenishment
    const gunShop = LANDMARKS.gunShop;
    const distToShop = Math.hypot(player.x - (gunShop.x + gunShop.w / 2), player.y - (gunShop.y + gunShop.h + 20));
    if (distToShop < 45 && player.weapon.ammo < player.weapon.maxAmmo) {
      if (player.cash >= 80) {
        player.cash -= 80;
        player.weapon.ammo = player.weapon.maxAmmo;
      }
    }

    // 3. Update Rivals
    for (const rival of this.rivals) {
      rival.update(dt, player, this.city, this.bullets, particles, camera);
    }

    // 4. Police Return Fire at 3+ Stars
    if (wantedSystem && wantedSystem.stars >= 3 && !player.isDead) {
      this.policeShootTimer += dt;
      if (this.policeShootTimer > 1.2) {
        this.policeShootTimer = 0;
        for (const cop of wantedSystem.policeSquad) {
          const d = Math.hypot(cop.x - player.x, cop.y - player.y);
          if (d < 450) {
            const copAngle = Math.atan2(player.y - cop.y, player.x - cop.x);
            const b = new Bullet(cop.x, cop.y, copAngle + (Math.random() - 0.5) * 0.1, cop, true, 18);
            this.bullets.push(b);
            break;
          }
        }
      }
    }

    // 5. Update Bullets & Collisions
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dt);
      if (!b.isAlive) {
        this.bullets.splice(i, 1);
        continue;
      }

      // World/Building hit
      const col = this.city.checkCircleCollision(b.x, b.y, 4);
      if (col.hit) {
        if (particles) particles.addSparks(b.x, b.y, 5, b.angle + Math.PI, 120);
        this.bullets.splice(i, 1);
        continue;
      }

      // Hit Player (if enemy bullet)
      if (b.isEnemy && !player.isDead) {
        const pd = Math.hypot(b.x - player.x, b.y - player.y);
        if (pd < player.radius + 4) {
          player.takeDamage(b.damage);
          if (particles) particles.addBlood(player.x, player.y, 6, b.angle);
          if (camera) camera.shake(5, 0.2);
          this.bullets.splice(i, 1);
          continue;
        }
      }

      // Hit Rivals (if player bullet)
      if (!b.isEnemy) {
        let hitRival = false;
        for (const rival of this.rivals) {
          if (rival.isDead) continue;
          const rd = Math.hypot(b.x - rival.x, b.y - rival.y);
          if (rd < rival.radius + 4) {
            rival.takeDamage(b.damage, particles);
            hitRival = true;
            if (rival.isDead && pedestrians) {
              pedestrians.spawnDrop(rival.x, rival.y);
            }
            break;
          }
        }
        if (hitRival) {
          this.bullets.splice(i, 1);
          continue;
        }
      }

      // Hit Pedestrians
      if (pedestrians && !b.isEnemy) {
        let hitPed = false;
        for (const ped of pedestrians.peds) {
          if (ped.isDead) continue;
          const pedD = Math.hypot(b.x - ped.x, b.y - ped.y);
          if (pedD < ped.radius + 4) {
            ped.takeDamage(b.damage, b.x, b.y, particles);
            hitPed = true;
            if (wantedSystem) wantedSystem.reportCrime('hit_pedestrian', ped.x, ped.y);
            break;
          }
        }
        if (hitPed) {
          this.bullets.splice(i, 1);
          continue;
        }
      }

      // Hit Vehicles
      if (traffic && traffic.vehicles) {
        let hitCar = false;
        for (const v of traffic.vehicles) {
          const vd = Math.hypot(b.x - v.x, b.y - v.y);
          if (vd < v.radius * 0.7) {
            v.health = Math.max(0, v.health - b.damage * 0.8);
            if (particles) particles.addSparks(b.x, b.y, 6, b.angle + Math.PI);
            hitCar = true;
            break;
          }
        }
        if (hitCar) {
          this.bullets.splice(i, 1);
          continue;
        }
      }
    }
  }

  getRivalsAliveCount() {
    return this.rivals.filter(r => !r.isDead).length;
  }

  clear() {
    this.bullets.length = 0;
    this.rivals.length = 0;
  }
}
