// One layer of the Veil's light. LAYER picks the band of detail it draws from
// the image: 0 a broad glow (a coarse mip, softened), 1 the gas itself, 2 only
// its finest filaments (the image less a blurred copy of itself). Stacked a
// few hundred units apart, they slide over one another as the camera moves.
// A slow ripple through the sampling keeps the gas drifting.
uniform sampler2D uMap;
uniform float uIntensity;
uniform float uPresence;
uniform float uTime;
uniform float uPhase;
uniform vec3 uNormal;

varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  float t = uTime * 0.03 + uPhase;
  vec2 uv = vUv + 0.0018 * vec2(
    sin(t + vUv.y * 7.0) + 0.5 * sin(1.7 * t + vUv.y * 17.0),
    cos(0.8 * t + vUv.x * 6.0) + 0.5 * cos(1.3 * t + vUv.x * 15.0)
  );

  #if LAYER == 0
    vec3 colour = vec3(0.0);
    for (int i = 0; i < 5; i++) {
      float a = float(i) * 1.2566;
      colour += textureLod(uMap, uv + vec2(cos(a), sin(a)) * 0.012, 5.0).rgb;
    }
    colour *= 0.2;
  #elif LAYER == 1
    vec3 colour = texture(uMap, uv).rgb;
  #else
    vec3 colour = max(texture(uMap, uv).rgb - textureLod(uMap, uv, 2.5).rgb * 0.85, 0.0);
  #endif

  // the frame dissolves into space: soft edges, rounded into an oval
  vec2 edge = min(vUv, 1.0 - vUv);
  float frame = smoothstep(0.0, 0.18, edge.x) * smoothstep(0.0, 0.22, edge.y);
  float oval = 1.0 - smoothstep(0.6, 1.05, length((vUv - 0.5) * vec2(2.0, 1.7)));
  float mask = frame * mix(1.0, oval, 0.55);

  // a sheet of light has no edge-on view and no near side: fade before either shows
  vec3 toEye = cameraPosition - vWorldPosition;
  float distance = length(toEye);
  float fade = smoothstep(0.1, 0.4, abs(dot(toEye / distance, uNormal))) * smoothstep(300.0, 1100.0, distance);

  gl_FragColor = vec4(colour * uIntensity * uPresence * mask * fade, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
