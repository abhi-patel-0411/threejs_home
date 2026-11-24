// Procedural, seamless texture generation (node) -> JPEG buffers
import jpeg from 'jpeg-js';

function hash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const fade = (t) => t * t * (3 - 2 * t);
// periodic value noise; u,v in [0,1), period p lattice cells
function vnoise(u, v, p, s = 0) {
  const x = u * p, y = v * p;
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = fade(x - xi), yf = fade(y - yi);
  const m = (a) => ((a % p) + p) % p;
  const a = hash(m(xi), m(yi), s), b = hash(m(xi + 1), m(yi), s);
  const c = hash(m(xi), m(yi + 1), s), d = hash(m(xi + 1), m(yi + 1), s);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
function fbm(u, v, p, oct = 5, s = 0) {
  let t = 0, amp = 0.5, norm = 0;
  for (let i = 0; i < oct; i++) {
    t += vnoise(u, v, p << i, s + i * 17) * amp;
    norm += amp; amp *= 0.5;
  }
  return t / norm;
}
const clamp = (x) => Math.max(0, Math.min(255, Math.round(x)));
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function render(size, fn, q = 86) {
  const data = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const c = fn(x / size, y / size, x, y);
    const i = (y * size + x) * 4;
    data[i] = clamp(c[0]); data[i + 1] = clamp(c[1]); data[i + 2] = clamp(c[2]); data[i + 3] = 255;
  }
  return Buffer.from(jpeg.encode({ data, width: size, height: size }, q).data);
}

export const TEX = {
  
  grass: () => render(1024, (u, v) => {
    const n = fbm(u, v, 8, 5, 1), f = vnoise(u, v, 256, 3), g = vnoise(u, v, 512, 9);
    let c = mix(hex(0x3f6c25), hex(0x77a23f), n);
    c = mix(c, hex(0x2f5419), f > 0.7 ? (f - 0.7) * 2.2 : 0);
    c = mix(c, hex(0x9cbf5a), g > 0.82 ? (g - 0.82) * 3 : 0);
    return c;
  }),
  oak: () => woodPlanks(1024, [0xc29a6c, 0xa77c51, 0x8d6542], 8, 11),
  walnut: () => woodPlanks(512, [0x7a5236, 0x5e3d27, 0x4b2f1e], 4, 21, true),
  pavers: () => render(1024, (u, v) => {
    // tiles 0.6 x 1.2 m on a 2.4 m tile => 4 cols x 2 rows, staggered
    const col = u * 4, row = v * 2;
    const r = Math.floor(row), off = r % 2 ? 0.5 : 0;
    const cu = col + off, ci = Math.floor(cu);
    const fu = cu - ci, fv = row - r;
    const grout = fu < 0.012 || fu > 0.988 || fv < 0.006 || fv > 0.994;
    const t = hash(ci % 4, r, 5);
    const n = fbm(u, v, 16, 4, 7);
    let c = mix(hex(0xd8d2c6), hex(0xc4bdb0), t * 0.7 + n * 0.5);
    const p = vnoise(u, v, 300, 2); if (p > 0.86) c = mix(c, hex(0x9b958b), (p - 0.86) * 4);
    return grout ? hex(0x8f8a82) : c;
  }),
  marble: () => render(1024, (u, v) => {
    const n = fbm(u, v, 4, 6, 3);
    const vein = Math.abs(Math.sin((u * 3 + v * 2 + n * 4.5) * Math.PI));
    const vein2 = Math.abs(Math.sin((u * -2 + v * 5 + fbm(u, v, 8, 5, 8) * 3) * Math.PI));
    let c = mix(hex(0xf4f2ee), hex(0xe6e2dc), fbm(u, v, 8, 4, 4));
    c = mix(c, hex(0x9a978f), Math.pow(1 - vein, 14) * 0.75);
    c = mix(c, hex(0xb8b3aa), Math.pow(1 - vein2, 22) * 0.6);
    return c;
  }),
  concrete: () => render(1024, (u, v) => {
    const n = fbm(u, v, 6, 6, 12), p = vnoise(u, v, 400, 13);
    let c = mix(hex(0xb3b2ad), hex(0x9d9c97), n);
    if (p > 0.9) c = mix(c, hex(0x77766f), (p - 0.9) * 6);
    return c;
  }),
  plaster: () => render(512, (u, v) => {
    const n = fbm(u, v, 8, 5, 31);
    return mix(hex(0xf1efea), hex(0xe2dfd8), n);
  }),
  granite: () => render(512, (u, v) => {
    const n = fbm(u, v, 8, 4, 41), p = vnoise(u, v, 256, 42), q = vnoise(u, v, 256, 43);
    let c = mix(hex(0x2c2d2f), hex(0x3c3d40), n);
    if (p > 0.8) c = mix(c, hex(0x6b6c70), (p - 0.8) * 4);
    if (q > 0.88) c = mix(c, hex(0x111112), (q - 0.88) * 7);
    return c;
  }),
  fabric: () => render(512, (u, v, x, y) => {
    const w = ((x >> 1) + (y >> 1)) % 2 ? 0.94 : 1.0;
    const n = fbm(u, v, 32, 3, 51);
    const k = (0.86 + n * 0.14) * w * 255;
    return [k, k, k];
  }),
  slats: () => render(512, (u, v) => {
    const s = (u * 16) % 1; const gap = s > 0.82;
    const n = fbm(u, v, 4, 3, 61);
    const k = gap ? 28 : 62 + n * 18;
    return [k, k + 2, k + 4];
  }),
  stoneclad: () => render(512, (u, v) => { // vertical ribbed stone for feature walls
    const s = (u * 10) % 1; const groove = s < 0.06;
    const n = fbm(u, v, 8, 5, 71);
    let c = mix(hex(0xcdbfa8), hex(0xae9c82), n);
    return groove ? mix(c, hex(0x5a4f42), 0.6) : c;
  }),
};

function woodPlanks(size, cols, planks, seed, fine = false) {
  const [c0, c1, c2] = cols.map(hex);
  return render(size, (u, v) => {
    const pi = Math.floor(u * planks);
    const fu = u * planks - pi;
    const lenOff = hash(pi, 0, seed);
    const seg = Math.floor(v * 2 + lenOff * 2);
    const id = pi * 7 + seg;
    const tone = fine ? 0.35 + hash(id, 1, seed) * 0.2 : hash(id, 1, seed);
    const grain = fbm(fu * 0.25 + id * 0.13, v * 0.06 + id * 0.31, 32, 4, seed + (id % 9));
    const rings = Math.abs(Math.sin((grain * 9 + fu * 2) * Math.PI));
    let c = mix(c0, c1, tone);
    c = mix(c, c2, Math.pow(1 - rings, 6) * 0.55);
    if (!fine && (fu < 0.015 || fu > 0.985)) c = mix(c, hex(0x3b2a1c), 0.7);
    const endJ = (v * 2 + lenOff * 2) % 1;
    if (!fine && (endJ < 0.004 || endJ > 0.996)) c = mix(c, hex(0x3b2a1c), 0.6);
    return c;
  });
}

// ---- palm frond with alpha (RGBA raw -> PNG via sharp) ----
export async function frondPNG(sharp) {
  const W = 512, H = 1024, data = Buffer.alloc(W * H * 4);
  const put = (x, y, r, g, b) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4; data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
  };
  const stamp = (x, y, rad, c) => { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if (dx * dx + dy * dy <= rad * rad + 0.5) put(x + dx, y + dy, ...c); };
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // leaflets
  for (let t = 0.03; t < 0.995; t += 0.0085) {
    const L = 0.47 * Math.sin(Math.PI * Math.min(1, t * 1.08)) * (0.85 + rnd() * 0.25);
    for (const side of [-1, 1]) {
      const base = [0x3f + rnd() * 30, 0x6e + rnd() * 35, 0x25 + rnd() * 20];
      const x0 = W / 2, y0 = t * H, x1 = W / 2 + side * L * W, y1 = (t + L * 0.28) * H;
      const steps = 70;
      for (let k = 0; k <= steps; k++) {
        const u = k / steps;
        const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * 10;
        const w = Math.max(0.6, 4.2 * Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.05)));
        const shade = 0.75 + 0.35 * (1 - Math.abs(u - 0.4));
        stamp(x, y, Math.round(w), [base[0] * shade, base[1] * shade, base[2] * shade]);
      }
    }
  }
  // rachis
  for (let y = 0; y < H; y++) stamp(W / 2, y, Math.max(1, Math.round(5 * (1 - y / H))), [0x8a, 0x8f, 0x52]);
  return sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}
