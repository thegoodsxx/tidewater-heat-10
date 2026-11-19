/**
 * Tidewater Heat - Player Entity
 * On-foot locomotion, sprinting, weapon aiming, health, and vehicle interaction.
 */

import { PLAYER_CONFIG, WEAPON_CONFIG } from './config.js';

export class Player {
  constructor(x = 520, y = 600) {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
    this.radius = PLAYER_CONFIG.radius;

    // Stats
    this.health = PLAYER_CONFIG.maxHealth;
    this.maxHealth = PLAYER_CONFIG.maxHealth;
    this.armor = 0;
    this.cash = PLAYER_CONFIG.startCash;

    // Weapon & Ammo
    this.weapon = {
      ...WEAPON_CONFIG.pistol,
      ammo: 60,
      clip: 15,
      lastFireTime: 0,
    };

    // State
    this.inVehicle = false;
    this.vehicle = null;
    this.isSprinting = false;
    this.walkCycle = 0; // for leg stride animation
    this.isAiming = false;
    this.muzzleFlashTimer = 0;
    this.damageFlashTimer = 0;
    this.isDead = false;
  }

  update(dt, input, camera, city) {
    if (this.inVehicle || this.isDead) return;

    // Muzzle flash timer
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
    }
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer -= dt;
    }

    // Determine aim direction from mouse
    const worldMouse = camera.screenToWorld(input.mouseX, input.mouseY);
    const aimDx = worldMouse.x - this.x;
    const aimDy = worldMouse.y - this.y;
    const aimDist = Math.hypot(aimDx, aimDy);

    // Movement input
    const { dx, dy, isMoving } = input.getMovementVector();
    this.isSprinting = isMoving && input.isSprinting();

    const targetSpeed = isMoving
      ? (this.isSprinting ? PLAYER_CONFIG.sprintSpeed : PLAYER_CONFIG.walkSpeed)
      : 0;

    // Accelerate / Decelerate
    if (isMoving) {
      const targetVx = dx * targetSpeed;
      const targetVy = dy * targetSpeed;
      const t = Math.min(1.0, PLAYER_CONFIG.accel * dt / Math.max(1, targetSpeed));
      this.vx += (targetVx - this.vx) * t;
      this.vy += (targetVy - this.vy) * t;
      
      // Face movement if not aiming or mouse far
      if (aimDist < 30) {
        this.angle = Math.atan2(dy, dx);
      }
      this.walkCycle += (this.isSprinting ? 18 : 10) * dt;
    } else {
      // Friction slowdown
      const decay = Math.max(0, 1.0 - PLAYER_CONFIG.friction * dt);
      this.vx *= decay;
      this.vy *= decay;
    }

    // Face mouse cursor when aiming
    if (aimDist >= 30) {
      this.angle = Math.atan2(aimDy, aimDx);
      this.isAiming = true;
    } else {
      this.isAiming = false;
    }

    // Update position
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.speed = Math.hypot(this.vx, this.vy);

    // Collision with city buildings, props, water
    city.resolveCollision(this, this.radius);
  }

  takeDamage(amount) {
    if (this.isDead) return;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount);
      this.armor -= absorbed;
      amount -= absorbed;
    }
    this.health = Math.max(0, this.health - amount);
    this.damageFlashTimer = 0.25;
    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addCash(amount) {
    this.cash += amount;
  }

  addAmmo(amount) {
    this.weapon.ammo = Math.min(this.weapon.maxAmmo, this.weapon.ammo + amount);
  }

  enterVehicle(vehicle) {
    this.inVehicle = true;
    this.vehicle = vehicle;
    vehicle.driver = this;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
  }

  exitVehicle(exitX, exitY) {
    if (!this.inVehicle || !this.vehicle) return;
    this.vehicle.driver = null;
    this.inVehicle = false;
    this.vehicle = null;
    this.x = exitX;
    this.y = exitY;
    this.vx = 0;
    this.vy = 0;
  }

  respawn(x, y) {
    this.x = x;
    this.y = y;
    this.health = this.maxHealth;
    this.armor = 0;
    this.isDead = false;
    this.inVehicle = false;
    this.vehicle = null;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
  }
}
