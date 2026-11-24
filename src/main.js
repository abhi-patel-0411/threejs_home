import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// GTAO that ignores glass / curtains / sky (they would otherwise hide interior AO)
class HouseAO extends GTAOPass {
  overrideVisibility() {
    const cache = this._visibilityCache;
    this.scene.traverse((o) => { cache.set(o, o.visible); if (o.isPoints || o.isLine || o.userData.noAO) o.visible = false; });
  }
}

const $ = (s) => document.querySelector(s);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');

// ------------------------------------------------------------------ renderer
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
let quality = isTouch ? 'perf' : 'high';
const setPR = () => renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 2 : 1.25));
setPR();
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 600);
camera.rotation.order = 'YXZ';

// ------------------------------------------------------------------ sky & lights
const sun = new THREE.DirectionalLight(0xfff1dc, 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 120 });
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.025;
sun.shadow.radius = 3;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xdfe9f5, 0x5b6a45, 0.35);
scene.add(hemi);

const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null;
// HDR sky (from the reference project): background + image-based lighting; the sun direction is found from its brightest pixel
const HDR = { tex: null, env: null, sunDir: new THREE.Vector3(-0.5, 0.65, 0.55).normalize(), horizon: new THREE.Color(0xc8d4dc) };
async function loadHDR() {
  const t = await new RGBELoader().setDataType(THREE.FloatType).loadAsync('env/sky.hdr');
  t.mapping = THREE.EquirectangularReflectionMapping;
  const { data, width: W, height: H } = t.image;
  let best = -1, bi = 0;
  for (let i = 0; i < W * H; i++) { const l = data[i * 4] * 0.2126 + data[i * 4 + 1] * 0.7152 + data[i * 4 + 2] * 0.0722; if (l > best) { best = l; bi = i; } }
  const px = bi % W, py = Math.floor(bi / W);
  const lat = (0.5 - (py + 0.5) / H) * Math.PI, lon = ((px + 0.5) / W - 0.5) * Math.PI * 2;
  HDR.sunDir.set(Math.cos(lon) * Math.cos(lat), Math.sin(lat), Math.sin(lon) * Math.cos(lat)).normalize();
  if (HDR.sunDir.y < 0.05) HDR.sunDir.set(-0.5, 0.65, 0.55).normalize(); // fallback
  // horizon colour for the fog
  const row = Math.floor(H * 0.49); let r = 0, g = 0, b = 0;
  for (let x = 0; x < W; x++) { const i = (row * W + x) * 4; r += data[i]; g += data[i + 1]; b += data[i + 2]; }
  const s = Math.max(r, g, b) / W; HDR.horizon.setRGB(r / W / s, g / W / s, b / W / s).multiplyScalar(0.82);
  HDR.tex = t;
  HDR.env = pmrem.fromEquirectangular(t);
}

// ------------------------------------------------------------------ post
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const ao = new HouseAO(scene, camera, innerWidth, innerHeight);
ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.6, thickness: 1.2, scale: 1.0, samples: 16 });
ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
ao.blendIntensity = 0.9;
composer.addPass(ao);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.25, 0.6, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ------------------------------------------------------------------ state
let meta = null, house = null;
const groups = {};           // name -> Object3D
const emissiveMats = [];     // [material, baseIntensity]
const pointLights = [];
let night = false;
let mode = 'intro';          // intro | walk | aerial
const INTERIOR = /^(Wall_Interior|Ceiling|Wood_Oak_Floor|Wood_Walnut|Stone_Feature|Fabric_|Rug_|Bedding|Lacquer|Leather|Marble|Books|Curtain_Dark)/;
const EYE = 1.62, RADIUS = 0.27, STEP = 0.36, BODY = 1.75;
const player = { pos: new THREE.Vector3(-0.8, 0, 15.5), vel: new THREE.Vector3(), vy: 0, yaw: 0, pitch: -0.02, camY: EYE, grounded: true };

// ------------------------------------------------------------------ environment / time of day
function applyTimeOfDay() {
  if (!HDR.env) return; // called again once the HDR is loaded
  if (night) {
    // moonlight from the front-right
    sun.position.set(14, 26, 22); sun.color.set(0x9db4ff); sun.intensity = 0.35;
    hemi.intensity = 0.06; hemi.color.set(0x6d7fa8);
    scene.background = new THREE.Color(0x0a1020);
    renderer.toneMappingExposure = 1.05;
    bloom.strength = 0.42; bloom.threshold = 0.85; bloom.radius = 0.5;
    scene.fog = new THREE.FogExp2(0x0a1020, 0.012);
    if (!envRT) { const ns = new THREE.Scene(); ns.background = new THREE.Color(0x1a2338); envRT = pmrem.fromScene(ns, 0.04); }
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.22;
  } else {
    sun.position.copy(HDR.sunDir).multiplyScalar(45); sun.color.set(0xfff0de); sun.intensity = 2.6;
    hemi.intensity = 0.06; hemi.color.set(0xdfe9f5);
    scene.background = HDR.tex; scene.backgroundIntensity = 1.0;
    renderer.toneMappingExposure = 0.95;
    bloom.strength = 0.12; bloom.threshold = 1.2;
    scene.fog = new THREE.FogExp2(HDR.horizon, 0.0035);
    scene.environment = HDR.env.texture;
    scene.environmentIntensity = 1.0;
  }
  for (const [m, base] of emissiveMats) m.emissiveIntensity = base * (night ? (m.name === 'Lamp_Shade' ? 0.8 : 1.1) : 0.6);
  for (const l of pointLights) { l.intensity = l.userData.base * (night ? 14 : 5); l.visible = night || quality === 'high'; }
  $('#dnLabel').textContent = night ? 'Day' : 'Night';
  document.querySelector('[data-act=night]').classList.toggle('on', night);
}

// ------------------------------------------------------------------ loading
const manager = new THREE.LoadingManager();
const loader = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
const setProgress = (p, msg) => { $('#barFill').style.width = `${Math.round(p * 100)}%`; $('#pct').textContent = msg ?? `${Math.round(p * 100)}%`; };

async function load() {
  meta = await fetch('models/house.meta.json').then((r) => r.json());
  await loadHDR();
  const gltf = await loader.loadAsync('models/house.glb', (e) => {
    const total = e.total || 48e6;
    setProgress(Math.min(0.98, e.loaded / total), `Loading model · ${(e.loaded / 1e6).toFixed(1)} MB`);
  });
  house = gltf.scene;
  house.traverse((o) => {
    if (o.name && o.children.length && !o.isMesh) groups[o.name] = o;
    if (!o.isMesh) return;
    const m = o.material;
    const name = m.name || '';
    if (m.map) { m.map.anisotropy = renderer.capabilities.getMaxAnisotropy(); }
    const transparent = m.transparent || name.startsWith('Glass') || name.startsWith('Curtain_Sheer');
    o.castShadow = !transparent && !name.startsWith('Emissive');
    o.receiveShadow = !name.startsWith('Emissive');
    if (transparent || name.startsWith('Emissive')) o.userData.noAO = true;
    if (INTERIOR.test(name)) m.envMapIntensity = 0.6;
    if (m.alphaTest > 0 || m.alphaMap) { o.castShadow = true; m.side = THREE.DoubleSide; }
    if (name.startsWith('Glass')) {
      m.depthWrite = false; m.envMapIntensity = 2.2; m.side = THREE.DoubleSide;
      o.renderOrder = 2;
    }
    if (name === 'Curtain_Sheer') { m.depthWrite = false; o.renderOrder = 1; m.side = THREE.DoubleSide; }
    if (name === 'Mirror') m.envMapIntensity = 1.5;
    if (name === 'Foliage') { m.side = THREE.DoubleSide; o.castShadow = true; }
    if (m.emissive && m.emissiveIntensity > 0 && (m.emissive.r + m.emissive.g + m.emissive.b) > 0) emissiveMats.push([m, m.emissiveIntensity]);
  });
  scene.add(house);
  for (const L of meta.lights) {
    const l = new THREE.PointLight(L.color, 0, L.distance, 2);
    l.position.fromArray(L.p); l.userData.base = L.intensity;
    pointLights.push(l); scene.add(l);
  }
  buildRoomsUI();
  applyTimeOfDay();
  setProgress(1, 'Ready');
  renderer.compile(scene, camera);
  $('#enter').disabled = false; $('#enterAerial').disabled = false;
  $('#enter').textContent = isTouch ? 'Start the tour' : 'Start the tour';
}
load().catch((e) => { console.error(e); $('#pct').textContent = 'Could not load the model: ' + e.message; });

// ------------------------------------------------------------------ collision
function groundAt(x, z, feet) {
  let best = -Infinity;
  const r = 0.12;
  for (const c of meta.colliders) {
    if (x < c[0] - r || x > c[3] + r || z < c[2] - r || z > c[5] + r) continue;
    const top = c[4];
    if (top <= feet + STEP && top > best) best = top;
  }
  return best === -Infinity ? 0 : best;
}
function resolve(p) {
  for (let iter = 0; iter < 3; iter++) {
    let hit = false;
    for (const c of meta.colliders) {
      if (c[4] <= p.y + STEP || c[1] >= p.y + BODY) continue;
      const x0 = c[0] - RADIUS, x1 = c[3] + RADIUS, z0 = c[2] - RADIUS, z1 = c[5] + RADIUS;
      if (p.x <= x0 || p.x >= x1 || p.z <= z0 || p.z >= z1) continue;
      const dl = p.x - x0, dr = x1 - p.x, db = p.z - z0, df = z1 - p.z;
      const m = Math.min(dl, dr, db, df);
      if (m === dl) p.x = x0; else if (m === dr) p.x = x1; else if (m === db) p.z = z0; else p.z = z1;
      hit = true;
    }
    if (!hit) break;
  }
  p.x = THREE.MathUtils.clamp(p.x, -27.5, 23.4); p.z = THREE.MathUtils.clamp(p.z, -30.4, 27.6); // estate fence
}

// ------------------------------------------------------------------ input
const keys = {};
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (mode === 'intro') return;
  if (e.code === 'Space' && mode === 'walk' && player.grounded) { player.vy = 4.2; player.grounded = false; e.preventDefault(); }
  if (e.code === 'KeyV') toggleAerial();
  if (e.code === 'KeyN') { night = !night; applyTimeOfDay(); }
  if (e.code === 'KeyM') $('#mapWrap').classList.toggle('hidden');
  if (e.code === 'KeyR') togglePanel('rooms');
  if (e.code === 'KeyP') screenshot();
  if (e.code === 'KeyF') toggleFS();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// pointer lock (desktop) + drag-look fallback
let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener('click', () => { if (mode === 'walk' && !isTouch && document.pointerLockElement !== canvas) canvas.requestPointerLock?.()?.catch?.(() => {}); });
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  document.body.classList.toggle('locked', locked);
  if (locked) { $('#hint').classList.add('gone'); closePanels(); }
});
addEventListener('mousemove', (e) => {
  if (mode !== 'walk') return;
  if (document.pointerLockElement === canvas) look(e.movementX, e.movementY, 0.0022);
});
// touch: left half joystick, right half look
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const lookTouch = { id: null };
canvas.addEventListener('pointerdown', (e) => {
  if (mode !== 'walk' || e.pointerType === 'mouse') { if (e.pointerType === 'mouse' && mode === 'walk' && isTouch) { dragging = true; lastX = e.clientX; lastY = e.clientY; } return; }
  if (e.clientX < innerWidth * 0.45 && stick.id === null) {
    stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.x = stick.y = 0;
    const s = $('#stick'); s.style.display = 'block'; s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px';
    s.firstElementChild.style.transform = 'translate(0,0)';
  } else if (lookTouch.id === null) { lookTouch.id = e.pointerId; lastX = e.clientX; lastY = e.clientY; }
});
addEventListener('pointermove', (e) => {
  if (e.pointerId === stick.id) {
    let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy; const d = Math.hypot(dx, dy), max = 50;
    if (d > max) { dx *= max / d; dy *= max / d; }
    stick.x = dx / max; stick.y = dy / max;
    $('#stick').firstElementChild.style.transform = `translate(${dx}px,${dy}px)`;
  } else if (e.pointerId === lookTouch.id || dragging) {
    look(e.clientX - lastX, e.clientY - lastY, 0.0045); lastX = e.clientX; lastY = e.clientY;
  }
});
const endPtr = (e) => {
  if (e.pointerId === stick.id) { stick.id = null; stick.x = stick.y = 0; $('#stick').style.display = 'none'; }
  if (e.pointerId === lookTouch.id) lookTouch.id = null;
  dragging = false;
};
addEventListener('pointerup', endPtr); addEventListener('pointercancel', endPtr);
function look(dx, dy, s) {
  player.yaw -= dx * s;
  player.pitch = THREE.MathUtils.clamp(player.pitch - dy * s, -1.45, 1.45);
}

// ------------------------------------------------------------------ walk update
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), wish = new THREE.Vector3();
function updateWalk(dt) {
  let ix = 0, iz = 0;
  if (keys.KeyW || keys.ArrowUp) iz += 1;
  if (keys.KeyS || keys.ArrowDown) iz -= 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (stick.id !== null) { ix += stick.x; iz -= stick.y; }
  if (keys.KeyQ) player.yaw += dt * 1.8;
  if (keys.KeyE) player.yaw -= dt * 1.8;
  const run = keys.ShiftLeft || keys.ShiftRight || (stick.id !== null && Math.hypot(stick.x, stick.y) > 0.95);
  const speed = run ? 5.2 : 2.6;
  fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  wish.set(0, 0, 0).addScaledVector(fwd, iz).addScaledVector(right, ix);
  if (wish.lengthSq() > 1) wish.normalize();
  wish.multiplyScalar(speed);
  const a = 1 - Math.exp(-dt * (wish.lengthSq() ? 10 : 12));
  player.vel.lerp(wish, a);

  const p = player.pos;
  const dist = player.vel.length() * dt;
  const n = Math.max(1, Math.ceil(dist / 0.08));
  for (let i = 0; i < n; i++) {
    p.x += (player.vel.x * dt) / n; p.z += (player.vel.z * dt) / n;
    resolve(p);
  }
  const g = groundAt(p.x, p.z, p.y);
  if (!player.grounded || p.y > g + 0.4) {
    player.vy -= 13 * dt; p.y += player.vy * dt;
    if (p.y <= g) { p.y = g; player.vy = 0; player.grounded = true; } else player.grounded = false;
  } else { p.y = g; player.vy = 0; player.grounded = true; }

  // smooth eye height (stairs feel)
  const targetY = p.y + EYE;
  player.camY = Math.abs(targetY - player.camY) > 1.2 ? targetY : THREE.MathUtils.lerp(player.camY, targetY, 1 - Math.exp(-dt * 16));
  const moving = player.vel.length();
  bobT += dt * moving * 2.2;
  const bob = player.grounded ? Math.sin(bobT) * 0.018 * Math.min(1, moving / 3) : 0;
  camera.position.set(p.x, player.camY + bob, p.z);
  camera.rotation.set(player.pitch, player.yaw, 0);
}
let bobT = 0;

// ------------------------------------------------------------------ aerial (orbit / dollhouse)
const orbit = new OrbitControls(camera, canvas);
orbit.enabled = false;
orbit.enableDamping = true; orbit.dampingFactor = 0.07;
orbit.minDistance = 6; orbit.maxDistance = 60; orbit.maxPolarAngle = Math.PI * 0.49;
orbit.target.set(0, 3, 0);
let levelView = 'all';
function setLevelView(v) {
  levelView = v;
  document.querySelectorAll('#levels button').forEach((b) => b.classList.toggle('on', b.dataset.lv === v));
  for (const [name, g] of Object.entries(groups)) {
    if (name === 'Modern_Two_Story_Residence') continue;
    let vis = true;
    if (v !== 'all' && name === 'SITE_Vegetation') vis = false;
    if (v === '1' && (name.startsWith('ROOF') || name === 'L1_Frame')) vis = false;
    if (v === '0' && (name.startsWith('ROOF') || name.startsWith('L1_'))) vis = false;
    g.visible = vis;
  }
  if (v !== 'all') tweenOrbit(new THREE.Vector3(9, v === '0' ? 17 : 19, 15), new THREE.Vector3(0, v === '0' ? 0.5 : 3.8, -0.5));
}
function toggleAerial(force) {
  const goAerial = force ?? mode !== 'aerial';
  closePanels();
  if (goAerial) {
    mode = 'aerial';
    document.exitPointerLock?.();
    document.body.classList.add('aerial');
    orbit.enabled = true;
    camera.position.set(-13, 9.5, 20);
    orbit.target.set(0, 3.2, 0);
    orbit.update();
  } else {
    mode = 'walk';
    document.body.classList.remove('aerial');
    orbit.enabled = false;
    setLevelView('all');
  }
  document.querySelector('[data-act=aerial]').classList.toggle('on', mode === 'aerial');
  document.querySelector('[data-act=walk]').classList.toggle('on', mode === 'walk');
}
let orbitTween = null;
function tweenOrbit(pos, tgt) { orbitTween = { t: 0, p0: camera.position.clone(), t0: orbit.target.clone(), p1: pos, t1: tgt }; }

// ------------------------------------------------------------------ teleport
let tele = null;
function teleport(spot) {
  if (mode !== 'walk') toggleAerial(false);
  closePanels();
  const fade = $('#fade');
  fade.classList.add('on');
  setTimeout(() => {
    player.pos.fromArray(spot.p); player.yaw = spot.yaw; player.pitch = spot.pitch ?? -0.04;
    player.vel.set(0, 0, 0); player.vy = 0; player.camY = player.pos.y + EYE;
    fade.classList.remove('on');
  }, 360);
}

// ------------------------------------------------------------------ UI
function buildRoomsUI() {
  const out = ['Front Garden', 'Entrance', 'Back Terrace', 'Balcony', 'Roof Garden'];
  for (const s of meta.spots) {
    const b = document.createElement('button');
    b.textContent = s.name;
    b.onclick = () => teleport(s);
    const lvl = s.p[1] > 2 ? 1 : 0;
    (out.includes(s.name) ? $('#roomsOut') : lvl ? $('#rooms1') : $('#rooms0')).appendChild(b);
  }
}
function togglePanel(id) { const el = $('#' + id); const open = !el.classList.contains('open'); closePanels(); if (open) { el.classList.add('open'); document.exitPointerLock?.(); } }
function closePanels() { document.querySelectorAll('.panel.open, .modal.open').forEach((e) => e.classList.remove('open')); }
document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => closePanels()));
$('#plans').addEventListener('click', (e) => { if (e.target.id === 'plans') closePanels(); });
document.querySelectorAll('.tabs button').forEach((b) => (b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
  $('#planImg').src = b.dataset.img;
}));
document.querySelectorAll('#levels button').forEach((b) => (b.onclick = () => setLevelView(b.dataset.lv)));
document.querySelectorAll('#dock button').forEach((b) => (b.onclick = () => {
  const a = b.dataset.act;
  if (a === 'rooms') togglePanel('rooms');
  if (a === 'walk') toggleAerial(false);
  if (a === 'aerial') toggleAerial(true);
  if (a === 'night') { night = !night; applyTimeOfDay(); }
  if (a === 'plans') { closePanels(); $('#plans').classList.add('open'); document.exitPointerLock?.(); }
  if (a === 'shot') screenshot();
  if (a === 'quality') { quality = quality === 'high' ? 'perf' : 'high'; applyQuality(); }
  if (a === 'fs') toggleFS();
}));
function applyQuality() {
  setPR();
  sun.shadow.mapSize.set(quality === 'high' ? 4096 : 2048, quality === 'high' ? 4096 : 2048);
  sun.shadow.map?.dispose(); sun.shadow.map = null;
  bloom.enabled = quality === 'high' || night;
  ao.enabled = quality === 'high';
  $('#qLabel').textContent = quality === 'high' ? 'High' : 'Fast';
  onResize(); applyTimeOfDay();
}
function toggleFS() { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); }
function screenshot() {
  composer.render();
  canvas.toBlob((b) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `residence-${Date.now()}.png`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
}
function start(aerial) {
  $('#intro').classList.add('hide');
  $('#hud').classList.add('on');
  mode = 'walk';
  player.pos.set(-0.8, 0.03, 15.5); player.yaw = 0.04; player.pitch = 0.06;
  if (aerial) toggleAerial(true);
  else if (!isTouch) canvas.requestPointerLock?.()?.catch?.(() => {});
  if (isTouch) $('#hint').textContent = 'Left thumb to move · drag right side to look';
  setTimeout(() => $('#hint').classList.add('gone'), 9000);
}
$('#enter').onclick = () => start(false);
$('#enterAerial').onclick = () => start(true);
applyQuality();

// ------------------------------------------------------------------ minimap + room detection
const map = $('#map'), mctx = map.getContext('2d');
const MAP = { x0: -8.5, z0: -7.5, size: 17 };
const toMap = (x, z) => [((x - MAP.x0) / MAP.size) * map.width, ((z - MAP.z0) / MAP.size) * map.height];
let currentRoom = '', roomTimer = 0;
function levelOf(y) { return y > (meta.levels[0].y + meta.levels[1].y) / 2 - 0.4 ? 1 : 0; }
function roomAt(x, z, lvl) {
  let best = null, area = Infinity;
  for (const r of meta.rooms) {
    if (r.level !== lvl && !(lvl === 0 && r.level === 0)) continue;
    const [x0, z0, x1, z1] = r.rect;
    if (x < x0 || x > x1 || z < z0 || z > z1) continue;
    const a = (x1 - x0) * (z1 - z0);
    if (a < area) { area = a; best = r; }
  }
  return best;
}
function drawMap() {
  const W = map.width, lvl = levelOf(player.pos.y), ly = meta.levels[lvl].y;
  mctx.clearRect(0, 0, W, W);
  mctx.fillStyle = 'rgba(10,12,15,.55)'; mctx.fillRect(0, 0, W, W);
  const cur = roomAt(player.pos.x, player.pos.z, lvl);
  for (const r of meta.rooms) {
    if (r.level !== lvl || ['Front Garden', 'Garden', 'Carport'].includes(r.name) && lvl === 1) continue;
    if (r.name === 'Garden' || r.name === 'Front Garden') continue;
    const [a, b] = toMap(r.rect[0], r.rect[1]), [c, d] = toMap(r.rect[2], r.rect[3]);
    mctx.fillStyle = cur === r ? 'rgba(201,164,92,.35)' : 'rgba(244,241,234,.07)';
    mctx.fillRect(a, b, c - a, d - b);
  }
  mctx.fillStyle = 'rgba(244,241,234,.85)';
  for (const c of meta.colliders) {
    if (c[4] - c[1] < 0.9 || c[1] > ly + 1.5 || c[4] < ly + 1.2) continue;
    if (c[3] - c[0] > 30) continue;
    const [a, b] = toMap(c[0], c[2]), [e, f] = toMap(c[3], c[5]);
    mctx.fillRect(a, b, Math.max(1.5, e - a), Math.max(1.5, f - b));
  }
  mctx.font = '500 13px Inter, sans-serif'; mctx.textAlign = 'center'; mctx.fillStyle = 'rgba(244,241,234,.55)';
  for (const r of meta.rooms) {
    if (r.level !== lvl || ['Garden', 'Front Garden', 'Hallway', 'Staircase', 'Powder Room', 'Walk-in Closet'].includes(r.name)) continue;
    const [a, b] = toMap((r.rect[0] + r.rect[2]) / 2, (r.rect[1] + r.rect[3]) / 2);
    if (a > 10 && a < W - 10 && b > 10 && b < W - 10) mctx.fillText(r.name.replace('Upper ', ''), a, b + 4);
  }
  // player
  const [px, pz] = toMap(player.pos.x, player.pos.z);
  mctx.save(); mctx.translate(px, pz); mctx.rotate(-player.yaw);
  const grd = mctx.createRadialGradient(0, 0, 0, 0, 0, 46);
  grd.addColorStop(0, 'rgba(201,164,92,.55)'); grd.addColorStop(1, 'rgba(201,164,92,0)');
  mctx.fillStyle = grd; mctx.beginPath(); mctx.moveTo(0, 0); mctx.arc(0, 0, 46, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55); mctx.fill();
  mctx.fillStyle = '#c9a45c'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 2;
  mctx.beginPath(); mctx.arc(0, 0, 7, 0, Math.PI * 2); mctx.fill(); mctx.stroke();
  mctx.restore();
  $('#mapLbl').textContent = `${meta.levels[lvl].name} · click to jump`;
  $('#levelName').textContent = meta.levels[lvl].name;
  // room toast
  const name = cur ? cur.name : roomAt(player.pos.x, player.pos.z, 0)?.name || 'Garden';
  if (name !== currentRoom) {
    currentRoom = name; $('#roomName').textContent = name;
    $('#roomToast').classList.add('show'); clearTimeout(roomTimer);
    roomTimer = setTimeout(() => $('#roomToast').classList.remove('show'), 2600);
  }
}
map.addEventListener('click', (e) => {
  const r = map.getBoundingClientRect();
  const x = MAP.x0 + ((e.clientX - r.left) / r.width) * MAP.size, z = MAP.z0 + ((e.clientY - r.top) / r.height) * MAP.size;
  const lvl = levelOf(player.pos.y), y = meta.levels[lvl].y;
  const room = roomAt(x, z, lvl);
  const g = groundAt(x, z, room ? y : 0.05);
  const p = new THREE.Vector3(x, g, z);
  resolve(p);
  teleport({ p: [p.x, groundAt(p.x, p.z, g), p.z], yaw: player.yaw, pitch: player.pitch });
});

// ------------------------------------------------------------------ loop
function onResize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  composer.setPixelRatio(renderer.getPixelRatio());
}
addEventListener('resize', onResize);

const clock = new THREE.Clock();
let fpsAcc = 0, fpsN = 0, mapT = 0;
// idle intro camera: slow orbit around the house behind the overlay
let introT = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (mode === 'intro') {
    introT += dt * 0.05;
    camera.position.set(Math.sin(introT + 0.5) * 22, 6.5, Math.cos(introT + 0.5) * 22);
    camera.lookAt(0, 3, 0);
  } else if (mode === 'walk' && meta) {
    updateWalk(dt);
  } else if (mode === 'aerial') {
    if (orbitTween) {
      orbitTween.t = Math.min(1, orbitTween.t + dt * 1.2);
      const e = 1 - Math.pow(1 - orbitTween.t, 3);
      camera.position.lerpVectors(orbitTween.p0, orbitTween.p1, e);
      orbit.target.lerpVectors(orbitTween.t0, orbitTween.t1, e);
      if (orbitTween.t >= 1) orbitTween = null;
    }
    orbit.update();
  }
  if (meta && mode !== 'intro') { mapT += dt; if (mapT > 0.1) { mapT = 0; drawMap(); } }
  // keep shadow frustum centered near the house / player
  sun.target.position.set(0, 0, 0);
  composer.render();
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 1) { $('#fps').textContent = `${Math.round(fpsN / fpsAcc)} fps`; fpsAcc = 0; fpsN = 0; }
});
window.__app = { player, scene, camera, meta: () => meta, teleport, toggleAerial, setLevelView, applyTimeOfDay, setNight: (v) => { night = v; applyTimeOfDay(); }, start };
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); $('#hint').classList.remove('gone'); $('#hint').textContent = 'Graphics memory was reset by the browser — reload the page (try Quality: Fast).'; });
