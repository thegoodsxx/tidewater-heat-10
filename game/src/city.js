/**
 * Tidewater Heat - City World Generation, Landmarks, and Collision Map
 * Coastal grid open-world layout with golden-hour architectural features.
 */

import { WORLD, PALETTE, LANDMARKS } from './config.js';
import { Rng } from './random.js';

export class City {
  constructor(seed = 1) {
    this.rng = new Rng(seed);
    this.width = WORLD.width;
    this.height = WORLD.height;
    
    // Geometry collections
    this.roads = [];
    this.sidewalks = [];
    this.intersections = [];
    this.buildings = [];
    this.props = []; // trees, hydrants, benches, lamps
    this.park = null;
    this.beach = null;
    this.pier = null;
    this.waterBodies = [];
    this.navWaypoints = [];
    this.lanes = [];

    // Spatial partitioning for collision
    this.gridSize = 160;
    this.cols = Math.ceil(this.width / this.gridSize);
    this.rows = Math.ceil(this.height / this.gridSize);
    this.spatialGrid = new Array(this.cols * this.rows).fill(null).map(() => []);

    this.generate();
  }

  generate() {
    this.buildRoadNetwork();
    this.buildBeachAndCoast();
    this.buildPark();
    this.buildBuildings();
    this.buildProps();
    this.buildSpatialIndex();
  }

  buildRoadNetwork() {
    // 5 North-South Avenues
    const aveXs = [
      { x: 240, w: 110, name: 'West Coast Ave' },
      { x: 860, w: 110, name: 'Palm Ave' },
      { x: 1480, w: 130, name: 'Central Blvd' },
      { x: 2100, w: 110, name: 'Marina Way' },
      { x: 2720, w: 110, name: 'Sunrise Ave' },
    ];

    // 5 East-West Streets
    const stYs = [
      { y: 200, h: 100, name: 'North Expressway' },
      { y: 720, h: 90, name: '1st Street' },
      { y: 1240, h: 110, name: 'Grand Ave' },
      { y: 1760, h: 90, name: 'Pier Way' },
      { y: 2260, h: 110, name: 'Ocean Drive' },
    ];

    // Build road segments
    for (const ave of aveXs) {
      this.roads.push({
        type: 'avenue',
        name: ave.name,
        x: ave.x - ave.w / 2,
        y: 80,
        w: ave.w,
        h: 2260 + 55 - 80, // ends at Ocean Drive
        isVertical: true,
      });

      // Sidewalks along avenue
      this.sidewalks.push({
        x: ave.x - ave.w / 2 - 24,
        y: 80,
        w: 24,
        h: 2260 + 55 - 80,
      });
      this.sidewalks.push({
        x: ave.x + ave.w / 2,
        y: 80,
        w: 24,
        h: 2260 + 55 - 80,
      });

      // Traffic lanes
      this.lanes.push({
        x: ave.x - ave.w * 0.25,
        y1: 100,
        y2: 2260,
        dir: 'S',
        isVertical: true,
      });
      this.lanes.push({
        x: ave.x + ave.w * 0.25,
        y1: 2260,
        y2: 100,
        dir: 'N',
        isVertical: true,
      });
    }

    for (const st of stYs) {
      this.roads.push({
        type: 'street',
        name: st.name,
        x: 100,
        y: st.y - st.h / 2,
        w: 2720 + 55 - 100 + 80,
        h: st.h,
        isVertical: false,
      });

      // Sidewalks along street
      this.sidewalks.push({
        x: 100,
        y: st.y - st.h / 2 - 24,
        w: 2720 + 55 - 100 + 80,
        h: 24,
      });
      this.sidewalks.push({
        x: 100,
        y: st.y + st.h / 2,
        w: 2720 + 55 - 100 + 80,
        h: 24,
      });

      // Traffic lanes
      this.lanes.push({
        y: st.y - st.h * 0.25,
        x1: 2720,
        x2: 100,
        dir: 'W',
        isVertical: false,
      });
      this.lanes.push({
        y: st.y + st.h * 0.25,
        x1: 100,
        x2: 2720,
        dir: 'E',
        isVertical: false,
      });
    }

    // Intersections for traffic waypoints & crosswalks
    for (const ave of aveXs) {
      for (const st of stYs) {
        this.intersections.push({
          x: ave.x,
          y: st.y,
          w: ave.w,
          h: st.h,
          aveName: ave.name,
          stName: st.name,
        });

        // Navigation waypoint
        this.navWaypoints.push({
          x: ave.x,
          y: st.y,
          connections: [],
        });
      }
    }
  }

  buildBeachAndCoast() {
    this.beach = {
      x: 0,
      y: WORLD.beachY,
      w: this.width,
      h: WORLD.waterY - WORLD.beachY,
    };

    this.waterBodies.push({
      x: 0,
      y: WORLD.waterY,
      w: this.width,
      h: this.height - WORLD.waterY,
      isSolid: true,
    });

    // Marina Pier (walkable & drivable boardwalk out into the water)
    this.pier = {
      x: 480,
      y: 2260 + 55, // connects to Ocean Drive
      w: 320,
      h: 460,
      parkingLot: {
        x: 520,
        y: 2360,
        w: 240,
        h: 120,
      },
      planks: [],
    };
  }

  getNearestLane(x, y) {
    let nearest = null;
    let bestDist = Infinity;
    for (const lane of this.lanes) {
      let d = 0;
      if (lane.isVertical) {
        if (y < Math.min(lane.y1, lane.y2) || y > Math.max(lane.y1, lane.y2)) continue;
        d = Math.abs(x - lane.x);
      } else {
        if (x < Math.min(lane.x1, lane.x2) || x > Math.max(lane.x1, lane.x2)) continue;
        d = Math.abs(y - lane.y);
      }
      if (d < bestDist) {
        bestDist = d;
        nearest = lane;
      }
    }
    return nearest;
  }

  isPointOnRoad(x, y) {
    for (const r of this.roads) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
    }
    return false;
  }

  isPointOnSidewalk(x, y) {
    for (const s of this.sidewalks) {
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
    }
    return false;
  }

  buildPark() {
    // Palm Grove Central Park
    this.park = {
      x: 920,
      y: 260,
      w: 480,
      h: 400,
      name: 'Palm Grove Central Park',
      pond: {
        x: 1080,
        y: 380,
        w: 160,
        h: 140,
        isSolid: true,
      },
      paths: [
        { x: 920, y: 450, w: 480, h: 26 }, // Main horizontal park trail
        { x: 1150, y: 260, w: 26, h: 400 }, // North-South park trail
      ],
    };
  }

  buildBuildings() {
    // Named Landmark Buildings
    const lm = LANDMARKS;
    const landmarkList = [
      { ...lm.marisolGarage, color: '#e07a5f', roofColor: '#8a3c26', hasNeon: true, neonText: 'VEGA CUSTOMS' },
      { ...lm.hospital, color: '#f4f1de', roofColor: '#3d405b', hasHelipad: true, crossSign: true },
      { ...lm.policeStation, color: '#3d5a80', roofColor: '#293241', hasTower: true, badgeSign: true },
      { ...lm.diner, color: '#f28482', roofColor: '#c15c5a', hasNeon: true, neonText: 'RUSTY ANCHOR' },
      { ...lm.gunShop, color: '#588157', roofColor: '#344e41', hasTarget: true, neonText: 'GUNS & AMMO' },
      { ...lm.marinaPier, color: '#81b29a', roofColor: '#4f772d', isMarina: true },
      { ...lm.beachHideout, color: '#e9c46a', roofColor: '#c49a45', isHideout: true },
      { ...lm.warehouses, color: '#6c757d', roofColor: '#495057', isWarehouse: true },
    ];

    for (const b of landmarkList) {
      this.buildings.push({
        id: b.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: b.name,
        type: b.type,
        x: b.x,
        y: b.y,
        w: b.w,
        h: b.h,
        color: b.color,
        roofColor: b.roofColor,
        isSolid: true,
        isLandmark: true,
        details: b,
      });
    }

    // City Infill Buildings (Commercial & Residential coastal highrises / shops)
    const blockSpaces = [
      // NW Block
      { x: 340, y: 520, w: 180, h: 140, name: 'Westside Freight Co.', color: '#7a8288', roof: '#555b61' },
      // North East Block
      { x: 1600, y: 540, w: 200, h: 120, name: 'Medical Plaza', color: '#e5e9ec', roof: '#abb4bd' },
      // Mid West Block
      { x: 340, y: 1360, w: 180, h: 140, name: 'Sunken Palm Hotel & Casino', color: '#f4a261', roof: '#b86b30', hasPool: true },
      { x: 340, y: 1000, w: 180, h: 160, name: 'Bayview Auto Body', color: '#457b9d', roof: '#1d3557' },
      // Mid Central Block
      { x: 980, y: 840, w: 200, h: 160, name: 'Southside Bank & Trust', color: '#e2d4b7', roof: '#8f7b57' },
      { x: 980, y: 1040, w: 200, h: 140, name: 'Tidewater Herald Offices', color: '#cad2c5', roof: '#52796f' },
      // East Mid Block
      { x: 2220, y: 1360, w: 200, h: 140, name: 'Tidewater City Hall', color: '#dedbd2', roof: '#7b7263' },
      { x: 2220, y: 1060, w: 190, h: 140, name: 'Pawn Star Jewels', color: '#b5838d', roof: '#6d454e' },
      // South West Block
      { x: 340, y: 1880, w: 180, h: 140, name: 'Oceanview Condominiums', color: '#b8bedd', roof: '#68749a' },
      // South Central Block
      { x: 980, y: 1880, w: 200, h: 140, name: 'Sunset Palms Apartments', color: '#ffb5a7', roof: '#b56576' },
      { x: 1600, y: 1880, w: 200, h: 140, name: 'Pacific Coast Mall', color: '#a8dadc', roof: '#457b9d' },
      // South East Block
      { x: 2220, y: 1880, w: 220, h: 140, name: 'Harbor Logistics Yard', color: '#7f7f7f', roof: '#4a4a4a' },
    ];

    for (const b of blockSpaces) {
      this.buildings.push({
        id: b.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: b.name,
        type: 'commercial',
        x: b.x,
        y: b.y,
        w: b.w,
        h: b.h,
        color: b.color,
        roofColor: b.roof,
        isSolid: true,
        isLandmark: false,
        details: b,
      });
    }
  }

  buildProps() {
    // Palm trees in park
    for (let i = 0; i < 28; i++) {
      const px = this.rng.range(this.park.x + 30, this.park.x + this.park.w - 30);
      const py = this.rng.range(this.park.y + 30, this.park.y + this.park.h - 30);
      // Don't spawn inside pond
      const p = this.park.pond;
      if (px >= p.x - 20 && px <= p.x + p.w + 20 && py >= p.y - 20 && py <= p.y + p.h + 20) {
        continue;
      }
      this.props.push({
        type: 'palm_tree',
        x: px,
        y: py,
        radius: 7,
        isSolid: true,
      });
    }

    // Palm trees along Ocean Drive (beach promenade)
    for (let x = 120; x < 2880; x += 110) {
      this.props.push({
        type: 'palm_tree',
        x: x + this.rng.range(-15, 15),
        y: 2320 + this.rng.range(-10, 10),
        radius: 7,
        isSolid: true,
      });
    }

    // Fire hydrants and street lamps along sidewalks
    for (const ave of [240, 860, 1480, 2100, 2720]) {
      for (let y = 300; y < 2200; y += 240) {
        this.props.push({
          type: 'street_lamp',
          x: ave - 64,
          y: y,
          radius: 4,
          isSolid: true,
        });
        this.props.push({
          type: 'street_lamp',
          x: ave + 64,
          y: y + 120,
          radius: 4,
          isSolid: true,
        });
      }
    }
  }

  buildSpatialIndex() {
    for (const b of this.buildings) {
      this.addToSpatialIndex(b);
    }
    for (const p of this.props) {
      if (p.isSolid) this.addToSpatialIndex(p);
    }
    for (const w of this.waterBodies) {
      this.addToSpatialIndex(w);
    }
    if (this.park && this.park.pond) {
      this.addToSpatialIndex(this.park.pond);
    }
  }

  addToSpatialIndex(item) {
    const minCol = Math.max(0, Math.floor(((item.x ?? item.x - item.radius) - 20) / this.gridSize));
    const maxCol = Math.min(this.cols - 1, Math.floor(((item.x + (item.w ?? item.radius * 2)) + 20) / this.gridSize));
    const minRow = Math.max(0, Math.floor(((item.y ?? item.y - item.radius) - 20) / this.gridSize));
    const maxRow = Math.min(this.rows - 1, Math.floor(((item.y + (item.h ?? item.radius * 2)) + 20) / this.gridSize));

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        this.spatialGrid[r * this.cols + c].push(item);
      }
    }
  }

  getCandidates(x, y, radius = 20) {
    const c = Math.max(0, Math.min(this.cols - 1, Math.floor(x / this.gridSize)));
    const r = Math.max(0, Math.min(this.rows - 1, Math.floor(y / this.gridSize)));
    return this.spatialGrid[r * this.cols + c] || [];
  }

  checkCircleCollision(x, y, radius) {
    // Pier area is safe from water collision
    const onPier = this.pier &&
      x >= this.pier.x - 10 && x <= this.pier.x + this.pier.w + 10 &&
      y >= this.pier.y - 10 && y <= this.pier.y + this.pier.h + 10;

    const candidates = this.getCandidates(x, y, radius);
    for (const item of candidates) {
      if (item.isSolid === false) continue;

      // Ignore ocean water if on pier
      if (onPier && item.y >= WORLD.waterY) continue;

      if (item.w !== undefined && item.h !== undefined) {
        // AABB vs Circle
        const closestX = Math.max(item.x, Math.min(x, item.x + item.w));
        const closestY = Math.max(item.y, Math.min(y, item.y + item.h));
        const dx = x - closestX;
        const dy = y - closestY;
        const distSq = dx * dx + dy * dy;
        if (distSq < radius * radius) {
          return { hit: true, item, normalX: dx, normalY: dy, dist: Math.sqrt(distSq) };
        }
      } else if (item.radius !== undefined) {
        // Circle vs Circle
        const dx = x - item.x;
        const dy = y - item.y;
        const distSq = dx * dx + dy * dy;
        const combined = radius + item.radius;
        if (distSq < combined * combined) {
          const dist = Math.sqrt(distSq) || 1;
          return { hit: true, item, normalX: dx / dist, normalY: dy / dist, dist };
        }
      }
    }
    return { hit: false };
  }

  resolveCollision(entity, radius) {
    for (let iter = 0; iter < 4; iter++) {
      const col = this.checkCircleCollision(entity.x, entity.y, radius);
      if (!col.hit) break;

      if (col.dist > 0.001) {
        const nx = col.normalX / col.dist;
        const ny = col.normalY / col.dist;
        const overlap = radius - col.dist;
        entity.x += nx * (overlap + 0.5);
        entity.y += ny * (overlap + 0.5);
      } else {
        entity.x += 1;
        entity.y += 1;
      }
    }

    // World border clamping
    entity.x = Math.max(radius + 20, Math.min(WORLD.width - radius - 20, entity.x));
    entity.y = Math.max(radius + 20, Math.min(WORLD.height - radius - 20, entity.y));
  }
}
