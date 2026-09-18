// =============================================================================
// GAME SHOW AUDIO ENGINE: PROCEDURAL BGM & DYNAMIC REVEAL SOUND EFFECTS
// 100% Native Web Audio API synthesis with zero external audio assets.
// =============================================================================

class GameAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.bgmEnabled = true;
    this.sfxEnabled = true;

    // BGM State
    this.bgmPlaying = false;
    this.bpm = 104;
    this.stepDuration = (60 / this.bpm) / 4; // 16th note = ~0.144s
    this.currentStep = 0;
    this.totalSteps = 64; // 4 bars of 16 steps
    this.nextNoteTime = 0;
    this.bgmTimerId = null;
    this.bgmGain = null;
    this.bgmVolume = 0.18; // Balanced background level

    // SFX Master Gain
    this.sfxGain = null;
    this.sfxVolume = 0.45;

    // Noise buffer for brushed percussion & drumrolls
    this.noiseBuffer = null;

    // Lo-Fi / Game-Show Chords: Fmaj7 - Em7 - Dm7 - Cmaj7
    this.chords = [
      { name: 'Fmaj7', root: 87.31,  notes: [174.61, 261.63, 329.63, 440.00] },
      { name: 'Em7',   root: 82.41,  notes: [164.81, 246.94, 293.66, 392.00] },
      { name: 'Dm7',   root: 73.42,  notes: [146.83, 220.00, 261.63, 349.23] },
      { name: 'Cmaj7', root: 65.41,  notes: [130.81, 196.00, 246.94, 329.63] }
    ];

    // Tension Ticker interval
    this.tickerInterval = null;
    this.tickToggle = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.ctx && !this.sfxGain) {
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
      this.bgmGain.connect(this.ctx.destination);

      this.noiseBuffer = this._generateNoiseBuffer();
    }
  }

  _generateNoiseBuffer() {
    const size = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  // ---------------------------------------------------------------------------
  // BACKGROUND MUSIC (BGM) SCHEDULER
  // ---------------------------------------------------------------------------
  startBGM() {
    this.init();
    if (this.bgmPlaying || !this.bgmEnabled) return;
    this.bgmPlaying = true;
    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this._scheduleBGM();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimerId) {
      clearTimeout(this.bgmTimerId);
      this.bgmTimerId = null;
    }
  }

  toggleBGM() {
    this.init();
    this.bgmEnabled = !this.bgmEnabled;
    if (this.bgmEnabled) {
      this.startBGM();
    } else {
      this.stopBGM();
    }
    return this.bgmEnabled;
  }

  toggleMute() {
    this.init();
    this.isMuted = !this.isMuted;
    if (this.sfxGain && this.bgmGain && this.ctx) {
      const sfxTarget = this.isMuted ? 0 : this.sfxVolume;
      const bgmTarget = (this.isMuted || !this.bgmEnabled) ? 0 : this.bgmVolume;
      this.sfxGain.gain.setTargetAtTime(sfxTarget, this.ctx.currentTime, 0.05);
      this.bgmGain.gain.setTargetAtTime(bgmTarget, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  _scheduleBGM() {
    if (!this.bgmPlaying || !this.bgmEnabled) return;
    // Lookahead: schedule 100ms in advance
    while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
      this._playBGMStep(this.currentStep, this.nextNoteTime);
      this.nextNoteTime += this.stepDuration;
      this.currentStep = (this.currentStep + 1) % this.totalSteps;
    }
    this.bgmTimerId = setTimeout(() => this._scheduleBGM(), 25);
  }

  _playBGMStep(step, time) {
    if (this.isMuted) return;
    const barIndex = Math.floor(step / 16);
    const stepInBar = step % 16;
    const chord = this.chords[barIndex];

    // Electric Piano Rhodes Chords (steps 0, 6, 10)
    if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10) {
      const dur = (stepInBar === 0) ? this.stepDuration * 4.5 : this.stepDuration * 3;
      const vel = (stepInBar === 0) ? 0.18 : 0.13;
      this._synthRhodes(chord.notes, time, dur, vel);
    }

    // Walking Bassline (steps 0, 6, 10, 14)
    if (stepInBar === 0) {
      this._synthBass(chord.root, time, this.stepDuration * 3.5, 0.22);
    } else if (stepInBar === 6) {
      this._synthBass(chord.root * 1.5, time, this.stepDuration * 2.5, 0.17);
    } else if (stepInBar === 10) {
      this._synthBass(chord.root * 2.0, time, this.stepDuration * 2.5, 0.18);
    } else if (stepInBar === 14) {
      this._synthBass(chord.root * 1.334, time, this.stepDuration * 1.8, 0.14);
    }

    // Brushed Shaker (every 2nd 16th note)
    if (stepInBar % 2 === 0) {
      const isAccent = (stepInBar === 4 || stepInBar === 12);
      this._synthShaker(time, isAccent ? 0.06 : 0.03, isAccent ? 0.08 : 0.03);
    }

    // Warm Kick on beats 1 and 3
    if (stepInBar === 0 || stepInBar === 8) {
      this._synthKick(time, 0.14);
    }

    // Soft Rim Tap on beats 2 and 4
    if (stepInBar === 4 || stepInBar === 12) {
      this._synthRim(time, 0.08);
    }
  }

  _synthRhodes(notes, time, dur, vel) {
    notes.forEach((freq, idx) => {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, time);
      osc2.frequency.setValueAtTime(freq * 2, time);
      osc2.detune.setValueAtTime(4 + idx * 2, time);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, time);
      filter.frequency.exponentialRampToValueAtTime(550, time + dur);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(vel, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(vel * 0.4, time + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + dur + 0.05);
      osc2.stop(time + dur + 0.05);
    });
  }

  _synthBass(freq, time, dur, vel) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vel, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(vel * 0.5, time + dur * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  _synthKick(time, vel) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.05);

    gain.gain.setValueAtTime(vel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.09);
  }

  _synthShaker(time, vel, decay) {
    if (!this.noiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vel, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
    noise.stop(time + decay + 0.01);
  }

  _synthRim(time, vel) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, time);
    osc.frequency.exponentialRampToValueAtTime(380, time + 0.015);

    gain.gain.setValueAtTime(vel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.022);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.025);
  }

  // ---------------------------------------------------------------------------
  // INTERACTIVE REVEAL SOUND EFFECTS (SFX)
  // ---------------------------------------------------------------------------

  // Wood knock for door pick & buttons
  playKnock() {
    if (!this.sfxEnabled || this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.07);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Wood door swing creak
  playDoorOpen() {
    if (!this.sfxEnabled || this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.linearRampToValueAtTime(200, t + 0.1);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.3);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  // Dramatic Suspense Drumroll & Swell (Leading to Monty's reveal)
  playSuspenseSwell(duration = 0.85) {
    if (!this.sfxEnabled || this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;

    // Snare roll bursts
    const steps = 18;
    for (let i = 0; i < steps; i++) {
      const progress = i / steps;
      const hitTime = t + Math.pow(progress, 1.4) * (duration - 0.04);
      const hitVol = 0.03 + progress * 0.2;

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600 + progress * 1400, hitTime);
      filter.Q.setValueAtTime(3.5, hitTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(hitVol, hitTime);
      gain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.035);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(hitTime);
      noise.stop(hitTime + 0.04);
    }

    // Rising tension drone
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, t);
    filter.frequency.exponentialRampToValueAtTime(1100, t + duration);

    gain.gain.setValueAtTime(0.02, t);
    gain.gain.linearRampToValueAtTime(0.2, t + duration - 0.04);
    gain.gain.setValueAtTime(0.001, t + duration); // Abrupt cliffhanger choke

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // Procedural Goat Bleat ("Maa-a-a-h") with FM LFO flutter
  playGoatBleat() {
    if (!this.sfxEnabled || this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    const dur = 0.8;

    const carrier = this.ctx.createOscillator();
    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(290, t);
    carrier.frequency.setValueAtTime(290, t + 0.4);
    carrier.frequency.exponentialRampToValueAtTime(210, t + dur);

    // 6.8 Hz vocal cord flutter
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(6.8, t);
    lfoGain.gain.setValueAtTime(22, t);
    lfo.connect(carrier.frequency);

    // Formant filters for nasal goat timbre
    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'peaking';
    f1.frequency.setValueAtTime(850, t);
    f1.Q.setValueAtTime(4.0, t);
    f1.gain.setValueAtTime(14, t);

    const f2 = this.ctx.createBiquadFilter();
    f2.type = 'peaking';
    f2.frequency.setValueAtTime(1750, t);
    f2.Q.setValueAtTime(4.5, t);
    f2.gain.setValueAtTime(10, t);

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2600, t);

    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(0.001, t);
    amp.gain.linearRampToValueAtTime(0.25, t + 0.05);
    amp.gain.setValueAtTime(0.22, t + 0.45);
    amp.gain.exponentialRampToValueAtTime(0.001, t + dur);

    carrier.connect(f1);
    f1.connect(f2);
    f2.connect(lp);
    lp.connect(amp);
    amp.connect(this.sfxGain);

    lfo.start(t);
    carrier.start(t);
    lfo.stop(t + dur + 0.05);
    carrier.stop(t + dur + 0.05);
  }

  // Ticking tension clock during Stay vs Switch dilemma
  startDecisionTicker() {
    this.stopDecisionTicker();
    this.tickerInterval = setInterval(() => {
      this.playTick();
    }, 750);
  }

  stopDecisionTicker() {
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
  }

  playTick() {
    if (!this.sfxEnabled || this.isMuted) return;
    this.init();
    const t = this.ctx.currentTime;
    this.tickToggle = !this.tickToggle;

    const baseFreq = this.tickToggle ? 1800 : 1200;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, t + 0.025);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.03);
  }

  // Game-Show Victory Fanfare: Brass Trumpets + Chime Cascade
  playVictoryFanfare() {
    if (!this.sfxEnabled || this.isMuted) return;
    this.init();
    const baseT = this.ctx.currentTime;

    const melody = [
      { freq: 392.00, start: 0.00, dur: 0.14 }, // G4
      { freq: 523.25, start: 0.14, dur: 0.14 }, // C5
      { freq: 659.25, start: 0.28, dur: 0.14 }, // E5
      { freq: 783.99, start: 0.42, dur: 0.35 }, // G5
      // Final Chord Stabs
      { freq: 523.25, start: 0.80, dur: 0.90 }, // C5
      { freq: 659.25, start: 0.80, dur: 0.90 }, // E5
      { freq: 783.99, start: 0.80, dur: 0.90 }, // G5
      { freq: 1046.50, start: 0.80, dur: 1.10 }  // C6
    ];

    melody.forEach(n => {
      const t = baseT + n.start;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(n.freq, t);
      osc2.frequency.setValueAtTime(n.freq, t);
      osc1.detune.setValueAtTime(-6, t);
      osc2.detune.setValueAtTime(+6, t);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, t);
      filter.frequency.exponentialRampToValueAtTime(3200, t + 0.04);
      filter.frequency.exponentialRampToValueAtTime(1500, t + n.dur);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.12, t + n.dur * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + n.dur + 0.05);
      osc2.stop(t + n.dur + 0.05);
    });

    // Chime Sparkle Cascade
    const chimes = [2093.00, 2637.02, 3135.96, 4186.01, 5274.04];
    chimes.forEach((freq, idx) => {
      const t = baseT + 0.95 + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.7);
    });
  }

  // Comical Sad Trombone ("Wah-Wah-Wah-Waaah")
  playSadTrombone() {
    if (!this.sfxEnabled || this.isMuted) return;
    this.init();
    const baseT = this.ctx.currentTime;

    const phrase = [
      { freq: 293.66, start: 0.00, dur: 0.35, isLast: false }, // D4
      { freq: 277.18, start: 0.38, dur: 0.35, isLast: false }, // C#4
      { freq: 261.63, start: 0.76, dur: 0.35, isLast: false }, // C4
      { freq: 246.94, start: 1.15, dur: 1.40, isLast: true }   // B3 (wah-wah drop)
    ];

    phrase.forEach(note => {
      const t = baseT + note.start;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.freq, t);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(4.5, t);

      const gain = this.ctx.createGain();

      if (!note.isLast) {
        filter.frequency.setValueAtTime(420, t);
        filter.frequency.linearRampToValueAtTime(1350, t + 0.1);
        filter.frequency.exponentialRampToValueAtTime(480, t + note.dur);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + note.dur);
      } else {
        // Multi-wah + comical pitch droop
        filter.frequency.setValueAtTime(450, t);
        filter.frequency.linearRampToValueAtTime(1350, t + 0.15);
        filter.frequency.linearRampToValueAtTime(550, t + 0.38);
        filter.frequency.linearRampToValueAtTime(1250, t + 0.62);
        filter.frequency.linearRampToValueAtTime(480, t + 0.85);
        filter.frequency.exponentialRampToValueAtTime(250, t + note.dur);

        osc.frequency.setValueAtTime(note.freq, t);
        osc.frequency.setValueAtTime(note.freq, t + 0.75);
        osc.frequency.exponentialRampToValueAtTime(140, t + note.dur); // Droop down

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.24, t + 0.08);
        gain.gain.setValueAtTime(0.2, t + 0.9);
        gain.gain.exponentialRampToValueAtTime(0.001, t + note.dur);
      }

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + note.dur + 0.05);
    });
  }
}

export const sound = new GameAudioEngine();
