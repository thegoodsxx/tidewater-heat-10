/**
 * Tidewater Heat - Deterministic Screenshot Stager
 * Implements ?shot=start|play|drive|chase|end|mission&seed=N for reproducible headless rendering.
 */

import { WORLD, LANDMARKS } from './config.js';

export function stageScreenshot(shotName, state, seed = 1) {
  const { player, camera, traffic, pedestrians, wantedSystem, combat, missions, particles } = state;

  switch (shotName) {
    case 'start': {
      state.screen = 'title';
      return;
    }

    case 'play': {
      state.screen = 'game';
      // Player on foot on Ocean Drive sidewalk near palm trees
      player.x = 860;
      player.y = 2210;
      player.angle = 0;
      player.inVehicle = false;
      player.vehicle = null;
      player.speed = 120;
      player.vx = 120;
      player.vy = 0;
      camera.snapTo(player.x, player.y, 1.0);
      missions.statusText = "Free Roam · Ocean Drive";
      break;
    }

    case 'drive': {
      state.screen = 'game';
      // Find or spawn sports car drifting around Central Blvd & Grand Ave intersection
      let car = traffic.vehicles.find(v => v.type === 'sports');
      if (!car) car = traffic.vehicles[0];
      car.x = 1480;
      car.y = 1240;
      car.angle = -Math.PI * 0.25;
      car.speed = 340;
      car.vx = Math.cos(car.angle) * car.speed;
      car.vy = Math.sin(car.angle) * car.speed;
      car.isParked = false;

      // Enter vehicle
      player.enterVehicle(car);
      camera.snapTo(car.x, car.y, 0.85);

      // Add skid marks and smoke behind car
      if (particles) {
        particles.addSkid(car.x - 30, car.y + 30, car.x, car.y, 6, 0.7);
        particles.addSkid(car.x - 15, car.y + 45, car.x + 15, car.y + 15, 6, 0.7);
        particles.addSmoke(car.x - 20, car.y + 20, 4, false);
      }
      missions.statusText = "High Speed Cruising · Grand Ave";
      break;
    }

    case 'chase': {
      state.screen = 'game';
      // Player in muscle car fleeing from police
      let car = traffic.vehicles.find(v => v.type === 'muscle') || traffic.vehicles[0];
      car.x = 1480;
      car.y = 1000;
      car.angle = Math.PI * 0.5; // heading South
      car.speed = 380;
      car.vx = 0;
      car.vy = car.speed;
      car.isParked = false;
      player.enterVehicle(car);

      // Set 3-star wanted level
      wantedSystem.setStars(3);

      // Position two police cruisers closely behind player
      if (wantedSystem.policeSquad.length < 2) {
        wantedSystem.spawnPursuitCar(player);
        wantedSystem.spawnPursuitCar(player);
      }
      if (wantedSystem.policeSquad[0]) {
        wantedSystem.policeSquad[0].x = 1480;
        wantedSystem.policeSquad[0].y = 880;
        wantedSystem.policeSquad[0].angle = Math.PI * 0.5;
        wantedSystem.policeSquad[0].speed = 370;
        wantedSystem.policeSquad[0].setSiren(true);
      }
      if (wantedSystem.policeSquad[1]) {
        wantedSystem.policeSquad[1].x = 1430;
        wantedSystem.policeSquad[1].y = 810;
        wantedSystem.policeSquad[1].angle = Math.PI * 0.52;
        wantedSystem.policeSquad[1].speed = 360;
        wantedSystem.policeSquad[1].setSiren(true);
      }

      camera.snapTo(car.x, car.y + 60, 0.82);
      missions.statusText = "Evade Police Pursuit! (3 Stars)";
      break;
    }

    case 'mission': {
      state.screen = 'game';
      // Mission 1: Car-delivery scene.
      // Player beside marked sports car at the marina lot, mission marker visible.
      missions.startMission(0, wantedSystem, combat);
      missions.missionState = 'running';
      missions.phase = 0;
      missions.statusText = 'Mission 1: Boost the marked Cheetah GT at Marina parking lot';

      const sportsCar = traffic.vehicles.find(v => v.isMissionCar) || traffic.vehicles[0];
      sportsCar.x = 620;
      sportsCar.y = 2400;
      sportsCar.angle = -Math.PI * 0.5;
      sportsCar.isMissionCar = true;

      // Player stands right beside driver's side door
      player.x = sportsCar.x - 34;
      player.y = sportsCar.y;
      player.angle = 0;
      player.inVehicle = false;
      player.vehicle = null;

      camera.snapTo(sportsCar.x, sportsCar.y, 0.95);
      break;
    }

    case 'end': {
      state.screen = 'game';
      // Story Epilogue at Oceanfront Beach Hideout
      missions.currentMissionIndex = 5;
      missions.missionState = 'completed_all';
      missions.statusText = 'Tidewater Kingpin! All 5 missions completed';
      player.x = LANDMARKS.beachHideout.x + 80;
      player.y = LANDMARKS.beachHideout.y + 130;
      player.angle = Math.PI * 0.5;
      player.cash = 16666;
      player.inVehicle = false;
      player.vehicle = null;
      camera.snapTo(player.x, player.y, 0.95);
      break;
    }

    default:
      state.screen = 'title';
      break;
  }
}

export function parseShotQuery(search = window.location.search) {
  const params = new URLSearchParams(search);
  const shot = params.get('shot');
  const seed = parseInt(params.get('seed') || '1', 10);
  return { shot, seed };
}
