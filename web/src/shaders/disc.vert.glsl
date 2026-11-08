varying vec2 vPolar; // x: 0 at inner edge .. 1 at outer edge, y: angle

uniform float uInner;
uniform float uOuter;

void main() {
  float r = length(position.xy);
  vPolar = vec2((r - uInner) / (uOuter - uInner), atan(position.y, position.x));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
