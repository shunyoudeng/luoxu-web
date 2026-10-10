/** Native document navigation: one setup per document, no polling or scroll listener. */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const targets = Array.from(document.querySelectorAll<HTMLElement>(
  '.section-head, .privacy-story h2, .open-source > div:first-child, ' +
  '.download-home > div:first-child, .release-heading, .feedback > div:first-child, .flow-path'
));
let observer: IntersectionObserver | undefined;
const pending = new Set<HTMLElement>();

function finishReveals() {
  observer?.disconnect();
  pending.clear();
  targets.forEach(target => {
    target.classList.remove('is-revealing');
    target.dataset.revealed = 'true';
  });
}

if (!reducedMotion.matches && typeof window.IntersectionObserver === 'function') {
  observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const target = entry.target as HTMLElement;
      observer?.unobserve(target);
      pending.delete(target);
      target.dataset.revealed = 'true';
      if (target.dataset.reveal === 'line' && !reducedMotion.matches && !target.matches(':focus-within')) {
        target.classList.add('is-revealing');
        target.addEventListener('animationend', () => target.classList.remove('is-revealing'), {once:true});
      }
    });
    if (pending.size === 0) observer?.disconnect();
  }, {threshold:0.12});

  targets.forEach(target => {
    target.dataset.reveal = target.matches('.flow-path') ? 'line' :
      target.matches('.section-head, .privacy-story h2') ? 'heading' : 'fade';
    const bounds = target.getBoundingClientRect();
    // Already visible content, including deep-linked sections, never waits for an entrance.
    if (bounds.top < window.innerHeight && bounds.bottom > 0) target.dataset.revealed = 'true';
    else {pending.add(target);observer?.observe(target);}
  });
}
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
