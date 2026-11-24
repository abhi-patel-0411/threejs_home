# Modern Two-Story Residence — 3D model + walkthrough

A 3D model (`public/models/house.glb`) built from the front-elevation photo and the
ground/second floor plans, plus a website to walk through it with W A S D.

## Run
```
npm install
npm run dev        # http://localhost:5179
npm run build      # regenerates the GLB, then builds the static site into dist/
```

## Controls
W A S D / arrows: move · mouse: look (click to capture) · Shift: run · Space: jump · Q / E: turn
V: aerial / dollhouse · N: day / night · R: rooms · M: minimap · P: screenshot · F: fullscreen
Touch: left thumb joystick, drag the right side to look.

## Assets (realism upgrade)
- Furniture, plants and decor: 21 CC0 models from Poly Haven (downloaded automatically into `build/cache/ph` on first build).
- PBR texture sets (oak herringbone floor, plaster, marble, concrete, fabric, leather, carpet, grass, soil) and the oak trees are taken from the reference villa in `C:/omini/experience.omenlabz.com/assets`, along with its leaf textures and `sky.hdr`.
- Seating models are turned automatically so they face the right way: the exporter finds the backrest and rotates the model if needed.
- The output is compressed with Meshopt and WebP textures (~46 MB).

## Villa estate
The grounds around the house come from the reference `villa.glb`: the lawn, perimeter fence and walls, cobblestone paths with grass strips, pergola, garden lights and the dense hedges. The villa building itself is cut away and the house sits in its place. The placement and cut-out areas are set in `ENV` in `build/export.mjs`.

## How it is built
- `build/house.mjs`: the layout. Walls, glazing, stair, slabs, roofs, furniture, landscaping, rooms and viewpoints.
- `build/kit.mjs`: geometry kit and material library. `build/plants.mjs`: procedural palms, banana plants, shrubs and trees.
- `build/textures.mjs`: procedural seamless textures (oak, walnut, marble, pavers, concrete, grass…), embedded in the GLB.
- `build/export.mjs`: writes `house.glb` (glTF 2.0, works in Blender and any glTF viewer) and `house.meta.json`
  (colliders, rooms, light positions, viewpoints).
- `src/main.js`: the viewer. Sky, sun shadows, ambient occlusion, bloom, first-person physics with stairs, room teleports,
  minimap, dollhouse level cut-away, day/night.

Edit `build/house.mjs` and run `npm run model` to regenerate the model.
