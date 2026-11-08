import { CanvasTexture, SRGBColorSpace } from 'three';

/** A soft round falloff for glows and cloud puffs, drawn once on a canvas. */
export function createGlowTexture(size = 128, falloff = 2.2) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(size, size);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.min(1, Math.hypot(x + 0.5 - half, y + 0.5 - half) / half);
      const a = Math.exp(-d * d * falloff * 2) * (1 - d * d);
      const i = (y * size + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
      image.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** A thin horizontal lens streak: bright and narrow at the centre, fading to nothing at both ends. */
export function createStreakTexture(width = 512, height = 32) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = Math.abs((x + 0.5) / width - 0.5) * 2;
      const v = Math.abs((y + 0.5) / height - 0.5) * 2;
      const a = (1 - u) ** 2.4 * Math.exp(-v * v * (6 + 18 * (1 - u))) * (1 - v * v);
      const i = (y * width + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
      image.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Deterministic PRNG so every visitor flies through the same universe. */
export function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function disposeTree(object) {
  object.traverse((child) => {
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        if (value?.isTexture) value.dispose();
      }
      for (const uniform of Object.values(material.uniforms ?? {})) {
        if (uniform.value?.isTexture) uniform.value.dispose();
      }
      material.dispose();
    }
  });
}
