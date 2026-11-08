// Maps the native scroll position onto a continuous journey value `p`:
// p === i exactly when station i's anchor sits at the centre of the viewport,
// and fractional values in between. Scrolling is never intercepted — the
// universe follows the page, not the other way round.
//
// A station's anchor is its centre on wide screens. On tall screens, where a
// panel takes the full width, it is the moment the panel's top edge reaches
// PANEL_ARRIVAL of the viewport, leaving the space above for the scene.

const PANEL_ARRIVAL = 0.45;
const HEADER_CLEARANCE = 72;

export function createJourney(elements) {
  const stations = [...elements].map((el, index) => ({
    el,
    index,
    id: el.dataset.station,
    section: el.dataset.section,
    side: el.dataset.side || 'center',
  }));
  const listeners = new Set();
  let centres = [];
  let progress = 0;

  /**
   * Where the scene's subject should sit while this station is centred: the
   * middle of the free space beside its panel (or above it on tall screens),
   * in normalised device coordinates, plus how much room it has there
   * (`room`, as a fraction of the viewport's half-height).
   */
  function focusFor(box, vw, vh, portrait) {
    if (portrait) {
      const top = Math.max(HEADER_CLEARANCE + 48, PANEL_ARRIVAL * vh);
      const centre = (HEADER_CLEARANCE + top) / 2;
      return { x: 0, y: 1 - (centre / vh) * 2, room: ((top - HEADER_CLEARANCE) / vh) * 0.82 };
    }

    const rail = document.getElementById('trajectory');
    const railLeft =
      rail && getComputedStyle(rail).visibility !== 'hidden' ? rail.getBoundingClientRect().left : vw;
    const leftSpace = box.left;
    const rightSpace = railLeft - box.right;
    const onRight = rightSpace >= leftSpace;
    const free = onRight ? rightSpace : leftSpace;
    const centre = onRight ? box.right + free / 2 : free / 2;
    return { x: (centre / vw) * 2 - 1, y: 0, room: (free / vw) * (vw / vh) * 0.82 };
  }

  function measure() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const portrait = vw / vh < 0.9;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
    centres = stations.map((station) => {
      const rect = station.el.getBoundingClientRect();
      const panel = station.el.querySelector('.panel');
      const box = panel?.getBoundingClientRect();
      station.focus = box ? focusFor(box, vw, vh, portrait) : null;
      const anchor =
        box && portrait
          ? box.top + window.scrollY + (0.5 - PANEL_ARRIVAL) * vh
          : rect.top + window.scrollY + rect.height / 2;
      // the first station is reached at the top of the page, the last at the bottom
      return Math.min(Math.max(anchor, vh / 2), maxScroll + vh / 2);
    });
    for (let i = 1; i < centres.length; i++) {
      if (centres[i] <= centres[i - 1]) centres[i] = centres[i - 1] + 1;
    }
    update();
  }

  function progressAt(scrollY) {
    const focus = scrollY + window.innerHeight / 2;
    if (focus <= centres[0]) return 0;
    for (let i = 0; i < centres.length - 1; i++) {
      if (focus < centres[i + 1]) {
        return i + (focus - centres[i]) / (centres[i + 1] - centres[i]);
      }
    }
    return centres.length - 1;
  }

  function update() {
    progress = progressAt(window.scrollY);
    for (const listener of listeners) listener(progress);
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', measure);
  new ResizeObserver(measure).observe(document.body);
  document.fonts?.ready.then(measure);
  measure();

  return {
    stations,
    get progress() {
      return progress;
    },
    stationAt(p) {
      return stations[Math.min(stations.length - 1, Math.max(0, Math.round(p)))];
    },
    /** The scroll position at which the camera rests at station `index`. */
    scrollYFor(index) {
      return Math.max(0, centres[index] - window.innerHeight / 2);
    },
    onChange(listener) {
      listeners.add(listener);
      listener(progress);
      return () => listeners.delete(listener);
    },
    measure,
  };
}
