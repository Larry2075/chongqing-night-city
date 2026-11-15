import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildTransport,trainRoutes,transportRoutes,transportStats,railLevel} from '../src/transport.js';
import {coreHeight} from '../data/site-survey.js';
import {archDeck} from '../src/river-route.js';
import {placeRiverFlight} from '../src/river-flight.js';
const TICK=[],scene=new THREE.Scene();
const model=buildTransport({scene,TICK,NOINK:[],put:m=>m,box:()=>new THREE.Mesh(),beam:()=>new THREE.Mesh(),panel:()=>{},mat:color=>new THREE.MeshBasicMaterial({color})});
assert.equal(trainRoutes.length,6);
assert.equal(transportRoutes.filter(r=>r.name==='朝天门大桥下层'&&r.lanes===1).length,2);
for(const route of trainRoutes){
 assert(route.visible.length>0);
 for(const [start,end] of route.visible)for(let d=start;d<end;d+=4){
  const {p:[x,y,z]}=route.path.sample(d);assert([x,y,z].every(Number.isFinite));
  const upper=route.bridgeId==='chaotianmen'?archDeck(x):route.bridgeId==='qiansimen'?coreHeight(27.25):23;
  assert(y+1.42<upper-.25,'Train roof must fit beneath the road deck');
 }
}
// The old 12-second weather loop must not teleport road/rail traffic.
model.update(11900,11900);
const before=[model.carBody,model.trainBody].map(m=>m.instanceMatrix.array.slice());
model.update(100,12100);
let movingCars=0,movingTrainCars=0;
for(const [kind,mesh] of [model.carBody,model.trainBody].entries()){
 const a=before[kind],b=mesh.instanceMatrix.array;
 for(let i=0;i<mesh.count;i++){
  const o=i*16,shown=arr=>Math.hypot(arr[o],arr[o+1],arr[o+2])>.1;
  if(!shown(a)||!shown(b))continue;
  const distance=Math.hypot(...[12,13,14].map(k=>a[o+k]-b[o+k]));
  assert(Number.isFinite(distance)&&distance<2.5,'Traffic jumped at weather loop boundary');
  if(distance>.05){if(kind===0)movingCars++;else movingTrainCars++;}
 }
}
assert(movingCars>30);assert(movingTrainCars>6);
console.log(JSON.stringify({...transportStats,movingCars,movingTrainCars,verified:'three bridges, standard gauge, headroom and continuous motion across 12 seconds'}));

// The requested shot must keep several Line 6 carriages inside the frame.
const camera=new THREE.PerspectiveCamera(55,16/9,.28,2000),matrix=new THREE.Matrix4();
const route=trainRoutes.find(r=>r.id==='rail-327734436');
let minimumVisible=6;
for(let ms=56000;ms<=62000;ms+=250){
 model.update(ms%12000,ms,true);placeRiverFlight(camera,ms);camera.updateMatrixWorld();
 let visible=0;
 for(let car=0;car<6;car++){
  model.trainBody.getMatrixAt(route.index*6+car,matrix);
  const point=new THREE.Vector3(0,.8,0).applyMatrix4(matrix).project(camera);
  if(Math.abs(point.x)<.95&&Math.abs(point.y)<.9&&point.z>-1&&point.z<1)visible++;
 }
 minimumVisible=Math.min(minimumVisible,visible);
 assert(visible>=3,`Line 6 not clearly framed at ${ms}ms: ${visible} carriages`);
}
model.update(0,60000,false);const freeRoam=model.trainBody.instanceMatrix.array.slice();
model.update(0,60000,true);model.update(0,60000,false);
assert.deepEqual(model.trainBody.instanceMatrix.array,freeRoam,'Flight cue must not persist into free roam');
console.log(JSON.stringify({line6TrackingSeconds:[56,62],minimumVisibleCarriages:minimumVisible,freeRoamUnaffected:true}));
