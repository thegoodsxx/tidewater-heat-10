/**
 * Tidewater Heat - WebAudio Pure Synthetic Sound Engine
 * Zero external audio files. Real-time procedural synthesis of engine hum, sirens,
 * gunshots, crashes, cash pickups, fanfare, and UI clicks with user gesture handling and mute toggle.
 */

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.initialized = false;

    // Engine sound state
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;

    // Siren state
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenTimer = 0;
  }

  initOnGesture() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSynth();
      this.setupSirenSynth();
      this.initialized = true;
    } catch (e) {
      console.warn('WebAudio initialization skipped:', e);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  setupEngineSynth() {
    if (!this.ctx) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(260, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
    this.engineOsc.start();
  }

  setupSirenSynth() {
    if (!this.ctx) return;
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sine';
    this.sirenOsc.frequency.setValueAtTime(700, this.ctx.currentTime);

    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.masterGain);
    this.sirenOsc.start();
  }

  update(dt, player, wantedSystem) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. Engine Hum Synthesis
    if (player.inVehicle && player.vehicle && !player.vehicle.isWrecked) {
      const speed = Math.abs(player.vehicle.speed);
      const ratio = Math.min(1.0, speed / player.vehicle.maxSpeed);
      const targetFreq = 48 + ratio * 135;
      const targetFilter = 220 + ratio * 480;
      const targetVol = 0.22 + ratio * 0.18;

      this.engineOsc.frequency.setTargetAtTime(targetFreq, t, 0.08);
      this.engineFilter.frequency.setTargetAtTime(targetFilter, t, 0.08);
      this.engineGain.gain.setTargetAtTime(targetVol, t, 0.08);
    } else {
      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(0, t, 0.1);
      }
    }

    // 2. Police Siren Synthesis
    if (wantedSystem && wantedSystem.stars > 0 && wantedSystem.policeSquad.length > 0) {
      this.sirenTimer += dt * 3.5;
      const sirenFreq = 680 + Math.sin(this.sirenTimer) * 260;
      this.sirenOsc.frequency.setValueAtTime(sirenFreq, t);
      this.sirenGain.gain.setTargetAtTime(0.18, t, 0.1);
    } else {
      if (this.sirenGain) {
        this.sirenGain.gain.setTargetAtTime(0, t, 0.2);
      }
    }
  }

  playGunshot() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    // Noise burst
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.03));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);

    // Punch oscillator
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.09);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playCrash(impactRatio = 1.0) {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(350, t);

    const gain = this.ctx.createGain();
    const vol = Math.min(0.8, 0.3 + impactRatio * 0.4);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
  }

  playPickup() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const notes = [880, 1175, 1480];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, t + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.25, t + idx * 0.06 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.2);
    });
  }

  playMissionFanfare() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const chord = [523.25, 659.25, 783.99, 1046.5]; // C major fanfare
    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.1);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, t + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.3, t + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.55);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.1);
      osc.stop(t + idx * 0.1 + 0.6);
    });
  }

  playClick() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.03);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  playHorn() {
    if (!this.initialized || !this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    [340, 420].forEach(f => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  }
}
