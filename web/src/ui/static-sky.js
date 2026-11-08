// A still, hand-drawn sky for browsers without WebGL. It sits between the CSS
// fallback's sky and its Earth (which is layered above it), adding only stars,
// so it reads as the same opening scene.

const TINTS = ['#dfe8ff', '#dfe8ff', '#f4f7ff', '#cfe3ff', '#ffe6bf'];

export function drawStaticSky(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const draw = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // deterministic so resizes don't reshuffle the sky
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const count = Math.round((w * h) / 2600);
    for (let i = 0; i < count; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const bright = rand() ** 6;
      ctx.globalAlpha = 0.18 + bright * 0.8;
      ctx.fillStyle = TINTS[(rand() * TINTS.length) | 0];
      ctx.beginPath();
      ctx.arc(x, y, 0.35 + bright * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  draw();
  let timer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(draw, 150);
  });
}
