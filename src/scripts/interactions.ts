/** Native document navigation: one setup per document, no polling or scroll listener. */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// Keep in sync with the hidden-state selector list in src/styles/motion.css.
const REVEAL_SELECTOR =
  '[data-reveal]:not([data-reveal=line]), .section-head, .flow > *, .feature-row, .feature-list + .text-link, ' +
  '.privacy-story .wrap > *, .privacy-copy > *, .architecture > *, .architecture-note, .open-source > *, ' +
  '.download-home > *, .download-grid > *, .testing-grid > *, .download-faq, .feedback > *, ' +
  '.release-entry, .article > *';
const targets = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
const lines = Array.from(document.querySelectorAll<HTMLElement>('.flow-path'));
let observer: IntersectionObserver | undefined;
const pending = new Set<HTMLElement>();
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

if (!reducedMotion.matches && typeof window.IntersectionObserver === 'function') {
  observer = new IntersectionObserver(entries => {
    const arriving = entries.filter(entry => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
    arriving.forEach((entry, index) => {
      const target = entry.target as HTMLElement;
      observer?.unobserve(target);
      pending.delete(target);
      // Blocks that arrive together rise one after another (capped), like a single gesture.
      target.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 90}ms`);
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
reducedMotion.addEventListener('change', () => {if (reducedMotion.matches) finishReveals();});

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
  });
  document.addEventListener('pointerdown', event => {
    if (event.target instanceof Node && !menu.contains(event.target)) close();
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => close()));
  window.matchMedia('(min-width:701px)').addEventListener('change', event => {if (event.matches) close();});
}
