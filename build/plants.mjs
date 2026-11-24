// Vegetation built from textured alpha cards (leaf texture from the reference villa, procedural palm frond)
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from './kit.mjs';

function tint(geo, r, base = 0xffffff, varL = 0.14, varH = 0.03) {
  const c = new THREE.Color(base), hsl = {}; c.getHSL(hsl);
  const n = geo.attributes.position.count, arr = new Float32Array(n * 3), tmp = new THREE.Color();
  for (let i = 0; i < n; i += 4) {
    const dl = (r() - 0.5) * varL, dh = (r() - 0.5) * varH;
    tmp.setHSL(hsl.h + dh, hsl.s, Math.min(1, Math.max(0, hsl.l + dl)));
    for (let k = 0; k < 4 && i + k < n; k++) { arr[(i + k) * 3] = tmp.r; arr[(i + k) * 3 + 1] = tmp.g; arr[(i + k) * 3 + 2] = tmp.b; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}
function solidColor(geo, hex) {
  const c = new THREE.Color(hex), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

// ---------------- palm ----------------
function frondGeo(len, r, droop) {
  const N = 12, pos = [], uv = [], idx = [];
  const spine = (t) => new THREE.Vector3(0, Math.sin(t * Math.PI * 0.6) * len * 0.3 - t * t * len * droop * 0.6, t * len);
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = spine(t), w = len * 0.5, fold = w * 0.28;
    pos.push(p.x - w, p.y - fold, p.z, p.x, p.y, p.z, p.x + w, p.y - fold, p.z);
    uv.push(0, t, 0.5, t, 1, t);
    if (i < N) {
      const a = i * 3, b = a + 3;
      idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function palm(kit, x, y, z, h = 6, seed = 1, group) {
  const r = rng(seed);
  const lean = new THREE.Vector3((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5);
  const segs = 14;
  const top = new THREE.Vector3(x, y, z);
  for (let i = 0; i < segs; i++) {
    const t = i / segs, len = h / segs;
    const rad = 0.18 - t * 0.065;
    const g = new THREE.CylinderGeometry(rad * 0.95, rad * 1.02, len * 1.02, 12, 1, true);
    const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 1.0, uv.getY(k) * 0.4 + i * 0.4);
    solidColor(g, i % 2 ? 0xc9bfae : 0xb8ad9a);
    const dir = new THREE.Vector3(lean.x * t * t, 1, lean.z * t * t).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const mid = top.clone().addScaledVector(dir, len / 2);
    kit.add('Bark', g, new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)), { group });
    top.addScaledVector(dir, len);
  }
  const nf = 14 + Math.floor(r() * 5);
  for (let i = 0; i < nf; i++) {
    const g = frondGeo(2.3 + r() * 1.1, r, 0.55 + r() * 0.6);
    tint(g, r, [0xffffff, 0xf0f5e0, 0xe2ecd0][i % 3], 0.12);
    const yaw = (i / nf) * Math.PI * 2 + r() * 0.35;
    const pitch = -0.55 + r() * 0.75;
    const roll = (r() - 0.5) * 0.5;
    const m = new THREE.Matrix4().makeRotationY(yaw).multiply(new THREE.Matrix4().makeRotationX(pitch)).multiply(new THREE.Matrix4().makeRotationZ(roll));
    m.setPosition(top);
    kit.add('Palm_Frond', g, m, { group });
  }
  // a few dry hanging fronds
  for (let i = 0; i < 3; i++) {
    const g = frondGeo(1.6, r, 1.6);
    tint(g, r, 0xb8a06a, 0.1);
    const m = new THREE.Matrix4().makeRotationY(r() * 6.28).multiply(new THREE.Matrix4().makeRotationX(0.6));
    m.setPosition(top.clone().add(new THREE.Vector3(0, -0.15, 0)));
    kit.add('Palm_Frond', g, m, { group });
  }
}

// ---------------- banana / strelitzia ----------------
function broadLeaf(len, wid, r) {
  const pos = [];
  const N = 10;
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N;
    const y0 = Math.sin(t0 * 1.6) * len * 0.35 - t0 * t0 * len * 0.4, y1 = Math.sin(t1 * 1.6) * len * 0.35 - t1 * t1 * len * 0.4;
    const w0 = Math.sin(Math.max(0.05, t0) * Math.PI) * wid, w1 = Math.sin(Math.max(0.05, t1) * Math.PI) * wid;
    const z0 = t0 * len, z1 = t1 * len;
    for (const s of [-1, 1]) {
      const rag = (r() - 0.5) * 0.04;
      pos.push(0, y0, z0, s * w0, y0 - w0 * 0.25 + rag, z0, 0, y1, z1);
      pos.push(0, y1, z1, s * w0, y0 - w0 * 0.25 + rag, z0, s * w1, y1 - w1 * 0.25, z1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
function shade(geo, r, base, yGrad = 0.25) {
  const c = new THREE.Color(base), hsl = {}; c.getHSL(hsl);
  const p = geo.attributes.position, n = p.count, arr = new Float32Array(n * 3), tmp = new THREE.Color();
  geo.computeBoundingBox(); const y0 = geo.boundingBox.min.y, yr = Math.max(1e-3, geo.boundingBox.max.y - y0);
  for (let i = 0; i < n; i++) {
    const t = (p.getY(i) - y0) / yr;
    tmp.setHSL(hsl.h, hsl.s, Math.min(1, hsl.l * (0.8 + t * yGrad * 2)));
    arr[i * 3] = tmp.r; arr[i * 3 + 1] = tmp.g; arr[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}
export function banana(kit, x, y, z, h = 2.4, seed = 2, group) {
  const r = rng(seed);
  const nl = 7 + Math.floor(r() * 4);
  for (let i = 0; i < nl; i++) {
    const yaw = (i / nl) * Math.PI * 2 + r();
    const sh = h * (0.45 + r() * 0.35);
    const stem = new THREE.CylinderGeometry(0.022, 0.04, sh, 6);
    shade(stem, r, 0x56733a);
    const tilt = 0.15 + r() * 0.25;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, yaw, 0, 'YXZ'));
    const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const mid = new THREE.Vector3(x, y, z).addScaledVector(dir, sh / 2);
    kit.add('Foliage', stem, new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)), { group });
    const top = new THREE.Vector3(x, y, z).addScaledVector(dir, sh);
    const leaf = broadLeaf(1.1 + r() * 0.7, 0.26 + r() * 0.12, r);
    shade(leaf, r, [0x2f5f22, 0x3a6c28, 0x28561d][i % 3], 0.3);
    const m = new THREE.Matrix4().makeRotationY(yaw).multiply(new THREE.Matrix4().makeRotationX(-0.5 - r() * 0.5));
    m.setPosition(top);
    kit.add('Foliage', leaf, m, { group });
  }
}

// ---------------- shrub: dense core + alpha leaf cards ----------------
export function shrub(kit, x, y, z, rad = 0.6, seed = 3, opts = {}) {
  const r = rng(seed);
  const flat = opts.flat ?? 0.8;
  const cy = y + rad * flat * 0.85;
  // core (hidden mostly, kills see-through)
  let core = new THREE.IcosahedronGeometry(rad * 0.72, 2);
  core.deleteAttribute('normal'); core.deleteAttribute('uv');
  core = mergeVertices(core);
  const p = core.attributes.position;
  for (let k = 0; k < p.count; k++) { const f = 0.85 + r() * 0.25; p.setXYZ(k, p.getX(k) * f * (opts.sx ?? 1), p.getY(k) * f * flat, p.getZ(k) * f * (opts.sz ?? 1)); }
  core.computeVertexNormals();
  solidColor(core, opts.core ?? 0x3a5a26);
  core.translate(x, cy, z);
  kit.add('Foliage', core, null, { group: opts.group });
  // cards
  const n = Math.round((opts.cards ?? 10 + rad * 26) * 2.2);
  const pos = [], uv = [], idx = [];
  const nrm = new THREE.Vector3(), t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const u = r() * Math.PI * 2, v = Math.acos(1 - r() * 1.7);
    nrm.set(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u));
    const c = new THREE.Vector3(x + nrm.x * rad * 0.55 * (opts.sx ?? 1), cy + nrm.y * rad * 0.5 * flat, z + nrm.z * rad * 0.55 * (opts.sz ?? 1));
    const s = rad * (0.7 + r() * 0.4);
    const rn = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.9).add(nrm).normalize();
    t1.set(0, 1, 0).cross(rn); if (t1.lengthSq() < 1e-3) t1.set(1, 0, 0); t1.normalize().multiplyScalar(s);
    t2.copy(rn).cross(t1).normalize().multiplyScalar(s);
    const b = pos.length / 3;
    for (const [a, d] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) pos.push(c.x + t1.x * a + t2.x * d, c.y + t1.y * a + t2.y * d, c.z + t1.z * a + t2.z * d);
    const u0 = Math.floor(r() * 2) * 0.5, v0 = Math.floor(r() * 2) * 0.5;
    uv.push(u0, v0, u0 + 0.5, v0, u0 + 0.5, v0 + 0.5, u0, v0 + 0.5);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // bend normals outward for soft, volumetric shading
  const np = g.attributes.normal, pp = g.attributes.position;
  for (let i = 0; i < np.count; i++) {
    const o = new THREE.Vector3(pp.getX(i) - x, (pp.getY(i) - cy) * 1.4, pp.getZ(i) - z).normalize();
    np.setXYZ(i, o.x, o.y, o.z);
  }
  tint(g, r, opts.color ?? 0xffffff, 0.16, 0.04);
  kit.add('Leaves', g, null, { group: opts.group });
}

export function hedge(kit, x0, z0, x1, z1, y, h = 0.9, seed = 4, group) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 0.7));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    shrub(kit, x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t, h * 0.6, seed * 100 + i, { group, flat: 1.3, cards: 14, color: 0xe8f0dc });
  }
}
