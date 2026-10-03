// Flat cartoon shading in three bands, so everything looks like a moulded plastic toy.
import * as THREE from 'three';

export const ramp = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255, 190, 190, 190, 255, 255, 255, 255, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;

const toons = new Map();
export const toon = (color, o = {}) => { const k = color + JSON.stringify(o); if (!toons.has(k)) toons.set(k, new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...o })); return toons.get(k); };
// One material for everything whose colours are baked into its shape
export const toyMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp });
