// Placeholder black hole: a dark horizon, a photon ring and a hot accretion
// disc. Phase 4 adds the lensing pass that bends the background around it.

import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import vertexShader from '../../shaders/disc.vert.glsl?raw';
import fragmentShader from '../../shaders/disc.frag.glsl?raw';
import { SINGULARITY } from '../layout.js';
import { disposeTree } from '../textures.js';

export function createSingularity() {
  const group = new Group();
  group.position.copy(SINGULARITY.centre);

  const horizon = new Mesh(
    new SphereGeometry(SINGULARITY.horizon, 64, 48),
    new MeshBasicMaterial({ color: 0x000000 })
  );

  const discMaterial = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uInner: { value: SINGULARITY.discInner },
      uOuter: { value: SINGULARITY.discOuter },
      uHot: { value: new Color('#fff4d6').multiplyScalar(2.2) },
      uWarm: { value: new Color('#fbbf24').multiplyScalar(1.3) },
      uCool: { value: new Color('#d946ef').multiplyScalar(0.6) },
      uPresence: { value: 1 },
    },
    blending: AdditiveBlending,
    depthWrite: false,
    transparent: true,
    side: DoubleSide,
  });
  const disc = new Mesh(
    new RingGeometry(SINGULARITY.discInner, SINGULARITY.discOuter, 256, 8),
    discMaterial
  );
  // RingGeometry lies in XY; turn it so its normal matches the layout's disc normal
  disc.quaternion.copy(
    new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), SINGULARITY.normal)
  );

  // photon ring: a thin bright annulus that always faces the viewer
  const ring = new Mesh(
    new RingGeometry(SINGULARITY.horizon * 1.06, SINGULARITY.horizon * 1.16, 128, 1),
    new MeshBasicMaterial({
      color: new Color('#ffe9b8').multiplyScalar(2.5),
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
  );

  group.add(disc, horizon, ring);

  return {
    object: group,
    setPresence(amount) {
      group.visible = amount > 0.001;
      discMaterial.uniforms.uPresence.value = amount;
      ring.material.opacity = amount;
    },
    update(time, camera) {
      discMaterial.uniforms.uTime.value = time;
      ring.lookAt(camera.position);
    },
    dispose() {
      disposeTree(group);
    },
  };
}
