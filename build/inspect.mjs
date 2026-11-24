import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { getBounds } from '@gltf-transform/functions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
for (const n of root.listNodes()) {
  const b = getBounds(n); const m = n.getMesh();
  console.log(n.getName(), 'prims', m?.listPrimitives().length, 'min', b.min.map(v=>v.toFixed(1)).join(','), 'max', b.max.map(v=>v.toFixed(1)).join(','),
    'mats', m?.listPrimitives().map(p=>p.getMaterial()?.getName()+':'+p.getAttribute('POSITION').getCount()).join(' ').slice(0,600));
}
