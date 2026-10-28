// Procedural Web Audio API sound generator for Chess 2
// Zero external asset dependencies, instant low-latency tactile audio feedback.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private volume: number = 0.5;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const savedMuted = localStorage.getItem("chess2_audio_muted");
        if (savedMuted !== null) this.muted = savedMuted === "true";
        const savedVol = localStorage.getItem("chess2_audio_volume");
        if (savedVol !== null) this.volume = Math.max(0, Math.min(1, parseFloat(savedVol)));
      } catch {
        /* ignore */
      }
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem("chess2_audio_muted", String(this.muted));
    } catch {
      /* ignore */
    }
    return this.muted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem("chess2_audio_volume", String(this.volume));
    } catch {
      /* ignore */
    }
  }

  // Helper to create gain node scaled to current volume
  private makeMasterGain(ctx: AudioContext, targetGain = 1): GainNode {
    const gain = ctx.createGain();
    gain.gain.value = this.muted ? 0 : this.volume * targetGain;
    gain.connect(ctx.destination);
    return gain;
  }

  // 1. Move piece: crisp wooden board slide and click
  public playMove() {
    const ctx = this.getContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;
    const out = this.makeMasterGain(ctx, 0.4);

    // Initial click/thud
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);

    oscGain.gain.setValueAtTime(0.8, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(oscGain);
    oscGain.connect(out);
    osc.start(now);
    osc.stop(now + 0.1);

    // Subtle wooden body resonance
    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    noise.type = "sine";
    noise.frequency.setValueAtTime(120, now);
    noise.frequency.exponentialRampToValueAtTime(45, now + 0.12);

    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(noiseGain);
    noiseGain.connect(out);
    noise.start(now);
    noise.stop(now + 0.13);
  }

  // 2. Capture piece: punchy wooden clack
  public playCapture() {
    const ctx = this.getContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;
    const out = this.makeMasterGain(ctx, 0.55);

    // Sharp impact
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "square";
    osc1.frequency.setValueAtTime(320, now);
    osc1.frequency.exponentialRampToValueAtTime(90, now + 0.07);

    gain1.gain.setValueAtTime(0.9, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc1.connect(gain1);
    gain1.connect(out);
    osc1.start(now);
    osc1.stop(now + 0.09);

    // Deep wooden thud
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(180, now + 0.02);
    osc2.frequency.exponentialRampToValueAtTime(50, now + 0.16);

    gain2.gain.setValueAtTime(0.7, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

    osc2.connect(gain2);
    gain2.connect(out);
    osc2.start(now + 0.02);
    osc2.stop(now + 0.18);
  }

  // 3. Draft / Buy unit: gold coins clinking
  public playDraft() {
    const ctx = this.getContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;
    const out = this.makeMasterGain(ctx, 0.35);

    // High coin ring 1
    const coin1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    coin1.type = "sine";
    coin1.frequency.setValueAtTime(1480, now);
    coin1.frequency.exponentialRampToValueAtTime(1800, now + 0.06);

    g1.gain.setValueAtTime(0.6, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    coin1.connect(g1);
    g1.connect(out);
    coin1.start(now);
    coin1.stop(now + 0.23);

    // High coin ring 2 (delayed clink)
    const coin2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    coin2.type = "sine";
    coin2.frequency.setValueAtTime(2100, now + 0.07);
    coin2.frequency.exponentialRampToValueAtTime(1950, now + 0.18);

    g2.gain.setValueAtTime(0.5, now + 0.07);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    coin2.connect(g2);
    g2.connect(out);
    coin2.start(now + 0.07);
    coin2.stop(now + 0.31);
  }

  // 4. End Turn: crisp parchment flip & gentle wooden bell
  public playEndTurn() {
    const ctx = this.getContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;
    const out = this.makeMasterGain(ctx, 0.4);

    // Upward chime chord (G4 -> C5)
    [392, 523.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      g.gain.setValueAtTime(0.45, now + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.28);

      osc.connect(g);
      g.connect(out);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.3);
    });
  }

  // 5. Courier / Chat notification: gentle brass bell dispatch chime
  public playCourier() {
    const ctx = this.getContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;
    const out = this.makeMasterGain(ctx, 0.45);

    // Two pleasant bell notes (A5 -> D6)
    [880, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.1);

      g.gain.setValueAtTime(0.5, now + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);

      osc.connect(g);
      g.connect(out);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.36);
    });
  }

  // 6. Treaty / Diplomacy: warm royal harmonic pact fanfare
  public playTreaty() {
    const ctx = this.getContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;
    const out = this.makeMasterGain(ctx, 0.4);

    // Triad: C4, E4, G4, C5
    [261.63, 329.63, 392.0, 523.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      g.gain.setValueAtTime(0.4, now + idx * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);

      osc.connect(g);
      g.connect(out);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.52);
    });
  }

  // 7. Tactical Detonation (Nuke): deep rumbling explosion
  public playDetonation() {
    const ctx = this.getContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;
    const out = this.makeMasterGain(ctx, 0.7);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.7);

    g.gain.setValueAtTime(0.9, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  // 8. Select piece / tactile click: soft ink pen or wooden block tap
  public playSelect() {
    const ctx = this.getContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;
    const out = this.makeMasterGain(ctx, 0.25);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);

    g.gain.setValueAtTime(0.4, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // 8b. Unit Card Hover: soft tactile parchment card tick
  public playHover() {
    const ctx = this.getContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;
    const out = this.makeMasterGain(ctx, 0.09);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(560, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.025);

    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  // 9. Victory: triumphant fanfare
  public playVictory() {
    const ctx = this.getContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;
    const out = this.makeMasterGain(ctx, 0.5);

    const notes = [
      { f: 523.25, t: 0.0, d: 0.2 },
      { f: 659.25, t: 0.18, d: 0.2 },
      { f: 783.99, t: 0.36, d: 0.25 },
      { f: 1046.5, t: 0.58, d: 0.65 },
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(n.f, now + n.t);

      g.gain.setValueAtTime(0.5, now + n.t);
      g.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(g);
      g.connect(out);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.05);
    });
  }

  // 10. Defeat: solemn descending cadence
  public playDefeat() {
    const ctx = this.getContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime;
    const out = this.makeMasterGain(ctx, 0.45);

    const notes = [
      { f: 392.0, t: 0.0, d: 0.3 },
      { f: 369.99, t: 0.28, d: 0.3 },
      { f: 329.63, t: 0.56, d: 0.6 },
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(n.f, now + n.t);

      g.gain.setValueAtTime(0.4, now + n.t);
      g.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(g);
      g.connect(out);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.05);
    });
  }

  // 11. Celebratory Fireworks for Grand Triumph
  public playFireworkBurst(delay = 0) {
    const ctx = this.getContext();
    if (!ctx || this.muted) return;
    const now = ctx.currentTime + delay;
    const out = this.makeMasterGain(ctx, 0.55);

    // 1. Launch whistle / swoosh
    const whistle = ctx.createOscillator();
    const whistleGain = ctx.createGain();
    whistle.type = "sine";
    whistle.frequency.setValueAtTime(320, now);
    whistle.frequency.exponentialRampToValueAtTime(1400, now + 0.28);

    whistleGain.gain.setValueAtTime(0.01, now);
    whistleGain.gain.linearRampToValueAtTime(0.3, now + 0.15);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.29);

    whistle.connect(whistleGain);
    whistleGain.connect(out);
    whistle.start(now);
    whistle.stop(now + 0.3);

    // 2. Main aerial explosion boom
    const burstTime = now + 0.28;
    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = "triangle";
    boom.frequency.setValueAtTime(160, burstTime);
    boom.frequency.exponentialRampToValueAtTime(35, burstTime + 0.35);

    boomGain.gain.setValueAtTime(0.8, burstTime);
    boomGain.gain.exponentialRampToValueAtTime(0.001, burstTime + 0.4);

    boom.connect(boomGain);
    boomGain.connect(out);
    boom.start(burstTime);
    boom.stop(burstTime + 0.42);

    // 3. Crackling sparkle cascade (micro-pops)
    for (let i = 0; i < 7; i++) {
      const crackleTime = burstTime + 0.08 + i * 0.04 + Math.random() * 0.03;
      const pop = ctx.createOscillator();
      const popGain = ctx.createGain();
      pop.type = "square";
      pop.frequency.setValueAtTime(1200 + Math.random() * 1400, crackleTime);

      popGain.gain.setValueAtTime(0.18, crackleTime);
      popGain.gain.exponentialRampToValueAtTime(0.001, crackleTime + 0.03);

      pop.connect(popGain);
      popGain.connect(out);
      pop.start(crackleTime);
      pop.stop(crackleTime + 0.04);
    }
  }

  public playFireworks(burstCount = 4) {
    for (let i = 0; i < burstCount; i++) {
      this.playFireworkBurst(i * 0.45 + (Math.random() * 0.15));
    }
  }
}

export const sound = new SoundEngine();
