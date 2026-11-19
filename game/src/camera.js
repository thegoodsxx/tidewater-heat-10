/**
 * Tidewater Heat - 2D Smooth Tracking Camera with Dynamic Lookahead and Screen Shake
 */

import { CAMERA, WORLD } from './config.js';

export class Camera {
  constructor(viewportWidth = 1280, viewportHeight = 720) {
    this.x = WORLD.width / 2;
    this.y = WORLD.height / 2;
    this.targetX = this.x;
    this.targetY = this.y;
    this.width = viewportWidth;
    this.height = viewportHeight;
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    
    // Shake state
    this.shakeAmount = 0;
    this.shakeDuration = 0;
    this.shakeElapsed = 0;
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
  }

  shake(amount = 8, duration = 0.3) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
    this.shakeDuration = duration;
    this.shakeElapsed = 0;
  }

  snapTo(x, y, zoom = this.targetZoom) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.zoom = zoom;
    this.targetZoom = zoom;
  }

  getVisibleBounds() {
    const halfW = (this.width / 2) / this.zoom;
    const halfH = (this.height / 2) / this.zoom;
    return {
      left: this.x - halfW - 80,
      right: this.x + halfW + 80,
      top: this.y - halfH - 80,
      bottom: this.y + halfH + 80,
    };
  }

  update(dt, target, inCar = false) {
    if (!target) return;

    const lookDist = inCar ? CAMERA.lookaheadCar : CAMERA.lookaheadFoot;
    this.targetZoom = inCar ? CAMERA.zoomCar : CAMERA.zoomFoot;

    const angle = target.angle ?? 0;
    const speedRatio = Math.min(1.0, (target.speed ?? 0) / 400);

    // Dynamic lookahead ahead of player/car facing
    const lookX = Math.cos(angle) * lookDist * (0.3 + 0.7 * speedRatio);
    const lookY = Math.sin(angle) * lookDist * (0.3 + 0.7 * speedRatio);

    this.targetX = target.x + lookX;
    this.targetY = target.y + lookY;

    // Smooth lerp
    const t = 1.0 - Math.exp(-CAMERA.smoothing * 60 * dt);
    this.x += (this.targetX - this.x) * t;
    this.y += (this.targetY - this.y) * t;
    this.zoom += (this.targetZoom - this.zoom) * (t * 0.5);

    // Screen shake update
    if (this.shakeElapsed < this.shakeDuration) {
      this.shakeElapsed += dt;
      const decay = 1.0 - this.shakeElapsed / this.shakeDuration;
      this.shakeAmount *= Math.max(0, decay);
    } else {
      this.shakeAmount = 0;
    }

    // Viewport world clamping
    const halfW = (this.width / 2) / this.zoom;
    const halfH = (this.height / 2) / this.zoom;
    this.x = Math.max(halfW, Math.min(WORLD.width - halfW, this.x));
    this.y = Math.max(halfH, Math.min(WORLD.height - halfH, this.y));
  }

  getOffset() {
    let ox = 0;
    let oy = 0;
    if (this.shakeAmount > 0.05) {
      ox = (Math.random() * 2 - 1) * this.shakeAmount;
      oy = (Math.random() * 2 - 1) * this.shakeAmount;
    }
    return {
      x: this.x + ox,
      y: this.y + oy,
      zoom: this.zoom,
    };
  }

  worldToScreen(wx, wy) {
    const off = this.getOffset();
    return {
      x: (wx - off.x) * off.zoom + this.width / 2,
      y: (wy - off.y) * off.zoom + this.height / 2,
    };
  }

  screenToWorld(sx, sy) {
    const off = this.getOffset();
    return {
      x: (sx - this.width / 2) / off.zoom + off.x,
      y: (sy - this.height / 2) / off.zoom + off.y,
    };
  }
}
