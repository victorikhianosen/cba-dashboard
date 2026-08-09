// A short two-note chime synthesized with the Web Audio API — no audio file to fetch/embed,
// so nothing for the CSP or asset pipeline to trip over. Browsers block audio until the user
// has interacted with the page at least once; that's expected here (by the time a live
// notification arrives over the socket, the user has long since clicked into the app) so no
// special handling for the "blocked until interaction" case is needed.
let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;

  if (!sharedContext) {
    sharedContext = new Ctor();
  }

  return sharedContext;
}

export function playNotificationChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  // A brickwall limiter, not just a compressor — very low threshold, high ratio, near-
  // instant attack. This is what lets every oscillator below run at full gain (up to 1.0)
  // without the summed signal ever clipping: the limiter clamps the peak right at the
  // ceiling instead of letting it distort, then a makeup gain pushes that clamped signal
  // back up to the loudest level the output can carry cleanly.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -50;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.1;

  const makeupGain = ctx.createGain();
  makeupGain.gain.value = 4;

  limiter.connect(makeupGain);
  makeupGain.connect(ctx.destination);

  const now = ctx.currentTime;
  // A rising major third (E6 -> G#6) reads as a bright, attention-getting "new item" cue.
  const notes: Array<[frequency: number, start: number]> = [
    [1318.51, 0],
    [1661.22, 0.1],
  ];

  // Three stacked voices per note — fundamental, an octave down for body, and a bright
  // square-wave overtone that cuts through — all at/near full gain. Loudness comes from
  // layering full-volume voices into the limiter above, not from any single oscillator
  // being turned up past what a speaker can reproduce cleanly.
  const voices: Array<{ type: OscillatorType; ratio: number; gain: number }> = [
    { type: "sine", ratio: 1, gain: 1.0 },
    { type: "triangle", ratio: 0.5, gain: 0.7 },
    { type: "square", ratio: 2, gain: 0.35 },
  ];

  notes.forEach(([frequency, start]) => {
    const noteStart = now + start;
    const noteEnd = noteStart + 0.28;

    voices.forEach(({ type, ratio, gain: peakGain }) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.value = frequency * ratio;

      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(peakGain, noteStart + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

      oscillator.connect(gain);
      gain.connect(limiter);

      oscillator.start(noteStart);
      oscillator.stop(noteEnd + 0.02);
    });
  });
}
