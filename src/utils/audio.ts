/**
 * Web Audio API synthesized sound effects & peaceful ambient town soundscape
 * Requires zero external audio assets, works seamlessly across all devices
 */

class SoundController {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public ambientEnabled: boolean = true;
  private ambientTimer: number | null = null;
  private birdTimer: number | null = null;
  private isAmbientRunning: boolean = false;
  private masterGain: GainNode | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Peaceful Ambient Soundscape (Lofi / Calm Town Chords & Nature) ---
  startPeacefulAmbient() {
    if (this.isAmbientRunning || !this.ambientEnabled) return;
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    this.isAmbientRunning = true;

    // Peaceful pentatonic chord progressions (C major / G major / F major peaceful calm tones)
    const chords = [
      [261.63, 329.63, 392.00, 523.25], // Cmaj (C4, E4, G4, C5)
      [220.00, 261.63, 329.63, 440.00], // Am (A3, C4, E4, A4)
      [174.61, 220.00, 261.63, 349.23], // Fmaj (F3, A3, C4, F4)
      [196.00, 246.94, 293.66, 392.00], // Gmaj (G3, B3, D4, G4)
    ];

    let chordIdx = 0;

    const playNextChord = () => {
      if (!this.isAmbientRunning || !this.ambientEnabled || !this.ctx || !this.masterGain) return;

      const chord = chords[chordIdx % chords.length];
      chordIdx++;

      chord.forEach((freq, noteIdx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = noteIdx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // Low-pass warmth filter for lo-fi peacefulness
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);

        const now = this.ctx.currentTime;
        const noteDuration = 4.8;

        // Soft, gentle fade-in and long calming fade-out
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.022, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + noteDuration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + noteDuration);
      });

      // Schedule next chord
      this.ambientTimer = window.setTimeout(playNextChord, 4200);
    };

    // Soft occasional bird chirping
    const playRandomBirdChirp = () => {
      if (!this.isAmbientRunning || !this.ambientEnabled || !this.ctx || !this.masterGain) return;
      this.playGentleBirdChirp();
      const nextDelay = 6000 + Math.random() * 8000;
      this.birdTimer = window.setTimeout(playRandomBirdChirp, nextDelay);
    };

    playNextChord();
    this.birdTimer = window.setTimeout(playRandomBirdChirp, 3000);
  }

  stopPeacefulAmbient() {
    this.isAmbientRunning = false;
    if (this.ambientTimer) {
      clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
    if (this.birdTimer) {
      clearTimeout(this.birdTimer);
      this.birdTimer = null;
    }
  }

  toggleAmbient(): boolean {
    this.ambientEnabled = !this.ambientEnabled;
    this.enabled = this.ambientEnabled;
    if (this.ambientEnabled) {
      this.startPeacefulAmbient();
    } else {
      this.stopPeacefulAmbient();
    }
    return this.ambientEnabled;
  }

  playGentleBirdChirp() {
    if (!this.ambientEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.masterGain) return;

      const baseFreq = 2200 + Math.random() * 800;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, now + 0.16);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.018, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // AudioContext policy fallback
    }
  }

  // --- UI Sound Effects ---
  playPop() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {
      // AudioContext policy fallback
    }
  }

  playEnterBuilding() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.masterGain) return;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.07);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.07 + 0.25);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(this.ctx.currentTime + idx * 0.07);
        osc.stop(this.ctx.currentTime + idx * 0.07 + 0.25);
      });
    } catch {
      // AudioContext policy fallback
    }
  }

  playCoinReward() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.masterGain) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
      osc1.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.09); // E6
      osc2.frequency.setValueAtTime(987.77, this.ctx.currentTime);
      osc2.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.09);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + 0.35);
      osc2.stop(this.ctx.currentTime + 0.35);
    } catch {
      // AudioContext policy fallback
    }
  }

  playFootstep() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.025, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // AudioContext policy fallback
    }
  }

  playFanfare() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.masterGain) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(this.ctx.currentTime + idx * 0.1);
        osc.stop(this.ctx.currentTime + idx * 0.1 + 0.35);
      });
    } catch {
      // AudioContext policy fallback
    }
  }
}

export const sounds = new SoundController();
