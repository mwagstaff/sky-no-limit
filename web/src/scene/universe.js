// Boots the WebGL universe behind the page: renderer, environments, camera
// rig, the render loop and its budgets. Loaded lazily, after the content.

import { AgXToneMapping, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import gsap from 'gsap';
import { FAR } from './layout.js';
import { detectTier } from './quality.js';
import { createRig } from './rig.js';
import { createStationPoses } from './stations.js';
import { createGlobeControl } from './globe-control.js';
import { createGlass } from './glass.js';
import { createStarfield } from './env/starfield.js';
import { createEarth } from './env/earth.js';
import { createSystem } from './env/system.js';
import { createNebula } from './env/nebula.js';
import { createSingularity } from './env/singularity.js';
import { createGalaxy } from './env/galaxy.js';
import { createSkyEvents } from './env/sky-events.js';
import { createDust } from './env/dust.js';

const SLOW_FRAME = 1 / 45;

export function createUniverse({ canvas, journey, reducedMotion, onReady, onLost }) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: window.devicePixelRatio < 2,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.setClearColor(0x03040b, 1);
  renderer.toneMapping = AgXToneMapping;
  renderer.toneMappingExposure = 1;

  const tier = detectTier(renderer.getContext());
  let pixelRatio = Math.min(window.devicePixelRatio || 1, tier.dpr);

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.5, FAR);

  const starfield = createStarfield({ tier });
  // shooting stars and comets only cross empty sky, never the copy
  const skyEvents = createSkyEvents({
    isClear(x, y) {
      const element = document.elementFromPoint(((x + 1) / 2) * window.innerWidth, ((1 - y) / 2) * window.innerHeight);
      return !element?.closest('.panel, .opening-copy, .contact-copy, .site-header, .trajectory, .site-footer, .cookie-notice, .view-reset');
    },
  });
  const earth = createEarth({ tier, renderer });
  const system = createSystem({ tier, renderer });
  const nebula = createNebula({ renderer });
  const singularity = createSingularity({ tier });
  const galaxy = createGalaxy({ tier });
  const dust = createDust({ tier });
  const environments = [starfield, skyEvents, earth, system, nebula, singularity, galaxy, dust];
  for (const env of environments) scene.add(env.object);

  /* ---------- Earth in the visitor's hand ---------- */

  const globeControl = createGlobeControl({
    camera,
    journeyValue: () => rig.value ?? journey.progress,
    reducedMotion,
    // with reduced motion there's no loop, so draw each step of the drag
    onChange: () => running || lost || renderFrame(0),
  });

  const rig = createRig({
    camera,
    stations: journey.stations,
    poseFor: createStationPoses({ system }),
    orbit: globeControl.orbit,
  });

  /* ---------- the cards' glass ---------- */

  // While the loop runs, the frosted glass behind each card is drawn here, in
  // the same frame as the scene (see glass.js); the class turns the CSS
  // backdrop blur off once it is. Without the loop (reduced motion, a hidden
  // tab) the canvas holds still and the CSS glass is fine.
  const root = document.documentElement;
  const glass = createGlass({ renderer });
  const cards = [];
  let glassOn = false;
  const setGlass = (on) => {
    if (on === glassOn) return;
    glassOn = on;
    root.classList.toggle('glass-webgl', on);
  };

  function drawGlass() {
    const top = window.scrollY;
    const height = window.innerHeight;
    let radius = 0;
    cards.length = 0;
    for (const { panel } of journey.stations) {
      if (!panel || panel.top - top > height || panel.top + panel.height - top < 0) continue;
      cards.push({ left: panel.left, top: panel.top - top, width: panel.width, height: panel.height });
      radius = panel.radius;
    }
    if (glass.render(cards, radius)) setGlass(true);
    else if (!glass.supported) setGlass(false);
  }

  /* ---------- sizing ---------- */

  const resize = () => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    for (const env of environments) {
      env.setPixelRatio?.(pixelRatio);
      env.setSize?.(width, height);
    }
    glass.setSize(canvas.width, canvas.height, renderer.getPixelRatio());
  };
  resize();
  // A resized canvas is blank until it's drawn again, and the browser would
  // show that blank frame (a black flash, starkest behind a glass panel over
  // the nebula). So every resize after start-up redraws on the spot.
  const resizeAndRedraw = () => {
    resize();
    if (!lost) renderFrame(0);
  };
  new ResizeObserver(resizeAndRedraw).observe(canvas);

  /* ---------- pointer parallax (fine pointers only) ---------- */

  const finePointer = window.matchMedia('(pointer: fine)');
  window.addEventListener(
    'pointermove',
    (event) => {
      // hold the view steady while the visitor has hold of the globe
      if (!finePointer.matches || reducedMotion.matches || globeControl.dragging) return;
      rig.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      rig.pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
    },
    { passive: true }
  );

  // the "Reset view" button: offered only while the visitor has things turned
  const resetButton = document.querySelector('.view-reset');
  let resetShown = false;
  const showReset = (shown) => {
    if (shown === resetShown || !resetButton) return;
    resetShown = shown;
    resetButton.classList.toggle('is-shown', shown);
  };
  resetButton?.addEventListener('click', () => globeControl.reset());

  /* ---------- render loop ---------- */

  let time = 0;
  let last = 0;
  let raf = 0;
  let running = false;
  let lost = false;
  let monitor = { elapsed: 0, frames: 0, warmup: 3 };

  // Deep-space set pieces are revealed as the journey reaches them rather than
  // all sitting in the opening sky: the nebula glimmers faintly from the start
  // and blooms on approach; the black hole and galaxy appear only near the end.
  const at = (id) => journey.stations.findIndex((station) => station.id === id);
  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const NEBULA_AT = at('nebula');
  const SINGULARITY_AT = at('singularity');
  const HORIZON_AT = at('horizon');

  function updatePresence(p) {
    nebula.setPresence(0.12 + 0.88 * smooth(NEBULA_AT - 1.6, NEBULA_AT, p) - 0.6 * smooth(SINGULARITY_AT, HORIZON_AT, p));
    singularity.setPresence(smooth(NEBULA_AT - 0.2, SINGULARITY_AT - 0.3, p));
    galaxy.setPresence(smooth(SINGULARITY_AT - 0.4, HORIZON_AT - 0.2, p));
  }

  function renderFrame(dt) {
    const still = reducedMotion.matches;
    if (!still) time += dt;
    for (const env of environments) env.update(time, camera);
    globeControl.update(still ? 0 : dt);
    showReset(globeControl.turned);
    rig.update(dt, journey.progress, { aspect: camera.aspect, time, snap: still });
    updatePresence(still ? Math.round(journey.progress) : rig.value);
    renderer.render(scene, camera);
    if (running) drawGlass();
  }

  // If a device can't hold ~45fps, give back pixels before anything else.
  // Gaps over a quarter-second are throttling or a hitch (tab switch, shader
  // compile), not steady-state cost, so they restart the measurement.
  function watchFrameRate(dt, interval) {
    if (interval > 0.25) {
      monitor = { elapsed: 0, frames: 0, warmup: monitor.warmup };
      return;
    }
    if (monitor.warmup > 0) {
      monitor.warmup -= dt;
      return;
    }
    monitor.elapsed += dt;
    monitor.frames += 1;
    if (monitor.elapsed < 2) return;
    const average = monitor.elapsed / monitor.frames;
    monitor = { elapsed: 0, frames: 0, warmup: 0 };
    if (average > SLOW_FRAME && pixelRatio > tier.minDpr) {
      pixelRatio = Math.max(tier.minDpr, pixelRatio - 0.25);
      resizeAndRedraw();
    }
  }

  function loop(now) {
    const interval = last ? (now - last) / 1000 : 1 / 60;
    const dt = Math.min(0.1, interval);
    last = now;
    renderFrame(dt);
    watchFrameRate(dt, interval);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (running || lost || document.hidden || reducedMotion.matches) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    setGlass(false);
  }

  // Reduced motion: no loop at all. Draw a still frame of the nearest station
  // whenever the visitor arrives somewhere new.
  let shownStation = -1;
  journey.onChange((p) => {
    if (running || lost) return;
    const nearest = Math.round(p);
    if (nearest === shownStation) return;
    shownStation = nearest;
    renderFrame(0);
  });

  const applyMotionPreference = () => {
    starfield.setMotion(!reducedMotion.matches);
    skyEvents.setMotion(!reducedMotion.matches);
    if (reducedMotion.matches) {
      stop();
      shownStation = -1;
      renderFrame(0);
    } else {
      start();
    }
  };
  reducedMotion.addEventListener('change', applyMotionPreference);

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    lost = true;
    stop();
    onLost?.();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    for (const env of environments) env.restore?.();
    applyMotionPreference();
    onReady?.();
  });

  /* ---------- arrival ---------- */

  // Only choreograph the arrival when the visitor lands at the start;
  // a deep link (e.g. /#top-scores) should simply be there. The universe is
  // revealed once Earth has its surface, so the first sight is never blank.
  const choreograph = !reducedMotion.matches && journey.progress < 0.25;
  if (choreograph) {
    rig.intro.amount = 1;
    renderer.toneMappingExposure = 0.15;
  }

  applyMotionPreference();
  if (!running) renderFrame(0);
  earth.ready.then(() => {
    if (!running) renderFrame(0);
    if (choreograph) {
      gsap.to(rig.intro, { amount: 0, duration: 4.2, ease: 'expo.out', delay: 0.15 });
      gsap.to(renderer, { toneMappingExposure: 1, duration: 3.2, ease: 'power2.out', delay: 0.15 });
    }
    requestAnimationFrame(() => onReady?.());
    // then, in the browser's spare time, the nebula and the worlds' maps
    // (the worlds keep their plain tints for visitors saving data)
    const idle = window.requestIdleCallback ?? ((task) => setTimeout(task, 300));
    idle(
      () => {
        nebula.load().catch(() => {});
        if (navigator.connection?.saveData !== true) system.loadSurfaces();
      },
      { timeout: 2500 }
    );
  });

  const api = {
    tier,
    get pixelRatio() {
      return pixelRatio;
    },
    dispose() {
      stop();
      for (const env of environments) env.dispose();
      glass.dispose();
      renderer.dispose();
    },
  };

  if (import.meta.env.DEV) {
    // settle(): jump the camera to the current station and draw it now —
    // for inspecting compositions when animation frames are throttled.
    const settle = () => {
      rig.update(0, journey.progress, { aspect: camera.aspect, time, snap: true });
      updatePresence(Math.round(journey.progress));
      renderer.render(scene, camera);
      if (running) drawGlass();
    };
    window.__universe = {
      ...api,
      renderer,
      scene,
      camera,
      rig,
      journey,
      settle,
      renderFrame,
      drawGlass,
      skyEvents,
      earth,
      nebula,
      system,
      globeControl,
    };
  }

  return api;
}
