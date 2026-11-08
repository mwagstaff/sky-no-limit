uniform vec3 uHeadColor;
uniform vec3 uTailColor;
uniform float uOpacity;
uniform float uFalloff; // how quickly the tail fades behind the head

varying float vAlong;
varying float vAcross;

void main() {
  float along = pow(vAlong, uFalloff);
  float across = exp(-vAcross * vAcross * 3.2);
  vec3 colour = mix(uTailColor, uHeadColor, vAlong * vAlong);
  gl_FragColor = vec4(colour * along * across * uOpacity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
