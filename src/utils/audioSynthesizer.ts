// Web Audio API Synthesizer for Soundboard FX & Audio Node Mixer

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;

  public init(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.masterGain);

      this.destinationNode = this.ctx.createMediaStreamDestination();
      this.sfxGain.connect(this.destinationNode);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx;
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getDestination(): MediaStreamAudioDestinationNode | null {
    if (!this.destinationNode) {
      this.init();
    }
    return this.destinationNode;
  }

  public setSfxVolume(volume: number) {
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);
    }
  }

  // Play synthetic sound effects
  public playSound(key: string, volume: number = 0.8) {
    try {
      const ctx = this.init();
      const t = ctx.currentTime;
      const soundGain = ctx.createGain();
      soundGain.gain.setValueAtTime(volume, t);
      
      if (this.sfxGain) {
        soundGain.connect(this.sfxGain);
      } else {
        soundGain.connect(ctx.destination);
      }

      switch (key) {
        case 'airhorn': {
          // Classic hype airhorn fanfares
          const freqs = [466.16, 466.16, 466.16, 466.16, 622.25];
          const times = [0, 0.12, 0.24, 0.36, 0.48];
          const durs = [0.08, 0.08, 0.08, 0.08, 0.4];

          freqs.forEach((f, idx) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, t + times[idx]);
            
            // Rich horn harmonics
            const osc2 = ctx.createOscillator();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(f * 1.5, t + times[idx]);

            g.gain.setValueAtTime(0, t + times[idx]);
            g.gain.linearRampToValueAtTime(0.4, t + times[idx] + 0.01);
            g.gain.exponentialRampToValueAtTime(0.001, t + times[idx] + durs[idx]);

            osc.connect(g);
            osc2.connect(g);
            g.connect(soundGain);

            osc.start(t + times[idx]);
            osc2.start(t + times[idx]);
            osc.stop(t + times[idx] + durs[idx]);
            osc2.stop(t + times[idx] + durs[idx]);
          });
          break;
        }

        case 'boom': {
          // Deep impact 808 boom / mindblown
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(160, t);
          osc.frequency.exponentialRampToValueAtTime(25, t + 1.2);

          // Noise burst
          const bufferSize = ctx.sampleRate * 0.5;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const noiseFilter = ctx.createBiquadFilter();
          noiseFilter.type = 'lowpass';
          noiseFilter.frequency.setValueAtTime(800, t);
          noiseFilter.frequency.exponentialRampToValueAtTime(50, t + 0.6);
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.6, t);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

          noise.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(soundGain);

          g.gain.setValueAtTime(0.8, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
          osc.connect(g);
          g.connect(soundGain);

          osc.start(t);
          noise.start(t);
          osc.stop(t + 1.5);
          noise.stop(t + 0.6);
          break;
        }

        case 'laugh': {
          // Cartoonish chuckle sequence
          const pitches = [320, 370, 340, 390, 360, 420, 380, 440];
          pitches.forEach((p, i) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            const startT = t + i * 0.11;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(p, startT);
            osc.frequency.linearRampToValueAtTime(p - 60, startT + 0.09);

            g.gain.setValueAtTime(0.35, startT);
            g.gain.exponentialRampToValueAtTime(0.001, startT + 0.09);

            osc.connect(g);
            g.connect(soundGain);
            osc.start(startT);
            osc.stop(startT + 0.09);
          });
          break;
        }

        case 'applause': {
          // Crowd cheering & clapping noise burst
          const dur = 2.0;
          const bufferSize = ctx.sampleRate * dur;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (0.5 + 0.5 * Math.sin(i * 0.015));
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1400, t);
          filter.Q.setValueAtTime(1.5, t);

          const g = ctx.createGain();
          g.gain.setValueAtTime(0.05, t);
          g.gain.linearRampToValueAtTime(0.5, t + 0.3);
          g.gain.setValueAtTime(0.5, t + 1.2);
          g.gain.exponentialRampToValueAtTime(0.001, t + dur);

          noise.connect(filter);
          filter.connect(g);
          g.connect(soundGain);
          noise.start(t);
          noise.stop(t + dur);
          break;
        }

        case 'dun_dun_dun': {
          // Dramatic orchestral hits
          const hits = [
            { freq: 220, time: 0, dur: 0.3 },
            { freq: 207.65, time: 0.35, dur: 0.3 },
            { freq: 164.81, time: 0.7, dur: 0.9 },
          ];
          hits.forEach(({ freq, time, dur }) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t + time);

            g.gain.setValueAtTime(0.5, t + time);
            g.gain.exponentialRampToValueAtTime(0.001, t + time + dur);

            osc.connect(g);
            g.connect(soundGain);
            osc.start(t + time);
            osc.stop(t + time + dur);
          });
          break;
        }

        case 'ding': {
          // Bright positive chime
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(987.77, t); // B5
          osc.frequency.setValueAtTime(1318.51, t + 0.08); // E6

          g.gain.setValueAtTime(0.4, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

          osc.connect(g);
          g.connect(soundGain);
          osc.start(t);
          osc.stop(t + 0.8);
          break;
        }

        case 'punch': {
          // Slap / Punch comical impact
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(300, t);
          osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

          g.gain.setValueAtTime(0.7, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

          osc.connect(g);
          g.connect(soundGain);
          osc.start(t);
          osc.stop(t + 0.18);
          break;
        }

        case 'gasp': {
          // Shock gasp inhale sound
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(350, t);
          osc.frequency.linearRampToValueAtTime(650, t + 0.25);

          g.gain.setValueAtTime(0.05, t);
          g.gain.linearRampToValueAtTime(0.35, t + 0.15);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

          osc.connect(g);
          g.connect(soundGain);
          osc.start(t);
          osc.stop(t + 0.35);
          break;
        }

        case 'buzzer': {
          // Wrong answer / fail buzzer
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(130, t);
          osc.frequency.setValueAtTime(120, t + 0.2);

          g.gain.setValueAtTime(0.4, t);
          g.gain.setValueAtTime(0.4, t + 0.35);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

          osc.connect(g);
          g.connect(soundGain);
          osc.start(t);
          osc.stop(t + 0.5);
          break;
        }

        case 'cheer': {
          // Quick hype whistle / fanfare
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, t);
          osc.frequency.linearRampToValueAtTime(1200, t + 0.2);
          osc.frequency.linearRampToValueAtTime(900, t + 0.4);

          g.gain.setValueAtTime(0.3, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

          osc.connect(g);
          g.connect(soundGain);
          osc.start(t);
          osc.stop(t + 0.5);
          break;
        }

        default:
          break;
      }
    } catch (e) {
      console.warn('AudioEngine playSound error:', e);
    }
  }
}

export const audioEngine = new AudioEngine();
