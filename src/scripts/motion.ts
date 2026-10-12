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
/* plain split headings: reveal once on entering */
$('[data-split]:not([data-intro-chars]):not([data-split-scrub])').forEach(el => {
  const chars = $('.ci', el);
  gsap.fromTo(chars, {yPercent: 110, rotate: 3}, {
    yPercent: 0, rotate: 0, duration: 1.1, ease: 'expo.out', stagger: .035,
    scrollTrigger: {trigger: el, start: 'top 88%', once: true},
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

/* ── ORDER stage: scattered notifications settle into four lanes, steps advance with scroll */
const order = document.querySelector<HTMLElement>('.order-stage');
if (order) {
  const cards = $('.msg', order);
  const steps = $('.order-step', order);
  const lanes = $('.lane', order);
  cards.forEach(c => {
    const r = c.getBoundingClientRect();
    void r;
  });
  const tl = gsap.timeline({scrollTrigger: {trigger: order, start: 'top top', end: 'bottom bottom', scrub: 1}});
  const rnd = gsap.utils.random;
  cards.forEach((c, i) => {
    tl.fromTo(c, {
      x: rnd(-300, 300), y: rnd(-260, 260), rotation: rnd(-26, 26), scale: rnd(.8, 1.15), filter: 'blur(1.5px)',
    }, {x: 0, y: 0, rotation: 0, scale: 1, filter: 'blur(0px)', ease: 'power3.inOut', duration: .6}, .02 * i);
  });
  tl.to(lanes, {y: 0, stagger: .08, duration: .3, ease: 'power2.out'}, .55);
  steps.forEach((s, i) => {
    ScrollTrigger.create({
      trigger: order, start: () => `top+=${(i * 0.19 + .06) * (order.offsetHeight - innerHeight)} top`,
      end: () => `top+=${((i + 1) * 0.19 + .06) * (order.offsetHeight - innerHeight)} top`,
      onToggle: self => s.classList.toggle('is-on', self.isActive), onRefresh: self => s.classList.toggle('is-on', self.isActive),
    });
  });
}

/* ── STORY: real stroke order written by scroll, then scattered words settle into rows */
$('.story-stage').forEach(stage => {
  const glyphs = $<SVGElement>('.hw', stage);
  const tl = gsap.timeline({scrollTrigger: {trigger: stage, start: 'top top', end: 'bottom bottom', scrub: 1.1}});
  glyphs.forEach((svg, gi) => {
    const paths = $<SVGPathElement>('.hw-med', svg);
    const lens = paths.map(p => Number(p.dataset.len || 1));
    const total = lens.reduce((a, b) => a + b, 0);
    let t = gi * .5;
    paths.forEach((p, i) => {
      const d = (lens[i] / total) * (.46 / glyphs.length * glyphs.length) + .014;
      tl.fromTo(p, {strokeDashoffset: 1}, {strokeDashoffset: 0, ease: 'power1.inOut', duration: d}, t);
      t += d * .92;
    });
    tl.fromTo($('.hw-ghost', svg), {opacity: .35}, {opacity: .1, duration: .3}, gi * .5);
  });
  const words = $('.drift', stage);
  words.forEach((w, i) => {
    tl.fromTo(w, {x: gsap.utils.random(-420, 420), y: gsap.utils.random(-300, 300), rotation: gsap.utils.random(-40, 40), opacity: .0, scale: gsap.utils.random(.7, 1.5), filter: 'blur(4px)'},
      {x: 0, y: 0, rotation: 0, opacity: 1, scale: 1, filter: 'blur(0px)', ease: 'power3.inOut', duration: .4}, 1.0 + i * .02);
  });
  tl.from($('.story-cap', stage), {y: 40, opacity: 0, stagger: .12, duration: .3, ease: 'power2.out'}, 1.55);
  tl.to({}, {duration: .25});
});

/* ── POSTER: dark immersive manifesto; lines arrive from depth, "数据库" is struck out */
$('.poster').forEach(poster => {
  const lines = $('.poster-line', poster);
  const strike = poster.querySelector<HTMLElement>('.strike');
  gsap.set(lines, {transformPerspective: 1100});
  const tl = gsap.timeline({scrollTrigger: {trigger: poster, start: 'top top', end: 'bottom bottom', scrub: 1.2}});
  lines.forEach((ln, i) => {
    tl.fromTo($('.ci', ln), {yPercent: 118, rotate: 4}, {yPercent: 0, rotate: 0, duration: .26, stagger: .02, ease: 'power3.out'}, i * .18);
    tl.fromTo(ln, {z: -520, opacity: 0}, {z: 0, opacity: 1, duration: .3, ease: 'power2.out'}, i * .18);
  });
  const last = lines.length - 1;
  tl.to(lines.slice(0, last), {z: 340, opacity: 0, yPercent: -18, duration: .4, stagger: .05, ease: 'power2.in'}, 1.0);
  tl.to(lines[last], {yPercent: -40, duration: .5, ease: 'power2.inOut'}, 1.0);
  if (strike) tl.fromTo(strike, {scaleX: 0}, {scaleX: 1, duration: .22, ease: 'power3.inOut'}, 1.3);
  tl.to($('.strike-target', poster), {opacity: .32, duration: .3}, 1.45);
  tl.to($('.poster-tail', poster), {opacity: 1, y: 0, duration: .3}, 1.5);
  tl.to({}, {duration: .2});
});

/* ── chapter headings drift in depth */
$('[data-depth]').forEach(el => {
  gsap.fromTo(el, {yPercent: 14 * Number(el.dataset.depth)}, {
    yPercent: -14 * Number(el.dataset.depth), ease: 'none',
    scrollTrigger: {trigger: el, start: 'top bottom', end: 'bottom top', scrub: true},
  });
});

/* ── masked image-like cards: clip-path reveal */
$('[data-mask]').forEach(el => {
  gsap.fromTo(el, {clipPath: 'inset(14% 8% 14% 8% round 32px)', scale: .94}, {
    clipPath: 'inset(0% 0% 0% 0% round 32px)', scale: 1, ease: 'power2.out',
    scrollTrigger: {trigger: el, start: 'top 92%', end: 'top 45%', scrub: .8},
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
