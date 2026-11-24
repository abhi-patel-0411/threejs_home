import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
const doc = await io.read('C:/omini/experience.omenlabz.com/assets/villa.glb');
const want = process.argv.slice(2);
for (const m of doc.getRoot().listMaterials()) {
  if (want.length && !want.includes(m.getName())) continue;
  const t = (tex, info) => tex ? `${tex.getName()}(${tex.getSize()?.join('x')})${info?.getExtension('KHR_texture_transform') ? ' scale=' + info.getExtension('KHR_texture_transform').getScale() : ''}` : '-';
  console.log(m.getName(), '| col', m.getBaseColorFactor().map(v=>v.toFixed(2)).join(','), 'r', m.getRoughnessFactor(), 'm', m.getMetallicFactor(), m.getAlphaMode(),
    '\n   base', t(m.getBaseColorTexture(), m.getBaseColorTextureInfo()), '\n   nrm', t(m.getNormalTexture(), m.getNormalTextureInfo()), '\n   mr', t(m.getMetallicRoughnessTexture()), '\n   occ', t(m.getOcclusionTexture()));
}
