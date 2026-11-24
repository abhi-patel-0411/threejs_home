import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import { PH_MODELS } from './fetch-assets.mjs';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const id of PH_MODELS) {
  const doc = await io.read(`build/cache/ph/${id}/${id}.gltf`);
  const s = doc.getRoot().listScenes()[0];
  const b = getBounds(s);
  console.log(id.padEnd(28), 'min', b.min.map(v=>v.toFixed(2)).join(','), ' max', b.max.map(v=>v.toFixed(2)).join(','), ' roots', s.listChildren().length, 'mats', doc.getRoot().listMaterials().map(m=>m.getName()+(m.getAlphaMode()!=='OPAQUE'?'['+m.getAlphaMode()+']':'')).join(','));
}
