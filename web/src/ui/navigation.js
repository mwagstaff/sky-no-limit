// Header state, the trajectory rail (section navigation + journey progress)
// and its small-screen menu sheet.

export function initNavigation({ journey }) {
  const root = document.documentElement;
  const rail = document.getElementById('trajectory');
  const toggle = document.querySelector('.menu-toggle');
  const links = [...rail.querySelectorAll('a[data-section]')];
  const lastIndex = Math.max(1, journey.stations.length - 1);
  let current = null;

  journey.onChange((p) => {
    root.classList.toggle('is-scrolled', window.scrollY > 12);
    rail.style.setProperty('--progress', (p / lastIndex).toFixed(4));

    const section = journey.stationAt(p).section;
    if (section === current) return;
    current = section;
    for (const link of links) {
      if (link.dataset.section === section) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  });

  const narrow = window.matchMedia('(max-width: 860px)');

  const setMenu = (open, { restoreFocus = false } = {}) => {
    root.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.menu-toggle-label').textContent = open ? 'Close' : 'Menu';
    if (open) links[0]?.focus();
    else if (restoreFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  for (const link of links) link.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.classList.contains('menu-open')) {
      setMenu(false, { restoreFocus: true });
    }
  });
  narrow.addEventListener('change', () => setMenu(false));
}
