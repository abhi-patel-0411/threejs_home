// Downloads CC0 furniture/plant models from Poly Haven (glTF, 1k textures) and extracts the
// real PBR texture sets + leaf textures from the reference villa into build/cache.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(__dirname, 'cache');
export const REF = 'C:/omini/experience.omenlabz.com/assets';

export const PH_MODELS = [
  'sofa_03', 'sofa_02', 'modern_arm_chair_01', 'mid_century_lounge_chair', 'Ottoman_01',
  'modern_coffee_table_01', 'coffee_table_round_01', 'side_table_01', 'dining_table', 'dining_chair_02',
  'bar_chair_round_01', 'potted_plant_01', 'potted_plant_02', 'potted_plant_04', 'ceramic_vase_01',
  'ceramic_vase_03', 'modern_ceiling_lamp_01', 'hanging_picture_frame_02', 'standing_picture_frame_01',
  'modern_wooden_cabinet', 'desk_lamp_arm_01', 'fern_02', 'wild_rooibos_bush', 'periwinkle_plant',
  'outdoor_table_chair_set_01', 'planter_box_01',
];

// villa texture sets (name in villa.glb -> our key)
export const VILLA_TEX = {
  'HS_Grass004_2K_Color': 'grass_c', 'Grass004_2K_NormalGL': 'grass_n',
  'WoodFloor052_2K_Color': 'floor_c', 'WoodFloor052_2K_NormalGL': 'floor_n', 'WoodFloor052_2K_Roughness': 'floor_r',
  'HS_PavingStones126A_2K_Color': 'pavers_c', 'PavingStones126A_2K_NormalGL': 'pavers_n', 'PavingStones126A_2K_Roughness': 'pavers_r',
  'Plaster001_2K_NormalGL': 'plaster_n', 'Plaster001_2K_Roughness': 'plaster_r',
  'white_plaster_02_diff_2k': 'wplaster_c', 'white_plaster_02_nor_gl_2k': 'wplaster_n', 'white_plaster_02_rough_2k': 'wplaster_r',
  'beige_wall_001_nor_gl_2k': 'drywall_n', 'beige_wall_001_rough_2k': 'drywall_r',
  'HS_Wood050_2K_Color': 'wood_c', 'Wood050_2K_NormalGL': 'wood_n', 'Wood050_2K_Roughness': 'wood_r',
  'Wood005_2K_NormalGL': 'wwood_n', 'Wood005_2K_Roughness': 'wwood_r',
  'Metal012_2K_NormalGL': 'metal_n', 'Metal012_2K_Roughness': 'metal_r',
  'Marble002_2K_Color': 'marblef_c', 'Marble002_2K_NormalGL': 'marblef_n', 'Marble002_2K_Roughness': 'marblef_r',
  'Marble005_2K_Color': 'marble_c', 'Marble005_2K_NormalGL': 'marble_n', 'Marble005_2K_Roughness': 'marble_r',
  'Concrete034_2K_Color': 'concrete_c', 'Concrete034_2K_NormalGL': 'concrete_n', 'Concrete034_2K_Roughness': 'concrete_r',
  'Tiles035_2K_Color': 'tiles_c', 'Tiles035_2K_NormalGL': 'tiles_n', 'Tiles035_2K_Roughness': 'tiles_r',
  'Fabric061_2K_Color': 'fabric_c', 'Fabric061_2K_NormalGL': 'fabric_n', 'Fabric061_2K_Roughness': 'fabric_r',
  'Leather023_2K_Color': 'leather_c', 'Leather023_2K_NormalGL': 'leather_n', 'Leather023_2K_Roughness': 'leather_r',
  'Carpet001_2K_Color': 'carpet_c', 'Carpet001_2K_NormalGL': 'carpet_n', 'Carpet001_2K_Roughness': 'carpet_r',
  'Ground038_1K_Color': 'soil_c', 'Ground038_1K_NormalGL': 'soil_n',
  'White-oak_Bark_Diffuse': 'bark_c', 'White-oak_Bark_Normal': 'bark_n',
};

async function download(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}

export async function fetchAll() {
  // ---- Poly Haven models ----
  for (const id of PH_MODELS) {
    const dir = path.join(CACHE, 'ph', id);
    const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
    const g = files.gltf['1k'].gltf;
    await download(g.url, path.join(dir, `${id}.gltf`));
    await Promise.all(Object.entries(g.include || {}).map(([rel, f]) => download(f.url, path.join(dir, rel))));
    process.stdout.write(`  ph ${id}\n`);
  }
  // ---- villa PBR textures (resized for the web) ----
  const out = path.join(CACHE, 'villa');
  if (!fs.existsSync(path.join(out, 'grass_c.jpg'))) {
    fs.mkdirSync(out, { recursive: true });
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
    const doc = await io.read(`${REF}/villa.glb`);
    for (const t of doc.getRoot().listTextures()) {
      const key = VILLA_TEX[t.getName()];
      if (!key) continue;
      const big = /^(grass|floor|pavers|wplaster|concrete)_c$/.test(key) ? 2048 : 1024;
      await sharp(Buffer.from(t.getImage())).resize(big, big, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 84 }).toFile(path.join(out, key + '.jpg'));
    }
  }
  // leaf alpha textures from the reference folder
  await sharp(`${REF}/leaves.png`).resize(1024, 1024).png().toFile(path.join(out, 'leaves.png'));
  await sharp(`${REF}/oak_leaf.png`).png().toFile(path.join(out, 'oak_leaf.png'));
  console.log('assets ready');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await fetchAll();
