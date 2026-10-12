/**
 * Kinetic layer: Lenis smooth scroll, GSAP ScrollTrigger scrubs, split-text reveals, magnetic / spring
 * micro-interactions and mouse tilt. All of it is progressive enhancement: with reduced motion or without JS
 * the page is the plain, fully readable document.
 */
import Lenis from 'lenis';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
const root = document.documentElement;
const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
const mobile = matchMedia('(max-width:700px)').matches;
const $ = <T extends Element = HTMLElement>(sel: string, ctx: ParentNode = document) => Array.from(ctx.querySelectorAll<T>(sel));

/* ── smooth scroll with weight */
const lenis = new Lenis({lerp: .085, wheelMultiplier: .9, smoothWheel: true, anchors: {offset: -24}});
root.classList.add('lenis-on');
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
ScrollTrigger.config({ignoreMobileResize: true});

/* ── split text into masked characters (CJK-friendly), keeping the accessible text on the parent */
function splitChars(el: HTMLElement) {
  if (el.dataset.splitDone) return $('.ci', el);
  const label = el.textContent?.trim() ?? '';
  const sr = document.createElement('span'); sr.className = 'sr-text'; sr.textContent = label;
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const ch of Array.from(child.textContent ?? '')) {
          if (/\s/.test(ch)) {frag.append(ch); continue;}
          const w = document.createElement('span'); w.className = 'ch'; w.setAttribute('aria-hidden', 'true');
          const i = document.createElement('span'); i.className = 'ci'; i.textContent = ch; w.append(i); frag.append(w);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && (child as HTMLElement).tagName !== 'BR') walk(child);
    });
  };
  walk(el);
  el.prepend(sr);
  el.dataset.splitDone = '1';
  return $('.ci', el);
}
const splitEls = $('[data-split],[data-split-poster]');
splitEls.forEach(el => splitChars(el));
root.classList.add('split-ready');

/* ── header: tucks away on the way down, returns on the way up */
const header = document.querySelector<HTMLElement>('.site-header');
if (header) {
  let hidden = false;
  lenis.on('scroll', ({scroll, direction}: {scroll: number; direction: number}) => {
    const shouldHide = scroll > 240 && direction === 1;
    const shouldShow = direction === -1 || scroll < 120;
    if (shouldHide && !hidden) {hidden = true; header.classList.add('is-tucked');}
    else if (shouldShow && hidden) {hidden = false; header.classList.remove('is-tucked');}
  });
  header.addEventListener('focusin', () => {hidden = false; header.classList.remove('is-tucked');});
}
const bar = document.querySelector<HTMLElement>('.progress-bar');
if (bar) gsap.to(bar, {scaleX: 1, ease: 'none', scrollTrigger: {start: 0, end: 'max', scrub: .3}});

/* ── narrative beats: storytelling plays on its own clock instead of being dragged by the wheel.
   A stage owns a paused timeline whose beats end at labels b1, b2…; each beat has a scroll position. Passing it on the
   way down plays the timeline to that beat's end; passing back up rewinds it (a little faster). The playhead is always
   tweened toward a single target, so quick flicks only retarget one tween: no jumps, no replays, no flicker. */
function beats(tl: gsap.core.Timeline, trigger: HTMLElement, starts: (string | (() => string))[]) {
  tl.pause(0);
  const active = starts.map(() => false);
  let target = -1, tween: gsap.core.Tween | undefined;
  const go = () => {
    const k = active.filter(Boolean).length;
    if (k === target) return;
    target = k;
    const to = k === 0 ? 0 : tl.labels['b' + k] ?? tl.duration();
    const back = to < tl.time();
    tween?.kill();
    tween = tl.tweenTo(to, {duration: Math.abs(to - tl.time()) / (back ? 1.7 : 1), ease: 'none'});
  };
  starts.forEach((start, i) => ScrollTrigger.create({
    trigger, start, end: 'max',
    onToggle: self => {active[i] = self.isActive; go();},
  }));
}
/* scroll distance into a pinned stage, as a fraction of its pinned travel */
const into = (el: HTMLElement, f: number) => () => `top+=${Math.round(f * Math.max(0, el.offsetHeight - innerHeight))} top`;

/* ── intro: any page-level [data-intro] block rises in, characters unmask */
const introTl = gsap.timeline({defaults: {ease: 'expo.out'}, delay: .15});
$('[data-intro-chars]').forEach((el, n) => {
  const chars = $('.ci', el);
  introTl.fromTo(chars, {yPercent: 115, rotate: 5}, {yPercent: 0, rotate: 0, duration: 1.35, stagger: {each: .045, from: 'start'}}, n * .12);
});
const introItems = $('[data-intro]');
if (introItems.length) introTl.from(introItems, {y: 28, opacity: 0, duration: 1.1, stagger: .09}, .35);

/* ── scroll-scrubbed character reveal for any [data-split-scrub] (poster lines) */
$('[data-split-scrub]').forEach(el => {
  const chars = $('.ci', el);
  gsap.fromTo(chars, {yPercent: 110, rotate: 4}, {
    yPercent: 0, rotate: 0, ease: 'power3.out', stagger: .06,
    scrollTrigger: {trigger: el, start: 'top 88%', end: 'top 40%', scrub: .8},
  });
});
/* plain split headings: written in on arrival, put away again only once they drop back below the fold */
$('[data-split]:not([data-intro-chars]):not([data-split-scrub])').forEach(el => {
  const chars = $('.ci', el);
  gsap.fromTo(chars, {yPercent: 110, rotate: 3}, {
    yPercent: 0, rotate: 0, duration: 1.1, ease: 'expo.out', stagger: .035,
    scrollTrigger: {trigger: el, start: 'top 88%', toggleActions: 'play none none reverse'},
  });
});

/* ── HOME HERO: mouse-tilted layered type + scroll push-in */
const hero = document.querySelector<HTMLElement>('.hero3');
if (hero) {
  const mega = hero.querySelector<HTMLElement>('.mega')!;
  const layers = $('.mega-layer', hero);
  const ry = gsap.quickTo(mega, 'rotationY', {duration: 1.1, ease: 'power3.out'});
  const rx = gsap.quickTo(mega, 'rotationX', {duration: 1.1, ease: 'power3.out'});
  const mx = gsap.quickTo(mega, 'x', {duration: 1.4, ease: 'power3.out'});
  if (fine) addEventListener('pointermove', e => {
    const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
    ry(nx * 16); rx(-ny * 11); mx(nx * -26);
  }, {passive: true});
  gsap.set(mega, {transformPerspective: 1400, transformOrigin: '30% 60%'});
  layers.forEach((l, i) => gsap.set(l, {z: -i * 70}));
  gsap.from(layers, {opacity: 0, z: '-=420', duration: 2.2, stagger: .14, ease: 'expo.out', delay: .1});
  const push = gsap.timeline({scrollTrigger: {trigger: hero, start: 'top top', end: 'bottom top', scrub: .9}});
  push.to(mega, {scale: 1.9, z: 260, yPercent: -6, ease: 'none'}, 0)
    .to(layers, {z: (i: number) => -i * 70 + i * 150, ease: 'none'}, 0)
    .to('.hero3-copy', {yPercent: -30, opacity: 0, ease: 'none'}, 0)
    .to('.mega', {opacity: 0, ease: 'power1.in', duration: .4}, .3);
}

/* ── ORDER stage: once the stage arrives, scattered notifications settle into four lanes and the steps light in turn */
const order = document.querySelector<HTMLElement>('.order-stage');
if (order) {
  const cards = $('.msg', order);
  const steps = $('.order-step', order);
  const lanes = $('.lane', order);
  const tl = gsap.timeline();
  const rnd = gsap.utils.random;
  cards.forEach((c, i) => {
    tl.fromTo(c, {
      x: rnd(-300, 300), y: rnd(-260, 260), rotation: rnd(-26, 26), scale: rnd(.8, 1.15), filter: 'blur(1.5px)',
    }, {x: 0, y: 0, rotation: 0, scale: 1, filter: 'blur(0px)', ease: 'expo.inOut', duration: 1.5}, .06 * i);
  });
  tl.to(lanes, {y: 0, stagger: .08, duration: 1, ease: 'power3.out'}, .7);
  steps.forEach((s, i) => tl.to({}, {
    duration: .38, onStart: () => s.classList.add('is-on'), onReverseComplete: () => s.classList.remove('is-on'),
  }, 1.45 + i * .38));
  tl.addLabel('b1');
  beats(tl, order, ['top 30%']);
}

/* ── STORY: the name is written in its real stroke order, then the scattered words settle into rows */
$('.story-stage').forEach(stage => {
  const glyphs = $<SVGElement>('.hw', stage);
  const tl = gsap.timeline();
  // a steady hand: ~2.8s for both characters, each stroke timed by its length, a breath between characters
  const all = glyphs.map(svg => $<SVGPathElement>('.hw-med', svg).map(p => Number(p.dataset.len || 1)));
  const sum = all.flat().reduce((a, b) => a + b, 0);
  let t = 0;
  glyphs.forEach((svg, gi) => {
    const paths = $<SVGPathElement>('.hw-med', svg);
    tl.fromTo($('.hw-ghost', svg), {opacity: .35}, {opacity: .1, duration: .8, ease: 'power1.out'}, t);
    paths.forEach((p, i) => {
      const d = (all[gi][i] / sum) * 2.3 + .05;
      tl.fromTo(p, {strokeDashoffset: 1}, {strokeDashoffset: 0, ease: 'power1.inOut', duration: d}, t);
      t += d * .9;
    });
    t += .22;
  });
  tl.addLabel('b1');
  const words = $('.drift', stage);
  words.forEach((w, i) => {
    tl.fromTo(w, {x: gsap.utils.random(-420, 420), y: gsap.utils.random(-300, 300), rotation: gsap.utils.random(-40, 40), opacity: 0, scale: gsap.utils.random(.7, 1.5), filter: 'blur(4px)'},
      {x: 0, y: 0, rotation: 0, opacity: 1, scale: 1, filter: 'blur(0px)', ease: 'expo.out', duration: 1.6}, 'b1+=' + i * .045);
  });
  tl.from($('.story-cap', stage), {y: 32, opacity: 0, stagger: .14, duration: 1, ease: 'expo.out'}, 'b1+=.35');
  tl.addLabel('b2');
  beats(tl, stage, ['top 22%', into(stage, .38)]);
});

/* ── POSTER: dark immersive manifesto; lines arrive from depth, then "数据库" is struck out */
$('.poster').forEach(poster => {
  const lines = $('.poster-line', poster);
  const strike = poster.querySelector<HTMLElement>('.strike');
  gsap.set(lines, {transformPerspective: 1100});
  const tl = gsap.timeline();
  lines.forEach((ln, i) => {
    tl.fromTo($('.ci', ln), {yPercent: 118, rotate: 4}, {yPercent: 0, rotate: 0, duration: 1.1, stagger: .045, ease: 'expo.out'}, i * .26);
    tl.fromTo(ln, {z: -520, opacity: 0}, {z: 0, opacity: 1, duration: 1.3, ease: 'expo.out'}, i * .26);
  });
  tl.addLabel('b1', '-=.35');
  const last = lines.length - 1;
  tl.to(lines.slice(0, last), {z: 340, opacity: 0, yPercent: -18, duration: 1, stagger: .08, ease: 'power3.in'}, 'b1');
  tl.to(lines[last], {yPercent: -40, duration: 1.3, ease: 'expo.inOut'}, 'b1+=.2');
  if (strike) tl.fromTo(strike, {scaleX: 0}, {scaleX: 1, duration: .7, ease: 'expo.inOut'}, 'b1+=1.05');
  tl.to($('.strike-target', poster), {opacity: .32, duration: .6}, 'b1+=1.45');
  tl.to($('.poster-tail', poster), {opacity: 1, y: 0, duration: 1, ease: 'expo.out'}, 'b1+=1.5');
  tl.addLabel('b2');
  beats(tl, poster, ['top 35%', into(poster, .42)]);
});

/* ── chapter headings drift in depth */
$('[data-depth]').forEach(el => {
  gsap.fromTo(el, {yPercent: 14 * Number(el.dataset.depth)}, {
    yPercent: -14 * Number(el.dataset.depth), ease: 'none',
    scrollTrigger: {trigger: el, start: 'top bottom', end: 'bottom top', scrub: true},
  });
});

/* ── masked image-like cards: the clip opens on arrival with its own easing, and closes only below the fold */
$('[data-mask]').forEach(el => {
  gsap.fromTo(el, {clipPath: 'inset(14% 8% 14% 8% round 32px)', scale: .94}, {
    clipPath: 'inset(0% 0% 0% 0% round 32px)', scale: 1, ease: 'expo.out', duration: 1.5,
    scrollTrigger: {trigger: el, start: 'top 90%', toggleActions: 'play none none reverse'},
  });
});

/* ── micro-interactions (fine pointers only) */
if (fine) {
  $('[data-magnet]').forEach(el => {
    const inner = el.querySelector<HTMLElement>('.mag-in') ?? el;
    const xTo = gsap.quickTo(el, 'x', {duration: .5, ease: 'power3.out'});
    const yTo = gsap.quickTo(el, 'y', {duration: .5, ease: 'power3.out'});
    const ixTo = gsap.quickTo(inner, 'x', {duration: .6, ease: 'power3.out'});
    const iyTo = gsap.quickTo(inner, 'y', {duration: .6, ease: 'power3.out'});
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      xTo(dx * .32); yTo(dy * .4); if (inner !== el) {ixTo(dx * .14); iyTo(dy * .18);}
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, {x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1,.38)', overwrite: 'auto'});
      if (inner !== el) gsap.to(inner, {x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1,.38)', overwrite: 'auto'});
    });
    el.addEventListener('pointerdown', () => gsap.to(el, {scale: .94, duration: .18, ease: 'power3.out'}));
    addEventListener('pointerup', () => gsap.to(el, {scale: 1, duration: .8, ease: 'elastic.out(1.1,.4)'}));
  });
  $('[data-tilt]').forEach(el => {
    gsap.set(el, {transformPerspective: 900});
    const rx = gsap.quickTo(el, 'rotationX', {duration: .6, ease: 'power3.out'});
    const ry = gsap.quickTo(el, 'rotationY', {duration: .6, ease: 'power3.out'});
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - .5) * 7); rx(-((e.clientY - r.top) / r.height - .5) * 7);
    });
    el.addEventListener('pointerenter', () => gsap.to(el, {y: -6, scale: 1.012, duration: .6, ease: 'elastic.out(1,.5)', overwrite: 'auto'}));
    el.addEventListener('pointerleave', () => {rx(0); ry(0); gsap.to(el, {y: 0, scale: 1, duration: .9, ease: 'elastic.out(1,.45)', overwrite: 'auto'});});
  });
}

/* fonts and pins settle late; recalc once so scrub ranges are exact */
const refresh = () => ScrollTrigger.refresh();
document.fonts?.ready.then(refresh);
addEventListener('load', refresh);
root.dataset.motion = 'ready';
