// The Capabilities nebula: Hubble's Veil, its stars removed, laid out as three
// layers of light a few hundred units apart (see shaders/nebula.frag.glsl).
// From the station they line up into the photograph; from anywhere else they
// part, and the nebula has depth. The image loads after the opening is on
// screen and fades in; until it arrives the sky simply has no nebula.

import { AdditiveBlending, Group, Matrix4, Mesh, PlaneGeometry, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector3 } from 'three';
import { NEBULA, UP } from '../layout.js';
import { disposeTree } from '../textures.js';
import vertexShader from '../../shaders/nebula.vert.glsl?raw';
import fragmentShader from '../../shaders/nebula.frag.glsl?raw';
import veilUrl from '../../assets/space/nebula-veil-2048.webp?url';

// detail band, depth towards the station, brightness and ripple phase of each layer
const LAYERS = [
  { layer: 0, depth: -700, intensity: 0.22, phase: 0 },
  { layer: 1, depth: 0, intensity: 0.3, phase: 1.7 },
  { layer: 2, depth: 420, intensity: 0.26, phase: 3.1 },
];
const FADE_IN = 2.5; // seconds for the image to come up once loaded

export function createNebula({ renderer }) {
  const group = new Group();
  group.position.copy(NEBULA.centre);
  // local +Z faces the station and +Y is up its sky; then the image's roll
  const right = new Vector3().crossVectors(UP, NEBULA.facing).normalize();
  const up = new Vector3().crossVectors(NEBULA.facing, right);
  group.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(right, up, NEBULA.facing));
  group.rotateZ(NEBULA.roll);
  group.visible = false;

  const shared = {
    uMap: { value: null },
    uTime: { value: 0 },
    uPresence: { value: 0 },
    uNormal: { value: NEBULA.facing },
  };
  const geometry = new PlaneGeometry(NEBULA.width, NEBULA.width / NEBULA.aspect);
  for (const { layer, depth, intensity, phase } of LAYERS) {
    const sheet = new Mesh(
      geometry,
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        defines: { LAYER: layer },
        uniforms: { ...shared, uIntensity: { value: intensity }, uPhase: { value: phase } },
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
      })
    );
    // sized so that from the station every layer covers the same patch of sky
    sheet.position.z = depth;
    sheet.scale.setScalar((NEBULA.viewDistance - depth) / NEBULA.viewDistance);
    group.add(sheet);
  }

  let presence = 0;
  let shown = 0; // 0 → 1 as the image fades in
  let loaded = false;
  let last = 0;

  return {
    object: group,
    /** Fetch the image; the nebula fades in once it's decoded. */
    load() {
      return new TextureLoader().loadAsync(veilUrl).then((texture) => {
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        shared.uMap.value = texture;
        loaded = true;
      });
    },
    setPresence(amount) {
      presence = amount;
    },
    update(time) {
      const dt = Math.max(0, time - last);
      last = time;
      if (loaded) shown = Math.min(1, shown + (dt > 0 ? dt / FADE_IN : 1));
      shared.uTime.value = time;
      shared.uPresence.value = presence * shown;
      group.visible = loaded && shared.uPresence.value > 0.001;
    },
    dispose() {
      disposeTree(group);
    },
  };
}
