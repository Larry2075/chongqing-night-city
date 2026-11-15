import assert from 'node:assert/strict';
import * as THREE from 'three';
import {writeFileSync} from 'node:fs';
import {flightDuration,placeRiverFlight} from '../src/river-flight.js';
import {bridgeLandmarks} from '../src/bridge-details.js';

// A chapter label alone is not coverage: landmark silhouettes must spend
// several consecutive seconds within the actual camera's safe image area.
const views=[
  ...Object.values(bridgeLandmarks).map(({name,center,shot})=>({name,point:center,range:shot,minSeconds:3})),
  {name:'东水门北塔',point:[332.84,56.8,-140.69],range:[30000,44000],minSeconds:5},
  {name:'东水门南塔',point:[486.29,60.4,-185.99],range:[30000,44000],minSeconds:5},
  {name:'来福士水晶连廊',point:[299,101.24,122],range:[44000,58500],minSeconds:7},
  {name:'洪崖洞',point:[-3,20,3.5],range:[77500,94000],minSeconds:5}
];
assert.equal(flightDuration,105000);
const camera=new THREE.PerspectiveCamera(55,16/9,.28,2000),report=[];
for(const view of views){
  let count=0,longest=0,run=0;
  for(let time=view.range[0];time<view.range[1];time+=250){
    placeRiverFlight(camera,time);camera.updateMatrixWorld();
    const p=new THREE.Vector3(...view.point).project(camera);
    const visible=Math.abs(p.x)<.93&&Math.abs(p.y)<.85&&p.z>-1&&p.z<1;
    if(visible){count++;run++;longest=Math.max(longest,run);}else run=0;
  }
  assert(longest/4>=view.minSeconds,`${view.name}: insufficient sustained framing (${longest/4}s)`);
  report.push({landmark:view.name,framedSeconds:count/4,longestContinuousSeconds:longest/4});
}
writeFileSync('docs/landmark-camera-audit.json',JSON.stringify({durationSeconds:105,note:'Frustum coverage, complemented by visual occlusion checks in the browser.',views:report},null,2));
console.log(JSON.stringify(report,null,2));
