// The cards' frosted glass, drawn by the renderer in the same frame as the
// scene behind it. The browser's own backdrop-filter blurs the canvas as a
// separate compositing step, and over a scene redrawn every frame Chrome's
// version flickers (most visibly where the nebula is bright behind a card).
// Drawn here, the frost can only ever show the frame it belongs to.
//
// Each frame is copied, halved twice (a 4×4 box, so stars don't sparkle
// through), blurred with a separable Gaussian at quarter resolution to match
// the CSS blur it replaces, and laid back over each card's rounded rectangle.
// The frost runs a little past the card's edge: scrolling moves the cards a
// frame ahead of the canvas, and it mustn't uncover a sliver of sharp sky.

import {
  BufferAttribute,
  BufferGeometry,
  FramebufferTexture,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector4,
  WebGLRenderTarget,
} from 'three';

const MAX_CARDS = 4;
const BLUR = 16; // CSS px: the blur(16px) of the card's CSS glass
const SATURATE = 1.25; // and its saturate(1.25)
const BLEED = 12; // CSS px of frost past each card's edge, fading out
const TAPS = 12; // tap pairs per blur pass: reach 24 texels, 3σ at the widest blur

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// sampled at the corner its four source texels share, bilinear filtering averages them
const halveShader = /* glsl */ `
  uniform sampler2D uSource;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture(uSource, vUv);
  }
`;

// a Gaussian along uStep, two texels per tap (bilinear filtering weighs each pair)
const blurShader = /* glsl */ `
  uniform sampler2D uSource;
  uniform vec2 uStep;
  uniform float uSigma;
  varying vec2 vUv;
  void main() {
    float k = -0.5 / (uSigma * uSigma);
    vec3 sum = texture(uSource, vUv).rgb;
    float total = 1.0;
    for (int i = 1; i <= ${TAPS}; i++) {
      float a = float(2 * i - 1);
      float wa = exp(a * a * k);
      float wb = exp((a + 1.0) * (a + 1.0) * k);
      float w = wa + wb;
      vec2 offset = uStep * (a + wb / w);
      sum += (texture(uSource, vUv + offset).rgb + texture(uSource, vUv - offset).rgb) * w;
      total += 2.0 * w;
    }
    gl_FragColor = vec4(sum / total, 1.0);
  }
`;

// the frost inside each card's rounded rectangle (device px, origin bottom left)
const frostShader = /* glsl */ `
  uniform sampler2D uBlur;
  uniform vec4 uCards[${MAX_CARDS}];
  uniform int uCount;
  uniform float uRadius;
  uniform float uBleed;
  uniform float uSaturate;
  varying vec2 vUv;
  void main() {
    float cover = 0.0;
    for (int i = 0; i < ${MAX_CARDS}; i++) {
      if (i >= uCount) break;
      vec2 q = abs(gl_FragCoord.xy - uCards[i].xy) - uCards[i].zw + uRadius;
      float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
      cover = max(cover, 1.0 - smoothstep(0.0, uBleed, d));
    }
    if (cover <= 0.0) discard;
    vec3 colour = texture(uBlur, vUv).rgb;
    colour = max(mix(vec3(dot(colour, vec3(0.2126, 0.7152, 0.0722))), colour, uSaturate), 0.0);
    gl_FragColor = vec4(colour, cover);
  }
`;

export function createGlass({ renderer }) {
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const quad = new Mesh(geometry);
  quad.frustumCulled = false;
  const scene = new Scene().add(quad);

  const pass = (fragmentShader, uniforms, options = {}) =>
    new ShaderMaterial({ vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false, ...options });
  const halve = pass(halveShader, { uSource: { value: null } });
  const blur = pass(blurShader, { uSource: { value: null }, uStep: { value: new Vector2() }, uSigma: { value: 4 } });
  const cards = Array.from({ length: MAX_CARDS }, () => new Vector4());
  const frost = pass(
    frostShader,
    {
      uBlur: { value: null },
      uCards: { value: cards },
      uCount: { value: 0 },
      uRadius: { value: 0 },
      uBleed: { value: BLEED },
      uSaturate: { value: SATURATE },
    },
    { transparent: true }
  );

  const target = () =>
    new WebGLRenderTarget(1, 1, { depthBuffer: false, minFilter: LinearFilter, magFilter: LinearFilter, generateMipmaps: false });
  const half = target();
  const quarterA = target();
  const quarterB = target();
  let frame = null;
  let pixelRatio = 1;
  let supported = true;
  let checked = false;

  function draw(material, output) {
    quad.material = material;
    renderer.setRenderTarget(output);
    renderer.render(scene, camera);
  }

  return {
    /** False if this browser can't copy its drawing buffer; the CSS glass stays then. */
    get supported() {
      return supported;
    },

    /** Match the drawing buffer (device px) and the pixel ratio it was drawn at. */
    setSize(width, height, ratio) {
      pixelRatio = ratio;
      frame?.dispose();
      frame = new FramebufferTexture(width, height);
      frame.minFilter = frame.magFilter = LinearFilter;
      half.setSize(Math.max(1, width >> 1), Math.max(1, height >> 1));
      quarterA.setSize(Math.max(1, width >> 2), Math.max(1, height >> 2));
      quarterB.setSize(Math.max(1, width >> 2), Math.max(1, height >> 2));
      // CSS px → quarter-resolution texels, kept within the kernel's reach
      blur.uniforms.uSigma.value = Math.min(8, (BLUR * pixelRatio) / 4);
    },

    /**
     * Frost the just-rendered frame behind `boxes` (viewport CSS px: left,
     * top, width, height), all with corner `radius`. Returns false if nothing
     * was drawn.
     */
    render(boxes, radius) {
      if (!supported || !frame || boxes.length === 0) return false;
      const autoClear = renderer.autoClear;

      renderer.setRenderTarget(null);
      renderer.copyFramebufferToTexture(frame);
      if (!checked) {
        // copying a multisampled drawing buffer isn't allowed everywhere
        checked = true;
        const gl = renderer.getContext();
        if (gl.getError() !== gl.NO_ERROR) {
          supported = false;
          return false;
        }
      }

      halve.uniforms.uSource.value = frame;
      draw(halve, half);
      halve.uniforms.uSource.value = half.texture;
      draw(halve, quarterA);
      blur.uniforms.uSource.value = quarterA.texture;
      blur.uniforms.uStep.value.set(1 / quarterA.width, 0);
      draw(blur, quarterB);
      blur.uniforms.uSource.value = quarterB.texture;
      blur.uniforms.uStep.value.set(0, 1 / quarterA.height);
      draw(blur, quarterA);

      const height = frame.image.height;
      const count = Math.min(MAX_CARDS, boxes.length);
      for (let i = 0; i < count; i++) {
        const { left, top, width, height: tall } = boxes[i];
        cards[i].set(
          (left + width / 2) * pixelRatio,
          height - (top + tall / 2) * pixelRatio,
          (width / 2) * pixelRatio,
          (tall / 2) * pixelRatio
        );
      }
      frost.uniforms.uCount.value = count;
      frost.uniforms.uRadius.value = radius * pixelRatio;
      frost.uniforms.uBleed.value = BLEED * pixelRatio;
      frost.uniforms.uBlur.value = quarterA.texture;
      renderer.autoClear = false;
      draw(frost, null);
      renderer.autoClear = autoClear;
      return true;
    },

    dispose() {
      frame?.dispose();
      for (const t of [half, quarterA, quarterB]) t.dispose();
      for (const m of [halve, blur, frost]) m.dispose();
      geometry.dispose();
    },
  };
}
