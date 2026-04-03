// Generates a soft pizzicato ringtone using Web Audio API
// 24-second loop, peaceful and repetitive

let audioCtx = null;
let ringtoneSource = null;
let isPlaying = false;

// Musical notes (Hz) for a gentle repeating melody
const MELODY = [
  523.25, 659.25, 783.99, 659.25,  // C5 E5 G5 E5
  587.33, 698.46, 880.00, 698.46,  // D5 F5 A5 F5
  523.25, 783.99, 659.25, 523.25,  // C5 G5 E5 C5
  493.88, 587.33, 698.46, 587.33,  // B4 D5 F5 D5
];

function createPizzicatoNote(ctx, freq, startTime, duration = 0.4) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, startTime);

  // Soft pizzicato envelope: quick attack, fast decay
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  // Gentle low-pass for warmth
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, startTime);
  filter.Q.setValueAtTime(1, startTime);

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);

  return osc;
}

function scheduleRingtone(ctx) {
  const oscs = [];
  const noteInterval = 0.375; // tempo: ~160 BPM feel
  const patternDuration = MELODY.length * noteInterval; // ~6 seconds per pattern
  const repeats = 4; // 4 repeats = ~24 seconds

  for (let r = 0; r < repeats; r++) {
    for (let i = 0; i < MELODY.length; i++) {
      const t = ctx.currentTime + (r * patternDuration) + (i * noteInterval);
      oscs.push(createPizzicatoNote(ctx, MELODY[i], t, 0.35));
    }
  }
  return { oscs, totalDuration: repeats * patternDuration };
}

export function startRingtone() {
  if (isPlaying) return;
  isPlaying = true;

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const loop = () => {
      if (!isPlaying) return;
      const { totalDuration } = scheduleRingtone(audioCtx);
      ringtoneSource = setTimeout(loop, totalDuration * 1000);
    };
    loop();
  } catch (e) {
    console.warn('Ringtone failed:', e);
    isPlaying = false;
  }
}

export function stopRingtone() {
  isPlaying = false;
  if (ringtoneSource) {
    clearTimeout(ringtoneSource);
    ringtoneSource = null;
  }
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
}

export function isRingtonePlaying() {
  return isPlaying;
}