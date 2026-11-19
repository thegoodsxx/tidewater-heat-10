/**
 * Tidewater Heat - Canvas 2D Renderer
 * Golden-hour coastal aesthetic, soft cast shadows, detailed city geometry, and player rendering.
 */

import { PALETTE, WORLD } from './config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.time = 0;
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  clear() {
    this.ctx.fillStyle = '#1e2126';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawCircle(x, y, r, fillStyle) {
    this.ctx.fillStyle = fillStyle;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  renderScene(dt, city, player, camera, options = {}) {
    this.time += dt;
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const cam = camera.getOffset();

    ctx.save();
    // Camera transformation
    ctx.translate(width / 2, height / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    const bounds = camera.getVisibleBounds();

    // 1. Terrain Ground
    this.renderGround(ctx, city, bounds);

    // 2. Beach, Coast & Ocean Waves
    this.renderCoastAndWater(ctx, city, bounds);

    // 3. Roads, Sidewalks, Crosswalks & Pier
    this.renderRoads(ctx, city, bounds);

    // 4. Ground Shadow Pass (Golden-hour low-sun angle)
    this.renderShadows(ctx, city, player, bounds);

    // 5. Props (Park pond, trees, streetlamps)
    this.renderProps(ctx, city, bounds);

    // 6. Buildings & Rooftops
    this.renderBuildings(ctx, city, bounds);

    // 7. Player (if on foot)
    if (!player.inVehicle && !player.isDead) {
      this.renderPlayer(ctx, player);
    }

    ctx.restore();
  }

  renderGround(ctx, city, bounds) {
    // Default coastal soil/grass backdrop
    ctx.fillStyle = '#5c804b';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    // Palm Grove Park
    if (city.park) {
      ctx.fillStyle = PALETTE.grass;
      ctx.fillRect(city.park.x, city.park.y, city.park.w, city.park.h);

      // Park walking paths
      ctx.fillStyle = PALETTE.parkPath;
      for (const path of city.park.paths) {
        ctx.fillRect(path.x, path.y, path.w, path.h);
      }

      // Park pond
      const pond = city.park.pond;
      ctx.fillStyle = PALETTE.waterDeep;
      ctx.beginPath();
      ctx.ellipse(pond.x + pond.w / 2, pond.y + pond.h / 2, pond.w / 2, pond.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pond wooden bridge
      ctx.fillStyle = PALETTE.boardwalk;
      ctx.fillRect(pond.x + pond.w / 2 - 16, pond.y, 32, pond.h);
    }
  }

  renderCoastAndWater(ctx, city, bounds) {
    const beach = city.beach;
    if (!beach) return;

    // Golden Sand Beach
    const sandGrad = ctx.createLinearGradient(0, beach.y, 0, beach.y + beach.h);
    sandGrad.addColorStop(0, PALETTE.sand);
    sandGrad.addColorStop(0.85, PALETTE.sandWet);
    sandGrad.addColorStop(1, '#b8985c');
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, beach.y, WORLD.width, beach.h);

    // Ocean Water
    const waterY = WORLD.waterY;
    const waterH = WORLD.height - waterY;
    const oceanGrad = ctx.createLinearGradient(0, waterY, 0, WORLD.height);
    oceanGrad.addColorStop(0, PALETTE.waterShallow);
    oceanGrad.addColorStop(0.2, PALETTE.waterDeep);
    oceanGrad.addColorStop(1, '#0e3a50');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, waterY, WORLD.width, waterH);

    // Animated Ocean Wave Shimmer
    const waveOffset = Math.sin(this.time * 1.8) * 12;
    ctx.fillStyle = PALETTE.waterFoam;
    ctx.beginPath();
    for (let x = 0; x <= WORLD.width; x += 60) {
      const wy = waterY + 6 + Math.sin(this.time * 2.2 + x * 0.02) * 5 + waveOffset * 0.4;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.lineTo(WORLD.width, waterY + 16);
    ctx.lineTo(0, waterY + 16);
    ctx.closePath();
    ctx.fill();
  }

  renderRoads(ctx, city, bounds) {
    // 1. Sidewalks
    ctx.fillStyle = PALETTE.sidewalk;
    for (const sw of city.sidewalks) {
      ctx.fillRect(sw.x, sw.y, sw.w, sw.h);
      ctx.fillStyle = PALETTE.sidewalkEdge;
      ctx.fillRect(sw.x, sw.y, sw.w, 2);
      ctx.fillRect(sw.x, sw.y + sw.h - 2, sw.w, 2);
      ctx.fillStyle = PALETTE.sidewalk;
    }

    // 2. Asphalt Road Surfaces
    ctx.fillStyle = PALETTE.asphalt;
    for (const r of city.roads) {
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }

    // 3. Marina Pier Boardwalk
    if (city.pier) {
      const pier = city.pier;
      ctx.fillStyle = PALETTE.boardwalk;
      ctx.fillRect(pier.x, pier.y, pier.w, pier.h);

      // Wooden planks lines
      ctx.strokeStyle = PALETTE.boardwalkPlank;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let py = pier.y; py <= pier.y + pier.h; py += 16) {
        ctx.moveTo(pier.x, py);
        ctx.lineTo(pier.x + pier.w, py);
      }
      ctx.stroke();

      // Parking lot on pier
      if (pier.parkingLot) {
        const lot = pier.parkingLot;
        ctx.fillStyle = PALETTE.asphaltDark;
        ctx.fillRect(lot.x, lot.y, lot.w, lot.h);
        ctx.strokeStyle = PALETTE.roadLineWhite;
        ctx.lineWidth = 2;
        // Parking bay lines
        for (let lx = lot.x + 20; lx < lot.x + lot.w - 10; lx += 45) {
          ctx.beginPath();
          ctx.moveTo(lx, lot.y + 10);
          ctx.lineTo(lx, lot.y + 60);
          ctx.stroke();
        }
      }
    }

    // 4. Road Lane Markings & Crosswalks
    for (const r of city.roads) {
      if (r.isVertical) {
        const midX = r.x + r.w / 2;
        // Solid yellow centerline
        ctx.strokeStyle = PALETTE.roadLineYellow;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(midX, r.y);
        ctx.lineTo(midX, r.y + r.h);
        ctx.stroke();

        // White dashed lane dividers
        ctx.strokeStyle = PALETTE.roadLineWhite;
        ctx.lineWidth = 2;
        ctx.setLineDash([18, 18]);
        ctx.beginPath();
        ctx.moveTo(r.x + r.w * 0.25, r.y);
        ctx.lineTo(r.x + r.w * 0.25, r.y + r.h);
        ctx.moveTo(r.x + r.w * 0.75, r.y);
        ctx.lineTo(r.x + r.w * 0.75, r.y + r.h);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const midY = r.y + r.h / 2;
        // Solid yellow centerline
        ctx.strokeStyle = PALETTE.roadLineYellow;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(r.x, midY);
        ctx.lineTo(r.x + r.w, midY);
        ctx.stroke();

        // White dashed lane dividers
        ctx.strokeStyle = PALETTE.roadLineWhite;
        ctx.lineWidth = 2;
        ctx.setLineDash([18, 18]);
        ctx.beginPath();
        ctx.moveTo(r.x, r.y + r.h * 0.25);
        ctx.lineTo(r.x + r.w, r.y + r.h * 0.25);
        ctx.moveTo(r.x, r.y + r.h * 0.75);
        ctx.lineTo(r.x + r.w, r.y + r.h * 0.75);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 5. Crosswalks at Intersections
    ctx.fillStyle = PALETTE.crosswalk;
    for (const inter of city.intersections) {
      const x = inter.x;
      const y = inter.y;
      const hw = inter.w / 2;
      const hh = inter.h / 2;

      // North crosswalk
      for (let i = -hw + 10; i < hw - 10; i += 16) {
        ctx.fillRect(x + i, y - hh - 20, 10, 20);
      }
      // South crosswalk
      for (let i = -hw + 10; i < hw - 10; i += 16) {
        ctx.fillRect(x + i, y + hh, 10, 20);
      }
    }
  }

  renderShadows(ctx, city, player, bounds) {
    const shadowDist = PALETTE.shadowDist;
    const shadowAngle = PALETTE.shadowAngle;
    const sx = Math.cos(shadowAngle) * shadowDist;
    const sy = Math.sin(shadowAngle) * shadowDist;

    ctx.fillStyle = PALETTE.shadow;

    // Building shadows
    for (const b of city.buildings) {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + b.w, b.y);
      ctx.lineTo(b.x + b.w + sx, b.y + sy);
      ctx.lineTo(b.x + b.w + sx, b.y + b.h + sy);
      ctx.lineTo(b.x + sx, b.y + b.h + sy);
      ctx.lineTo(b.x, b.y + b.h);
      ctx.closePath();
      ctx.fill();
    }

    // Palm tree shadows
    for (const p of city.props) {
      if (p.type === 'palm_tree') {
        ctx.beginPath();
        ctx.ellipse(p.x + sx * 0.8, p.y + sy * 0.8, 22, 14, shadowAngle, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player shadow
    if (!player.inVehicle && !player.isDead) {
      ctx.beginPath();
      ctx.ellipse(player.x + sx * 0.4, player.y + sy * 0.4, player.radius + 3, player.radius - 2, shadowAngle, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderProps(ctx, city, bounds) {
    for (const p of city.props) {
      if (p.type === 'palm_tree') {
        // Trunk
        ctx.fillStyle = PALETTE.treeTrunk;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Tropical Palm Fronds
        ctx.fillStyle = PALETTE.treeLeaves;
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + Math.sin(this.time * 1.5 + p.x) * 0.08;
          ctx.beginPath();
          ctx.ellipse(p.x + Math.cos(a) * 16, p.y + Math.sin(a) * 16, 18, 7, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = PALETTE.treeLeavesLight;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'street_lamp') {
        ctx.fillStyle = '#495057';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        // Warm dusk glow
        ctx.fillStyle = 'rgba(255, 230, 160, 0.4)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  renderBuildings(ctx, city, bounds) {
    for (const b of city.buildings) {
      // 3D wall edge (front facade)
      ctx.fillStyle = '#1c1f24';
      ctx.fillRect(b.x, b.y + b.h - 8, b.w, 8);

      // Building Rooftop Base
      ctx.fillStyle = b.roofColor || '#3a3f47';
      ctx.fillRect(b.x, b.y, b.w, b.h - 8);

      // Roof Border / Parapet
      ctx.strokeStyle = b.color || '#5a626d';
      ctx.lineWidth = 4;
      ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 12);

      // HVAC / Rooftop units
      ctx.fillStyle = '#26292e';
      ctx.fillRect(b.x + 18, b.y + 18, 28, 22);
      ctx.fillRect(b.x + b.w - 48, b.y + 18, 24, 20);

      // Helipad on Hospital
      if (b.details && b.details.hasHelipad) {
        const cx = b.x + b.w / 2;
        const cy = b.y + (b.h - 8) / 2;
        ctx.strokeStyle = '#e63946';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, 32, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#e63946';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('H', cx, cy);
      }

      // Neon / Signage
      if (b.details && b.details.neonText) {
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.details.neonText, b.x + b.w / 2, b.y + b.h - 14);
      } else {
        // Name label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2);
      }
    }
  }

  renderPlayer(ctx, player) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Damage flash
    if (player.damageFlashTimer > 0 && Math.floor(player.damageFlashTimer * 20) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Legs walking animation
    const legOffset = Math.sin(player.walkCycle) * 7;
    ctx.fillStyle = '#243242'; // Dark trousers
    // Left leg
    ctx.fillRect(-6 + legOffset, -12, 6, 10);
    // Right leg
    ctx.fillRect(-6 - legOffset, 2, 6, 10);

    // Torso (Miami Coral Hawaiian Shirt)
    ctx.fillStyle = '#f26a5b';
    ctx.beginPath();
    ctx.roundRect(-10, -9, 20, 18, 4);
    ctx.fill();

    // Shirt collar & floral accents
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.fillStyle = '#e5a176'; // Skin
    // Left arm
    ctx.fillRect(-2, -12, 10, 5);
    // Right arm (holding pistol forward)
    ctx.fillRect(-2, 7, 14, 5);

    // 9mm Pistol
    ctx.fillStyle = '#1e252d';
    ctx.fillRect(10, 6, 10, 4);

    // Head
    ctx.fillStyle = '#e5a176';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    // Hair / Sunglasses
    ctx.fillStyle = '#2d2218';
    ctx.beginPath();
    ctx.arc(-2, 0, 6, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillRect(2, -4, 4, 8); // Sunglasses

    // Muzzle flash
    if (player.muzzleFlashTimer > 0) {
      ctx.fillStyle = '#ffe66d';
      ctx.beginPath();
      ctx.arc(24, 8, 8 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
