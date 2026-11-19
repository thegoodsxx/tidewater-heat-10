/**
 * Tidewater Heat - Particle and Skid Mark System
 * Manages tire skid marks, crash sparks, engine smoke, muzzle flashes, and blood splatters.
 */

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.skidMarks = [];
    this.maxSkids = 400;
  }

  addSkid(x1, y1, x2, y2, width = 6, alpha = 0.5) {
    if (this.skidMarks.length >= this.maxSkids) {
      this.skidMarks.shift();
    }
    this.skidMarks.push({
      x1, y1, x2, y2, width, alpha,
      life: 15.0, // fades slowly over 15 seconds
      maxLife: 15.0,
    });
  }

  addSparks(x, y, count = 10, dirAngle = 0, speed = 200) {
    for (let i = 0; i < count; i++) {
      const a = dirAngle + (Math.random() - 0.5) * Math.PI * 0.8;
      const spd = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        type: 'spark',
        x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: Math.random() < 0.5 ? '#ffe66d' : '#ff9838',
        radius: 2 + Math.random() * 2,
        life: 0.2 + Math.random() * 0.25,
        maxLife: 0.45,
      });
    }
  }

  addSmoke(x, y, count = 1, isFire = false) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 20 + Math.random() * 40;
      this.particles.push({
        type: isFire ? 'fire' : 'smoke',
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(a) * spd * 0.3,
        vy: Math.sin(a) * spd * 0.3 - 25, // drifts upward
        color: isFire ? (Math.random() < 0.5 ? '#e63946' : '#ffb703') : '#2c2e35',
        radius: isFire ? (4 + Math.random() * 4) : (7 + Math.random() * 8),
        growth: isFire ? 8 : 16,
        life: isFire ? 0.3 : (0.7 + Math.random() * 0.5),
        maxLife: isFire ? 0.3 : 1.2,
      });
    }
  }

  addBlood(x, y, count = 6, dirAngle = 0) {
    for (let i = 0; i < count; i++) {
      const a = dirAngle + (Math.random() - 0.5) * Math.PI;
      const spd = 30 + Math.random() * 90;
      this.particles.push({
        type: 'blood',
        x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: '#9e1a24',
        radius: 2.5 + Math.random() * 2.5,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
      });
    }
  }

  addSplash(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 20 + Math.random() * 60;
      this.particles.push({
        type: 'splash',
        x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: '#d2f2f7',
        radius: 3 + Math.random() * 3,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
      });
    }
  }

  clear() {
    this.particles.length = 0;
    this.skidMarks.length = 0;
  }

  update(dt) {
    // Update skid marks
    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      const s = this.skidMarks[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.skidMarks.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.growth) {
        p.radius += p.growth * dt;
      }
    }
  }

  renderSkids(ctx) {
    ctx.strokeStyle = '#18191c';
    for (const s of this.skidMarks) {
      const alpha = (s.life / s.maxLife) * s.alpha;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }

  renderParticles(ctx) {
    for (const p of this.particles) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }
}
