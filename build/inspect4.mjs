import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
const doc = await io.read('build/cache/villa.glb');
for (const n of doc.getRoot().listNodes()) {
  if (!['GROUND','V_OUTSIDE_H','F_BUSHES_L','F_BUSHES_X','OAK_1','POOL_WATER'].includes(n.getName())) continue;
  console.log('==', n.getName(), 'T', n.getTranslation(), 'R', n.getRotation(), 'S', n.getScale(), 'uvsets', n.getMesh().listPrimitives()[0].listSemantics().join(' '));
  for (const p of n.getMesh().listPrimitives()) {
    const a = p.getAttribute('POSITION'); const v=[0,0,0]; const ys={};
    let mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9];
    for (let i=0;i<a.getCount();i++){a.getElement(i,v);for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],v[k]);mx[k]=Math.max(mx[k],v[k]);} const b=Math.round(v[1]*5)/5; ys[b]=(ys[b]||0)+1;}
    const top=Object.entries(ys).sort((a,b)=>b[1]-a[1]).slice(0,4).map(e=>e[0]+':'+e[1]).join(' ');
    console.log('  ', (p.getMaterial()?.getName()||'').padEnd(24), a.getCount(), 'min', mn.map(x=>x.toFixed(1)).join(','), 'max', mx.map(x=>x.toFixed(1)).join(','), n.getName()==='GROUND'?'ys '+top:'');
  }
}
