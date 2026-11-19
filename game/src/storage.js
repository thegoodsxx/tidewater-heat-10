/**
 * Tidewater Heat - Persistence & Autosave Manager
 * LocalStorage serialization of cash, missions, coordinates, with autosave timer and Continue support.
 */

const STORAGE_KEY = 'tidewater_heat_save_v1';

export class StorageManager {
  constructor() {
    this.autosaveInterval = 30.0; // autosave every 30 seconds
    this.autosaveTimer = 0;
    this.lastSavedTime = 0;
  }

  hasSave() {
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  }

  getSaveSummary() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return {
        cash: data.cash || 500,
        missionIndex: data.currentMissionIndex || 0,
        timestamp: data.timestamp || Date.now(),
      };
    } catch {
      return null;
    }
  }

  saveGame(player, missions) {
    try {
      const data = {
        cash: player.cash,
        health: player.health,
        ammo: player.weapon.ammo,
        x: player.x,
        y: player.y,
        currentMissionIndex: missions ? missions.currentMissionIndex : 0,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.lastSavedTime = Date.now();
      return true;
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
      return false;
    }
  }

  loadGame(player, missions) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data) return false;

      // Apply saved attributes
      if (typeof data.cash === 'number') player.cash = data.cash;
      if (typeof data.ammo === 'number') player.weapon.ammo = data.ammo;
      if (typeof data.x === 'number' && typeof data.y === 'number') {
        player.x = data.x;
        player.y = data.y;
      }
      player.health = player.maxHealth;
      player.isDead = false;
      player.inVehicle = false;
      player.vehicle = null;

      if (missions && typeof data.currentMissionIndex === 'number') {
        missions.currentMissionIndex = data.currentMissionIndex;
      }
      return true;
    } catch (e) {
      console.warn('LocalStorage load failed:', e);
      return false;
    }
  }

  update(dt, player, missions) {
    this.autosaveTimer += dt;
    if (this.autosaveTimer >= this.autosaveInterval) {
      this.autosaveTimer = 0;
      this.saveGame(player, missions);
    }
  }

  clearSave() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}
