// Placeholder accretion disc: hot inner edge cooling outwards, with sheared
// streaks that rotate faster closer in. Phase 4 adds gravitational lensing.
uniform float uTime;
uniform vec3 uHot;
uniform vec3 uWarm;
uniform vec3 uCool;
uniform float uPresence;

varying vec2 vPolar;

void main() {
  float r = clamp(vPolar.x, 0.0, 1.0);
  float spin = vPolar.y + uTime * (0.9 / (0.25 + r * 2.0));
  float streaks = 0.65 + 0.35 * sin(spin * 9.0 + r * 40.0) * sin(spin * 3.0 - r * 17.0);

  vec3 colour = mix(uHot, uWarm, smoothstep(0.0, 0.35, r));
  colour = mix(colour, uCool, smoothstep(0.35, 1.0, r));

  float fadeIn = smoothstep(0.0, 0.04, r);
  float fadeOut = 1.0 - smoothstep(0.55, 1.0, r);
  float intensity = fadeIn * fadeOut * streaks * (2.4 - 1.9 * r);

  gl_FragColor = vec4(colour * intensity * uPresence, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
