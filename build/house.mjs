// Modern Two-Story Residence — layout derived from the elevation photo + ground/second floor plans.
// Units: meters. +X = east (right on plan), +Z = south (front / street), +Y = up.
import * as THREE from 'three';
import { Kit } from './kit.mjs';
import { palm, banana, shrub, hedge } from './plants.mjs';

export const G = 0.45;              // ground finished floor level (on plinth)
export const H1 = 3.4;              // floor-to-floor
export const U = G + H1;            // upper finished floor level (3.85)
export const SL = 0.3;              // slab thickness
const GC = U - SL;                  // ground ceiling (3.55)
const LR = U + 2.95;                // left (master) ceiling (6.8)
const CR = U + 3.6;                 // center (lounge) ceiling (7.45)
const RR = U + 2.95;                // right ceiling
const EW = 0.25, IW = 0.12;         // wall thickness
const XL = -5.7, XA = -1.9, XB = 1.9, XR = 5.7, ZB = -5, ZF = 4;

export function buildHouse() {
  const k = new Kit();
  const I = new THREE.Matrix4();

  // =====================================================================
  // SITE
  // =====================================================================
  k.group = 'SITE_Landscape';
  k.aabb('Grass', -150, -1, -150, 150, 0, 150, { col: true });
  // plinth
  k.aabb('Concrete_Gray', -6.7, 0, -5.3, 5.95, G - 0.02, 7.0, { col: true });
  // front steps
  for (let i = 0; i < 3; i++) k.aabb('Stone_Pavers', -4.6, 0, 7.0 + i * 0.32, 1.6, ((G - 0.02) * (3 - i)) / 4, 7.32 + i * 0.32, { col: true });
  // entrance path + driveway
  k.aabb('Stone_Pavers', -2.2, 0, 7.95, 0.6, 0.06, 28.2, { col: true });
  k.aabb('Concrete_Gray', 5.95, 0, 0.2, 8.6, 0.04, 10.6, { col: true });
  for (let i = 0; i < 3; i++) k.aabb('Concrete_Gray', 5.95, 0.04, 0.4, 6.25 + (2 - i) * 0.3, 0.04 + (i + 1) * 0.13, 4.45, { col: true }); // steps into carport
  // stepping pavers around side
  for (let i = 0; i < 9; i++) k.aabb('Stone_Pavers', -8.2, 0, 6 - i * 1.4, -7.2, 0.03, 6.6 - i * 1.4, { col: true });

  // terrace finishes (front, back, carport)
  k.group = 'L0_Structure';
  k.aabb('Stone_Pavers', -6.7, G - 0.02, 4.0, 1.9, G, 7.0, { col: true });
  k.aabb('Stone_Pavers', -5.85, G - 0.02, -5.3, XA, G, -2.0, { col: true });
  k.aabb('Concrete_Gray', XB, G - 0.02, 0.4, 5.95, G, 4.45, { col: true });

  // planting bed (right, lush) and front planters
  k.group = 'SITE_Landscape';
  k.aabb('Soil', 1.95, 0, 4.45, 5.95, 0.12, 8.2, { col: false });
  k.aabb('Concrete_Gray', 1.9, 0, 8.2, 5.95, 0.35, 8.35, { col: true });
  k.aabb('Soil', -9.5, 0, 2.2, -6.75, 0.1, 8.5);
  // terrace planter boxes
  for (const [x0, x1] of [[-6.5, -4.7], [0.9, 1.85]]) {
    k.aabb('Concrete_Gray', x0, G, 6.3, x1, G + 0.45, 6.95, { col: true });
    k.aabb('Soil', x0 + 0.05, G + 0.45, 6.35, x1 - 0.05, G + 0.46, 6.9);
  }
  // low boundary wall + hedges
  // (boundary walls, fence and hedges now come from the reference villa estate)

  // =====================================================================
  // GROUND FLOOR — floors
  // =====================================================================
  k.group = 'L0_Structure';
  k.aabb('Wood_Oak_Floor', XL, G - 0.02, -2.0, XA, G, ZF, { col: true });           // living
  k.aabb('Wood_Oak_Floor', XA, G - 0.02, ZB, XB, G, ZF, { col: true });             // foyer/dining/kitchen
  k.aabb('Wood_Oak_Floor', XB, G - 0.02, ZB, XR, G, -1.6, { col: true });           // guest
  k.aabb('Marble_Floor', XB, G - 0.02, -1.6, 3.4, G, 0.4, { col: true });           // powder
  k.aabb('Concrete_Gray', 3.4, G - 0.02, -1.6, XR, G, 0.4, { col: true });          // storage

  // ---------------- ground exterior walls ----------------
  // back (z=-5)
  k.wall('x', ZB, XA, XB, G, GC, EW, 'Plaster_White', [{ a: -1.4, b: 1.4, y0: G + 1.05, y1: G + 2.35, glass: true }]);
  k.wall('x', ZB, XB, XR + EW / 2, G, GC, EW, 'Plaster_White', [{ a: 3.0, b: 4.8, y0: G + 0.6, y1: G + 2.6, glass: true }]);
  // left (x=-5.7) living — stone feature wall inside
  k.wall('z', XL, -2.0, ZF, G, GC, EW, 'Plaster_White', [{ a: 2.6, b: 3.7, y0: G + 0.4, y1: G + 2.8, glass: true, div: 1.2 }]);
  // right (x=5.7)
  k.wall('z', XR, ZB, -1.6, G, GC, EW, 'Plaster_White', [{ a: -4.2, b: -2.6, y0: G + 0.6, y1: G + 2.6, glass: true }]);
  k.wall('z', XR, -1.6, 0.4, G, GC, EW, 'Plaster_White');
  // front (z=4) glazing
  k.glazing('x', ZF, XL, XA, G, GC, { div: 1.27, transom: G + 2.45 });
  k.glazing('x', ZF, XA, -1.55, G, GC, { div: 1, transom: G + 2.45 });
  k.glazing('x', ZF, -0.15, 0.8, G, GC, { div: 1, transom: G + 2.45 });
  k.aabb('Metal_Dark', -1.55, G + 2.95, ZF - 0.04, -0.15, GC, ZF + 0.04);
  k.aabb('Granite_Dark', 0.8, G, ZF - 0.15, XB + 0.15, U, ZF + 0.2, { col: true }); // dark granite pier (photo)
  // entrance pivot door, swung open
  {
    const m = k.frame(-1.5, G, ZF, -1.25);
    k.box(m, 'Wood_Walnut', 1.32, 2.92, 0.06, 0.68, 1.46, 0);
    k.box(m, 'Metal_Brass', 0.03, 1.4, 0.05, 1.2, 1.3, -0.06);
  }
  // back terrace column
  k.aabb('Concrete_Gray', XL - 0.15, G, ZB - 0.15, XL + 0.15, GC, ZB + 0.15, { col: true });

  // ---------------- ground interior walls ----------------
  // living | back terrace : glass slider
  k.glazing('x', -2.0, XL, -4.6, G, GC, { div: 1.1 });
  k.glazing('x', -2.0, -3.2, XA, G, GC, { div: 1.1 });
  k.aabb('Metal_Dark', -4.6, G + 2.6, -2.04, -3.2, GC, -1.96);
  k.aabb('Plaster_White', -4.6, G + 2.65, -2.1, -3.2, GC, -1.9);
  // kitchen | back terrace
  k.glazing('z', XA, ZB, -2.0, G, GC, { div: 1.0 });
  k.aabb('Plaster_White', XA - 0.15, G, -2.15, XA + 0.15, GC, -1.85, { col: true });
  // kitchen | guest
  k.wall('z', XB, ZB, -1.6, G, GC, IW, 'Wall_Interior', [{ a: -3.4, b: -2.5, y1: G + 2.3 }]);
  // guest | powder/storage
  k.wall('x', -1.6, XB, XR, G, GC, IW, 'Wall_Interior');
  // under-stair | powder
  k.wall('z', XB, -1.6, 0.4, G, GC, IW, 'Wall_Interior', [{ a: -1.3, b: -0.5, y1: G + 2.2 }]);
  k.wall('z', 3.4, -1.6, 0.4, G, GC, IW, 'Wall_Interior');
  // powder/storage | carport (exterior)
  k.wall('x', 0.4, XB, XR + EW / 2, G, GC, EW, 'Plaster_White', [{ a: 4.2, b: 5.1, y1: G + 2.3 }]);
  k.aabb('Wood_Walnut', 4.2, G, 0.34, 5.1, G + 2.3, 0.46, { col: true });
  // stair | carport wall (dark granite like photo)
  k.wall('z', XB, 0.4, ZF + 0.2, G, U, EW, 'Granite_Dark');

  // =====================================================================
  // STAIR — floating oak treads, 20 risers, climbing toward the back
  // =====================================================================
  k.group = 'L0_Stair';
  const NR = 20, R = H1 / NR, T = 0.27, SX0 = 0.86, SX1 = 1.84, SZ0 = 3.55;
  for (let i = 1; i < NR; i++) {
    const top = G + i * R, z1 = SZ0 - (i - 1) * T, z0 = SZ0 - i * T;
    k.aabb('Wood_Oak_Floor', SX0, top - 0.07, z0 - 0.02, SX1, top, z1, { col: true });
    k.aabb('Glass_Rail', SX0 - 0.03, top, z0, SX0 - 0.01, top + 0.95, z1);
  }
  {
    // steel stringer + handrail (sloped)
    const len = Math.hypot(19 * T, H1), ang = Math.atan2(H1, 19 * T);
    const mid = new THREE.Vector3(SX1 - 0.02, G + H1 / 2 - 0.1, SZ0 - 19 * T / 2);
    const m = new THREE.Matrix4().compose(mid, new THREE.Quaternion().setFromEuler(new THREE.Euler(ang, 0, 0)), new THREE.Vector3(1, 1, 1));
    k.box(m, 'Metal_Black', 0.04, 0.3, len, 0, 0, 0);
    const m2 = new THREE.Matrix4().compose(new THREE.Vector3(SX0 - 0.02, G + H1 / 2 + 0.95, SZ0 - 19 * T / 2), new THREE.Quaternion().setFromEuler(new THREE.Euler(ang, 0, 0)), new THREE.Vector3(1, 1, 1));
    k.box(m2, 'Metal_Brass', 0.05, 0.04, len, 0, 0, 0);
  }
  const SZT = SZ0 - 19 * T; // -1.58 top of stair

  // =====================================================================
  // UPPER SLAB (ceiling below + finish above)
  // =====================================================================
  const slab = (x0, z0, x1, z1, fin, grp = 'L1_Structure') => {
    k.aabb('Ceiling', x0, U - SL, z0, x1, U - 0.02, z1, { group: grp });
    k.aabb(fin, x0, U - 0.02, z0, x1, U, z1, { col: true, group: grp });
  };
  slab(XL - EW / 2, -2.6, XA, ZF, 'Wood_Oak_Floor');
  slab(XL - EW / 2, ZB - EW / 2, -3.8, -2.6, 'Wood_Oak_Floor');
  slab(-3.8, ZB - EW / 2, XA, -2.6, 'Marble_Floor');
  slab(XA, -2.6, 0.8, ZF, 'Wood_Oak_Floor');
  slab(0.8, -2.6, XB, SZT, 'Wood_Oak_Floor');
  slab(0.8, 3.6, XB, ZF, 'Wood_Oak_Floor');
  slab(XA, ZB - EW / 2, XB, -2.6, 'Stone_Pavers');
  slab(XB, ZB - EW / 2, XR + EW / 2, -2.6, 'Wood_Oak_Floor');
  slab(XB, -2.6, 3.3, 0.6, 'Wood_Oak_Floor');
  slab(3.3, -2.6, XR + EW / 2, 0.6, 'Marble_Floor');
  slab(XB, 0.6, XR + EW / 2, ZF, 'Wood_Oak_Floor');
  // balcony slab + deep grey fascia (photo)
  k.group = 'L1_Structure';
  k.aabb('Ceiling', -6.7, U - 0.62, ZF, XB, U - 0.02, 5.45);
  k.aabb('Stone_Pavers', -6.7, U - 0.02, ZF, XB, U, 5.45, { col: true });
  k.aabb('Concrete_Gray', -6.7, U - 0.7, 5.45, XB + 0.05, U + 0.22, 5.7, { col: true });
  k.aabb('Concrete_Gray', -6.7, U - 0.7, ZF - 0.2, -6.45, U + 1.05, 5.7, { col: true }); // left end parapet
  k.aabb('Glass_Rail', -6.45, U + 0.22, 5.5, XB, U + 1.08, 5.54, { col: true });
  k.aabb('Glass_Rail', XB - 0.04, U, ZF, XB, U + 1.08, 5.5, { col: true });
  k.aabb('Emissive_Warm', -6.4, U - 0.66, 5.38, XB - 0.1, U - 0.64, 5.42); // LED cove under fascia
  // curved concrete fin supporting the left cantilever (photo / plan)
  {
    const s = new THREE.Shape();
    s.moveTo(-5.75, G); s.lineTo(-5.75, U - 0.7); s.lineTo(-6.7, U - 0.7);
    s.quadraticCurveTo(-6.6, G + 0.6, -5.95, G); s.lineTo(-5.75, G);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: false, curveSegments: 18 });
    geo.translate(0, 0, 5.2);
    k.add('Concrete_Gray', geo, null, { col: true });
  }
  // ground-floor front LED soffit downlights
  for (let x = -5.3; x < 1.8; x += 1.4) k.cyl(I, 'Emissive_Warm', 0.05, 0.05, 0.01, x, U - 0.625, 4.7, 12);

  // =====================================================================
  // UPPER FLOOR — walls
  // =====================================================================
  k.group = 'L1_Structure';
  // ---- left (master) volume ----
  k.wall('x', ZB, XL - EW / 2, XA, U, LR, EW, 'Plaster_White', [{ a: -3.4, b: -2.3, y0: U + 1.6, y1: U + 2.5, glass: true }]);
  k.wall('z', XL, ZB, ZF, U, LR, EW, 'Plaster_White', [{ a: -1.2, b: 2.4, y0: U + 0.5, y1: U + 2.55, glass: true, div: 1.2 }]);
  k.glazing('x', ZF, XL, -3.5, U, LR, { div: 1.1, transom: U + 2.45 });
  k.glazing('x', ZF, -2.3, XA, U, LR, { div: 1.2, transom: U + 2.45 });
  k.aabb('Metal_Dark', -3.5, U + 2.4, ZF - 0.04, -2.3, LR, ZF + 0.04);
  k.wall('x', -2.6, XL, XA, U, LR, IW, 'Wall_Interior', [{ a: -4.9, b: -4.1, y1: U + 2.2 }, { a: -3.3, b: -2.5, y1: U + 2.2 }]);
  k.wall('z', -3.8, ZB, -2.6, U, LR, IW, 'Wall_Interior');
  // master | lounge (tall, lounge is double height)
  k.wall('z', XA, -2.6, ZF, U, CR, IW + 0.06, 'Wall_Interior', [{ a: -1.3, b: -0.4, y1: U + 2.2 }]);
  k.wall('z', XA, ZB - EW / 2, -2.6, U, LR, EW, 'Plaster_White');
  // roof slab + thin dark canopy with slatted soffit (photo)
  k.group = 'ROOF';
  k.aabb('Ceiling', XL - EW / 2, LR, ZB - EW / 2, XA, LR + 0.3, ZF + 0.1);
  k.aabb('Plaster_White', XL - EW / 2, LR + 0.3, ZB - EW / 2, XA, LR + 0.55, ZB);
  const canopy = (x0, z0, x1, z1, y, t = 0.16) => {
    k.aabb('Metal_Dark', x0, y, z0, x1, y + t, z1);
    k.aabb('Soffit_Slats', x0 + 0.02, y - 0.03, z0 + 0.02, x1 - 0.02, y, z1 - 0.02);
    k.aabb('Metal_Dark', x0, y - 0.1, z1 - 0.06, x1, y + t, z1); // front fascia
    k.aabb('Metal_Dark', x0, y - 0.1, z0, x0 + 0.06, y + t, z1);
  };
  canopy(-6.95, -5.4, -1.75, 6.05, LR + 0.55);
  for (const [x, z] of [[-5.2, 3.6], [-2.4, 3.6], [-5.2, -4.5], [-2.4, -4.5]]) k.aabb('Metal_Dark', x - 0.04, LR + 0.3, z - 0.04, x + 0.04, LR + 0.55, z + 0.04);
  // LED strip under canopy front
  k.aabb('Emissive_Warm', -6.8, LR + 0.5, 5.92, -1.9, LR + 0.515, 5.96);

  // ---- center (lounge) volume ----
  k.group = 'L1_Structure';
  k.glazing('x', ZF, XA, -1.3, U, U + 3.0, { div: 1, transom: U + 2.45 });
  k.glazing('x', ZF, 0.1, XB, U, U + 3.0, { div: 0.95, transom: U + 2.45 });
  k.aabb('Metal_Dark', -1.3, U + 2.4, ZF - 0.04, 0.1, U + 3.0, ZF + 0.04);
  k.aabb('Concrete_Gray', XA - 0.15, U + 3.0, ZF - 0.15, XB + 0.15, CR + 0.3, ZF + 0.3, { group: 'ROOF' }); // grey band
  k.wall('x', -2.6, XA, XB, U + 2.7, CR, IW + 0.1, 'Plaster_White');
  k.glazing('x', -2.6, XA, -1.25, U, U + 2.7, { div: 1 });
  k.glazing('x', -2.6, 0.15, XB, U, U + 2.7, { div: 1 });
  k.aabb('Metal_Dark', -1.25, U + 2.4, -2.64, 0.15, U + 2.7, -2.56);
  k.wall('z', XB, -2.6, ZF, U, CR, IW + 0.06, 'Wall_Interior', [{ a: -2.45, b: -1.65, y1: U + 2.2 }]);
  // opening railing around stair void
  k.aabb('Glass_Rail', 0.78, U, SZT, 0.8, U + 1.05, 3.6, { col: true });
  k.aabb('Glass_Rail', 0.8, U, 3.6, XB, U + 1.05, 3.62, { col: true });
  k.aabb('Metal_Brass', 0.765, U + 1.03, SZT, 0.815, U + 1.07, 3.62);
  // roof garden parapet
  k.aabb('Plaster_White', XA, U, ZB - EW / 2, XB, U + 0.45, ZB + EW / 2, { col: true });
  k.aabb('Glass_Rail', XA, U + 0.45, ZB - 0.02, XB, U + 1.1, ZB + 0.02, { col: true });
  // roof + big canopy (highest element, photo)
  k.group = 'ROOF';
  k.aabb('Ceiling', XA, CR, -2.75, XB, CR + 0.3, ZF + 0.3);
  canopy(-2.45, -3.3, 3.2, 5.05, CR + 0.55, 0.2);
  for (const [x, z] of [[-1.6, 3.9], [1.6, 3.9], [-1.6, -2.4], [1.6, -2.4]]) k.aabb('Metal_Dark', x - 0.05, CR + 0.3, z - 0.05, x + 0.05, CR + 0.55, z + 0.05);
  k.aabb('Emissive_Warm', -2.3, CR + 0.47, 4.95, 3.1, CR + 0.485, 4.99);

  // ---- right volume (white frame box) ----
  k.group = 'L1_Structure';
  k.wall('x', ZB, XB, XR + EW / 2, U, RR, EW, 'Plaster_White', [{ a: 3.0, b: 4.8, y0: U + 0.5, y1: U + 2.6, glass: true }]);
  k.wall('z', XR, ZB, ZF, U, RR, EW, 'Plaster_White', [
    { a: -4.3, b: -3.1, y0: U + 0.6, y1: U + 2.5, glass: true },
    { a: -1.6, b: -0.4, y0: U + 1.5, y1: U + 2.4, glass: true },
    { a: 1.4, b: 3.2, y0: U + 0.5, y1: U + 2.6, glass: true },
  ]);
  k.glazing('x', ZF, XB, XR, U, RR, { div: 0.95, transom: U + 2.2 });
  k.wall('x', -2.6, XB, XR, U, RR, IW, 'Wall_Interior', [{ a: 2.15, b: 3.0, y1: U + 2.2 }]);
  k.wall('z', 3.3, -2.6, 0.6, U, RR, IW, 'Wall_Interior', [{ a: -1.5, b: -0.7, y1: U + 2.2 }]);
  k.wall('x', 0.6, XB, XR, U, RR, IW, 'Wall_Interior', [{ a: 2.15, b: 3.0, y1: U + 2.2 }]);
  // white frame (deep reveal) spanning both storeys
  k.group = 'ROOF';
  k.aabb('Plaster_White', XB + 0.05, G, ZF, XB + 0.4, U - SL, ZF + 0.5, { col: true, group: 'L0_Structure' });
  k.aabb('Plaster_White', XR - 0.2, G, ZF - 0.1, XR + 0.25, U - SL, ZF + 0.5, { col: true, group: 'L0_Structure' });
  k.aabb('Plaster_White', XB + 0.05, U - SL, ZF, XB + 0.4, RR + 0.55, ZF + 0.5, { col: true, group: 'L1_Frame' });
  k.aabb('Plaster_White', XR - 0.2, U - SL, ZF - 0.1, XR + 0.25, RR + 0.55, ZF + 0.5, { col: true, group: 'L1_Frame' });
  k.aabb('Plaster_White', XB + 0.05, RR, ZF - 0.1, XR + 0.25, RR + 0.55, ZF + 0.5);
  k.aabb('Concrete_Gray', XB + 0.4, U - SL - 0.05, ZF + 0.05, XR - 0.2, U + 0.05, ZF + 0.35, { group: 'L0_Structure' });
  k.aabb('Ceiling', XB, RR, ZB - EW / 2, XR + EW / 2, RR + 0.3, ZF);
  k.aabb('Plaster_White', XB, RR + 0.3, ZB - EW / 2, XR + EW / 2, RR + 0.55, ZB + 0.1);
  k.aabb('Plaster_White', XR, RR + 0.3, ZB, XR + EW / 2, RR + 0.55, ZF);

  // rooftop greenery (photo: plants peeking over the roofline)
  k.group = 'ROOF';
  k.aabb('Concrete_Gray', XB + 0.3, RR + 0.3, ZB + 0.2, XR - 0.2, RR + 0.65, ZB + 1.0);
  for (let i = 0; i < 7; i++) shrub(k, 2.5 + i * 0.5, RR + 0.62, ZB + 0.6, 0.5, 300 + i, { group: 'ROOF' });
  k.aabb('Concrete_Gray', -5.4, LR + 0.3, ZB + 0.2, -2.2, LR + 0.5, ZB + 0.9);

  // =====================================================================
  // INTERIOR — ground floor
  // =====================================================================
  k.group = 'L0_Interior';
  const P = (id, x, y, z, yaw = 0, o) => k.propAt(id, x, y, z, yaw, o);
  // ---- living ----
  k.aabb('Stone_Feature', XL + 0.12, G, -1.2, XL + 0.22, GC, 2.4, { col: true });
  k.aabb('Screen_Black', XL + 0.23, G + 1.15, -0.25, XL + 0.27, G + 2.0, 1.35);
  k.aabb('Emissive_Warm', XL + 0.22, GC - 0.06, -1.15, XL + 0.3, GC - 0.04, 2.35); // wall washer
  P('modern_wooden_cabinet', XL + 0.4, G, 0.55, Math.PI / 2);
  P('ceramic_vase_01', XL + 0.4, G + 0.68, -0.35, 0, { col: false });
  P('potted_plant_04', XL + 0.4, G + 0.68, 1.55, 0, { col: false });
  sofaL(k, k.frame(-2.5, G, 0.55, -Math.PI / 2), 3.0, 'Fabric_Linen');
  k.aabb('Rug_Wool', -4.95, G, -1.0, -2.6, G + 0.012, 2.1);
  P('modern_coffee_table_01', -4.2, G, 0.35, 0);
  P('modern_arm_chair_01', -4.35, G, 2.85, Math.PI - 0.4);
  P('modern_arm_chair_01', -4.35, G, -1.55, 0.4);
  P('side_table_01', -2.95, G, -1.3, 0);
  P('potted_plant_01', -5.2, G, 3.45, 0.6);
  P('potted_plant_02', -2.45, G, 3.35, 2.2);
  floorLamp(k, k.frame(-2.4, G, -1.6, 0));
  k.light(-3.8, GC - 0.25, 0.6, 0xffd8a8, 1, 8);
  k.light(-3.8, GC - 0.25, 3.0, 0xffd8a8, 0.8, 7);
  downlights(k, -5.0, -2.6, -1.3, 3.4, GC, 1.2);

  // ---- foyer ----
  k.aabb('Rug_Dark', -1.6, G, 2.0, 0.4, G + 0.012, 3.6);
  consoleTable(k, k.frame(-1.2, G, 1.75, 0));
  P('potted_plant_01', 0.45, G, 3.6, 0);
  pendantGlobe(k, -0.55, GC, 2.3, 0.5, 0.3);
  k.light(-0.55, GC - 0.6, 2.3, 0xffd8a8, 0.8, 7);

  // ---- dining ----
  diningTable(k, k.frame(-0.6, G, -0.05, 0));
  for (const x of [-1.3, -0.6, 0.1]) {
    P('dining_chair_02', x, G, -0.98, 0);          // faces +z, toward the table
    P('dining_chair_02', x, G, 0.88, Math.PI);     // faces -z, toward the table
  }
  P('ceramic_vase_03', -0.6, G + 0.87, -0.05, 0, { col: false });
  P('modern_ceiling_lamp_01', -1.15, GC - 1.17, -0.05, 0, { col: false });
  P('modern_ceiling_lamp_01', -0.05, GC - 1.17, -0.05, 0, { col: false });
  k.light(-0.6, GC - 0.9, -0.05, 0xffd8a8, 1, 8);
  k.prop('hanging_picture_frame_02', k.frame(XB - 0.07, G + 1.55, 0.0, -Math.PI / 2), { col: false });

  // ---- kitchen ----
  kitchen(k);
  for (const x of [-0.9, -0.3, 0.3]) P('bar_chair_round_01', x, G, -1.92, Math.PI);
  k.light(-0.3, GC - 0.4, -3.4, 0xfff0dc, 1, 8);
  downlights(k, -1.4, -4.6, 1.4, -2.0, GC, 1.4);

  // ---- guest bedroom ----
  bed(k, k.frame(3.95, G, -1.66, Math.PI), 1.6, 'Fabric_Sage');
  k.aabb('Rug_Wool', 2.9, G, -3.9, 5.0, G + 0.012, -2.2);
  P('modern_arm_chair_01', 5.0, G, -4.35, -0.64);
  P('potted_plant_02', 2.35, G, -1.95, 0.3);
  wardrobe(k, 2.0, -4.95, 2.6, -3.55, G);
  k.light(3.9, GC - 0.3, -3.2, 0xffd8a8, 0.7, 6);

  // ---- powder ----
  vanity(k, k.frame(2.65, G, -1.5, 0), 1.0);
  toilet(k, k.frame(3.1, G, 0.25, Math.PI));
  k.light(2.65, GC - 0.3, -0.6, 0xffe6c4, 0.4, 4);

  // ---- carport ----
  P('potted_plant_01', 2.5, G, 3.6, 1.2);
  k.aabb('Emissive_Warm', XB + 0.2, GC - 0.03, 1.0, XB + 0.24, GC - 0.01, 3.8);
  bench(k, k.frame(2.9, G, 0.75, 0));

  // ---- back terrace (outdoor dining) ----
  P('outdoor_table_chair_set_01', -4.4, G, -3.55, 0);
  P('outdoor_table_chair_set_01', -2.85, G, -3.55, 0);
  P('potted_plant_02', -5.3, G, -4.7, 0.8);
  k.light(-3.8, GC - 0.3, -3.6, 0xffd0a0, 0.6, 6);

  // front terrace loungers
  lounger(k, k.frame(-4.4, G, 5.4, Math.PI * 0.97));
  lounger(k, k.frame(-3.4, G, 5.4, Math.PI * 1.03));
  P('side_table_01', -3.9, G, 4.75, 0);

  // =====================================================================
  // INTERIOR — upper floor
  // =====================================================================
  k.group = 'L1_Interior';
  // ---- master suite ----
  k.aabb('Stone_Feature', XA - 0.2, U, 0.2, XA - 0.1, LR, 3.0, { col: true });
  bed(k, k.frame(XA - 0.2, U, 1.6, -Math.PI / 2), 1.9, 'Fabric_Charcoal');
  k.aabb('Rug_Wool', -5.0, U, 0.0, -2.4, U + 0.012, 3.2);
  bench(k, k.frame(-4.6, U, 1.6, Math.PI / 2));
  P('mid_century_lounge_chair', -4.85, U, -1.55, 0.75);
  floorLamp(k, k.frame(-5.3, U, -2.25, 0));
  P('potted_plant_01', -5.2, U, 3.5, 2);
  k.light(-3.6, LR - 0.3, 1.4, 0xffd8a8, 0.8, 7);
  downlights(k, -5.0, -2.0, -2.6, 3.4, LR, 1.5);
  // ---- walk-in closet ----
  wardrobe(k, XL + 0.13, -4.95, XL + 0.73, -2.75, U);
  wardrobe(k, -4.95, ZB + 0.13, -3.95, ZB + 0.73, U, true);
  P('Ottoman_01', -4.4, U, -3.6, Math.PI / 2);
  k.light(-4.75, LR - 0.3, -3.8, 0xffe6c4, 0.4, 4);
  // ---- en-suite ----
  bathtub(k, k.frame(-2.85, U, -4.3, 0));
  vanity(k, k.frame(XA - 0.09, U, -3.3, -Math.PI / 2), 1.0);
  P('potted_plant_04', -3.6, U + 0.58, -4.55, 0, { col: false });
  k.light(-2.85, LR - 0.3, -3.8, 0xffe6c4, 0.5, 5);

  // ---- upper lounge / family room ----
  k.aabb('Wood_Walnut', XA + 0.09, U, 0.2, XA + 0.15, U + 3.0, 3.0);
  k.aabb('Screen_Black', XA + 0.16, U + 1.05, 0.85, XA + 0.2, U + 1.9, 2.35);
  P('modern_wooden_cabinet', XA + 0.42, U, 1.6, Math.PI / 2);
  P('sofa_02', 0.27, U, 1.6, -Math.PI / 2);
  k.aabb('Rug_Dark', -1.3, U, 0.4, 0.6, U + 0.012, 2.8);
  P('modern_coffee_table_01', -0.68, U, 1.6, 0);
  P('modern_arm_chair_01', -0.75, U, 3.35, Math.PI);
  bookshelf(k, XA + 0.1, -2.5, -1.4, U);
  P('mid_century_lounge_chair', -0.95, U, -1.95, 0.5);
  floorLamp(k, k.frame(0.4, U, -2.3, 0));
  P('potted_plant_01', 0.45, U, 3.6, 1);
  pendantGlobe(k, -0.7, CR, 1.6, 1.0, 0.5);
  k.light(-0.55, U + 2.6, 1.6, 0xffd8a8, 1, 9);

  // ---- roof garden ----
  for (const [x0, z0, x1, z1] of [[XA + 0.1, ZB + 0.2, XA + 0.7, -2.8], [XB - 0.7, ZB + 0.2, XB - 0.1, -2.8]]) {
    k.aabb('Concrete_Gray', x0, U, z0, x1, U + 0.5, z1, { col: true });
    k.aabb('Soil', x0 + 0.05, U + 0.5, z0 + 0.05, x1 - 0.05, U + 0.51, z1 - 0.05);
    for (let z = z0 + 0.35; z < z1; z += 0.55) shrub(k, (x0 + x1) / 2, U + 0.5, z, 0.42, Math.round(z * 100 + x0 * 10), { group: 'L1_Interior' });
  }
  lounger(k, k.frame(-0.6, U, -4.0, 0));
  lounger(k, k.frame(0.5, U, -4.0, 0));

  // ---- balcony ----
  for (const x of [-5.6, -0.9]) {
    k.aabb('Concrete_Gray', x, U, 4.55, x + 0.9, U + 0.55, 5.3, { col: true });
    shrub(k, x + 0.45, U + 0.55, 4.92, 0.5, Math.round(x * 10 + 500), { group: 'L1_Interior' });
  }
  P('outdoor_table_chair_set_01', -3.0, U, 4.75, Math.PI / 2);

  // ---- bedroom 2 ----
  bed(k, k.frame(4.15, U, -2.68, Math.PI), 1.5, 'Fabric_Linen');
  k.aabb('Rug_Dark', 3.3, U, -4.6, 5.5, U + 0.012, -2.9);
  desk(k, k.frame(2.0, U, -3.8, Math.PI / 2));
  P('potted_plant_02', 2.3, U, -4.7, 0.5);
  k.light(4.0, RR - 0.3, -3.8, 0xffd8a8, 0.7, 6);
  // ---- hall + bath ----
  k.prop('hanging_picture_frame_02', k.frame(3.24, U + 1.55, -0.05, -Math.PI / 2), { col: false });
  vanity(k, k.frame(XR - 0.13, U, -1.0, -Math.PI / 2), 1.4);
  toilet(k, k.frame(4.1, U, 0.48, Math.PI));
  k.aabb('Glass_Rail', 3.4, U, -1.75, 4.6, LR - 0.4, -1.73, { col: true });
  k.aabb('Metal_Steel', 3.9, RR - 0.5, -2.3, 4.1, RR - 0.48, -2.1);
  k.light(4.5, RR - 0.3, -1.0, 0xffe6c4, 0.5, 5);
  k.light(2.6, RR - 0.3, -1.0, 0xffe6c4, 0.4, 4);
  // ---- bedroom 3 ----
  bed(k, k.frame(4.15, U, 0.68, 0), 1.5, 'Fabric_Rust');
  k.aabb('Rug_Wool', 3.2, U, 1.0, 5.4, U + 0.012, 3.4);
  P('mid_century_lounge_chair', 2.55, U, 3.25, 2.4);
  floorLamp(k, k.frame(2.1, U, 3.75, 0));
  k.light(4.0, RR - 0.3, 2.3, 0xffd8a8, 0.7, 6);

  // ---- curtains (sheer, like the photo) ----
  k.group = 'L0_Interior';
  curtain(k, XL + 0.1, XL + 1.0, ZF - 0.18, G, GC - 0.02);
  curtain(k, XA - 1.0, XA - 0.05, ZF - 0.18, G, GC - 0.02);
  curtain(k, -0.15, 0.75, ZF - 0.18, G, GC - 0.02);
  k.group = 'L1_Interior';
  curtain(k, XL + 0.1, XL + 1.1, ZF - 0.18, U, LR - 0.02);
  curtain(k, -2.85, -2.35, ZF - 0.18, U, LR - 0.02);
  curtain(k, XA + 0.12, XA + 0.7, ZF - 0.18, U, U + 2.98);
  curtain(k, XB - 0.9, XB - 0.05, ZF - 0.2, U, U + 2.98);
  curtain(k, XR - 1.0, XR - 0.1, ZF - 0.18, U, RR - 0.02);

  // =====================================================================
  // LANDSCAPE (vegetation, photo-matched)
  // =====================================================================
  k.group = 'SITE_Vegetation';
  const V = (id, x, y, z, yaw = 0) => k.propAt(id, x, y, z, yaw, { col: false });
  // right planting bed (photo: lush palms + banana + low tropical planting)
  palm(k, 2.9, 0.12, 7.5, 6.8, 31); palm(k, 5.1, 0.12, 7.1, 5.6, 32); palm(k, 9.6, 0, 8.8, 6.2, 33);
  banana(k, 3.9, 0.12, 7.2, 2.8, 34); banana(k, 5.3, 0.12, 6.0, 2.6, 35); banana(k, 2.4, 0.12, 4.9, 2.4, 36);
  for (let i = 0; i < 7; i++) shrub(k, 2.3 + (i % 4) * 1.05, 0.12, 7.75 - Math.floor(i / 4) * 2.4 + (i % 2) * 0.25, 0.55, 40 + i);
  V('fern_02', 2.3, 0.12, 6.0, 0.4); V('fern_02', 4.4, 0.12, 5.0, 2.2); V('fern_02', 3.4, 0.12, 8.0, 4);
  V('wild_rooibos_bush', 4.2, 0.12, 7.6, 1.2); V('wild_rooibos_bush', 2.2, 0.12, 4.7, 3.3);
  // left cluster (photo bottom-left)
  palm(k, -9.0, 0.1, 4.6, 4.6, 51); banana(k, -9.6, 0.1, 6.8, 2.2, 52);
  for (let i = 0; i < 7; i++) shrub(k, -10.8 + (i % 4) * 0.75, 0.1, 3.0 + Math.floor(i / 4) * 2.6 + (i % 3) * 0.5, 0.65, 60 + i);
  V('fern_02', -7.0, 0.1, 6.5, 1); V('fern_02', -6.9, 0.1, 3.4, 3); V('wild_rooibos_bush', -9.8, 0.1, 2.0, 0.5);
  // terrace planters + front border
  for (let i = 0; i < 4; i++) shrub(k, -6.25 + i * 0.45, G + 0.45, 6.62, 0.3, 70 + i, { cards: 10 });
  shrub(k, 1.35, G + 0.45, 6.62, 0.33, 75, { cards: 10 });
  for (let x = -4.0; x < 1.4; x += 1.25) V('periwinkle_plant', x, 0, 8.35, (x * 7) % 6);
  for (let x = -4.4; x < 1.4; x += 0.95) shrub(k, x + 0.4, 0, 8.75, 0.32, Math.round(80 + x * 10), { cards: 9, color: 0xdfe8cf });
  // big oaks around the plot (real tree models from the reference villa)
  k.oak('OAK_1', -4, -20, 0.8, 0.4); k.oak('OAK_2', 13, -21, 0.7, 2.0);
  k.oak('OAK_3', -20, -8, 0.7, 1.0); k.oak('OAK_1', -19, 17, 0.6, 3.0); k.oak('OAK_2', 17, -4, 0.55, 4.0);
  palm(k, -9.5, 0, -1.0, 7, 98); palm(k, 9.8, 0, 4.5, 6.5, 99); palm(k, 10.5, 0, -6, 7.5, 100); palm(k, -10.5, 0, -8, 6.8, 101);
  // lawn uplights
  for (const [x, z] of [[2.9, 8.3], [5.1, 7.9], [-9.0, 5.4], [9.6, 9.6]]) k.cyl(I, 'Emissive_Warm', 0.06, 0.06, 0.04, x + 0.35, 0.13, z, 10);

  // =====================================================================
  // ROOMS & VIEWPOINTS (for the website)
  // =====================================================================
  k.room('Front Garden', 0, -14, 7, 14, 30);
  k.room('Front Terrace', 0, -6.7, 4, 1.9, 7);
  k.room('Living Room', 0, XL, -2, XA, ZF);
  k.room('Foyer', 0, XA, 1.5, 0.8, ZF);
  k.room('Dining', 0, XA, -1.6, XB, 1.5);
  k.room('Staircase', 0, 0.8, 1.5, XB, ZF);
  k.room('Kitchen', 0, XA, ZB, XB, -1.6);
  k.room('Guest Bedroom', 0, XB, ZB, XR, -1.6);
  k.room('Powder Room', 0, XB, -1.6, 3.4, 0.4);
  k.room('Carport', 0, XB, 0.4, 8.6, ZF + 0.5);
  k.room('Back Terrace', 0, XL - 0.2, ZB - 0.3, XA, -2);
  k.room('Master Suite', 1, XL, -2.6, XA, ZF);
  k.room('Walk-in Closet', 1, XL, ZB, -3.8, -2.6);
  k.room('En-Suite', 1, -3.8, ZB, XA, -2.6);
  k.room('Upper Lounge', 1, XA, -2.6, XB, ZF);
  k.room('Roof Garden', 1, XA, ZB, XB, -2.6);
  k.room('Bedroom 2', 1, XB, ZB, XR, -2.6);
  k.room('Hallway', 1, XB, -2.6, 3.3, 0.6);
  k.room('Bathroom', 1, 3.3, -2.6, XR, 0.6);
  k.room('Bedroom 3', 1, XB, 0.6, XR, ZF);
  k.room('Balcony', 1, -6.7, ZF, XB, 5.6);
  k.room('Garden', 0, -14, -13, 14, 30);

  k.spot('Front Garden', -0.8, 0.03, 15.5, 0.04);
  k.spot('Entrance', -0.85, G, 6.4, 0);
  k.spot('Living Room', -1.9, G, 3.45, Math.PI * 0.3);
  k.spot('Dining & Kitchen', -0.4, G, 3.0, 0);
  k.spot('Kitchen', 1.35, G, -1.9, 0.55);
  k.spot('Guest Bedroom', 2.45, G, -3.0, -Math.PI * 0.32);
  k.spot('Back Terrace', -2.4, G, -4.4, Math.PI * 0.45);
  k.spot('Upper Lounge', 1.3, U, -2.1, Math.PI * 0.82);
  k.spot('Master Suite', -5.0, U, 3.5, -Math.PI * 0.3);
  k.spot('En-Suite', -2.4, U, -2.9, 0.4);
  k.spot('Walk-in Closet', -4.8, U, -2.9, 0);
  k.spot('Bedroom 2', 2.4, U, -3.0, -1.15);
  k.spot('Bathroom', 3.7, U, -0.2, -Math.PI * 0.55);
  k.spot('Bedroom 3', 2.4, U, 1.0, -2.2);
  k.spot('Balcony', -6.0, U, 5.0, -Math.PI / 2);
  k.spot('Roof Garden', 0.0, U, -2.9, 0);

  return k;
}

// =====================================================================
// FURNITURE (local frame: +z = front of piece, origin at floor center/back as noted)
// =====================================================================
function floorLamp(k, m) {
  k.cyl(m, 'Metal_Black', 0.16, 0.16, 0.03, 0, 0.015, 0, 20);
  k.cyl(m, 'Metal_Black', 0.012, 0.012, 1.5, 0, 0.76, 0, 8);
  k.cyl(m, 'Lamp_Shade', 0.2, 0.24, 0.32, 0, 1.55, 0, 24);
}
function pendantGlobe(k, x, ceil, z, drop, r) {
  k.cyl(new THREE.Matrix4(), 'Metal_Black', 0.006, 0.006, drop, x, ceil - drop / 2, z, 6);
  k.sphere(new THREE.Matrix4(), 'Lamp_Shade', r, x, ceil - drop - r * 0.8, z);
  k.cyl(new THREE.Matrix4(), 'Metal_Brass', 0.08, 0.08, 0.03, x, ceil - 0.015, z, 16);
}
function linearPendant(k, x, ceil, z, len) {
  k.cyl(new THREE.Matrix4(), 'Metal_Black', 0.005, 0.005, 0.9, x - len / 2 + 0.1, ceil - 0.45, z, 6);
  k.cyl(new THREE.Matrix4(), 'Metal_Black', 0.005, 0.005, 0.9, x + len / 2 - 0.1, ceil - 0.45, z, 6);
  k.aabb('Metal_Brass', x - len / 2, ceil - 0.97, z - 0.05, x + len / 2, ceil - 0.9, z + 0.05);
  k.aabb('Emissive_Warm', x - len / 2 + 0.03, ceil - 0.975, z - 0.03, x + len / 2 - 0.03, ceil - 0.97, z + 0.03);
}
function downlights(k, x0, z0, x1, z1, ceil, step) {
  for (let x = x0; x <= x1 + 1e-3; x += step) for (let z = z0; z <= z1 + 1e-3; z += step)
    k.cyl(new THREE.Matrix4(), 'Emissive_Warm', 0.045, 0.045, 0.012, x, ceil - 0.006, z, 12);
}
function consoleTable(k, m) {
  k.box(m, 'Wood_Walnut', 1.4, 0.05, 0.38, 0, 0.82, 0, { col: true });
  k.box(m, 'Metal_Brass', 0.03, 0.8, 0.3, -0.6, 0.4, 0); k.box(m, 'Metal_Brass', 0.03, 0.8, 0.3, 0.6, 0.4, 0);
  k.cyl(m, 'Ceramic_White', 0.1, 0.07, 0.35, -0.35, 1.02, 0, 20);
  k.box(m, 'Art_Cream', 0.3, 0.06, 0.22, 0.3, 0.875, 0);
}
function kitchen(k) {
  const G0 = G, z0 = ZB + EW / 2;
  // back run base cabinets + counter + backsplash
  k.aabb('Lacquer_Black', XA + 0.05, G0, z0, XB - 0.05, G0 + 0.86, z0 + 0.62, { col: true });
  k.aabb('Marble', XA + 0.05, G0 + 0.86, z0, XB - 0.05, G0 + 0.9, z0 + 0.65);
  k.aabb('Marble', XA + 0.05, G0 + 0.9, z0, XB - 0.05, G0 + 1.05, z0 + 0.02);
  for (let x = XA + 0.05; x < XB - 0.1; x += 0.6) k.aabb('Metal_Brass', x + 0.25, G0 + 0.75, z0 + 0.62, x + 0.35, G0 + 0.77, z0 + 0.64);
  k.aabb('Metal_Steel', -0.3, G0 + 0.9, z0 + 0.15, 0.3, G0 + 0.905, z0 + 0.5); // sink
  k.cyl(new THREE.Matrix4(), 'Metal_Steel', 0.015, 0.015, 0.35, 0, G0 + 1.08, z0 + 0.08, 8);
  k.aabb('Screen_Black', -1.5, G0 + 0.9, z0 + 0.1, -0.9, G0 + 0.905, z0 + 0.55); // cooktop
  // upper floating shelf + LED
  k.aabb('Wood_Walnut', XA + 0.05, G0 + 2.45, z0, XB - 0.05, G0 + 2.5, z0 + 0.32);
  k.aabb('Emissive_Warm', XA + 0.1, G0 + 2.44, z0 + 0.02, XB - 0.1, G0 + 2.445, z0 + 0.06);
  for (let i = 0; i < 6; i++) k.cyl(new THREE.Matrix4(), i % 2 ? 'Ceramic_White' : 'Pot_Ceramic', 0.06, 0.06, 0.14 + (i % 3) * 0.05, -1.5 + i * 0.55, G0 + 2.57 + (i % 3) * 0.025, z0 + 0.16, 16);
  // tall units (fridge + ovens) against right wall
  k.aabb('Lacquer_Black', XB - 0.68, G0, z0, XB - 0.06, GC - 0.4, -3.55, { col: true });
  k.aabb('Metal_Steel', XB - 0.69, G0 + 0.9, -4.3, XB - 0.68, G0 + 1.5, -3.7);
  k.aabb('Screen_Black', XB - 0.69, G0 + 1.55, -4.3, XB - 0.68, G0 + 1.95, -3.7);
  k.aabb('Metal_Brass', XB - 0.7, G0 + 0.8, -4.62, XB - 0.69, G0 + 1.9, -4.6);
  // island with waterfall marble
  k.aabb('Wood_Walnut', -1.3, G0, -3.25, 0.7, G0 + 0.88, -2.45, { col: true });
  k.aabb('Marble', -1.35, G0 + 0.88, -3.3, 0.75, G0 + 0.93, -2.3);
  k.aabb('Marble', -1.35, G0, -3.3, -1.3, G0 + 0.88, -2.3);
  k.aabb('Marble', 0.7, G0, -3.3, 0.75, G0 + 0.88, -2.3);
  for (const x of [-0.85, -0.3, 0.25]) pendantGlobe(k, x, GC, -2.85, 0.9, 0.13);
  // bowl of fruit
  k.cyl(new THREE.Matrix4(), 'Ceramic_White', 0.18, 0.1, 0.08, -0.2, G0 + 0.97, -2.8, 24);
  for (let i = 0; i < 4; i++) k.sphere(new THREE.Matrix4(), 'Art_Terracotta', 0.045, -0.25 + (i % 2) * 0.09, G0 + 1.02, -2.85 + (i >> 1) * 0.09);
}
function bed(k, m, w = 1.6, throwMat = 'Fabric_Sage') {
  // origin: center of headboard wall; bed extends to +z
  k.rbox(m, 'Fabric_Linen', w + 0.5, 1.15, 0.12, 0, 0.58, 0.06, 0.04);
  k.box(m, 'Wood_Walnut', w + 0.1, 0.3, 2.05, 0, 0.17, 1.15, { col: true });
  k.rbox(m, 'Bedding_White', w, 0.26, 1.98, 0, 0.44, 1.14, 0.08);
  k.rbox(m, throwMat, w + 0.04, 0.05, 0.6, 0, 0.58, 1.75, 0.02);
  k.rbox(m, 'Bedding_White', w * 0.42, 0.16, 0.38, -w * 0.24, 0.64, 0.38, 0.07);
  k.rbox(m, 'Bedding_White', w * 0.42, 0.16, 0.38, w * 0.24, 0.64, 0.38, 0.07);
  for (const s of [-1, 1]) {
    const x = s * (w / 2 + 0.42);
    k.box(m, 'Wood_Walnut', 0.5, 0.42, 0.42, x, 0.31, 0.3, { col: true });
    k.cyl(m, 'Ceramic_White', 0.08, 0.1, 0.25, x, 0.645, 0.25, 16);
    k.cyl(m, 'Lamp_Shade', 0.12, 0.15, 0.2, x, 0.86, 0.25, 20);
  }
}
function desk(k, m) {
  k.box(m, 'Wood_Walnut', 1.3, 0.04, 0.6, 0, 0.75, 0.3, { col: true });
  k.box(m, 'Metal_Black', 0.04, 0.73, 0.55, -0.6, 0.365, 0.3); k.box(m, 'Metal_Black', 0.04, 0.73, 0.55, 0.6, 0.365, 0.3);
  k.prop('dining_chair_02', k.frame(0, 0, 0.8, Math.PI, m)); // seat faces the desk
  k.box(m, 'Screen_Black', 0.36, 0.02, 0.25, 0.2, 0.78, 0.3);
  k.prop('desk_lamp_arm_01', k.frame(-0.45, 0.77, 0.25, 0.5, m), { col: false });
}
function wardrobe(k, x0, z0, x1, z1, y, open = false) {
  k.aabb('Lacquer_White', x0, y, z0, x1, y + 2.4, z1, { col: true });
  const alongX = x1 - x0 > z1 - z0;
  const n = Math.round((alongX ? x1 - x0 : z1 - z0) / 0.5);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (alongX) k.aabb('Metal_Dark', x0 + (x1 - x0) * t - 0.004, y + 0.05, z1, x0 + (x1 - x0) * t + 0.004, y + 2.35, z1 + 0.005);
    else k.aabb('Metal_Dark', x1, y + 0.05, z0 + (z1 - z0) * t - 0.004, x1 + 0.005, y + 2.35, z0 + (z1 - z0) * t + 0.004);
  }
  if (open) k.aabb('Emissive_Warm', x0 + 0.05, y + 2.3, z1 - 0.05, x1 - 0.05, y + 2.31, z1);
}
function vanity(k, m, len) {
  // origin at wall; vanity extends to +z
  k.box(m, 'Wood_Walnut', len, 0.45, 0.5, 0, 0.6, 0.25, { col: true });
  k.box(m, 'Marble', len + 0.02, 0.04, 0.52, 0, 0.845, 0.26);
  k.cyl(m, 'Ceramic_White', 0.2, 0.16, 0.13, 0, 0.93, 0.28, 28);
  k.cyl(m, 'Metal_Brass', 0.012, 0.012, 0.25, 0, 1.0, 0.06, 8);
  k.box(m, 'Mirror', len * 0.85, 0.9, 0.02, 0, 1.6, 0.02);
  k.box(m, 'Emissive_Warm', len * 0.85, 0.02, 0.03, 0, 2.06, 0.03);
}
function toilet(k, m) {
  k.box(m, 'Ceramic_White', 0.38, 0.4, 0.15, 0, 0.6, 0.08);
  k.rbox(m, 'Ceramic_White', 0.38, 0.38, 0.55, 0, 0.19, 0.38, 0.12, { col: true });
}
function bathtub(k, m) {
  k.rbox(m, 'Ceramic_White', 1.7, 0.58, 0.8, 0, 0.29, 0, 0.2, { col: true });
  k.rbox(m, 'Mirror', 1.5, 0.02, 0.6, 0, 0.56, 0, 0.01);
  k.cyl(m, 'Metal_Brass', 0.02, 0.02, 1.0, 0.95, 0.5, 0, 8);
}
function bookshelf(k, x, z0, z1, y) {
  k.aabb('Wood_Walnut', x, y, z0, x + 0.35, y + 2.6, z1, { col: true });
  const geo = [];
  for (let s = 0; s < 5; s++) {
    const yy = y + 0.12 + s * 0.5;
    k.aabb('Lacquer_Black', x + 0.02, yy - 0.02, z0 + 0.02, x + 0.36, yy, z1 - 0.02);
    let z = z0 + 0.06;
    let i = 0;
    while (z < z1 - 0.12) {
      const w = 0.03 + ((i * 37) % 5) * 0.008, h = 0.22 + ((i * 13) % 7) * 0.025;
      const col = [0x8c5634, 0x2f5a63, 0xd8cfc0, 0x3b3d40, 0xa9643f, 0x6b7b5a][(i * 7 + s) % 6];
      if ((i + s) % 9 !== 4) k.aabb('Books', x + 0.08, yy, z, x + 0.32, yy + h, z + w, { color: col });
      z += w + 0.004; i++;
      if ((i + s) % 11 === 0) z += 0.2;
    }
  }
}
function art(k, axis, fixed, c, cy, w, h, mat, dir = 1) {
  const t = 0.04;
  if (axis === 'x') {
    k.aabb('Metal_Black', c - w / 2 - 0.03, cy - h / 2 - 0.03, fixed - t, c + w / 2 + 0.03, cy + h / 2 + 0.03, fixed);
    k.aabb(mat, c - w / 2, cy - h / 2, fixed + 0.002 - t - 0.004, c + w / 2, cy + h / 2, fixed - t + 0.01);
  } else {
    const f0 = dir > 0 ? fixed : fixed - t, f1 = dir > 0 ? fixed + t : fixed;
    k.aabb('Metal_Black', f0, cy - h / 2 - 0.03, c - w / 2 - 0.03, f1, cy + h / 2 + 0.03, c + w / 2 + 0.03);
    const g0 = dir > 0 ? f1 : f0 - 0.005, g1 = dir > 0 ? f1 + 0.005 : f0;
    k.aabb(mat, g0, cy - h / 2, c - w / 2, g1, cy + h / 2, c + w / 2);
    k.aabb('Art_Cream', g0 + (dir > 0 ? 0.001 : -0.001), cy - h * 0.25, c - w * 0.3, g1 + (dir > 0 ? 0.001 : -0.001), cy + h * 0.15, c + w * 0.05);
  }
}
function bench(k, m) {
  k.box(m, 'Wood_Walnut', 1.4, 0.06, 0.45, 0, 0.44, 0, { col: true });
  k.box(m, 'Metal_Black', 0.05, 0.42, 0.4, -0.6, 0.21, 0); k.box(m, 'Metal_Black', 0.05, 0.42, 0.4, 0.6, 0.21, 0);
  k.rbox(m, 'Fabric_Charcoal', 1.3, 0.06, 0.4, 0, 0.5, 0, 0.025);
}
function lounger(k, m) {
  k.box(m, 'Wood_Walnut', 0.7, 0.08, 1.4, 0, 0.3, 0.2, { col: true });
  k.box(m, 'Metal_Black', 0.04, 0.3, 0.04, -0.3, 0.15, -0.4); k.box(m, 'Metal_Black', 0.04, 0.3, 0.04, 0.3, 0.15, -0.4);
  k.box(m, 'Metal_Black', 0.04, 0.3, 0.04, -0.3, 0.15, 0.8); k.box(m, 'Metal_Black', 0.04, 0.3, 0.04, 0.3, 0.15, 0.8);
  k.rbox(m, 'Bedding_White', 0.66, 0.08, 1.36, 0, 0.38, 0.2, 0.03);
  const back = k.frame(0, 0.38, -0.5, 0, m).multiply(new THREE.Matrix4().makeRotationX(0.75));
  k.box(back, 'Wood_Walnut', 0.7, 0.07, 0.7, 0, 0, -0.35);
  k.rbox(back, 'Bedding_White', 0.66, 0.08, 0.66, 0, 0.07, -0.35, 0.03);
}
function curtain(k, x0, x1, z, y0, y1) {
  const w = x1 - x0, folds = Math.max(4, Math.round(w / 0.12));
  const geo = new THREE.PlaneGeometry(w, y1 - y0, folds * 4, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / w) * folds * Math.PI * 2) * 0.045);
  geo.computeVertexNormals();
  geo.translate((x0 + x1) / 2, (y0 + y1) / 2, z);
  k.add('Curtain_Sheer', geo, null);
}

// modern sectional (real fabric texture); origin = centre of back edge, seat faces +z
function sofa(k, m, len = 2.4, fab = 'Fabric_Linen') {
  k.box(m, 'Metal_Black', len - 0.2, 0.08, 0.8, 0, 0.04, 0.45);
  k.rbox(m, fab, len, 0.32, 0.95, 0, 0.26, 0.48, 0.06, { col: true });
  k.rbox(m, fab, len, 0.42, 0.22, 0, 0.6, 0.12, 0.08);
  k.rbox(m, fab, 0.22, 0.28, 0.95, -len / 2 + 0.11, 0.55, 0.48, 0.07);
  k.rbox(m, fab, 0.22, 0.28, 0.95, len / 2 - 0.11, 0.55, 0.48, 0.07);
  const n = Math.max(2, Math.round((len - 0.44) / 0.8)), cw = (len - 0.44) / n;
  for (let i = 0; i < n; i++) k.rbox(m, fab, cw - 0.02, 0.14, 0.66, -len / 2 + 0.22 + cw * (i + 0.5), 0.48, 0.55, 0.06);
  for (let i = 0; i < n; i++) k.rbox(m, fab, cw - 0.06, 0.36, 0.14, -len / 2 + 0.22 + cw * (i + 0.5), 0.72, 0.28, 0.07);
  k.rbox(m, 'Fabric_Rust', 0.42, 0.38, 0.13, -len / 2 + 0.5, 0.74, 0.4, 0.06);
  k.rbox(m, 'Fabric_Sage', 0.42, 0.38, 0.13, len / 2 - 0.5, 0.74, 0.4, 0.06);
}
function sofaL(k, m, len, fab) {
  sofa(k, m, len, fab);
  k.rbox(m, fab, 0.85, 0.32, 0.9, len / 2 - 0.43, 0.26, 1.35, 0.06, { col: true });
  k.rbox(m, fab, 0.8, 0.14, 0.85, len / 2 - 0.43, 0.48, 1.38, 0.06);
}
// modern walnut dining table with black steel sled legs; origin = centre
function diningTable(k, m) {
  k.box(m, 'Wood_Walnut', 2.2, 0.045, 1.0, 0, 0.745, 0, { col: true });
  for (const sx of [-0.85, 0.85]) {
    k.box(m, 'Metal_Black', 0.05, 0.7, 0.05, sx, 0.37, -0.38); k.box(m, 'Metal_Black', 0.05, 0.7, 0.05, sx, 0.37, 0.38);
    k.box(m, 'Metal_Black', 0.05, 0.05, 0.8, sx, 0.7, 0); k.box(m, 'Metal_Black', 0.05, 0.03, 0.8, sx, 0.015, 0);
  }
  k.box(m, 'Ceramic_White', 0.5, 0.03, 0.22, 0.45, 0.785, 0);
}
