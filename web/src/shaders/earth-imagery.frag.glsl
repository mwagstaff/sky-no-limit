// Bakes Earth's maps from NASA imagery into the same layout the procedural
// bake writes, so the surface shader doesn't care which one it was given.
//   surface: rgb albedo (gamma-encoded for 8-bit precision), a water mask
//   detail:  r cloud cover, g city lights, b unused
precision highp float;

uniform sampler2D uDay;    // Blue Marble: Next Generation, July 2004 (sRGB)
uniform sampler2D uClouds; // cloud cover, derived from NASA SVS renders
uniform sampler2D uLights; // Black Marble 2016 city lights

in vec2 vUv;
layout(location = 0) out vec4 outSurface;
layout(location = 1) out vec4 outDetail;

void main() {
  vec3 day = texture(uDay, vUv).rgb;

  // a little more saturation: from orbit, the jewel should read blue and green
  float luma = dot(day, vec3(0.2126, 0.7152, 0.0722));
  vec3 albedo = max(mix(vec3(luma), day, 1.2), 0.0);

  // water is wherever blue clearly leads (the bathymetry paints the sea in deep blues)
  vec3 perceptual = pow(day, vec3(1.0 / 2.2));
  float water = smoothstep(0.03, 0.09, perceptual.b - max(perceptual.r, perceptual.g));

  outSurface = vec4(pow(albedo, vec3(1.0 / 2.2)), water);
  outDetail = vec4(texture(uClouds, vUv).r, texture(uLights, vUv).r, 0.0, 1.0);
}
