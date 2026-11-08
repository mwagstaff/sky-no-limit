// Earth's atmosphere as light scattered towards the eye. For each view ray we
// take its closest approach to the planet: rays that miss glow with the air
// density at that altitude; rays that meet the ground glow with the slant of
// their path through the air, which grows towards the limb. The two meet at
// the limb, so the rim is a soft luminous band rather than an edge.
uniform vec3 uCentre;
uniform float uRadius;
uniform float uScaleHeight;
uniform vec3 uSunDirection;
uniform vec3 uRayleigh;
uniform vec3 uSunset;
uniform float uIntensity;

varying vec3 vWorldPosition;

void main() {
  vec3 rayDir = normalize(vWorldPosition - cameraPosition);
  float along = dot(uCentre - cameraPosition, rayDir);
  vec3 closest = cameraPosition + rayDir * along;
  float impact = length(closest - uCentre);
  float altitude = impact - uRadius;

  float depth;
  vec3 up;
  if (altitude > 0.0) {
    depth = exp(-altitude / uScaleHeight) + 0.05 * exp(-altitude / (uScaleHeight * 6.0));
    up = (closest - uCentre) / impact;
  } else {
    vec3 hit = cameraPosition + rayDir * (along - sqrt(max(uRadius * uRadius - impact * impact, 0.0)));
    up = normalize(hit - uCentre);
    float mu = max(dot(up, -rayDir), 1e-3);
    depth = min(1.0, sqrt(2.0 * uScaleHeight / (3.14159265 * uRadius)) / mu);
    depth *= mix(0.2, 1.0, depth); // a clear day side, a bright rim
  }

  float sun = dot(up, uSunDirection);
  float lit = smoothstep(-0.24, 0.32, sun);
  float twilight = exp(-pow((sun + 0.02) / 0.12, 2.0));
  vec3 colour = mix(uRayleigh, uSunset, twilight * 0.45);
  // a whisper of airglow keeps the night-side limb from vanishing entirely
  float glow = depth * (lit + 0.02) * uIntensity;

  gl_FragColor = vec4(colour * glow, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
