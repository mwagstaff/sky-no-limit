// Keeps the address bar in step with the journey, so wherever the visitor is
// can be shared or bookmarked (/#bromley-bins), and lands deep links and
// in-page links precisely where the camera rests at that station, rather than
// wherever the browser's own anchor scroll would leave them.
//
// Scrolling replaces the current history entry (no back-button clutter); an
// in-page link adds one, as links do. The opening is the bare address.

export function initAddress({ journey, reducedMotion }) {
  // a station's address is its own id, or its section's (the Work overview sits inside #work)
  const ids = journey.stations.map((station) => station.el.id || station.el.closest('[id]')?.id || '');
  // a renamed station keeps its old addresses (data-aliases), so shared links still land
  const aliases = new Map();
  journey.stations.forEach((station, index) => {
    for (const alias of station.el.dataset.aliases?.split(/\s+/) ?? []) if (alias) aliases.set(alias, index);
  });
  const indexOf = (hash) => {
    const id = hash.replace(/^#/, '');
    if (!id) return -1;
    try {
      const name = decodeURIComponent(id);
      const index = ids.indexOf(name);
      return index >= 0 ? index : (aliases.get(name) ?? -1);
    } catch {
      return -1;
    }
  };
  const addressFor = (index) =>
    window.location.pathname + window.location.search + (index > 0 ? `#${ids[index]}` : '');

  // a deep link's station: the address keeps saying so until we've landed there
  const arrival = indexOf(window.location.hash);
  if (arrival > 0 && window.location.hash !== `#${ids[arrival]}`) {
    // arrived by an old name: show the current one
    try {
      history.replaceState(history.state, '', addressFor(arrival));
    } catch {
      // the old name still works; it just stays in the address bar
    }
  }
  let shown = Math.max(0, arrival);
  let travellingTo = arrival > 0 ? arrival : null; // a station we're heading for; the address waits

  const write = (index, push = false) => {
    shown = index;
    const address = addressFor(index);
    if (address === window.location.pathname + window.location.search + window.location.hash) return;
    try {
      history[push ? 'pushState' : 'replaceState'](push ? null : history.state, '', address);
    } catch {
      // browsers rate-limit history updates; the address simply lags a little
    }
  };

  journey.onChange((progress) => {
    const index = Math.round(progress);
    if (travellingTo !== null) {
      if (index !== travellingTo || Math.abs(progress - travellingTo) > 0.02) return;
      travellingTo = null;
    }
    if (index !== shown) write(index);
  });

  // the visitor taking over cancels any journey we started
  for (const type of ['wheel', 'touchstart', 'keydown']) {
    window.addEventListener(type, () => (travellingTo = null), { passive: true });
  }

  // a scroll that never quite arrives (or a scrollbar drag, which sends no
  // input events) mustn't hold the address hostage
  let patience = 0;
  function travel(index, smooth) {
    travellingTo = index;
    clearTimeout(patience);
    patience = setTimeout(() => (travellingTo = null), 2500);
    window.scrollTo({ top: journey.scrollYFor(index), behavior: smooth ? 'smooth' : 'instant' });
  }

  // In-page links to a station: go to where its camera rests, and move focus
  // there so keyboard and screen-reader users arrive with it.
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const index = indexOf(link.hash);
    if (index < 0) return;
    event.preventDefault();
    write(index, true);
    travel(index, !reducedMotion.matches);
    const target = journey.stations[index].el;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  // The fragment changed without a link of ours (typed into the address bar,
  // or an old name): go there, under its current name.
  window.addEventListener('hashchange', () => {
    const index = indexOf(window.location.hash);
    if (index < 0) return;
    write(index);
    travel(index, !reducedMotion.matches);
  });

  // A deep link: land on the station once the layout has settled (fonts and
  // images change heights), unless the visitor has already started moving.
  if (arrival > 0) {
    let moved = false;
    const settle = () => {
      if (moved) return;
      journey.measure();
      travel(arrival, false);
    };
    for (const type of ['wheel', 'touchstart', 'keydown']) {
      window.addEventListener(type, () => (moved = true), { once: true, passive: true });
    }
    // the browser keeps re-applying its own jump to the fragment until the page
    // has loaded, so have the last word just after that
    const afterLoad = () => setTimeout(settle, 60);
    settle();
    document.fonts?.ready.then(settle);
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
  }
}
