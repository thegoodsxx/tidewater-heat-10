/**
 * Tidewater Heat - Heads-Up Display (HUD) & Live Radar Minimap
 * Health, cash, wanted stars, ammo counter, speedometer, objective banner, and minimap radar.
 */

import { PALETTE, WORLD, LANDMARKS } from './config.js';

export class Hud {
  constructor() {
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
  }

  render(ctx, width, height, player, wantedSystem, missions, city, traffic, combat) {
    // 1. Top-Right Stats HUD (Health, Cash, Stars, Weapon/Ammo)
    this.renderTopRightStats(ctx, width, height, player, wantedSystem);

    // 2. Top-Center Objective Banner
    this.renderObjectiveBanner(ctx, width, height, missions);

    // 3. Bottom-Right Speedometer (if player in car)
    if (player.inVehicle && player.vehicle) {
      this.renderSpeedometer(ctx, width, height, player.vehicle);
    }

    // 4. Bottom-Left Live Minimap Radar
    this.renderMinimap(ctx, width, height, player, wantedSystem, missions, city);
  }

  renderTopRightStats(ctx, width, height, player, wantedSystem) {
    const rx = width - 260;
    const ry = 20;
    const rw = 240;
    const rh = 130;

    // HUD Background Card
    ctx.fillStyle = PALETTE.hudBg;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.hudBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cash Display
    ctx.fillStyle = PALETTE.cashGreen;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'right';
    const cashStr = '$' + player.cash.toLocaleString();
    ctx.fillText(cashStr, rx + rw - 15, ry + 32);

    // Health Bar
    const barX = rx + 15;
    const barY = ry + 44;
    const barW = rw - 30;
    const barH = 14;

    ctx.fillStyle = PALETTE.healthBg;
    ctx.fillRect(barX, barY, barW, barH);
    const hpRatio = Math.max(0, player.health / player.maxHealth);
    ctx.fillStyle = PALETTE.healthRed;
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Health Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`HP ${Math.ceil(player.health)}`, barX + 5, barY + 11);

    // Wanted Stars (5 Stars)
    const starY = ry + 78;
    const stars = wantedSystem ? wantedSystem.stars : 0;
    const isEvading = wantedSystem && wantedSystem.isEvading;
    const flash = isEvading && Math.floor(this.time * 6) % 2 === 0;

    for (let i = 0; i < 5; i++) {
      const sx = rx + 20 + i * 26;
      const active = i < stars;
      ctx.fillStyle = active ? (flash ? '#ffffff' : PALETTE.starActive) : PALETTE.starEmpty;
      this.drawStar(ctx, sx, starY, 9, 4.5);
    }

    // Weapon & Ammo
    const weaponY = ry + 112;
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(player.weapon.name, rx + 15, weaponY);

    const isLowAmmo = player.weapon.ammo < 15;
    ctx.fillStyle = isLowAmmo ? '#e63946' : '#ffd166';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${player.weapon.ammo} / ${player.weapon.maxAmmo}`, rx + rw - 15, weaponY);
  }

  drawStar(ctx, cx, cy, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / 5;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < 5; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  renderObjectiveBanner(ctx, width, height, missions) {
    if (!missions) return;
    const text = missions.statusText;
    if (!text) return;

    ctx.save();
    ctx.font = 'bold 15px sans-serif';
    const textW = ctx.measureText(text).width;
    const bw = Math.max(340, textW + 50);
    const bh = 34;
    const bx = (width - bw) / 2;
    const by = 20;

    ctx.fillStyle = 'rgba(18, 22, 30, 0.9)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 6);
    ctx.fill();
    ctx.strokeStyle = PALETTE.accentGold;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffea79';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, by + bh / 2);
    ctx.restore();
  }

  renderSpeedometer(ctx, width, height, car) {
    const sw = 160;
    const sh = 90;
    const sx = width - sw - 20;
    const sy = height - sh - 20;

    ctx.fillStyle = PALETTE.hudBg;
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.hudBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Speed in MPH
    const mph = Math.max(0, Math.floor(Math.abs(car.speed) * 0.22));
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mph.toString(), sx + sw / 2, sy + 44);

    ctx.fillStyle = PALETTE.hudMuted;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('MPH', sx + sw / 2, sy + 58);

    // Vehicle condition bar
    const vBarX = sx + 15;
    const vBarY = sy + 68;
    const vBarW = sw - 30;
    const vBarH = 8;
    ctx.fillStyle = '#333';
    ctx.fillRect(vBarX, vBarY, vBarW, vBarH);

    const vHpRatio = Math.max(0, car.health / car.maxHealth);
    ctx.fillStyle = vHpRatio > 0.5 ? '#2ec4b6' : (vHpRatio > 0.25 ? '#ffb703' : '#e63946');
    ctx.fillRect(vBarX, vBarY, vBarW * vHpRatio, vBarH);
  }

  renderMinimap(ctx, width, height, player, wantedSystem, missions, city) {
    const mapSize = 170;
    const mx = 20;
    const my = height - mapSize - 20;

    // Minimap Background & Border
    ctx.save();
    ctx.fillStyle = 'rgba(15, 18, 25, 0.92)';
    ctx.beginPath();
    ctx.roundRect(mx, my, mapSize, mapSize, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.hudBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Clip inside radar
    ctx.beginPath();
    ctx.roundRect(mx + 2, my + 2, mapSize - 4, mapSize - 4, 7);
    ctx.clip();

    // World to radar scaling
    const scale = (mapSize - 4) / WORLD.width;
    const ox = mx + 2;
    const oy = my + 2;

    // Ocean & Coast
    const oceanY = oy + WORLD.waterY * scale;
    ctx.fillStyle = PALETTE.waterDeep;
    ctx.fillRect(ox, oceanY, (mapSize - 4), (mapSize - 4) - (oceanY - oy));

    // Roads
    ctx.fillStyle = '#444952';
    for (const r of city.roads) {
      ctx.fillRect(ox + r.x * scale, oy + r.y * scale, Math.max(2, r.w * scale), Math.max(2, r.h * scale));
    }

    // Park
    if (city.park) {
      ctx.fillStyle = PALETTE.grass;
      ctx.fillRect(ox + city.park.x * scale, oy + city.park.y * scale, city.park.w * scale, city.park.h * scale);
    }

    // Buildings
    ctx.fillStyle = '#6b7280';
    for (const b of city.buildings) {
      ctx.fillRect(ox + b.x * scale, oy + b.y * scale, Math.max(2, b.w * scale), Math.max(2, b.h * scale));
    }

    // Police Cruisers Blips (Flashing Red/Blue)
    if (wantedSystem && wantedSystem.stars > 0) {
      const isRed = Math.floor(this.time * 8) % 2 === 0;
      ctx.fillStyle = isRed ? '#e63946' : '#2b7fff';
      for (const cop of wantedSystem.getAllPoliceVehicles()) {
        ctx.beginPath();
        ctx.arc(ox + cop.x * scale, oy + cop.y * scale, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Mission Target Marker (Glowing gold diamond)
    if (missions) {
      const marker = missions.getCurrentMarker();
      if (marker) {
        ctx.fillStyle = '#ffb703';
        const mkX = ox + marker.x * scale;
        const mkY = oy + marker.y * scale;
        ctx.beginPath();
        ctx.arc(mkX, mkY, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player Blip & Heading Arrow
    const px = ox + player.x * scale;
    const py = oy + player.y * scale;
    const heading = player.inVehicle && player.vehicle ? player.vehicle.angle : player.angle;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(heading);
    ctx.fillStyle = '#2ec4b6';
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -4);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}
