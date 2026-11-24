// Builds the house and writes public/models/house.glb + public/models/house.meta.json
//  - architecture & built-ins: procedural (build/house.mjs) with real PBR texture sets
//  - furniture / plants: CC0 Poly Haven models (instanced)
//  - large trees: oak models from the reference villa
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import sharp from 'sharp';
import draco3d from 'draco3dgltf';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRMaterialsEmissiveStrength } from '@gltf-transform/extensions';
import { mergeDocuments, copyToDocument, getBounds, dedup, prune, unpartition, textureCompress, meshopt } from '@gltf-transform/functions';
import { buildHouse, G, U } from './house.mjs';
import { MATS } from './kit.mjs';
import { TEX, frondPNG } from './textures.mjs';
import { fetchAll, REF } from './fetch-assets.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../public/models');
const CACHE = path.join(__dirname, 'cache');
fs.mkdirSync(OUT, { recursive: true });

await fetchAll();
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});

const t0 = Date.now();
const kit = buildHouse();
const parts = kit.build();
console.log(`geometry: ${parts.length} meshes, ${kit.props.length} props, ${kit.oaks.length} oaks (${Date.now() - t0} ms)`);

const doc = new Document();
doc.createBuffer('main');
const ext = doc.createExtension(KHRMaterialsEmissiveStrength);
const scene = doc.createScene('ModernResidence');
const root = doc.createNode('Modern_Two_Story_Residence');
scene.addChild(root);

// ---------------- textures ----------------
const texCache = {};
async function getTex(key) {
  if (texCache[key]) return texCache[key];
  let buf, mime = 'image/jpeg';
  const jpg = path.join(CACHE, 'villa', key + '.jpg'), png = path.join(CACHE, 'villa', key + '.png');
  if (fs.existsSync(jpg)) buf = fs.readFileSync(jpg);
  else if (fs.existsSync(png)) { buf = fs.readFileSync(png); mime = 'image/png'; }
  else if (key === 'frond') { buf = await frondPNG(sharp); mime = 'image/png'; }
  else if (TEX[key]) buf = TEX[key]();
  else throw new Error('missing texture ' + key);
  return (texCache[key] = doc.createTexture(key).setImage(new Uint8Array(buf)).setMimeType(mime).setURI(key + (mime === 'image/png' ? '.png' : '.jpg')));
}

const matCache = {};
async function getMat(name) {
  if (matCache[name]) return matCache[name];
  const d = MATS[name];
  const c = new THREE.Color(d.color);
  const m = doc.createMaterial(name)
    .setBaseColorFactor([c.r, c.g, c.b, d.opacity ?? 1])
    .setRoughnessFactor(d.rough ?? 0.8)
    .setMetallicFactor(d.metal ?? 0)
    .setDoubleSided(!!d.double);
  if (d.blend) m.setAlphaMode('BLEND');
  if (d.alpha) m.setAlphaMode('MASK').setAlphaCutoff(d.alpha);
  if (d.tex?.c) m.setBaseColorTexture(await getTex(d.tex.c));
  if (d.tex?.n) m.setNormalTexture(await getTex(d.tex.n));
  if (d.tex?.r) m.setMetallicRoughnessTexture(await getTex(d.tex.r));
  if (d.emissive) {
    const e = new THREE.Color(d.emissive);
    m.setEmissiveFactor([e.r, e.g, e.b]);
    if (d.strength && d.strength !== 1) m.setExtension('KHR_materials_emissive_strength', ext.createEmissiveStrength().setEmissiveStrength(d.strength));
  }
  return (matCache[name] = m);
}

// ---------------- procedural geometry ----------------
const groups = {};
const groupNode = (g) => {
  if (!groups[g]) { groups[g] = doc.createNode(g); root.addChild(groups[g]); }
  return groups[g];
};
for (const { group, mat, geo } of parts) {
  const prim = doc.createPrimitive().setMaterial(await getMat(mat));
  const acc = (arr, type) => doc.createAccessor().setArray(arr).setType(type);
  prim.setAttribute('POSITION', acc(new Float32Array(geo.attributes.position.array), 'VEC3'));
  prim.setAttribute('NORMAL', acc(new Float32Array(geo.attributes.normal.array), 'VEC3'));
  prim.setAttribute('TEXCOORD_0', acc(new Float32Array(geo.attributes.uv.array), 'VEC2'));
  if (geo.attributes.color) prim.setAttribute('COLOR_0', acc(new Float32Array(geo.attributes.color.array), 'VEC3'));
  const idx = geo.index.array;
  prim.setIndices(acc(geo.attributes.position.count > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), 'SCALAR'));
  const mesh = doc.createMesh(`${group}__${mat}`).addPrimitive(prim);
  groupNode(group).addChild(doc.createNode(`${group}__${mat}`).setMesh(mesh));
}

// ---------------- Poly Haven props (instanced) ----------------
const cloneTree = (n) => {
  const c = doc.createNode(n.getName()).setTranslation(n.getTranslation()).setRotation(n.getRotation()).setScale(n.getScale());
  if (n.getMesh()) c.setMesh(n.getMesh());
  for (const ch of n.listChildren()) c.addChild(cloneTree(ch));
  return c;
};
// villa estate placement: villa coords + offset = our coords (villa ground top is at y=2.2)
const ENV = {
  offset: [-4, -2.2, -6],
  clear: [[-12.5, -11, 11.5, 10.5]],
  clearBushes: [[-15, -12, 13, 19]],
  clearOutside: [[-23, -20, 18, -5], [11.5, -11, 18, 5]], // leftovers of the villa building (decks, roof trims)
  keepMats: ['Dark metal', 'White wood', 'Stone', 'Cobblestone', 'Cobblestone walls', 'Grass', 'Light', 'Constructive wood', 'Modern White wood', 'Old plaster'],
};
const SEATING = new Set(['dining_chair_02', 'modern_arm_chair_01', 'mid_century_lounge_chair', 'sofa_02', 'sofa_03', 'Ottoman_01']);
const templates = {};
for (const id of [...new Set(kit.props.map((p) => p.id))]) {
  const src = await io.read(path.join(CACHE, 'ph', id, `${id}.gltf`));
  const srcScene = src.getRoot().listScenes()[0];
  const b = getBounds(srcScene);
  // Seating: detect which side the backrest is on (highest vertices) and turn the model so its seat faces +Z
  let flip = false;
  if (SEATING.has(id)) {
    const pts = [];
    srcScene.traverse((n) => {
      const mesh = n.getMesh(); if (!mesh) return;
      const wm = new THREE.Matrix4().fromArray(n.getWorldMatrix());
      for (const pr of mesh.listPrimitives()) {
        const a = pr.getAttribute('POSITION'), v = [0, 0, 0];
        for (let i = 0; i < a.getCount(); i += 7) { a.getElement(i, v); pts.push(new THREE.Vector3(...v).applyMatrix4(wm)); }
      }
    });
    const cz = (b.min[2] + b.max[2]) / 2, top = b.max[1];
    const hi = pts.filter((p) => p.y > top * 0.82);
    const hz = hi.reduce((s2, p) => s2 + p.z, 0) / Math.max(1, hi.length);
    flip = hz > cz;
    console.log(`  ${id}: backrest at ${flip ? '+Z -> turned 180' : '-Z (ok)'}`);
  }
  const map = mergeDocuments(doc, src);
  const s2 = map.get(srcScene);
  let roots = s2.listChildren();
  roots.forEach((r) => s2.removeChild(r));
  s2.dispose();
  let min = b.min, max = b.max;
  if (flip) {
    const w = doc.createNode(id + '_turned').setRotation([0, 1, 0, 0]);
    roots.forEach((r) => w.addChild(r));
    roots = [w];
    min = [-b.max[0], b.min[1], -b.max[2]]; max = [-b.min[0], b.max[1], -b.min[2]];
  }
  templates[id] = { roots, min, max };
}
const counts = {};
for (const p of kit.props) {
  const t = templates[p.id];
  counts[p.id] = (counts[p.id] || 0) + 1;
  const node = doc.createNode(`${p.id}_${counts[p.id]}`).setMatrix(p.m);
  for (const r of t.roots) node.addChild(cloneTree(r));
  groupNode(p.group).addChild(node);
  if (p.col) {
    const M = new THREE.Matrix4().fromArray(p.m);
    const bb = new THREE.Box3();
    for (const x of [t.min[0], t.max[0]]) for (const y of [t.min[1], t.max[1]]) for (const z of [t.min[2], t.max[2]]) bb.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(M));
    kit.colliders.push([bb.min.x + 0.04, bb.min.y, bb.min.z + 0.04, bb.max.x - 0.04, bb.max.y, bb.max.z - 0.04].map((v) => +v.toFixed(3)));
  }
}
console.log(`props: ${Object.keys(templates).length} models, ${kit.props.length} instances`);

// ---------------- oak trees from the reference villa ----------------
if (kit.oaks.length) {
  const villa = await io.read(`${REF}/villa.glb`);
  const leafTex = await getTex('oak_leaf');
  const oakMeshes = {};
  for (const name of [...new Set(kit.oaks.map((o) => o.name))]) {
    const n = villa.getRoot().listNodes().find((x) => x.getName() === name);
    const map = copyToDocument(doc, villa, [n.getMesh()]);
    const mesh = map.get(n.getMesh());
    // trunk position = bark accessor bounds center at its lowest part
    const bark = mesh.listPrimitives().find((p) => p.getMaterial()?.getName().includes('Bark'));
    const pos = bark.getAttribute('POSITION');
    let minY = Infinity, sx = 0, sz = 0, cnt = 0;
    const v = [0, 0, 0];
    for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, v); if (v[1] < minY) minY = v[1]; }
    for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, v); if (v[1] < minY + 1.0) { sx += v[0]; sz += v[2]; cnt++; } }
    for (const p of mesh.listPrimitives()) {
      const m = p.getMaterial();
      if (m?.getName().includes('Leaf')) m.setBaseColorTexture(leafTex).setAlphaMode('MASK').setAlphaCutoff(0.5).setDoubleSided(true);
    }
    oakMeshes[name] = { mesh, off: [-sx / cnt, -minY, -sz / cnt] };
  }
  for (const o of kit.oaks) {
    const { mesh, off } = oakMeshes[o.name];
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), o.yaw);
    const place = doc.createNode(`Tree_${o.name}`).setTranslation([o.x, 0, o.z]).setRotation(q.toArray()).setScale([o.scale, o.scale, o.scale]);
    place.addChild(doc.createNode(o.name).setTranslation(off).setMesh(mesh));
    groupNode('SITE_Trees').addChild(place);
  }
  // ---------------- the reference villa's estate around our house ----------------
  // ground, perimeter walls/fence, cobblestone paths, pergola, garden lights and the dense hedges.
  // Everything inside CLEAR (our house + its garden) is cut away; villa building parts are skipped.
  const OFF = ENV.offset;
  const inClear = (x, z) => ENV.clear.some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
  const leaves = await getTex('leaves');
  for (const name of ['GROUND', 'F_BUSHES_L', 'F_BUSHES_X', 'V_OUTSIDE_H']) {
    const src = villa.getRoot().listNodes().find((x) => x.getName() === name);
    const mesh = copyToDocument(doc, villa, [src.getMesh()]).get(src.getMesh());
    let kept = 0, dropped = 0;
    for (const prim of mesh.listPrimitives()) {
      const mname = prim.getMaterial()?.getName() || '';
      if (name === 'V_OUTSIDE_H' && !ENV.keepMats.includes(mname)) { mesh.removePrimitive(prim); continue; }
      const pos = prim.getAttribute('POSITION'), idx = prim.getIndices();
      const n = idx ? idx.getCount() : pos.getCount();
      const out = [], a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0];
      for (let t = 0; t < n; t += 3) {
        const i0 = idx ? idx.getScalar(t) : t, i1 = idx ? idx.getScalar(t + 1) : t + 1, i2 = idx ? idx.getScalar(t + 2) : t + 2;
        pos.getElement(i0, a); pos.getElement(i1, b); pos.getElement(i2, c);
        const cx = (a[0] + b[0] + c[0]) / 3 + OFF[0], cz = (a[2] + b[2] + c[2]) / 3 + OFF[2];
        if (inClear(cx, cz) || (name === 'V_OUTSIDE_H' && ENV.clearOutside.some(([x0, z0, x1, z1]) => cx > x0 && cx < x1 && cz > z0 && cz < z1)) || (name.startsWith('F_BUSHES') && ENV.clearBushes.some(([x0, z0, x1, z1]) => cx > x0 && cx < x1 && cz > z0 && cz < z1))) { dropped++; continue; }
        out.push(i0, i1, i2); kept++;
      }
      if (!out.length) { mesh.removePrimitive(prim); continue; }
      const arr = pos.getCount() > 65535 ? new Uint32Array(out) : new Uint16Array(out);
      prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(arr));
      if (mname === 'SHC leaves') {
        prim.getMaterial().setBaseColorTexture(leaves).setAlphaMode('MASK').setAlphaCutoff(0.45).setDoubleSided(true).setBaseColorFactor([1.15, 1.2, 1.05, 1]).setRoughnessFactor(0.8);
        prim.setAttribute('COLOR_0', null);
      }
    }
    groupNode('SITE_Estate').addChild(doc.createNode('Estate_' + name).setTranslation(OFF).setMesh(mesh));
    console.log(`  estate ${name}: kept ${kept} tris, cut ${dropped}`);
  }
  for (const e of doc.getRoot().listExtensionsUsed()) if (e.extensionName === 'KHR_draco_mesh_compression') e.dispose();
}

// ---------------- optimise & write ----------------
await doc.transform(
  unpartition(),
  dedup(),
  prune({ keepLeaves: false }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 82, resize: [2048, 2048] }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
const glb = await io.writeBinary(doc);
fs.writeFileSync(path.join(OUT, 'house.glb'), glb);

const meta = {
  name: 'Modern Two-Story Residence',
  levels: [{ name: 'Ground Floor', y: G }, { name: 'Second Floor', y: U }],
  colliders: kit.colliders,
  rooms: kit.rooms,
  spots: kit.spots,
  lights: kit.lights,
  credits: 'Furniture & plants: Poly Haven (CC0). Oak trees & PBR textures: reference villa assets (SHC / ambientCG / Poly Haven).',
};
fs.writeFileSync(path.join(OUT, 'house.meta.json'), JSON.stringify(meta));
console.log(`house.glb ${(glb.byteLength / 1e6).toFixed(1)} MB in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
