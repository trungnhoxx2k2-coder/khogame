// Âm thanh tổng hợp bằng Web Audio (không cần file âm thanh).
let ctx: AudioContext | null = null;
let on = true;

export const loadSound = () => { try { on = localStorage.getItem('cotuong:sound') !== '0'; } catch { /* bỏ qua */ } return on; };
export function setSound(v: boolean) { on = v; try { localStorage.setItem('cotuong:sound', v ? '1' : '0'); } catch { /* bỏ qua */ } }

function tone(freq: number, dur: number, delay = 0, type: OscillatorType = 'sine', vol = 0.15) {
  if (!on || typeof window === 'undefined') return;
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
    const t0 = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + dur);
  } catch { /* trình duyệt chặn âm thanh */ }
}
export const sfx = {
  move: () => tone(300, 0.08, 0, 'triangle'),
  capture: () => { tone(180, 0.12, 0, 'square', 0.1); tone(260, 0.1, 0.05, 'square', 0.1); },
  check: () => { tone(700, 0.12); tone(900, 0.16, 0.12); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, i * 0.12, 'triangle')),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, i * 0.15, 'sawtooth', 0.08)),
};
