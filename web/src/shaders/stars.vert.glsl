// Stars as screen-space points. Sub-pixel stars dim instead of shrinking so
// the faint end of the field stays smooth rather than shimmering. Every star
// breathes a little; about one in six twinkles properly, on two beating
// frequencies so it never settles into an obvious rhythm.
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;

uniform float uTime;
uniform float uPixelRatio;
uniform float uTwinkle;
uniform float uAttenuate; // 0 for the infinitely distant sky, >0 for near stars

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float depthScale = mix(1.0, clamp(2400.0 / -mvPosition.z, 0.35, 2.4), uAttenuate);
  float size = aSize * uPixelRatio * depthScale;

  float rate = 0.5 + fract(aPhase * 7.13) * 2.1;
  float wave = 0.62 * sin(uTime * rate + aPhase * 6.2831) + 0.38 * sin(uTime * rate * 2.71 + aPhase * 17.0);
  float strength = fract(aPhase * 13.7) > 0.83 ? 0.55 : 0.12;
  float twinkle = 1.0 + uTwinkle * strength * wave;

  gl_PointSize = max(size * mix(1.0, twinkle, 0.35), 1.0);
  vAlpha = clamp(size, 0.0, 1.0) * twinkle;
  vColor = aColor;
}
