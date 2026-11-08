varying vec3 vColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;
  float core = exp(-d * d * 5.5);
  gl_FragColor = vec4(vColor * core * vAlpha, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
