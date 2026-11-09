// Earth's surface: baked albedo and weather, lit by a sun of its own. Soft
// terminator, ocean glint, cloud shadows, city lights on the night side, and
// extinction towards the limb (the atmosphere shell adds the scattered light).
uniform sampler2D uSurface;
uniform sampler2D uDetail;
uniform vec3 uSunDirection; // world space
uniform vec3 uSunLocal;     // the same, in the globe's own frame
uniform float uCloudShift;  // the weather's drift east, in uv units
uniform float uSunIntensity;
uniform vec3 uCityColor;
uniform float uScaleRatio;  // atmospheric scale height / radius

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vLocalNormal;
varying vec3 vWorldPosition;

const float PI = 3.141592653589793;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorldPosition);
  vec3 l = normalize(uSunDirection);
  float nl = dot(n, l);
  float nv = max(dot(n, v), 0.0);

  vec4 surface = texture2D(uSurface, vUv);
  vec3 albedo = pow(surface.rgb, vec3(2.2));
  float water = surface.a;
  float lights = texture2D(uDetail, vUv).g;

  vec2 cloudUv = vec2(vUv.x + uCloudShift, vUv.y);
  float clouds = texture2D(uDetail, cloudUv).r;

  // cloud shadows: look up the cloud a little way towards the sun
  vec3 ln = normalize(vLocalNormal);
  float ring = max(length(ln.xz), 1e-3);
  vec3 east = vec3(ln.z, 0.0, -ln.x) / ring;
  vec3 north = vec3(-ln.x * ln.y / ring, ring, -ln.z * ln.y / ring);
  vec2 sunward = vec2(dot(uSunLocal, east) / (2.0 * PI * ring), dot(uSunLocal, north) / PI);
  float shadow = texture2D(uDetail, cloudUv + sunward * 0.012).r;

  float day = smoothstep(-0.06, 0.3, nl);
  float diffuse = max(nl, 0.0) * 0.86 + day * 0.14;
  vec3 sun = vec3(1.0, 0.97, 0.93) * uSunIntensity;

  vec3 ground = albedo * diffuse * sun * (1.0 - 0.5 * shadow * day);

  // the sun's reflection off open water
  vec3 h = normalize(l + v);
  float nh = max(dot(n, h), 0.0);
  float glint = (pow(nh, 260.0) * 0.9 + pow(nh, 40.0) * 0.018) * water * (1.0 - clouds) * day;
  ground += vec3(1.0, 0.9, 0.74) * glint * sun;

  vec3 colour = mix(ground, vec3(0.86, 0.88, 0.92) * diffuse * sun, clouds);

  // a warm wash along the terminator, strongest where it catches cloud
  float twilight = exp(-pow((nl - 0.02) / 0.1, 2.0));
  colour += vec3(0.55, 0.22, 0.06) * twilight * (0.006 + 0.03 * clouds);

  // cities on the night side, dimmed under cloud, and a whisper of moonlight
  // so the continents still read in the dark
  float night = 1.0 - smoothstep(-0.14, 0.06, nl);
  colour += uCityColor * lights * night * (1.0 - 0.8 * clouds);
  colour += mix(albedo, vec3(0.5), clouds) * vec3(0.035, 0.05, 0.085) * night;

  // extinction: the longer the path through the air, the dimmer the ground
  float slant = min(1.0, uScaleRatio / max(nv, 1e-3));
  colour *= mix(1.0, 0.3, slant);

  gl_FragColor = vec4(colour, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
