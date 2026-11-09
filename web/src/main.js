import './styles.css';
import { createJourney } from './journey/progress.js';
import { initAddress } from './journey/address.js';
import { initNavigation } from './ui/navigation.js';
import { drawStaticSky } from './ui/static-sky.js';

const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const canvas = document.getElementById('universe');

const journey = createJourney(document.querySelectorAll('[data-station]'));
initNavigation({ journey });
initAddress({ journey, reducedMotion });

// Three.js needs WebGL 2. Probe on a throwaway canvas so the real one stays
// free for the 2D fallback if it isn't there.
const supportsWebGL2 = () => {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
};

const fallBack = () => {
  root.classList.add('no-webgl');
  drawStaticSky(canvas);
};

if (supportsWebGL2()) {
  import('./scene/universe.js')
    .then(({ createUniverse }) =>
      createUniverse({
        canvas,
        journey,
        reducedMotion,
        onReady: () => root.classList.add('universe-ready'),
        onLost: () => root.classList.remove('universe-ready'),
      })
    )
    .catch((error) => {
      console.error('Universe failed to start; showing the still sky instead.', error);
      fallBack();
    });
} else {
  fallBack();
}
