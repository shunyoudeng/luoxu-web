/** Page setup runs once per page: on first load and after every client-side navigation (Astro ClientRouter).
    Canvas, sound and their state persist across pages; reveals and the menu belong to the page and are rebuilt. */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// Keep in sync with the hidden-state selector list in src/styles/reveal.css.
const REVEAL_SELECTOR =
  '[data-reveal]:not([data-reveal=line]), [data-layer], .section-head, .feature-row, .feature-list + .text-link, ' +
  '.testing-grid > *, .download-grid > *, .download-faq, .feedback > *, .release-entry, .article > *';
let targets: HTMLElement[] = [], lines: HTMLElement[] = [];
let observer: IntersectionObserver | undefined;
const pending = new Set<HTMLElement>();
let pageAbort: AbortController | null = null, pageBody: HTMLElement | null = null;
// Tells the head script that motion is under control, so it keeps html.js.
document.documentElement.dataset.motion = 'ready';

function show(target: HTMLElement) {
  target.dataset.revealed = 'true';
  // Drop the stagger once arrived so later interaction never inherits a delay.
  target.addEventListener('transitionend', () => target.style.removeProperty('--reveal-delay'), {once:true});
}

function finishReveals() {
  observer?.disconnect();
  pending.clear();
  [...targets, ...lines].forEach(target => {
    target.classList.remove('is-revealing');
    target.dataset.revealed = 'true';
    target.style.removeProperty('--reveal-delay');
  });
}

function setupPage() {
  if (pageBody === document.body) return;
  pageBody = document.body;
  pageAbort?.abort();
  pageAbort = new AbortController();
  const signal = pageAbort.signal;
  observer?.disconnect(); pending.clear();
  targets = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
  lines = Array.from(document.querySelectorAll<HTMLElement>('.flow-path'));
  if (!reducedMotion.matches && typeof window.IntersectionObserver === 'function') {
    observer = new IntersectionObserver(entries => {
      const arriving = entries.filter(entry => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
      const perLayer = new Map<string, number>();
      arriving.forEach((entry, index) => {
        const target = entry.target as HTMLElement;
        observer?.unobserve(target);
        pending.delete(target);
        // Layered blocks arrive by importance (label, headline, lead, visual); the rest rise in reading
        // order. Both are short staggers, capped, so the whole group lands within about half a second.
        const layer = target.dataset.layer;
        if (layer !== undefined) {
          const seen = perLayer.get(layer) ?? 0;
          perLayer.set(layer, seen + 1);
          target.style.setProperty('--reveal-delay', `${Math.min(Number(layer), 6) * 110 + Math.min(seen, 3) * 70}ms`);
        } else target.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 90}ms`);
        show(target);
        if (target.dataset.reveal === 'line' && !target.matches(':focus-within')) {
          target.classList.add('is-revealing');
          target.addEventListener('animationend', () => target.classList.remove('is-revealing'), {once:true});
        }
      });
      if (pending.size === 0) observer?.disconnect();
    }, {threshold:0.08, rootMargin:'0px 0px -6% 0px'});

    lines.forEach(line => {line.dataset.reveal = 'line';pending.add(line);observer?.observe(line);});
    targets.forEach(target => {pending.add(target);observer?.observe(target);});
  } else finishReveals();

  const menu = document.querySelector<HTMLDetailsElement>('.mobile-menu');
  const summary = menu?.querySelector<HTMLElement>('summary');
  if (menu && summary) {
    const close = (restoreFocus = false) => {
      if (!menu.open) return;
      menu.open = false;
      if (restoreFocus) summary.focus();
    };
    summary.setAttribute('aria-expanded', String(menu.open));
    menu.addEventListener('toggle', () => summary.setAttribute('aria-expanded', String(menu.open)));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) {event.preventDefault();close(menu.contains(document.activeElement));}
    }, {signal});
    document.addEventListener('pointerdown', event => {
      if (event.target instanceof Node && !menu.contains(event.target)) close();
    }, {signal});
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => close()));
    window.matchMedia('(min-width:701px)').addEventListener('change', event => {if (event.matches) close();}, {signal});
  }
}
setupPage();
document.addEventListener('astro:page-load', setupPage);
reducedMotion.addEventListener('change', () => {if (reducedMotion.matches) finishReveals();});

/* The router replaces <html> attributes with the new page's; carry the live state (js, webgl, lenis, theme, motion,
   --scene-bg) over so nothing flashes or re-initialises. The entry veil never comes back. */
document.addEventListener('astro:before-swap', e => {
  const next = (e as Event & {newDocument: Document}).newDocument.documentElement;
  for (const {name, value} of Array.from(document.documentElement.attributes)) {
    if (!name.startsWith('data-astro')) next.setAttribute(name, value);
  }
  next.classList.remove('gate', 'gate-out');
});
/* ── V3 spatial layer: loaded after the document is usable; every part degrades to the static page. */
const sceneCanvas = document.querySelector<HTMLCanvasElement>('#scene');
const coarse = window.matchMedia('(pointer:coarse)').matches || window.matchMedia('(max-width:900px)').matches;
if (!reducedMotion.matches) {
  import('./motion').catch(() => {document.documentElement.classList.remove('js');finishReveals();});
}
import('./sound').catch(() => undefined);

/* ── entry veil: shows real loading progress (scene build + shader compile), never longer than ~3.5s, then offers
   "enter with sound" / "quiet". Choosing is the user gesture the browser needs before audio may start. */
const root = document.documentElement;
const veil = document.querySelector<HTMLElement>('.gate-veil');
let reportDone = () => {};
if (root.classList.contains('gate') && veil) {
  const pct = veil.querySelector<HTMLElement>('.gate-pct span'), bar = veil.querySelector<HTMLElement>('.gate-bar');
  const t0 = performance.now();
  let real = 0, shown = 0, ready = false;
  addEventListener('luoxu:progress', e => {real = Math.max(real, (e as CustomEvent<number>).detail);});
  reportDone = () => {real = 1;};
  const step = () => {
    const t = performance.now() - t0;
    const target = t > 3500 ? 1 : Math.max(real, Math.min(.85, t / 3000));
    shown += (target - shown) * .14;
    if (target === 1 && shown > .995) shown = 1;
    bar?.style.setProperty('--p', shown.toFixed(3));
    if (pct) pct.textContent = String(Math.round(shown * 100));
    if (shown < 1) {requestAnimationFrame(step); return;}
    ready = true; veil.classList.add('is-ready');
    veil.querySelector<HTMLButtonElement>('.gate-enter')?.focus({preventScroll: true});
  };
  requestAnimationFrame(step);
  const enter = (sound: boolean) => {
    if (!ready || root.classList.contains('gate-out')) return;
    try {sessionStorage.setItem('luoxu:entered', '1');} catch {/* ignore */}
    dispatchEvent(new CustomEvent('luoxu:sound', {detail: sound}));
    root.classList.add('gate-out');
    dispatchEvent(new Event('luoxu:enter'));
    setTimeout(() => root.classList.remove('gate', 'gate-out'), 1150);
  };
  veil.addEventListener('click', e => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button[data-sound]');
    if (b) enter(b.dataset.sound === '1');
  });
  document.addEventListener('keydown', e => {if (e.key === 'Escape') enter(false);});
} else if (veil) veil.remove();

if (sceneCanvas) {
  const boot = () => import('./scene').then(m => m.startScene(sceneCanvas, {reduced: reducedMotion.matches, mobile: coarse}))
    .then(h => {if (!h) reportDone();}, () => reportDone());
  // behind the veil the scene is the thing being loaded: start at once; otherwise wait for an idle moment
  const later = () => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(boot, {timeout: 1200}) : setTimeout(boot, 300));
  if (root.classList.contains('gate')) boot();
  else if (document.readyState === 'complete') later(); else window.addEventListener('load', later, {once: true});
} else reportDone();