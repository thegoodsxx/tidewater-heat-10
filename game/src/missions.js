/**
 * Tidewater Heat - 5-Mission Story Chain for Fixer Marisol Vega
 * Dialogue system, timed objectives, car boosting, heat evasion, dockside shoot-out, final getaway.
 */

import { LANDMARKS } from './config.js';

export const STORY_MISSIONS = [
  {
    id: 1,
    title: 'The Marina Boost',
    startDialogue: [
      { speaker: 'Marisol Vega', text: 'Listen up. A high-roller left his prized Cheetah GT in the south Marina lot. Boost it and deliver it to my garage in one piece.' },
      { speaker: 'Player', text: "Consider it done. I'll make sure there's not a scratch on it." },
    ],
    endDialogue: [
      { speaker: 'Marisol Vega', text: "Clean work! This engine purrs like a kitten. Here's your cut, $1,500. Keep your phone handy." },
    ],
    reward: 1500,
    targetMarker: { x: 620, y: 2400, label: 'Marina Lot (Boost Car)' },
    destMarker: { x: 500, y: 440, label: "Marisol's Garage" },
  },
  {
    id: 2,
    title: 'The Hot Package',
    startDialogue: [
      { speaker: 'Marisol Vega', text: "Got a hot package waiting at the Rusty Anchor Diner. The buyers at Northside Warehouses won't wait. You have 60 seconds. Move!" },
      { speaker: 'Player', text: "60 seconds is plenty. Heading to the diner now." },
    ],
    endDialogue: [
      { speaker: 'Marisol Vega', text: 'Right on the buzzer! The buyers were pleased. $2,500 cash in your pocket.' },
    ],
    reward: 2500,
    timeLimit: 60.0,
    pickupMarker: { x: 1100, y: 1440, label: 'Rusty Anchor Diner' },
    dropoffMarker: { x: 2300, y: 440, label: 'Northside Warehouses' },
  },
  {
    id: 3,
    title: 'Heat Wave',
    startDialogue: [
      { speaker: 'Marisol Vega', text: "It's an ambush! The feds tipped off the local precinct. Lose the heat, ditch your tail, and lay low until the stars clear!" },
      { speaker: 'Player', text: "I'm on it. Breaking line of sight now." },
    ],
    endDialogue: [
      { speaker: 'Marisol Vega', text: "Whew, you shook 'em! That was close. They didn't trace anything back to us. Take $3,000." },
    ],
    reward: 3000,
    wantedLevel: 3,
  },
  {
    id: 4,
    title: 'Dockside Showdown',
    startDialogue: [
      { speaker: 'Marisol Vega', text: 'The Southside Syndicate tried to move into our shipping slips at the marina pier. Clear out those goons so our boats can dock.' },
      { speaker: 'Player', text: 'Time for some pest control. Going in.' },
    ],
    endDialogue: [
      { speaker: 'Marisol Vega', text: "The docks are ours again. That'll teach the Syndicate whose city this is. Here's $4,000." },
    ],
    reward: 4000,
    pierMarker: { x: 600, y: 2520, label: 'Tidewater Pier' },
    rivalsCount: 6,
  },
  {
    id: 5,
    title: 'Sunset Getaway',
    startDialogue: [
      { speaker: 'Marisol Vega', text: 'This is the final score. The police have locked down the city. We have to reach the Oceanfront Beach Hideout right now. Keep your pedal down!' },
      { speaker: 'Player', text: 'Hold on tight. We are blowing past their barricades.' },
    ],
    endDialogue: [
      { speaker: 'Marisol Vega', text: 'We made it! Tidewater is ours. You ran this city ragged tonight. Take your $5,000 and enjoy the sunset.' },
    ],
    reward: 5000,
    wantedLevel: 4,
    hideoutMarker: { x: 2650, y: 2420, label: 'Beach Hideout' },
  },
];

export class MissionManager {
  constructor() {
    this.currentMissionIndex = 0; // 0 to 4
    this.activeMission = null;
    this.missionState = 'idle'; // 'idle', 'dialogue_start', 'running', 'dialogue_end', 'failed', 'completed_all'
    this.dialogueQueue = [];
    this.dialogueIndex = 0;
    this.timer = 0;
    this.phase = 0;
    this.statusText = 'Visit Marisol\'s Garage to accept contract';
  }

  getCurrentMarker() {
    if (this.missionState === 'idle') {
      if (this.currentMissionIndex >= STORY_MISSIONS.length) return null;
      // Marker at Marisol's Garage
      return { x: LANDMARKS.marisolGarage.x, y: LANDMARKS.marisolGarage.y + 40, label: "Marisol's Garage" };
    }

    if (!this.activeMission) return null;

    if (this.activeMission.id === 1) {
      if (this.phase === 0) return this.activeMission.targetMarker;
      return this.activeMission.destMarker;
    }
    if (this.activeMission.id === 2) {
      if (this.phase === 0) return this.activeMission.pickupMarker;
      return this.activeMission.dropoffMarker;
    }
    if (this.activeMission.id === 3) {
      return null; // Lose heat anywhere
    }
    if (this.activeMission.id === 4) {
      return this.activeMission.pierMarker;
    }
    if (this.activeMission.id === 5) {
      return this.activeMission.hideoutMarker;
    }
    return null;
  }

  startMission(index, wantedSystem, combat) {
    if (index >= STORY_MISSIONS.length) {
      this.missionState = 'completed_all';
      this.statusText = 'City conquered! Free roam';
      return;
    }

    this.currentMissionIndex = index;
    this.activeMission = STORY_MISSIONS[index];
    this.dialogueQueue = [...this.activeMission.startDialogue];
    this.dialogueIndex = 0;
    this.missionState = 'dialogue_start';
    this.phase = 0;
    this.timer = this.activeMission.timeLimit || 0;
  }

  advanceDialogue(wantedSystem, combat) {
    this.dialogueIndex++;
    if (this.dialogueIndex >= this.dialogueQueue.length) {
      if (this.missionState === 'dialogue_start') {
        this.missionState = 'running';
        this.onMissionRunStart(wantedSystem, combat);
      } else if (this.missionState === 'dialogue_end') {
        this.missionState = 'idle';
        this.currentMissionIndex++;
        this.activeMission = null;
        if (this.currentMissionIndex >= STORY_MISSIONS.length) {
          this.missionState = 'completed_all';
          this.statusText = 'Tidewater Kingpin! All 5 missions cleared';
        } else {
          this.statusText = "Return to Marisol's Garage for next job";
        }
      }
    }
  }

  onMissionRunStart(wantedSystem, combat) {
    const m = this.activeMission;
    if (m.id === 1) {
      this.statusText = 'Boost the marked Cheetah GT at Marina parking lot';
    } else if (m.id === 2) {
      this.statusText = 'Pick up hot package at Rusty Anchor Diner';
    } else if (m.id === 3) {
      wantedSystem.setStars(m.wantedLevel);
      this.statusText = 'Lose the 3-star wanted level!';
    } else if (m.id === 4) {
      combat.spawnRivalGang(600, 2550, m.rivalsCount);
      this.statusText = 'Eliminate rival gang at marina pier';
    } else if (m.id === 5) {
      wantedSystem.setStars(m.wantedLevel);
      this.statusText = 'Reach Beach Hideout under 4-star pursuit!';
    }
  }

  update(dt, player, wantedSystem, combat, input) {
    // Check dialogue advance input (E or Enter)
    if (this.missionState === 'dialogue_start' || this.missionState === 'dialogue_end') {
      if (input.wasPressed('KeyE') || input.wasPressed('Enter') || input.wasMousePressed()) {
        this.advanceDialogue(wantedSystem, combat);
      }
      return;
    }

    // Check retry on failure
    if (this.missionState === 'failed') {
      if (input.wasPressed('KeyE') || input.wasPressed('Enter')) {
        this.startMission(this.currentMissionIndex, wantedSystem, combat);
      } else if (input.wasPressed('Escape')) {
        this.missionState = 'idle';
        this.activeMission = null;
        this.statusText = "Free Roam - Visit Marisol's Garage";
      }
      return;
    }

    // Check Start Mission at Marisol's Garage if idle
    if (this.missionState === 'idle' && this.currentMissionIndex < STORY_MISSIONS.length) {
      const g = LANDMARKS.marisolGarage;
      const d = Math.hypot(player.x - (g.x + g.w / 2), player.y - (g.y + g.h / 2));
      if (d < 75) {
        this.statusText = 'Press [E] to accept Marisol\'s mission';
        if (input.wasPressed('KeyE')) {
          this.startMission(this.currentMissionIndex, wantedSystem, combat);
        }
      } else {
        this.statusText = `Mission ${this.currentMissionIndex + 1}: Visit Marisol's Garage`;
      }
      return;
    }

    if (this.missionState !== 'running' || !this.activeMission) return;

    // Mission 1: The Marina Boost
    if (this.activeMission.id === 1) {
      if (this.phase === 0) {
        if (player.inVehicle && player.vehicle && player.vehicle.isMissionCar) {
          this.phase = 1;
          this.statusText = "Deliver Cheetah GT to Marisol's Garage";
        }
      } else if (this.phase === 1) {
        const dest = this.activeMission.destMarker;
        const dist = Math.hypot(player.x - dest.x, player.y - dest.y);
        if (dist < 80 && player.inVehicle && player.vehicle.isMissionCar) {
          this.completeCurrentMission(player);
        }
      }
    }

    // Mission 2: The Hot Package (Timed)
    else if (this.activeMission.id === 2) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.failMission('Time expired! The buyers left.');
        return;
      }
      if (this.phase === 0) {
        const pMarker = this.activeMission.pickupMarker;
        const d = Math.hypot(player.x - pMarker.x, player.y - pMarker.y);
        if (d < 60) {
          this.phase = 1;
          this.statusText = `Deliver to Northside Warehouses (${Math.ceil(this.timer)}s)`;
        } else {
          this.statusText = `Pick up package at Diner (${Math.ceil(this.timer)}s)`;
        }
      } else if (this.phase === 1) {
        this.statusText = `Deliver to Northside Warehouses (${Math.ceil(this.timer)}s)`;
        const dMarker = this.activeMission.dropoffMarker;
        const d = Math.hypot(player.x - dMarker.x, player.y - dMarker.y);
        if (d < 75) {
          this.completeCurrentMission(player);
        }
      }
    }

    // Mission 3: Heat Wave (Lose 3 stars)
    else if (this.activeMission.id === 3) {
      this.statusText = `Evade police pursuit! (Wanted Stars: ${wantedSystem.stars})`;
      if (wantedSystem.stars === 0) {
        this.completeCurrentMission(player);
      }
    }

    // Mission 4: Dockside Showdown (Eliminate rivals)
    else if (this.activeMission.id === 4) {
      const remaining = combat.getRivalsAliveCount();
      this.statusText = `Clear pier rivals: ${remaining} remaining`;
      if (remaining === 0) {
        this.completeCurrentMission(player);
      }
    }

    // Mission 5: Sunset Getaway (Reach Beach Hideout with 4 stars)
    else if (this.activeMission.id === 5) {
      const hideout = this.activeMission.hideoutMarker;
      const d = Math.hypot(player.x - hideout.x, player.y - hideout.y);
      this.statusText = 'Reach Beach Hideout under 4-star pursuit!';
      if (d < 85) {
        wantedSystem.setStars(0);
        this.completeCurrentMission(player);
      }
    }
  }

  completeCurrentMission(player) {
    player.addCash(this.activeMission.reward);
    this.dialogueQueue = [...this.activeMission.endDialogue];
    this.dialogueIndex = 0;
    this.missionState = 'dialogue_end';
  }

  failMission(reason = 'Mission Failed') {
    this.missionState = 'failed';
    this.statusText = `${reason} - Press [E] to Retry or [ESC] for Free Roam`;
  }

  getCurrentDialogueLine() {
    if (this.missionState !== 'dialogue_start' && this.missionState !== 'dialogue_end') return null;
    return this.dialogueQueue[this.dialogueIndex] || null;
  }

  serialize() {
    return {
      currentMissionIndex: this.currentMissionIndex,
    };
  }

  deserialize(data) {
    if (data && typeof data.currentMissionIndex === 'number') {
      this.currentMissionIndex = Math.min(STORY_MISSIONS.length, data.currentMissionIndex);
    }
  }
}
