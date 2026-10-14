/**
 * LUOXU ambient score — generated live with Web Audio, nothing downloaded.
 *
 * A slow four-chord pad (D lydian colour: Dadd9 · Bm11 · Gmaj9 · Aadd4) breathes under a long synthetic hall,
 * a few glass-bell notes fall from a pentatonic set among small forest sounds (birds, drops, a brook, bamboo, leaves;
 * crickets at night), and a band of filtered air moves with the scroll. Chapter changes (luoxu:section from the
 * scene) draw a soft swell and, now and then, one forest sound; the dark privacy chapter closes the filter.
 * Optional narration: public/audio/voice/manifest.json lists recorded lines per chapter; they play once each,
 * through the same hall, with the music ducked and a subtitle shown. Sound is always opt-in.
 */
const PREF = 'luoxu:sound';
const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);
const CHORDS = [[38, 50, 57, 62, 64, 69], [35, 47, 54, 59, 62, 64], [31, 43, 50, 55, 59, 66], [33, 45, 52, 57, 62, 64]];
const BELLS = [74, 76, 78, 81, 83, 86, 88];
const CHORD_SEC = 11;
const VOICE = import.meta.env.BASE_URL.replace(/\/?$/, '/') + 'audio/voice/';

interface Line {section: number; src: string; text: string}

let ctx: AudioContext | null = null;
let master: GainNode, music: GainNode, tone: BiquadFilterNode, hall: ConvolverNode, airGain: GainNode, airFilter: BiquadFilterNode, noiseBuf: AudioBuffer;
let on = false, timer = 0, nextChord = 0, chordIx = 0, nextBell = 0, lastSection = -1;
let lines: Line[] = [];
const played = new Set<number>();
let voice: AudioBufferSourceNode | null = null;

function impulse(c: AudioContext, sec: number) {
  const len = Math.floor(c.sampleRate * sec), buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch); let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      lp += (Math.random() * 2 - 1 - lp) * (.5 - .42 * t); // darker as it decays
      d[i] = lp * Math.pow(1 - t, 3.2) * (i < 600 ? i / 600 : 1);
    }
  }
  return buf;
}

function build() {
  const c = new AudioContext({latencyHint: 'playback'});
  master = c.createGain(); master.gain.value = 0;
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3;
  master.connect(comp).connect(c.destination);
  hall = c.createConvolver(); hall.buffer = impulse(c, 7);
  const wet = c.createGain(); wet.gain.value = .8; hall.connect(wet).connect(master);
  music = c.createGain(); music.gain.value = 1;
  tone = c.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 900; tone.Q.value = .4;
  music.connect(tone); tone.connect(master); tone.connect(hall);
  // air: looped noise through a moving band
  const nb = noiseBuf = c.createBuffer(1, c.sampleRate * 4, c.sampleRate), nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const noise = c.createBufferSource(); noise.buffer = nb; noise.loop = true;
  airFilter = c.createBiquadFilter(); airFilter.type = 'bandpass'; airFilter.frequency.value = 900; airFilter.Q.value = .8;
  airGain = c.createGain(); airGain.gain.value = .006;
  noise.connect(airFilter).connect(airGain).connect(hall); noise.start();
  ctx = c;
}

function pad(c: AudioContext, notes: number[], at: number) {
  const len = CHORD_SEC + 6;
  notes.forEach((n, k) => {
    const g = c.createGain(); const peak = (k === 0 ? .05 : .028) / Math.sqrt(notes.length / 4);
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(peak, at + 4.5); g.gain.setValueAtTime(peak, at + len - 6);
    g.gain.linearRampToValueAtTime(0, at + len);
    const pan = c.createStereoPanner(); pan.pan.value = (k / (notes.length - 1) - .5) * .7;
    g.connect(pan).connect(music);
    for (const [type, det] of [['sine', -4], ['triangle', 5]] as [OscillatorType, number][]) {
      const o = c.createOscillator(); o.type = type; o.frequency.value = mtof(n); o.detune.value = det + (Math.random() - .5) * 4;
      const og = c.createGain(); og.gain.value = type === 'sine' ? 1 : .35;
      o.connect(og).connect(g); o.start(at); o.stop(at + len + .1);
    }
  });
}

function bell(c: AudioContext, at: number, n = BELLS[(Math.random() * BELLS.length) | 0], level = .03) {
  const g = c.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(level, at + .008);
  g.gain.exponentialRampToValueAtTime(.0001, at + 4);
  const pan = c.createStereoPanner(); pan.pan.value = Math.random() * 1.2 - .6;
  g.connect(pan); pan.connect(hall); pan.connect(master);
  for (const [ratio, amp] of [[1, 1], [2.76, .22], [5.4, .07]]) {
    const o = c.createOscillator(); o.frequency.value = mtof(n) * ratio;
    const og = c.createGain(); og.gain.value = amp; o.connect(og).connect(g); o.start(at); o.stop(at + 4.1);
  }
}

/* ── forest: small synthetic nature sounds, a handful of short-lived nodes each */
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
function place(c: AudioContext, width = 1.4) {
  const pan = c.createStereoPanner(); pan.pan.value = (Math.random() - .5) * width;
  pan.connect(hall); pan.connect(master);
  return pan;
}
function env(c: AudioContext, at: number, peak: number, attack: number, decay: number) {
  const g = c.createGain(); g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(.0001, at + attack + decay);
  return g;
}
function osc(c: AudioContext, out: AudioNode, at: number, len: number, f: number, type: OscillatorType = 'sine') {
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, at); o.connect(out); o.start(at); o.stop(at + len);
  return o;
}

// a small bird: two to four quick upward chirps
function birds(c: AudioContext, at: number) {
  const pan = place(c), base = rnd(2500, 3800), n = 2 + ((Math.random() * 3) | 0);
  for (let i = 0, t = at; i < n; i++, t += rnd(.1, .17)) {
    const f = base * rnd(.92, 1.08), g = env(c, t, .006, .012, .09); g.connect(pan);
    const o = osc(c, g, t, .12, f * .8);
    o.frequency.exponentialRampToValueAtTime(f * 1.25, t + .05); o.frequency.exponentialRampToValueAtTime(f, t + .09);
  }
}
// a drop into still water: a fast rising "plip"
function drop(c: AudioContext, at: number, level = .018) {
  const f = rnd(650, 1150), g = env(c, at, level, .004, .17); g.connect(place(c));
  osc(c, g, at, .2, f).frequency.exponentialRampToValueAtTime(f * 2.1, at + .06);
}
// a brook: a loose cluster of quiet drops
function brook(c: AudioContext, at: number) {
  for (let i = 0, n = 4 + ((Math.random() * 4) | 0), t = at; i < n; i++, t += rnd(.06, .22)) drop(c, t, rnd(.006, .011));
}
// a bamboo knock, hollow and short
function bamboo(c: AudioContext, at: number) {
  const pan = place(c, 1), f = rnd(420, 680);
  for (const [r, a, d] of [[1, .022, .24], [2.92, .006, .07]]) {const g = env(c, at, a, .003, d); g.connect(pan); osc(c, g, at, d + .05, f * r, 'triangle');}
}
// wind through leaves: a swell of filtered noise
function leaves(c: AudioContext, at: number) {
  const s = c.createBufferSource(); s.buffer = noiseBuf;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = rnd(2200, 4200); bp.Q.value = .9;
  const g = c.createGain(), peak = rnd(.012, .02), up = rnd(.6, 1);
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(peak, at + up); g.gain.linearRampToValueAtTime(0, at + up + rnd(1.2, 1.8));
  s.connect(bp).connect(g).connect(place(c)); s.start(at, Math.random() * 3); s.stop(at + up + 1.9);
}
// a cricket: a pulsed high tone in three short trills (the night chapter)
function cricket(c: AudioContext, at: number) {
  const am = c.createGain(); am.gain.value = .5;
  const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = rnd(26, 34);
  const depth = c.createGain(); depth.gain.value = .5; lfo.connect(depth).connect(am.gain); lfo.start(at); lfo.stop(at + 1.5);
  const g = c.createGain(); g.gain.setValueAtTime(0, at);
  for (let k = 0; k < 3; k++) {const t = at + k * .46; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.0035, t + .03); g.gain.setValueAtTime(.0035, t + .22); g.gain.linearRampToValueAtTime(0, t + .26);}
  osc(c, am, at, 1.5, rnd(4200, 4800)); am.connect(g).connect(place(c, .8));
}
const chime = (c: AudioContext, at: number) => bell(c, at, undefined, .018);

type Cue = (c: AudioContext, at: number) => void;
const DAY: Cue[] = [birds, drop, brook, bamboo, leaves, chime];
const NIGHT: Cue[] = [cricket, drop, leaves, chime];
let lastCue: Cue | null = null;
function cue(c: AudioContext, at: number) {
  const set = document.documentElement.dataset.theme === 'dark' ? NIGHT : DAY;
  let f: Cue;
  do f = set[(Math.random() * set.length) | 0]; while (f === lastCue);
  lastCue = f; f(c, at);
}

/* Chapter swells are rate-limited: every chapter still breathes (the air opens and closes), but a sound marks the
   change at most once per CUE_GAP seconds, drawn from the forest set so the same one never repeats back to back. */
const CUE_GAP = 8;
let lastChime = -1e9;
function swell(c: AudioContext, section: number) {
  const at = c.currentTime;
  airFilter.frequency.cancelScheduledValues(at);
  airFilter.frequency.setTargetAtTime(2600, at, .4); airFilter.frequency.setTargetAtTime(900, at + 1.4, 1.2);
  airGain.gain.setTargetAtTime(.03, at, .3); airGain.gain.setTargetAtTime(.006, at + 1.2, 1);
  if (at - lastChime < CUE_GAP) return;
  lastChime = at;
  // the closing chapter opens upward: a slow rising arpeggio
  if (section === 9) [74, 78, 81, 86, 90].forEach((n, i) => bell(c, at + .3 + i * .42, n, .024 - i * .002));
  else cue(c, at + .25);
}

function tick() {
  if (!ctx) return;
  const t = ctx.currentTime;
  while (nextChord < t + 2) {pad(ctx, CHORDS[chordIx++ % CHORDS.length], nextChord); nextChord += CHORD_SEC;}
  if (nextBell < t + 1) {
    // ambient sounds keep their own slow pace and give way to a chapter cue that just played
    if (t - lastChime > 3) {const at = Math.max(t, nextBell); if (Math.random() < .4) bell(ctx, at); else cue(ctx, at);}
    nextBell = t + 4 + Math.random() * 6;
  }
  const dark = document.documentElement.dataset.theme === 'dark';
  tone.frequency.setTargetAtTime(dark ? 520 : (lastSection === 9 ? 1700 : 1100) + Math.min(1, vel) * 1600, t, .6);
}

let vel = 0, lastY = scrollY, lastT = performance.now();
addEventListener('scroll', () => {
  const now = performance.now();
  vel = vel * .8 + Math.abs(scrollY - lastY) / Math.max(1, now - lastT) * .2; lastY = scrollY; lastT = now;
  if (ctx && on) airGain.gain.setTargetAtTime(.006 + Math.min(.025, vel * .02), ctx.currentTime, .25);
}, {passive: true});
setInterval(() => {vel *= .7;}, 200);

/* ── narration */
// persisted across pages by the layout (transition:persist); a stand-in keeps old markup working
const sub = document.querySelector<HTMLElement>('.voice-sub') ?? document.body.appendChild(Object.assign(document.createElement('p'), {className: 'voice-sub'}));
fetch(VOICE + 'manifest.json').then(r => (r.ok ? r.json() : null))
  .then(m => {if (m?.enabled && Array.isArray(m.lines)) lines = m.lines;}).catch(() => undefined);

async function speak(section: number) {
  const line = lines.find(l => l.section === section);
  if (!ctx || !on || !line || played.has(section) || document.body.dataset.scene !== 'home') return;
  played.add(section);
  try {
    const buf = await ctx.decodeAudioData(await (await fetch(VOICE + line.src)).arrayBuffer());
    if (!on) return;
    voice?.stop();
    const s = ctx.createBufferSource(); s.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 120;
    const air = ctx.createBiquadFilter(); air.type = 'highshelf'; air.frequency.value = 6000; air.gain.value = 3;
    const vg = ctx.createGain(); vg.gain.value = .9; const send = ctx.createGain(); send.gain.value = .35;
    s.connect(hp).connect(air).connect(vg).connect(master); air.connect(send).connect(hall);
    const t = ctx.currentTime;
    music.gain.setTargetAtTime(.4, t, .4);
    s.onended = () => {if (ctx) music.gain.setTargetAtTime(1, ctx.currentTime, 1.2); sub.classList.remove('is-on'); if (voice === s) voice = null;};
    sub.textContent = line.text; sub.classList.add('is-on');
    s.start(t + .3); voice = s;
  } catch {/* missing line: stay silent */}
}

addEventListener('luoxu:section', e => {
  const s = (e as CustomEvent<number>).detail;
  if (s === lastSection) return;
  const first = lastSection < 0; lastSection = s;
  if (ctx && on && !first) swell(ctx, s);
  speak(s);
});

/* ── on / off */
const btn = document.querySelector<HTMLButtonElement>('.sound-toggle');
function setOn(v: boolean) {
  on = v;
  try {localStorage.setItem(PREF, v ? 'on' : 'off');} catch {/* ignore */}
  btn?.setAttribute('aria-pressed', String(v));
  document.documentElement.classList.toggle('sound-on', v);
  if (v) {
    if (!ctx) build();
    const c = ctx!; c.resume();
    if (!timer) {nextChord = c.currentTime + .1; nextBell = c.currentTime + 2.5; tick(); timer = window.setInterval(tick, 500);}
    master.gain.cancelScheduledValues(c.currentTime); master.gain.setTargetAtTime(.9, c.currentTime, 1.4);
    if (lastSection >= 0) speak(lastSection);
  } else if (ctx) {
    master.gain.setTargetAtTime(0, ctx.currentTime, .3);
    voice?.stop(); voice = null; sub.classList.remove('is-on');
  }
}
btn?.addEventListener('click', () => setOn(!on));
addEventListener('luoxu:sound', e => setOn((e as CustomEvent<boolean>).detail));
document.addEventListener('visibilitychange', () => {
  if (!ctx || !on) return;
  if (document.hidden) ctx.suspend(); else ctx.resume();
});
// A returning visitor who chose sound gets it back on their first gesture (browsers require one).
let pref: string | null = null;
try {pref = localStorage.getItem(PREF);} catch {/* ignore */}
if (pref === 'on' && !document.documentElement.classList.contains('gate')) {
  const wake = () => {setOn(true); removeEventListener('pointerdown', wake); removeEventListener('keydown', wake);};
  addEventListener('pointerdown', wake, {once: true}); addEventListener('keydown', wake, {once: true});
}
