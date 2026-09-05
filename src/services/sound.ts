// Audio alert system using Web Audio API (safe, zero external dependencies, no CORS issues)

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (err) {
    console.warn('AudioContext not available:', err);
    return null;
  }
}

/**
 * Play a pleasant 2-tone hospital reminder chime for medicine notifications
 */
export function playMedicineChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // First Tone (587.33 Hz - D5)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(587.33, now);
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.3, now + 0.05);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.45);

  // Second Tone (880 Hz - A5)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(880, now + 0.2);
  gain2.gain.setValueAtTime(0, now + 0.2);
  gain2.gain.linearRampToValueAtTime(0.35, now + 0.25);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.2);
  osc2.stop(now + 0.85);
}

/**
 * Play clinic buzzer when Doctor calls next patient into cabin
 */
export function playClinicCallBuzzer() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Triple ding (Attention chime: G4 -> C5 -> E5)
  const notes = [392.0, 523.25, 659.25];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + idx * 0.18;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.3, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}

export function playTokenCallChime(_token?: number) {
  playClinicCallBuzzer();
}
