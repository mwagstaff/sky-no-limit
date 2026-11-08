// A tapered streak between two world points, built in screen space so its
// width is in pixels however far away it is. position.x runs tail (-0.5) to
// head (+0.5); position.y runs across.
uniform vec3 uHead;
uniform vec3 uTail;
uniform vec2 uResolution; // drawing-buffer pixels
uniform float uHeadWidth; // pixels
uniform float uTailWidth;

varying float vAlong;
varying float vAcross;

void main() {
  float s = position.x + 0.5;
  vec4 head = projectionMatrix * viewMatrix * vec4(uHead, 1.0);
  vec4 tail = projectionMatrix * viewMatrix * vec4(uTail, 1.0);
  vec2 headScreen = head.xy / head.w * uResolution;
  vec2 tailScreen = tail.xy / tail.w * uResolution;
  vec2 dir = headScreen - tailScreen;
  dir = length(dir) > 1e-4 ? normalize(dir) : vec2(1.0, 0.0);

  vec4 clip = mix(tail, head, s);
  float width = mix(uTailWidth, uHeadWidth, s);
  clip.xy += vec2(-dir.y, dir.x) * position.y * width * 2.0 / uResolution * clip.w;

  // either end behind the camera: collapse rather than smear across the screen
  if (head.w <= 0.0 || tail.w <= 0.0) clip = vec4(0.0, 0.0, 2.0, 1.0);
  gl_Position = clip;
  vAlong = s;
  vAcross = position.y * 2.0;
}
