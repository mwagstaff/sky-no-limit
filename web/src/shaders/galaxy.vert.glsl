attribute float aSize;
attribute vec3 aColor;

uniform float uPixelRatio;
uniform float uScale;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  float size = aSize * uPixelRatio * uScale / -mvPosition.z;
  gl_PointSize = max(size, 1.0);
  vAlpha = clamp(size, 0.0, 1.0);
  vColor = aColor;
}
