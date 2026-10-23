let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a classic supermarket POS scanner beep sound (1.8 kHz chirp).
 */
export function playBeep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.11);
  } catch {
    // Audio autoplay or permissions fail-safe
  }
}

/**
 * Plays a checkout payment completed chime.
 */
export function playSuccessChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => { // C5 - E5 - G5 chord
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.14, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.07 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.22);
    });
  } catch {
    // Fail-safe
  }
}

/**
 * Plays an authentic thermal receipt printer mechanical paper feed sound.
 */
export function playPrinterFeedSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Series of mechanical stepper motor ticks
    for (let i = 0; i < 8; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const freq = 280 + (i % 2) * 60;
      osc.frequency.setValueAtTime(freq, now + i * 0.14);
      gain.gain.setValueAtTime(0.04, now + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.14 + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.09);
    }
  } catch {
    // Fail-safe
  }
}

/**
 * Plays the iconic Soundbox success double-tone chime (G5 -> C6).
 */
export function playPaytmSuccessChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Tone 1: G5 (783.99 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.17);

    // Tone 2: C6 (1046.5 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.14);
    gain2.gain.setValueAtTime(0.26, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.53);
  } catch {
    // Fail-safe
  }
}

/**
 * Plays a festive party popper pop sound with a joyful sparkle chime.
 */
export function playPartyPopperSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Snappy cork / party popper "POP"
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();
    popOsc.type = 'triangle';
    popOsc.frequency.setValueAtTime(340, now);
    popOsc.frequency.exponentialRampToValueAtTime(75, now + 0.06);
    popGain.gain.setValueAtTime(0.28, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    popOsc.connect(popGain);
    popGain.connect(ctx.destination);
    popOsc.start(now);
    popOsc.stop(now + 0.08);

    // 2. Joyful celebration sparkle chime (C6 - E6 - G6 - C7)
    [1046.5, 1318.5, 1567.98, 2093.0].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + 0.05 + idx * 0.05);
      gain.gain.setValueAtTime(0.12, now + 0.05 + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05 + idx * 0.05 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + 0.05 + idx * 0.05);
      osc.stop(now + 0.05 + idx * 0.05 + 0.36);
    });
  } catch {
    // Fail-safe
  }
}

