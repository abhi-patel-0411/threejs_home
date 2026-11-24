# Plan — producing "villa.glb quality" house models, every time

This plan describes how to turn **any** house (an elevation photo + floor plans) into a walkable 3D
model at the same quality as the reference `villa.glb`, using that villa as the **master template**
for materials, vegetation, estate and lighting.

It is written against this repository (`C:\modalhome`) and the reference folder
(`C:\omini\experience.omenlabz.com`).

---

## 1. What makes `villa.glb` look "perfect" (the quality bar)

What `villa.glb` contains (inspected with `build/inspect*.mjs`):

| Part | In `villa.glb` | Why it matters |
|---|---|---|
| Geometry | 11 nodes, merged per area: `SHELL`, `GROUND`, `V_INTERIOR_H`, `V_OUTSIDE_H`, `V_Windows_glass_doors`, `POOL_WATER`, `OAK_1..3`, `F_BUSHES_L/X` | Few draw calls, fast to load |
| Compression | `KHR_draco_mesh_compression` | 89 MB for ~5 M triangles |
| Materials | 73 PBR materials, ambientCG / Poly Haven 2K sets (Color + NormalGL + Roughness) | Real surfaces, not flat colours |
| Vegetation | 3 high-poly oaks (~0.5 M verts each), ~1.8 M verts of alpha-card hedges (`leaves.png`) | Dense, believable greenery |
| Lighting | Baked lightmaps (`lm_shell.jpg`, `lm_ground.jpg`, 4K, second UV set `TEXCOORD_1`) + `sky.hdr` | Soft GI shadows and ambient occlusion everywhere |
| Estate | Fence, walls, cobblestone paths with grass strips, pergola, garden lights | The house sits in a finished place |
| Walkthrough | `collider.glb` (simplified collision mesh) + WASD viewer | Smooth walking, no clipping |

**Quality checklist**: a new model is "villa quality" when all of these are true:

- [ ] Every surface has a real PBR texture set (no plain colours except glass, metal and lacquer)
- [ ] Furniture is real modelled assets, each one facing the right way
- [ ] Vegetation uses alpha-card leaves and real tree models, not blobs
- [ ] The house sits in a complete estate (ground, boundary, paths, lights, hedges)
- [ ] HDR sky for background and image-based lighting
- [ ] Soft shadows and AO (real-time GTAO now, baked lightmaps as the stretch goal)
- [ ] Collisions on every wall and piece of furniture, working stairs, plot bounds
- [ ] One GLB of 100 MB or less that loads in under 15 s on broadband and runs at 45 fps or more on a mid-range desktop

---

## 2. Pipeline overview

```
 Photo + floor plans
        │
        ▼
 (A) Layout spec  ──────────► build/house.mjs  (walls, openings, slabs, stair, roofs, rooms, viewpoints)
        │
        ▼
 (B) Material map ──────────► build/kit.mjs MATS → villa PBR sets (cache/villa/*.jpg)
        │
        ▼
 (C) Furnishing   ──────────► k.propAt('<polyhaven id>', x, y, z, yaw)  (auto-oriented seating)
        │
        ▼
 (D) Landscape    ──────────► palms / banana / alpha-card shrubs + villa oaks
        │
        ▼
 (E) Estate       ──────────► villa GROUND + fence + paths + pergola + hedges, cut around the house (ENV)
        │
        ▼
 (F) Export       ──────────► build/export.mjs → dedup, prune, WebP textures, Meshopt → public/models/house.glb
        │                                                                     + house.meta.json (colliders, rooms, lights, spots)
        ▼
 (G) Viewer       ──────────► src/main.js (HDR, shadows, GTAO, bloom, WASD, minimap, dollhouse, day/night)
        │
        ▼
 (H) QA renders + walk tests  →  fix → rebuild
```

Commands:

```powershell
npm install
npm run model      # (A)-(F): regenerate house.glb + meta
npm run dev        # (G): http://localhost:5179
npm run build      # static site in dist/ using the committed house.glb (what Vercel runs)
npm run build:full # (A)-(F) + site; local only, needs the reference villa folder
```

---

## 3. Step by step for a NEW house

### (A) Layout spec: from the drawings to `build/house.mjs`

1. **Read the plan dimensions** (overall width and depth, room splits) and **storey heights** from the elevation.
   Fill in the constants at the top of `house.mjs`:
   `G` (plinth), `H1` (floor to floor), `SL` (slab), `LR/CR/RR` (ceiling per volume), `XL..XR`, `ZB..ZF` (grid lines).
2. Use one axis convention, always: **+X = right on the plan, +Z = front/street, +Y = up, metres.**
3. Build the shell in this order (each call adds geometry **and** colliders):
   - plinth, terraces, steps → `k.aabb(...)`
   - exterior walls with openings → `k.wall(axis, fixed, from, to, y0, y1, t, mat, [{a,b,y0,y1,glass}])`
   - glazing with mullions → `k.glazing(...)`
   - interior walls and door openings (door height 2.2 m)
   - slabs → `slab(x0,z0,x1,z1, finish)`, leaving an opening for the stair
   - stair: 17–18 cm risers, 27 cm treads, glass balustrade
   - roofs, canopies (`canopy()`), parapets and frames matching the photo
4. Register **rooms** (`k.room(name, level, x0, z0, x1, z1)`) and **viewpoints** (`k.spot(name, x, y, z, yaw)`).
5. Keep rooms walkable: leave at least 0.6 m between furniture items and keep 0.8–0.9 m door openings clear.

### (B) Material map (villa PBR sets)

Map each surface in the photo to an entry in `MATS` (`build/kit.mjs`). Use the villa sets in `build/cache/villa/`:

| Surface in photo | `MATS` key | Texture set |
|---|---|---|
| White render / plaster | `Plaster_White` | `wplaster_n/r` (white tint) |
| Grey concrete bands | `Concrete_Gray` | `concrete_c/n/r` |
| Wood floors | `Wood_Oak_Floor` | `floor_c/n/r` (herringbone WoodFloor052) |
| Joinery / panels | `Wood_Walnut` | `wood_c/n/r` |
| Counters / baths | `Marble`, `Marble_Floor` | `marble_c/n/r` |
| Interior walls / ceilings | `Wall_Interior`, `Ceiling` | `drywall_n/r` |
| Upholstery | `Fabric_*` (colour factor) | `fabric_c/n/r` |
| Rugs | `Rug_*` | `carpet_c/n/r` |
| Lawn / soil | `Grass`, `Soil` | `grass_c/n`, `soil_c/n` |

Rules:
- `tile` = metres per texture repeat. Wall and floor geometry gets world-space UVs automatically.
- Roughness maps go in the metal-roughness slot with `metal: 0`.
- Glass stays a simple blended material (`Glass`, `Glass_Rail`). Don't use transmission, for performance.

### (C) Furnishing with real assets

1. Pick models from Poly Haven (CC0) and add their ids to `PH_MODELS` in `build/fetch-assets.mjs`.
   The first build downloads them into `build/cache/ph/<id>/`.
2. Place them with `k.propAt(id, x, y, z, yaw, { col, group })`. The model's front is assumed to face **+Z**.
3. Seating ids listed in `SEATING` (`export.mjs`) are **auto-oriented**: the exporter finds the backrest and
   turns the model if it was built the other way round. Add every new chair or sofa id to `SEATING`.
4. Chair rules (this is what was wrong before):
   - chairs on the far side of a table (−Z side) → `yaw = 0`; chairs on the near side (+Z) → `yaw = π`
   - a desk chair is placed in the desk's frame at local `z = 0.8`, `yaw = π`
   - sofas and armchairs face the TV or the conversation centre: `yaw = atan2(dx, dz)` towards the target
5. Use built-in pieces only where no good asset exists (beds, kitchen runs, wardrobes, vanities), and always give them villa textures.
6. Check the style: modern house → modern pieces. Avoid Chesterfield sofas and checked tablecloths in a minimalist villa.

### (D) Landscape

- Palms, banana plants and alpha-card shrubs come from `build/plants.mjs` (they use `leaves.png` and the procedural `frond` texture).
- Large trees: `k.oak('OAK_1'|'OAK_2'|'OAK_3', x, z, scale, yaw)`. These copy the villa oaks; use a scale of 0.55–0.8 so they stay in proportion.
- Ground plants: Poly Haven `fern_02`, `wild_rooibos_bush`, `periwinkle_plant` (with `col: false`).
- Match the photo: lush planting where the photo has it, low borders along the paths.

### (E) Estate (villa grounds around the new house)

Configured with `ENV` in `build/export.mjs`:

```js
const ENV = {
  offset: [-4, -2.2, -6],          // villa coords + offset = our coords (villa ground top = 2.2)
  clear:        [[x0, z0, x1, z1]], // cut ground/props/hedges under the new house + garden
  clearBushes:  [[...]],            // extra hedge-free area (front lawn, views)
  clearOutside: [[...]],            // leftovers of the villa building (decks, roof trims)
  keepMats: ['Dark metal','White wood','Stone','Cobblestone','Cobblestone walls','Grass','Light',
             'Constructive wood','Modern White wood','Old plaster'],
};
```

Procedure for a new house:
1. Choose `offset` so the house footprint lands in the villa's building zone and the front faces the villa entrance (+Z).
2. Set `clear` to the house footprint plus about 5 m all round.
3. Render an aerial view, look for leftover fragments (floating beams, cut hedges) and add `clearOutside` / `clearBushes` rectangles.
4. Update the walk bounds in `src/main.js` (`resolve()` clamp) to the estate fence.

### (F) Export and optimisation

`build/export.mjs` does it all:
- merges procedural meshes per (group, material) into few draw calls
- instances props by sharing meshes and builds colliders from their rotated bounding boxes
- `dedup → prune → textureCompress(WebP, ≤2048) → meshopt` compression

Budgets to keep:

| Item | Budget |
|---|---|
| `house.glb` | 100 MB or less (now 75 MB) |
| Triangles drawn | 3 M or fewer (hedges and oaks are the main cost) |
| Textures | 2048 px or less for large surfaces, 1024 px for props |
| Draw calls | 400 or fewer |

### (G) Viewer

`src/main.js` already gives villa-style presentation:
- `sky.hdr` as background and image-based lighting; sun direction taken from the HDR's brightest pixel
- AgX tone mapping, PCF soft shadows (±26 m), GTAO, subtle bloom
- WASD, mouse look, Shift to run, Space to jump; stairs and furniture collisions from `house.meta.json`
- room teleports, minimap, dollhouse levels (node groups `L0_*`, `L1_*`, `ROOF`, `SITE_*`), day/night
- Meshopt decoding (`setMeshoptDecoder`)

### (H) QA: required before calling it done

1. **Renders** (scripted snapshots) from: front garden, front-right, left, back, aerial, plus every room viewpoint, in day and night.
2. **Walk tests**:
   - garden → front door → foyer
   - up and down the stairs
   - walk into every wall and big piece of furniture
   - balcony railing stops you
   - plot fence stops you
3. **Orientation check**: every chair faces its table, desk or conversation area, and every sofa faces its TV or the room.
4. **Clash check**:
   - no plant pokes through glass
   - no prop overlaps a door opening
   - no villa leftovers float in the air
5. **Performance**: 45 fps or more at High on a desktop GPU and 30 fps or more at Fast; no WebGL context loss.

---

## 4. Roadmap: closing the last gap to `villa.glb`

| Priority | Item | How |
|---|---|---|
| 1 | **Baked lightmaps** (biggest realism gain) | Export `house.glb`, then in Blender add a second UV map (Smart UV Project), bake Cycles diffuse lighting into 4K atlases (`lm_house.jpg`, `lm_ground.jpg`). Re-import and set `aoMap`/`lightMap` with `channel = 1` in the viewer, the way the reference does |
| 2 | Collider mesh | Generate a simplified `collider.glb` (walls, floors, stairs) and use three-mesh-bvh capsule collision instead of AABBs |
| 3 | Hedge cost | Run `simplify()` (meshoptimizer) on `F_BUSHES_*` and cut by cluster instead of by triangle. This roughly halves file size and removes stray leaf cards |
| 4 | Draco option | Offer Draco as well as Meshopt for maximum compression |
| 5 | Lazy loading | Split into `house-core.glb` (shell + interior) and `estate.glb` (ground + vegetation) so the house appears first |
| 6 | More assets | Modern bed, kitchen and bathroom sets (CC0) to replace the remaining built-in pieces |
| 7 | Template generator | Move the layout into a JSON spec (`layout.json`: grids, walls, openings, rooms) so a new house needs no code edits |

---

## 5. Reusing `villa.glb` as the master template: rules

1. **Never edit `villa.glb`.** Read it with gltf-transform (Draco decoder) and copy parts out (`copyToDocument`).
2. Reuse from it, in this order of value:
   - PBR texture sets
   - `sky.hdr`
   - oak trees
   - hedge geometry and `leaves.png`
   - estate meshes (ground, fence, paths, pergola, lights)
3. Never reuse its building (`SHELL`, `V_INTERIOR_H`, `V_Windows_glass_doors`, `POOL_WATER`) or its lightmaps. Those belong to the villa's own geometry.
4. Keep the credits: the villa assets are "SHC (D. Woo) — royalty-free" and the textures are ambientCG / Poly Haven (CC0). Furniture is Poly Haven (CC0). Credits are shown in the site's Plans panel and stored in `house.meta.json`.
5. Check the reference licence before publishing commercially.

---

## 6. File map

| File | Role |
|---|---|
| `build/house.mjs` | Layout: shell, interiors, landscape, rooms, viewpoints |
| `build/kit.mjs` | Material library (`MATS`), geometry kit, `prop`/`oak` placement API |
| `build/plants.mjs` | Palms, banana plants, alpha-card shrubs, hedges |
| `build/textures.mjs` | Procedural textures (granite, slats, stone cladding, pavers, frond) |
| `build/fetch-assets.mjs` | Downloads Poly Haven models; extracts villa textures and leaves |
| `build/export.mjs` | Assembles everything (`ENV` estate settings, seating auto-orientation) and writes the GLB and meta file |
| `src/main.js`, `src/style.css`, `index.html` | Walkthrough website |
| `public/models/house.glb`, `house.meta.json` | Output model and walk data |
| `public/env/sky.hdr` | HDR sky from the reference project |
