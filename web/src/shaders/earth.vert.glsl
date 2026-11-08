varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vLocalNormal;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vLocalNormal = normal;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
