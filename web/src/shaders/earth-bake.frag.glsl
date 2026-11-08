// The fallback Earth (Save-Data, failed imagery, ?earth=procedural): bakes the
// surface from noise into two equirectangular maps laid out like
// SphereGeometry's uvs, the same layout earth-imagery.frag.glsl writes. Everything is driven by 3D noise on the unit
// sphere, so the maps are seamless and the poles don't pinch.
//   surface: rgb albedo (gamma-encoded for 8-bit precision), a water mask
//   detail:  r cloud cover, g city lights, b land elevation
precision highp float;

uniform float uSeaLevel;

in vec2 vUv;
layout(location = 0) out vec4 outSurface;
layout(location = 1) out vec4 outDetail;

const float PI = 3.141592653589793;

#include <noise>

float band(float x, float centre, float width) {
  float d = (x - centre) / width;
  return exp(-d * d);
}

void main() {
  float phi = vUv.x * 2.0 * PI;
  float theta = (1.0 - vUv.y) * PI;
  vec3 p = vec3(-cos(phi) * sin(theta), cos(theta), sin(phi) * sin(theta));
  float latitude = abs(asin(clamp(p.y, -1.0, 1.0))) / (0.5 * PI); // 0 equator, 1 pole

  /* ---- continents: warped low-frequency noise, so coasts are ragged but masses read large ---- */
  vec3 q = p * 1.05;
  vec3 warp = vec3(
    fbm(q + vec3(0.0, 3.1, 7.7), 4),
    fbm(q + vec3(5.2, 1.3, 2.8), 4),
    fbm(q + vec3(9.1, 4.7, 0.6), 4)
  );
  float height = fbm(q + warp * 0.75, 7) + 0.04 * fbm(p * 9.0 + warp * 2.0, 4);
  float coast = height - uSeaLevel;
  float land = smoothstep(-0.002, 0.002, coast);
  float elevation = clamp(coast / 0.32, 0.0, 1.0);

  /* ---- climate ---- */
  float moisture = fbm(p * 2.2 + vec3(31.0), 5) + 0.5;
  float arid = clamp(band(latitude, 0.26, 0.12) * 0.9 + (0.5 - moisture) * 1.5 - elevation * 0.3, 0.0, 1.0);
  float desert = smoothstep(0.5, 0.8, arid);
  float cold = smoothstep(0.6, 0.8, latitude + elevation * 0.25 + (moisture - 0.5) * 0.1);
  float ice = smoothstep(0.86, 0.9, latitude + fbm(p * 6.0, 3) * 0.05 + elevation * 0.1 * land);
  float lush = smoothstep(0.3, 0.75, moisture + (1.0 - latitude) * 0.2);

  /* ---- surface colour (linear) ---- */
  vec3 forest = vec3(0.02, 0.1, 0.02);
  vec3 grassland = vec3(0.09, 0.17, 0.035);
  vec3 sand = mix(vec3(0.44, 0.32, 0.17), vec3(0.36, 0.19, 0.09), smoothstep(-0.2, 0.3, fbm(p * 5.0 + 3.0, 3)));
  vec3 tundra = vec3(0.17, 0.16, 0.12);
  vec3 rock = vec3(0.24, 0.21, 0.17);
  vec3 snow = vec3(0.82, 0.86, 0.91);

  vec3 ground = mix(grassland, forest, lush);
  ground = mix(ground, sand, desert);
  ground = mix(ground, tundra, cold);
  ground = mix(ground, rock, smoothstep(0.55, 0.9, elevation) * 0.6);

  float depth = clamp(-coast / 0.28, 0.0, 1.0);
  vec3 ocean = mix(vec3(0.014, 0.11, 0.17), vec3(0.005, 0.03, 0.1), smoothstep(0.0, 0.14, depth));
  ocean = mix(ocean, vec3(0.003, 0.014, 0.058), smoothstep(0.3, 1.0, depth));

  vec3 albedo = mix(ocean, ground, land);
  albedo = mix(albedo, snow, ice);
  float water = (1.0 - land) * (1.0 - ice);

  /* ---- weather: zonal streaks, a wet equator and storm tracks, clear subtropics ---- */
  vec3 c = vec3(p.x, p.y * 1.7, p.z) * 2.1;
  vec3 swirl = vec3(fbm(c * 1.4 + 2.0, 4), fbm(c * 1.4 + 7.0, 4), fbm(c * 1.4 + 13.0, 4));
  float cover = fbm(c * 1.8 + swirl * 1.15, 6) + 0.14 * fbm(c * 7.0 + swirl * 2.5, 3);
  cover += 0.16 * band(latitude, 0.0, 0.1) + 0.16 * band(latitude, 0.62, 0.14) - 0.16 * band(latitude, 0.27, 0.1);
  float clouds = smoothstep(0.16, 0.56, cover) * 0.9;

  /* ---- cities: clustered, coastal, absent from deserts, ice and the far north ---- */
  float sprawl = pow((snoise(p * 150.0) * 0.5 + 0.5) * (snoise(p * 46.0 + 5.0) * 0.5 + 0.5), 4.0);
  float regions = smoothstep(0.05, 0.45, fbm(p * 4.5 + 17.0, 3));
  float nearCoast = 1.0 - smoothstep(0.0, 0.07, coast);
  float habitable = land * (1.0 - ice) * (1.0 - desert * 0.85) * (1.0 - cold);
  float lights = clamp(habitable * regions * sprawl * 9.0 * (0.35 + nearCoast), 0.0, 1.0);

  outSurface = vec4(pow(albedo, vec3(1.0 / 2.2)), water);
  outDetail = vec4(clouds, lights, elevation * land, 1.0);
}
