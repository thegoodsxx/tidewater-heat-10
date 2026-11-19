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
    const traffic = options.traffic;
    const particles = options.particles;

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

    // 4. Tire Skid Marks
    if (particles) {
      particles.renderSkids(ctx);
    }

    // 5. Ground Shadow Pass (Golden-hour low-sun angle)
    this.renderShadows(ctx, city, player, traffic, options.pedestrians, bounds);

    // 6. Drops & Pickups (Cash, Ammo)
    if (options.pedestrians && options.pedestrians.drops) {
      this.renderDrops(ctx, options.pedestrians.drops);
    }

    // 7. Pedestrians
    if (options.pedestrians && options.pedestrians.peds) {
      this.renderPedestrians(ctx, options.pedestrians.peds);
    }

    // 8. Combat Rivals & Gang members
    if (options.combat && options.combat.rivals) {
      this.renderRivals(ctx, options.combat.rivals);
    }

    // 9. Vehicles (lower chassis & headlights)
    const allVehicles = traffic && traffic.vehicles ? [...traffic.vehicles] : [];
    if (options.wantedSystem) {
      allVehicles.push(...options.wantedSystem.getAllPoliceVehicles());
    }
    if (allVehicles.length > 0) {
      this.renderHeadlights(ctx, allVehicles);
      this.renderVehicles(ctx, allVehicles);
    }

    // 7. Props (Park pond, trees, streetlamps)
    this.renderProps(ctx, city, bounds);

    // 8. Buildings & Rooftops
    this.renderBuildings(ctx, city, bounds);

    // 9. Player (if on foot)
    if (!player.inVehicle && !player.isDead) {
      this.renderPlayer(ctx, player);
    }

    // 10. Particles (sparks, smoke, blood, fire)
    if (particles) {
      particles.renderParticles(ctx);
    }

    // 11. Combat Bullets & Tracers
    if (options.combat && options.combat.bullets) {
      this.renderBullets(ctx, options.combat.bullets);
    }

    // 12. Gun Shop Ammu-Nation Refill Beacon
    this.renderGunShopBeacon(ctx);

    // 13. Mission World Beacon Marker
    if (options.missions) {
      const marker = options.missions.getCurrentMarker();
      if (marker) {
        this.renderMissionMarker(ctx, marker.x, marker.y, marker.label);
      }
    }

    ctx.restore();

    // 11. Screen Overlays (Busted / Wasted)
    if (options.wantedSystem) {
      this.renderScreenOverlays(ctx, options.wantedSystem, width, height);
    }

    // 12. Mission Dialogue & Story Panels
    if (options.missions) {
      this.renderMissionPanels(ctx, options.missions, width, height);
    }

    // 13. HUD & Minimap
    if (options.hud) {
      options.hud.render(ctx, width, height, player, options.wantedSystem, options.missions, city, options.traffic, options.combat);
    }

    // 14. Golden-Hour Coastal Vignette
    this.renderGoldenHourVignette(ctx, width, height);
  }

  renderGoldenHourVignette(ctx, width, height) {
    ctx.save();
    const grad = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.45, width / 2, height / 2, Math.max(width, height) * 0.85);
    grad.addColorStop(0, 'rgba(255, 180, 80, 0.0)');
    grad.addColorStop(0.7, 'rgba(255, 140, 50, 0.04)');
    grad.addColorStop(1, 'rgba(40, 15, 25, 0.28)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  renderStartScreen(ctx, width, height, saveSummary) {
    // Warm golden-hour sunset gradient
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#2d1b2e');
    bg.addColorStop(0.35, '#6a2c4e');
    bg.addColorStop(0.65, '#b84a39');
    bg.addColorStop(0.85, '#e07a38');
    bg.addColorStop(1, '#f6c368');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Subtle sun disc
    ctx.fillStyle = 'rgba(255, 235, 170, 0.4)';
    ctx.beginPath();
    ctx.arc(width / 2, height * 0.45, 120, 0, Math.PI * 2);
    ctx.fill();

    // Ocean water base
    ctx.fillStyle = '#102a38';
    ctx.fillRect(0, height - 90, width, 90);
    ctx.fillStyle = 'rgba(210, 242, 247, 0.3)';
    ctx.fillRect(0, height - 90, width, 4);

    // Main Title: TIDEWATER HEAT
    ctx.save();
    ctx.textAlign = 'center';

    // Title 3D Drop Shadow
    ctx.font = '900 68px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#1a0b16';
    ctx.fillText('TIDEWATER HEAT', width / 2 + 5, height * 0.22 + 5);

    // Title Main Glow & Text
    ctx.fillStyle = '#ffb703';
    ctx.fillText('TIDEWATER HEAT', width / 2, height * 0.22);

    // Subtitle
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#f8edeb';
    ctx.fillText('A COASTAL CRIME ODYSSEY · TIDEWATER CITY', width / 2, height * 0.28);

    // Story Intro Card
    const cardW = Math.min(width - 60, 680);
    const cardH = 95;
    const cardX = (width - cardW) / 2;
    const cardY = height * 0.33;

    ctx.fillStyle = 'rgba(15, 18, 25, 0.85)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 8);
    ctx.fill();
    ctx.strokeStyle = '#ff9838';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#f1f5f9';
    ctx.font = '14px sans-serif';
    ctx.fillText('Welcome to Tidewater, an open-world coastal playground of fast cars and relentless heat.', width / 2, cardY + 30);
    ctx.fillText('Team up with fixer Marisol Vega, steal wheels, survive police pursuits, and rule the coast.', width / 2, cardY + 55);
    ctx.fillText('Desktop Chrome · Keyboard & Mouse · Audio synthesized via WebAudio', width / 2, cardY + 78);

    // Controls Card
    const ctrlW = Math.min(width - 60, 680);
    const ctrlH = 110;
    const ctrlX = (width - ctrlW) / 2;
    const ctrlY = height * 0.49;

    ctx.fillStyle = 'rgba(15, 18, 25, 0.85)';
    ctx.beginPath();
    ctx.roundRect(ctrlX, ctrlY, ctrlW, ctrlH, 8);
    ctx.fill();
    ctx.strokeStyle = '#457b9d';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('CONTROLS', width / 2, ctrlY + 24);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '13px monospace';
    ctx.fillText('[WASD] / [Arrows] Walk & Drive   ·   [Shift] Sprint   ·   [Space] Handbrake Drift', width / 2, ctrlY + 50);
    ctx.fillText('[E] Steal / Enter / Exit Vehicle, Interact & Advance Story Dialogue', width / 2, ctrlY + 74);
    ctx.fillText('[Left Click] / [F] Fire 9mm Pistol   ·   [M] Mute Audio', width / 2, ctrlY + 96);

    // Interactive Buttons
    const btnY = height * 0.72;
    // New Game Button
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 200, btnY, 400, 48, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('▶ PRESS [ENTER] OR CLICK FOR NEW GAME', width / 2, btnY + 30);

    // Continue Button (if save exists)
    if (saveSummary) {
      const cY = btnY + 60;
      ctx.fillStyle = '#2ec4b6';
      ctx.beginPath();
      ctx.roundRect(width / 2 - 200, cY, 400, 42, 8);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#111';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(`▶ PRESS [C] TO CONTINUE (Save: $${saveSummary.cash}, Mission ${saveSummary.missionIndex + 1})`, width / 2, cY + 26);
    }

    ctx.restore();
  }

  renderScreenOverlays(ctx, wantedSystem, width, height) {
    if (wantedSystem.isWastedActive()) {
      ctx.fillStyle = 'rgba(180, 20, 30, 0.65)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('WASTED', width / 2, height / 2 - 20);

      ctx.font = '22px sans-serif';
      ctx.fillStyle = '#ffeaa7';
      ctx.fillText('Admitted to Tidewater Memorial Hospital (-$200)', width / 2, height / 2 + 35);
    } else if (wantedSystem.isBustedActive()) {
      ctx.fillStyle = 'rgba(15, 30, 60, 0.75)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#2b7fff';
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BUSTED', width / 2, height / 2 - 20);

      ctx.font = '22px sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.fillText('Processed at Tidewater Precinct #1 (-$300 Bail)', width / 2, height / 2 + 35);
    }
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

  renderShadows(ctx, city, player, traffic, bounds) {
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

    // Vehicle shadows
    if (traffic && traffic.vehicles) {
      for (const v of traffic.vehicles) {
        ctx.save();
        ctx.translate(v.x + sx * 0.5, v.y + sy * 0.5);
        ctx.rotate(v.angle);
        ctx.beginPath();
        ctx.roundRect(-v.length / 2, -v.width / 2, v.length, v.width, 6);
        ctx.fill();
        ctx.restore();
      }
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

  renderHeadlights(ctx, vehicles) {
    for (const v of vehicles) {
      // Warm yellow/amber dusk headlight cones
      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(v.angle);

      const fwd = v.length / 2;
      const beamLen = 140;
      const beamSpread = 32;

      // Left light cone
      const gradLeft = ctx.createRadialGradient(fwd, -v.width * 0.35, 4, fwd + beamLen * 0.7, -v.width * 0.35, beamLen);
      gradLeft.addColorStop(0, 'rgba(255, 235, 170, 0.45)');
      gradLeft.addColorStop(1, 'rgba(255, 235, 170, 0.0)');

      ctx.fillStyle = gradLeft;
      ctx.beginPath();
      ctx.moveTo(fwd, -v.width * 0.35);
      ctx.lineTo(fwd + beamLen, -v.width * 0.35 - beamSpread);
      ctx.lineTo(fwd + beamLen, -v.width * 0.35 + beamSpread * 0.5);
      ctx.closePath();
      ctx.fill();

      // Right light cone
      const gradRight = ctx.createRadialGradient(fwd, v.width * 0.35, 4, fwd + beamLen * 0.7, v.width * 0.35, beamLen);
      gradRight.addColorStop(0, 'rgba(255, 235, 170, 0.45)');
      gradRight.addColorStop(1, 'rgba(255, 235, 170, 0.0)');

      ctx.fillStyle = gradRight;
      ctx.beginPath();
      ctx.moveTo(fwd, v.width * 0.35);
      ctx.lineTo(fwd + beamLen, v.width * 0.35 - beamSpread * 0.5);
      ctx.lineTo(fwd + beamLen, v.width * 0.35 + beamSpread);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  renderVehicles(ctx, vehicles) {
    for (const v of vehicles) {
      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(v.angle);

      const hl = v.length / 2;
      const hw = v.width / 2;

      // Mission 1 Marked sports car indicator aura
      if (v.isMissionCar) {
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, v.radius + 12 + Math.sin(this.time * 6) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Main Car Chassis
      ctx.fillStyle = v.bodyColor;
      ctx.beginPath();
      ctx.roundRect(-hl, -hw, v.length, v.width, 6);
      ctx.fill();

      // Chassis outline
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Windshield & Rear glass
      ctx.fillStyle = '#1c2833';
      ctx.fillRect(-hl * 0.45, -hw * 0.75, v.length * 0.65, v.width * 0.75);

      // Car Roof
      ctx.fillStyle = v.roofColor;
      ctx.beginPath();
      ctx.roundRect(-hl * 0.3, -hw * 0.7, v.length * 0.45, v.width * 0.7, 4);
      ctx.fill();

      // Headlights
      ctx.fillStyle = '#fff4cc';
      ctx.fillRect(hl - 3, -hw + 3, 3, 6);
      ctx.fillRect(hl - 3, hw - 9, 3, 6);

      // Taillights
      ctx.fillStyle = '#d90429';
      ctx.fillRect(-hl, -hw + 3, 3, 6);
      ctx.fillRect(-hl, hw - 9, 3, 6);

      // Police Cruiser Lightbar
      if (v.isPolice) {
        const isRed = Math.floor(v.sirenTimer) % 2 === 0;
        ctx.fillStyle = isRed ? '#e63946' : '#2b7fff';
        ctx.fillRect(-3, -hw * 0.5, 6, v.width * 0.5);

        // Siren glow if active
        if (v.sirenActive) {
          ctx.fillStyle = isRed ? 'rgba(230, 57, 70, 0.4)' : 'rgba(43, 127, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(0, 0, 36, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
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

  renderDrops(ctx, drops) {
    for (const d of drops) {
      d.timer = (d.timer || 0) + 0.05;
      const bob = Math.sin(d.timer * 4) * 3;
      ctx.save();
      ctx.translate(d.x, d.y + bob);

      if (d.type === 'cash') {
        ctx.fillStyle = PALETTE.cashGreen;
        ctx.fillRect(-8, -5, 16, 10);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-8, -5, 16, 10);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('$', 0, 3);
      } else {
        ctx.fillStyle = '#d4a373';
        ctx.fillRect(-7, -5, 14, 10);
        ctx.strokeStyle = '#3d2616';
        ctx.lineWidth = 1;
        ctx.strokeRect(-7, -5, 14, 10);
      }
      ctx.restore();
    }
  }

  renderPedestrians(ctx, peds) {
    for (const p of peds) {
      if (p.isDead) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = '#8b0000';
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.shirtColor;
        ctx.fillRect(-6, -4, 12, 8);
        ctx.fillStyle = p.skinColor;
        ctx.beginPath();
        ctx.arc(6, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      const legOffset = Math.sin(p.walkCycle) * (p.state === 'flee' ? 6 : 4);
      ctx.fillStyle = p.pantsColor;
      ctx.fillRect(-5 + legOffset, -8, 5, 7);
      ctx.fillRect(-5 - legOffset, 1, 5, 7);

      ctx.fillStyle = p.shirtColor;
      ctx.beginPath();
      ctx.roundRect(-8, -6, 16, 12, 3);
      ctx.fill();

      ctx.fillStyle = p.skinColor;
      ctx.fillRect(-2, -8, 8, 3);
      ctx.fillRect(-2, 5, 8, 3);

      ctx.fillStyle = p.skinColor;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = p.hairColor;
      ctx.beginPath();
      ctx.arc(-2, 0, 4.5, Math.PI * 0.5, Math.PI * 1.5);
      ctx.fill();

  renderGunShopBeacon(ctx) {
    const shop = { x: 2300, y: 940, w: 140, h: 100 };
    const bx = shop.x + shop.w / 2;
    const by = shop.y + shop.h + 20;

    ctx.save();
    ctx.strokeStyle = '#2a9d8f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(bx, by, 18 + Math.sin(this.time * 5) * 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#2a9d8f';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AMMO $80', bx, by + 4);
    ctx.restore();
  }

  renderBullets(ctx, bullets) {
    for (const b of bullets) {
      ctx.save();
      ctx.strokeStyle = b.isEnemy ? '#ff3b30' : '#ffe66d';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(b.x - Math.cos(b.angle) * 14, b.y - Math.sin(b.angle) * 14);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  renderMissionMarker(ctx, x, y, label) {
    const pulse = Math.sin(this.time * 6) * 5;
    ctx.save();
    // Glowing golden ground rings
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(x, y, 26 + pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 183, 3, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y, 26 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Floating 3D Diamond
    const bob = Math.sin(this.time * 4) * 6;
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.moveTo(x, y - 35 + bob);
    ctx.lineTo(x + 12, y - 47 + bob);
    ctx.lineTo(x, y - 59 + bob);
    ctx.lineTo(x - 12, y - 47 + bob);
    ctx.closePath();
    ctx.fill();

    // Label
    if (label) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y - 68 + bob);
    }
    ctx.restore();
  }

  renderMissionPanels(ctx, missions, width, height) {
    const dialogue = missions.getCurrentDialogueLine();
    if (dialogue) {
      // Bottom dialogue bar
      const panelH = 120;
      const py = height - panelH - 20;
      const px = Math.max(20, (width - 760) / 2);
      const pw = Math.min(width - 40, 760);

      ctx.fillStyle = 'rgba(15, 18, 25, 0.94)';
      ctx.fillRect(px, py, pw, panelH);
      ctx.strokeStyle = PALETTE.hudBorder;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(px, py, pw, panelH);

      // Portrait box
      const isMarisol = dialogue.speaker.includes('Marisol');
      ctx.fillStyle = '#222831';
      ctx.fillRect(px + 15, py + 15, 90, 90);
      ctx.strokeStyle = isMarisol ? '#ff9838' : '#2ec4b6';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 15, py + 15, 90, 90);

      // Draw stylized portrait inside box
      ctx.save();
      ctx.translate(px + 60, py + 60);
      if (isMarisol) {
        // Marisol Vega portrait
        ctx.fillStyle = '#e0ac69'; // skin
        ctx.beginPath();
        ctx.arc(0, 2, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111'; // sleek dark hair
        ctx.beginPath();
        ctx.arc(0, -6, 24, Math.PI * 0.8, Math.PI * 2.2);
        ctx.fill();
        ctx.fillStyle = '#111'; // sunglasses
        ctx.fillRect(-14, -2, 12, 8);
        ctx.fillRect(2, -2, 12, 8);
        ctx.fillStyle = '#ffd166'; // gold hoop earring
        ctx.beginPath();
        ctx.arc(-20, 4, 4, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Player portrait
        ctx.fillStyle = '#e5a176';
        ctx.beginPath();
        ctx.arc(0, 2, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2d2218';
        ctx.beginPath();
        ctx.arc(0, -6, 23, Math.PI * 0.9, Math.PI * 2.1);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.fillRect(-12, -2, 24, 7);
      }
      ctx.restore();

      // Speaker Name
      ctx.fillStyle = isMarisol ? '#ff9838' : '#2ec4b6';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(dialogue.speaker, px + 125, py + 36);

      // Dialogue Text
      ctx.fillStyle = '#f0f4f8';
      ctx.font = '16px sans-serif';
      ctx.fillText(dialogue.text, px + 125, py + 68);

      // Continue prompt
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('[E / Enter] Continue ▶', px + pw - 20, py + panelH - 15);
    } else if (missions.missionState === 'failed') {
      // Failure notice
      const panelH = 100;
      const py = height / 2 - 50;
      const px = Math.max(20, (width - 640) / 2);
      const pw = Math.min(width - 40, 640);

      ctx.fillStyle = 'rgba(20, 10, 15, 0.95)';
      ctx.fillRect(px, py, pw, panelH);
      ctx.strokeStyle = '#e63946';
      ctx.lineWidth = 3;
      ctx.strokeRect(px, py, pw, panelH);

      ctx.fillStyle = '#e63946';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MISSION FAILED', width / 2, py + 38);

      ctx.fillStyle = '#ffffff';
      ctx.font = '15px sans-serif';
      ctx.fillText(missions.statusText, width / 2, py + 72);
    }
  }
}
