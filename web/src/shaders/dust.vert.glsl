// Foreground dust: a box of motes that always surrounds the camera. Each mote
// drifts slowly through the world and wraps round the box, so standing still
// shows a gentle drift and flying shows them stream past.
attribute float aSize;
attribute float aPhase;

uniform float uTime;
uniform float uBox;
uniform float uPixelRatio;
uniform float uOpacity;

varying float vAlpha;
varying float vWarm;

void main() {
  vec3 drift = vec3(0.7, 0.22, -0.45) * uTime * (0.5 + aPhase);
  vec3 local = mod(position * uBox + drift - cameraPosition, uBox) - 0.5 * uBox;
  vec4 mvPosition = viewMatrix * vec4(cameraPosition + local, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float distance = -mvPosition.z;
  float size = aSize * uPixelRatio * clamp(150.0 / max(distance, 1.0), 0.0, 7.0);
  gl_PointSize = max(size, 1.0);

  // fade at the box's faces (no popping) and right in front of the lens
  float edge = 1.0 - smoothstep(0.36, 0.5, max(max(abs(local.x), abs(local.y)), abs(local.z)) / uBox);
  float lens = smoothstep(6.0, 40.0, distance);
  vAlpha = uOpacity * edge * lens * clamp(size, 0.0, 1.0) / max(size * 0.35, 1.0) * step(0.0, distance);
  vWarm = step(0.82, aPhase);
}
