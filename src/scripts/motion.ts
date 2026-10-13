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

/* ── smooth scroll with weight: light enough that the page always follows the wheel closely (touch stays native) */
const lenis = new Lenis({lerp: .12, wheelMultiplier: 1, smoothWheel: true, anchors: {offset: -24}});
root.classList.add('lenis-on');
if (root.classList.contains('gate')) {lenis.stop(); addEventListener('luoxu:enter', () => lenis.start(), {once: true});}
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
ScrollTrigger.config({ignoreMobileResize: true});

/* ── split text into masked characters (CJK-friendly), keeping the accessible text on the parent.
   Per-character boxes would let a line break anywhere (mid-word, or before a comma), so characters are grouped into
   unbreakable words first: a short clause (up to 7 characters, punctuation included) stays whole so headings break at
   the comma; longer clauses use Intl.Segmenter words. Closing punctuation stays with the word before, opening with the next. */
const CLOSE = /^[，。、；：？！,.;:?!）)」』”’》…—]+$/, OPEN = /[“‘（(「『《]$/;
const segmenter = 'Segmenter' in Intl ? new Intl.Segmenter('zh', {granularity: 'word'}) : null;
const SHORT_CLAUSE = 7;
function words(text: string) {
  const out: string[] = [];
  const parts = (text.match(/[^，。、；：？！]*[，。、；：？！]*/g) ?? [text]).filter(Boolean).flatMap(clause =>
    clause.trim().length <= SHORT_CLAUSE && !/\s/.test(clause.trim()) ? [clause]
      : segmenter ? Array.from(segmenter.segment(clause), s => s.segment) : Array.from(clause));
  for (const p of parts) {
    const prev = out[out.length - 1];
    if (prev !== undefined && !/\s$/.test(prev) && !/^\s/.test(p) && (CLOSE.test(p) || OPEN.test(prev))) out[out.length - 1] = prev + p;
    else out.push(p);
  }
  return out;
}
function splitChars(el: HTMLElement) {
  if (el.dataset.splitDone) return $('.ci', el);
  const label = el.textContent?.trim() ?? '';
  const sr = document.createElement('span'); sr.className = 'sr-text'; sr.textContent = label;
  const walk = (node: Node) => {
    Array.from(node.childNodes).forEach(child => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const word of words(child.textContent ?? '')) {
          if (/^\s+$/.test(word)) {frag.append(word); continue;}
          const wd = document.createElement('span'); wd.className = 'wd';
          for (const ch of Array.from(word)) {
            if (/\s/.test(ch)) {wd.append(ch); continue;}
            const w = document.createElement('span'); w.className = 'ch'; w.setAttribute('aria-hidden', 'true');
            const i = document.createElement('span'); i.className = 'ci'; i.textContent = ch; w.append(i); wd.append(w);
          }
          frag.append(wd);
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
/* Everything below belongs to one page. With client-side navigation the document survives, so each page builds its
   motion inside a gsap.context (reverted on swap) and registers window listeners with an AbortSignal. */
let pageCtx: gsap.Context | null = null, pageAbort: AbortController | null = null, pageBody: HTMLElement | null = null;
function setupPage() {
  if (pageBody === document.body) return;
  pageBody = document.body;
  pageAbort = new AbortController();
  const signal = pageAbort.signal;
  pageCtx = gsap.context(() => {
const splitEls = $('[data-split],[data-split-poster]');
splitEls.forEach(el => splitChars(el));
root.classList.add('split-ready');

/* ── header: tucks away on the way down, returns on the way up */
const header = document.querySelector<HTMLElement>('.site-header');
if (header) {
  let hidden = false;
  const off = lenis.on('scroll', ({scroll, direction}: {scroll: number; direction: number}) => {
    const shouldHide = scroll > 240 && direction === 1;
    const shouldShow = direction === -1 || scroll < 120;
    if (shouldHide && !hidden) {hidden = true; header.classList.add('is-tucked');}
    else if (shouldShow && hidden) {hidden = false; header.classList.remove('is-tucked');}
  });
  signal.addEventListener('abort', off);
  header.addEventListener('focusin', () => {hidden = false; header.classList.remove('is-tucked');});
}
const bar = document.querySelector<HTMLElement>('.progress-bar');
if (bar) gsap.to(bar, {scaleX: 1, ease: 'none', scrollTrigger: {start: 0, end: 'max', scrub: .3}});

/* ── narrative stages: the wheel always scrolls the page; storytelling runs on its own clock.
   No pins, no sticky dwell. A stage owns one paused timeline; crossing its threshold on the way down plays it through
   to the end by itself, crossing back up reverses it (faster) from wherever it is. play()/reverse() only flip the
   direction of a single playhead, so quick flicks never restart, replay or jump. */
/* Run a timeline to its end and back once, silently, while the page loads: every tween reads its start values now, so
   none of them forces a style recalculation the first time it plays in the middle of a fast scroll. */
const warm = (tl: gsap.core.Timeline) => tl.progress(1, true).progress(0, true);
/* Animated blur re-filters an element every frame; on phones the cards and words arrive without it. */
const blur = (px: number) => (mobile ? 'none' : `blur(${px}px)`);
function autoplay(tl: gsap.core.Timeline, trigger: HTMLElement, start: string, rate = 1) {
  warm(tl);
  tl.pause(0);
  // Expose the real lifecycle for settled-state checks; GSAP tweens are not
  // browser Web Animations and need not publish a global engine instance.
  trigger.dataset.playback = 'ready';
  tl.eventCallback('onComplete', () => {trigger.dataset.playback = 'complete';});
  tl.eventCallback('onReverseComplete', () => {trigger.dataset.playback = 'ready';});
  ScrollTrigger.create({
    trigger, start, end: 'max',
    onToggle: self => {
      if (self.isActive) {
        trigger.dataset.playback = tl.time() >= tl.duration() ? 'complete' : 'playing';
        tl.timeScale(rate).play();
      } else {
        trigger.dataset.playback = tl.time() <= 0 ? 'ready' : 'rewinding';
        tl.timeScale(rate * 1.8).reverse();
      }
    },
  });
}
/* light parallax for stages: the frame glides down through the stage's bottom padding, so the stage keeps moving with
   the scroll (about three quarters speed) and stays in view a little longer while its timeline plays */
$('[data-glide]').forEach(stage => {
  const frame = stage.firstElementChild as HTMLElement | null;
  if (!frame) return;
  gsap.fromTo(frame, {y: 0}, {
    y: () => parseFloat(getComputedStyle(stage).paddingBottom) || 0, ease: 'none',
    scrollTrigger: {trigger: stage, start: 'clamp(top bottom)', end: 'bottom top', scrub: true, invalidateOnRefresh: true},
  });
});

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
  }, {passive: true, signal});
  gsap.set(mega, {transformPerspective: 1400, transformOrigin: '30% 60%'});
  layers.forEach((l, i) => gsap.set(l, {z: -i * 70}));
  gsap.from(layers, {opacity: 0, z: '-=420', duration: 2.2, stagger: .14, ease: 'expo.out', delay: .1});
  const push = gsap.timeline({scrollTrigger: {trigger: hero, start: 'top top', end: 'bottom top', scrub: .9}});
  push.to(mega, {scale: 1.9, z: 260, yPercent: -6, ease: 'none'}, 0)
    .to(layers, {z: (i: number) => -i * 70 + i * 150, ease: 'none'}, 0)
    .to('.hero3-copy', {yPercent: -30, opacity: 0, ease: 'none'}, 0)
    .to('.mega', {opacity: 0, ease: 'power1.in', duration: .4}, .3);
  warm(push); // the first flick out of the hero would otherwise read every layer's style mid-scroll
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
      x: rnd(-300, 300), y: rnd(-260, 260), rotation: rnd(-26, 26), scale: rnd(.8, 1.15), ...(mobile ? {} : {filter: blur(1.5)}),
    }, {x: 0, y: 0, rotation: 0, scale: 1, ...(mobile ? {} : {filter: blur(0)}), force3D: true, ease: 'expo.inOut', duration: 1.5}, .06 * i);
  });
  tl.to(lanes, {y: 0, stagger: .08, duration: 1, ease: 'power3.out'}, .7);
  steps.forEach((s, i) => tl.to({}, {
    duration: .38, onStart: () => s.classList.add('is-on'), onReverseComplete: () => s.classList.remove('is-on'),
  }, 1.45 + i * .38));
  autoplay(tl, order, 'top 18%');
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
    let inkEnd = t;
    tl.fromTo($('.hw-ghost', svg), {opacity: .35}, {opacity: .1, duration: .8, ease: 'power1.out'}, t);
    paths.forEach((p, i) => {
      const d = (all[gi][i] / sum) * 2.3 + .05;
      tl.fromTo(p, {strokeDashoffset: 1}, {strokeDashoffset: 0, ease: 'power1.inOut', duration: d}, t);
      inkEnd = Math.max(inkEnd, t + d);
      t += d * .9;
    });
    // Crossfade to the identical, unmasked outline after this character's last
    // stroke. Both tweens reverse naturally, so replay never flashes a full glyph.
    tl.fromTo($('.hw-complete', svg), {opacity: 0}, {opacity: 1, duration: .12, ease: 'power1.out'}, inkEnd);
    tl.to($('.hw-fill', svg), {opacity: 0, duration: .12, ease: 'power1.out'}, inkEnd);
    t += .22;
  });
  tl.addLabel('b1');
  const words = $('.drift', stage);
  words.forEach((w, i) => {
    tl.fromTo(w, {x: gsap.utils.random(-420, 420), y: gsap.utils.random(-300, 300), rotation: gsap.utils.random(-40, 40), opacity: 0, scale: gsap.utils.random(.7, 1.5), ...(mobile ? {} : {filter: blur(4)})},
      {x: 0, y: 0, rotation: 0, opacity: 1, scale: 1, ...(mobile ? {} : {filter: blur(0)}), ease: 'expo.out', duration: 1.6}, 'b1+=' + i * .045);
  });
  tl.from($('.story-cap', stage), {y: 32, opacity: 0, stagger: .14, duration: 1, ease: 'expo.out'}, 'b1+=.35');
  autoplay(tl, stage, 'top 15%', 2);
});

/* ── POSTER: dark immersive manifesto; lines arrive from depth, hold a breath, then "数据库" is struck out.
   The whole act plays by itself once the poster is in view, at an unhurried pace. */
$('.poster').forEach(poster => {
  const lines = $('.poster-line', poster);
  const strike = poster.querySelector<HTMLElement>('.strike');
  gsap.set(lines, {transformPerspective: 1100});
  const tl = gsap.timeline();
  const lead = .3; // a short beat after arrival before the first line rises
  lines.forEach((ln, i) => {
    tl.fromTo($('.ci', ln), {yPercent: 118, rotate: 4}, {yPercent: 0, rotate: 0, duration: 1.2, stagger: .05, ease: 'expo.out'}, lead + i * .3);
    tl.fromTo(ln, {z: -520, opacity: 0}, {z: 0, opacity: 1, duration: 1.4, ease: 'expo.out'}, lead + i * .3);
  });
  tl.addLabel('b1', '+=.55'); // let the full sentence read before it resolves
  const last = lines.length - 1;
  // Only the resolution/strike sequence is accelerated. The sentence reveal and
  // reading pause above retain their original timing, including reverse playback.
  const resolution = gsap.timeline().timeScale(2);
  resolution.to(lines.slice(0, last), {z: 340, opacity: 0, yPercent: -18, duration: 1, stagger: .08, ease: 'power3.in'}, 0);
  resolution.to(lines[last], {yPercent: -40, duration: 1.3, ease: 'expo.inOut'}, .2);
  if (strike) resolution.fromTo(strike, {scaleX: 0}, {scaleX: 1, duration: .7, ease: 'expo.inOut'}, 1.05);
  // dim to a solid tone, not opacity: a translucent word lets the field's bright ring show through its strokes
  resolution.to($('.strike-target', poster), {color: '#8FA398', duration: .6}, 1.45);
  resolution.to($('.poster-tail', poster), {opacity: 1, y: 0, duration: 1, ease: 'expo.out'}, 1.5);
  tl.add(resolution, 'b1');
  autoplay(tl, poster, 'top 22%');
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
    addEventListener('pointerup', () => gsap.to(el, {scale: 1, duration: .8, ease: 'elastic.out(1.1,.4)'}), {signal});
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

  });
}
setupPage();
let swapped = false;
document.addEventListener('astro:before-swap', () => {swapped = true; pageCtx?.revert(); pageAbort?.abort(); pageCtx = null; lenis.stop();});
document.addEventListener('astro:page-load', () => {
  if (!swapped) return; // the first page-load is the initial document, already set up
  swapped = false;
  // the router has already placed the new page at its scroll target; Lenis takes over from there
  lenis.resize(); lenis.scrollTo(scrollY, {immediate: true, force: true}); lenis.start();
  setupPage();
  // ScrollTrigger.refresh() briefly scrolls to 0 and restores its cached position, so only call it here, after a swap,
  // when the router has already set the scroll; on first load the load/fonts refresh below covers it.
  ScrollTrigger.refresh();
});

/* fonts and pins settle late; recalc once so scrub ranges are exact */
/* ScrollTrigger.refresh() scrolls to 0 to measure and then restores its own cached scroll position. A scroll it has not
   seen yet (a restored position, a jump made while this module was still loading) would be lost, so put back the real
   position afterwards. */
function refresh() {
  const y = scrollY;
  ScrollTrigger.refresh();
  if (Math.abs(scrollY - y) > 1) {scrollTo(0, y); lenis.scrollTo(y, {immediate: true, force: true}); ScrollTrigger.update();}
}
document.fonts?.ready.then(refresh);
addEventListener('load', refresh);
// the scene opened the phone's scene gaps; re-measure in the next quiet moment, not in the frame the field appears
addEventListener('luoxu:layout', () => ('requestIdleCallback' in window ? requestIdleCallback(refresh, {timeout: 600}) : setTimeout(refresh, 200)));
root.dataset.motion = 'ready';
