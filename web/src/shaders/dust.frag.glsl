varying float vAlpha;
varying float vWarm;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float soft = exp(-d * d * 3.5) * (1.0 - d * d);
  vec3 colour = mix(vec3(0.62, 0.74, 1.0), vec3(1.0, 0.8, 0.55), vWarm);
  gl_FragColor = vec4(colour * soft * vAlpha, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
