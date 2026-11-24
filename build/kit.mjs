// Geometry kit: collects geometry per (group, material), colliders, lights, rooms.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------- material library ----------
// tex: texture key (TEX), tile: meters per texture repeat (world UV)
export const MATS = {
  Plaster_White:  { color: 0xf4f2ee, rough: 1, tex: { n: 'wplaster_n', r: 'wplaster_r' }, tile: 3 },
  Concrete_Gray:  { color: 0xb8b8b4, rough: 0.9, tex: { c: 'concrete_c', n: 'concrete_n', r: 'concrete_r' }, tile: 3 },
  Granite_Dark:   { color: 0xffffff, rough: 0.42, tex: { c: 'granite', n: 'plaster_n' }, tile: 1.2 },
  Metal_Dark:     { color: 0x232527, rough: 0.55, metal: 0.6, tex: { n: 'metal_n' }, tile: 1 },
  Soffit_Slats:   { color: 0xffffff, rough: 0.6, tex: { c: 'slats' }, tile: 2 },
  Glass:          { color: 0x51656f, rough: 0.02, metal: 0.3, opacity: 0.32, blend: true },
  Glass_Rail:     { color: 0xd6e8ec, rough: 0.03, metal: 0.1, opacity: 0.16, blend: true },
  Curtain_Sheer:  { color: 0xf4f0e6, rough: 0.95, opacity: 0.55, blend: true, double: true },
  Wood_Oak_Floor: { color: 0xffffff, rough: 1, tex: { c: 'floor_c', n: 'floor_n', r: 'floor_r' }, tile: 2.2 },
  Stone_Pavers:   { color: 0xffffff, rough: 0.8, tex: { c: 'pavers', n: 'concrete_n' }, tile: 2.4 },
  Marble:         { color: 0xffffff, rough: 1, tex: { c: 'marble_c', n: 'marble_n', r: 'marble_r' }, tile: 1.6 },
  Marble_Floor:   { color: 0xeceae6, rough: 1, tex: { c: 'marble_c', n: 'marble_n', r: 'marble_r' }, tile: 1.2 },
  Wall_Interior:  { color: 0xf4f0e8, rough: 1, tex: { n: 'drywall_n', r: 'drywall_r' }, tile: 2 },
  Ceiling:        { color: 0xf7f5f0, rough: 1, tex: { n: 'drywall_n', r: 'drywall_r' }, tile: 2 },
  Stone_Feature:  { color: 0xffffff, rough: 0.8, tex: { c: 'stoneclad', n: 'concrete_n' }, tile: 1.5 },
  Wood_Walnut:    { color: 0x9a7a62, rough: 1, tex: { c: 'wood_c', n: 'wood_n', r: 'wood_r' }, tile: 1.2 },
  Fabric_Linen:   { color: 0xe6ddd0, rough: 1, tex: { c: 'fabric_c', n: 'fabric_n', r: 'fabric_r' }, tile: 0.7 },
  Fabric_Charcoal:{ color: 0x6a6c70, rough: 1, tex: { c: 'fabric_c', n: 'fabric_n', r: 'fabric_r' }, tile: 0.7 },
  Fabric_Sage:    { color: 0xa9b597, rough: 1, tex: { c: 'fabric_c', n: 'fabric_n', r: 'fabric_r' }, tile: 0.7 },
  Fabric_Rust:    { color: 0xc77d55, rough: 1, tex: { c: 'fabric_c', n: 'fabric_n', r: 'fabric_r' }, tile: 0.7 },
  Leather_Cognac: { color: 0xffffff, rough: 1, tex: { c: 'leather_c', n: 'leather_n', r: 'leather_r' }, tile: 0.8 },
  Bedding_White:  { color: 0xfbf9f5, rough: 1, tex: { n: 'fabric_n', r: 'fabric_r' }, tile: 0.6 },
  Rug_Wool:       { color: 0xe8e0d2, rough: 1, tex: { c: 'carpet_c', n: 'carpet_n', r: 'carpet_r' }, tile: 1.2 },
  Rug_Dark:       { color: 0x7a746c, rough: 1, tex: { c: 'carpet_c', n: 'carpet_n', r: 'carpet_r' }, tile: 1.2 },
  Lacquer_White:  { color: 0xeeebe5, rough: 0.6, tex: { n: 'wwood_n' }, tile: 1.5 },
  Lacquer_Black:  { color: 0x222326, rough: 0.45, tex: { n: 'wwood_n' }, tile: 1.5 },
  Metal_Brass:    { color: 0xc59d5f, rough: 0.28, metal: 1 },
  Metal_Black:    { color: 0x18191b, rough: 0.4, metal: 0.6 },
  Metal_Steel:    { color: 0xb9bcc0, rough: 0.25, metal: 1 },
  Ceramic_White:  { color: 0xfafaf8, rough: 0.12 },
  Mirror:         { color: 0xe8eef0, rough: 0.0, metal: 1 },
  Screen_Black:   { color: 0x0b0c0e, rough: 0.12, metal: 0.3 },
  Emissive_Warm:  { color: 0xfff1d8, rough: 0.5, emissive: 0xffe2b0, strength: 4 },
  Lamp_Shade:     { color: 0xf3e7d0, rough: 0.9, emissive: 0xffd9a0, strength: 1.2, double: true },
  Art_Gold:       { color: 0xc9a45c, rough: 0.8 },
  Art_Teal:       { color: 0x2f5a63, rough: 0.85 },
  Art_Terracotta: { color: 0xb86a4b, rough: 0.85 },
  Art_Cream:      { color: 0xe9dfcc, rough: 0.85 },
  Grass:          { color: 0xd8e6c8, rough: 1, tex: { c: 'grass_c', n: 'grass_n' }, tile: 2.2 },
  Soil:           { color: 0xffffff, rough: 1, tex: { c: 'soil_c', n: 'soil_n' }, tile: 1.5 },
  Bark:           { color: 0xffffff, rough: 0.95, vcol: true, tex: { c: 'bark_c', n: 'bark_n' } },
  Foliage:        { color: 0xffffff, rough: 0.75, vcol: true, double: true },
  Leaves:         { color: 0xffffff, rough: 0.7, vcol: true, double: true, alpha: 0.45, tex: { c: 'leaves' } },
  Palm_Frond:     { color: 0xffffff, rough: 0.65, vcol: true, double: true, alpha: 0.4, tex: { c: 'frond' } },
  Pot_Ceramic:    { color: 0x2f3134, rough: 0.6 },
  Pot_Terracotta: { color: 0xb2785a, rough: 0.85 },
  Books:          { color: 0xffffff, rough: 0.8, vcol: true },
};

// ---------- builder ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
export const Y = new THREE.Vector3(0, 1, 0);

export class Kit {
  constructor() {
    this.buckets = new Map(); // group -> mat -> geoms[]
    this.colliders = [];
    this.lights = [];
    this.rooms = [];
    this.spots = [];
    this.props = [];
    this.oaks = [];
    this.group = 'SITE';
  }
  // local frame: position + yaw (radians)
  frame(x = 0, y = 0, z = 0, yaw = 0, parent = null) {
    const m = new THREE.Matrix4().compose(_v.set(x, y, z), _q.setFromAxisAngle(Y, yaw), _s);
    return parent ? parent.clone().multiply(m) : m;
  }
  add(mat, geo, matrix, opts = {}) {
    if (!MATS[mat]) throw new Error('unknown mat ' + mat);
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    const def = MATS[mat];
    if (def.vcol) {
      if (!g.attributes.color) {
        const c = new THREE.Color(opts.color ?? 0xffffff);
        const n = g.attributes.position.count, arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
        g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      }
    } else if (g.attributes.color) g.deleteAttribute('color');
    if (def.tile && !opts.keepUV) worldUV(g, def.tile);
    if (!g.attributes.uv) { const n = g.attributes.position.count; g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2)); }
    const grp = opts.group || this.group;
    if (!this.buckets.has(grp)) this.buckets.set(grp, new Map());
    const b = this.buckets.get(grp);
    if (!b.has(mat)) b.set(mat, []);
    b.get(mat).push(g);
    if (opts.col) {
      g.computeBoundingBox();
      const bb = g.boundingBox;
      this.colliders.push([bb.min.x, bb.min.y, bb.min.z, bb.max.x, bb.max.y, bb.max.z].map((v) => +v.toFixed(3)));
    }
    return g;
  }
  // axis-aligned box in a local frame m, centered at (x,y,z) local, size w,h,d
  box(m, mat, w, h, d, x, y, z, opts = {}) {
    const geo = new THREE.BoxGeometry(w, h, d);
    geo.translate(x, y, z);
    return this.add(mat, geo, m, opts);
  }
  // world-space AABB box from min/max (no frame)
  aabb(mat, x0, y0, z0, x1, y1, z1, opts = {}) {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
    const geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    geo.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return this.add(mat, geo, null, opts);
  }
  cyl(m, mat, rt, rb, h, x, y, z, seg = 24, opts = {}) {
    const geo = new THREE.CylinderGeometry(rt, rb, h, seg);
    geo.translate(x, y, z);
    return this.add(mat, geo, m, opts);
  }
  sphere(m, mat, r, x, y, z, opts = {}) {
    const geo = new THREE.SphereGeometry(r, 20, 14);
    if (opts.sy) geo.scale(1, opts.sy, 1);
    geo.translate(x, y, z);
    return this.add(mat, geo, m, opts);
  }
  // rounded box (soft cushions)
  rbox(m, mat, w, h, d, x, y, z, r = 0.05, opts = {}) {
    const shape = new THREE.Shape();
    const hw = w / 2 - r, hh = h / 2 - r;
    shape.moveTo(-hw, -h / 2);
    shape.lineTo(hw, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -hh);
    shape.lineTo(w / 2, hh); shape.quadraticCurveTo(w / 2, h / 2, hw, h / 2);
    shape.lineTo(-hw, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, hh);
    shape.lineTo(-w / 2, -hh); shape.quadraticCurveTo(-w / 2, -h / 2, -hw, -h / 2);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.6, bevelSegments: 3, curveSegments: 4 });
    geo.translate(x, y, z - (d - 2 * r) / 2);
    return this.add(mat, geo, m, opts);
  }
  // real-asset instances (Poly Haven CC0 models); m = placement matrix. Model front faces +Z.
  prop(id, m, opts = {}) { this.props.push({ id, m: m.elements.slice(), group: opts.group || this.group, col: opts.col ?? true }); }
  propAt(id, x, y, z, yaw = 0, opts = {}) { this.prop(id, this.frame(x, y, z, yaw), opts); }
  oak(name, x, z, scale = 1, yaw = 0) { this.oaks.push({ name, x, z, scale, yaw }); }
  light(x, y, z, color = 0xffd7a8, intensity = 6, distance = 9) { this.lights.push({ p: [x, y, z].map((v) => +v.toFixed(2)), color, intensity, distance }); }
  room(name, level, x0, z0, x1, z1) { this.rooms.push({ name, level, rect: [x0, z0, x1, z1] }); }
  spot(name, x, y, z, yaw, pitch = 0) { this.spots.push({ name, p: [x, y, z], yaw, pitch }); }

  // wall along X (fixed z) or Z (fixed x) with openings [{a,b,y0,y1,glass}] in local wall coords (absolute along-axis)
  wall(axis, fixed, from, to, y0, y1, t, mat, openings = [], opts = {}) {
    const ops = openings.slice().sort((p, q) => p.a - q.a);
    const seg = (a, b, ya, yb) => {
      if (b - a < 1e-3 || yb - ya < 1e-3) return;
      if (axis === 'x') this.aabb(mat, a, ya, fixed - t / 2, b, yb, fixed + t / 2, { col: true, ...opts });
      else this.aabb(mat, fixed - t / 2, ya, a, fixed + t / 2, yb, b, { col: true, ...opts });
    };
    let cur = from;
    for (const o of ops) {
      seg(cur, o.a, y0, y1);
      seg(o.a, o.b, y0, o.y0 ?? y0);
      seg(o.a, o.b, o.y1 ?? y1, y1);
      if (o.glass) this.glazing(axis, fixed, o.a, o.b, o.y0 ?? y0, o.y1 ?? y1, { div: o.div, transom: o.transom });
      cur = o.b;
    }
    seg(cur, to, y0, y1);
  }

  // glass panel with dark slim mullions
  glazing(axis, fixed, a, b, y0, y1, { div = 1.2, transom = null, frame = 0.05, depth = 0.07, mat = 'Glass', group } = {}) {
    const o = group ? { group } : {};
    const A = (x0, ya, x1, yb, th, m, col) => {
      if (axis === 'x') this.aabb(m, x0, ya, fixed - th / 2, x1, yb, fixed + th / 2, { col, ...o });
      else this.aabb(m, fixed - th / 2, ya, x0, fixed + th / 2, yb, x1, { col, ...o });
    };
    A(a, y0, b, y1, 0.02, mat, true);
    const n = Math.max(1, Math.round((b - a) / div));
    for (let i = 0; i <= n; i++) {
      const p = a + ((b - a) * i) / n;
      A(Math.max(a, p - frame / 2), y0, Math.min(b, p + frame / 2), y1, depth, 'Metal_Dark');
    }
    A(a, y0, b, y0 + frame, depth, 'Metal_Dark');
    A(a, y1 - frame, b, y1, depth, 'Metal_Dark');
    if (transom) A(a, transom - frame / 2, b, transom + frame / 2, depth, 'Metal_Dark');
  }

  build() {
    const out = [];
    for (const [grp, mats] of this.buckets) {
      for (const [mat, geos] of mats) {
        let merged = mergeGeometries(geos, false);
        merged = mergeVertices(merged, 1e-4);
        out.push({ group: grp, mat, geo: merged });
      }
    }
    return out;
  }
}

// planar-projected world UVs, per triangle dominant axis
export function worldUV(g, tile) {
  const p = g.attributes.position, n = g.attributes.normal, cnt = p.count;
  const uv = new Float32Array(cnt * 2);
  for (let i = 0; i < cnt; i += 3) {
    // face normal from first vertex normal (boxes are flat)
    let nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < 3; k++) { nx += n.getX(i + k); ny += n.getY(i + k); nz += n.getZ(i + k); }
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    for (let k = 0; k < 3; k++) {
      const x = p.getX(i + k), y = p.getY(i + k), z = p.getZ(i + k);
      let u, v;
      if (ay >= ax && ay >= az) { u = x; v = z; }
      else if (ax >= az) { u = z; v = -y; }
      else { u = x; v = -y; }
      uv[(i + k) * 2] = u / tile; uv[(i + k) * 2 + 1] = v / tile;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5) >>> 0), (((s ^ (s >>> 7)) >>> 0) % 100000) / 100000);
}
