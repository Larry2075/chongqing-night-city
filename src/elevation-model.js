import * as THREE from 'three';
import {coreHeight,CORE_SLOPE} from '../data/site-survey.js';
export function calibratedDistrict(world) {
  return {...world,
    path:(points,width,above)=>world.path(points.map(([x,y,z])=>[x,coreHeight(y),z]),width,above),
    block:(x,z,w,d,base,top)=>world.block(x,z,w,d,coreHeight(base),coreHeight(top)),
    polygon:(rings,base,top)=>world.polygon(rings,coreHeight(base),coreHeight(top)),
    terrain:(ring,y)=>world.terrain(ring,coreHeight(y))
  };
}
export function calibrateCoreObjects(objects) {
  for(const object of objects) {
    if(object.userData.worldElevation)continue;
    if(object.isGroup) {
      object.position.y=coreHeight(object.position.y);
      object.scale.y*=CORE_SLOPE;
      continue;
    }
    if(!object.isMesh)continue;
    object.updateMatrixWorld(true);
    const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
    const p=geometry.attributes.position;
    for(let i=0;i<p.count;i++)p.setY(i,coreHeight(p.getY(i)));
    p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
    object.geometry=geometry;object.position.set(0,0,0);object.quaternion.identity();object.scale.set(1,1,1);object.updateMatrix();
  }
}
