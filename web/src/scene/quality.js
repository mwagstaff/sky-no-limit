// Rendering budgets per device class. The starting tier comes from what the
// browser will tell us; the frame monitor in universe.js then trims pixel
// ratio further if a device can't hold its frame rate.

export const TIERS = {
  high: { name: 'high', dpr: 2, minDpr: 1, stars: 16000, nearStars: 5000, galaxy: 90000, dust: 240 },
  medium: { name: 'medium', dpr: 1.5, minDpr: 0.85, stars: 10000, nearStars: 3000, galaxy: 50000, dust: 150 },
  low: { name: 'low', dpr: 1, minDpr: 0.7, stars: 5500, nearStars: 1500, galaxy: 22000, dust: 70 },
};

const WEAK_GPU =
  /swiftshader|llvmpipe|software|basic render|mali-[4t]|adreno \(tm\) [2-5]\d\d|powervr|intel.*(hd|uhd) graphics( [2-6]\d\d)?\b/i;

export function detectTier(gl) {
  let gpu = '';
  try {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    gpu = gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '';
  } catch {
    // renderer string is a hint, not a requirement
  }

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const smallScreen = Math.min(window.screen.width, window.screen.height) < 768;
  const memory = navigator.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const saveData = navigator.connection?.saveData === true;

  let tier = 'high';
  if (coarse || smallScreen || memory <= 4 || cores <= 4) tier = 'medium';
  if (WEAK_GPU.test(gpu) || saveData || memory <= 2) tier = 'low';

  const forced = new URLSearchParams(window.location.search).get('quality');
  if (forced && TIERS[forced]) tier = forced;

  return { ...TIERS[tier], gpu };
}
