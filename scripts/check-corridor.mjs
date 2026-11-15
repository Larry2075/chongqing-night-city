import assert from 'node:assert/strict';
import * as T from 'three';
import {createDistrict} from '../src/district.js';
import {buildChongqing} from '../src/chongqing.js';
import {locations,configureWaterfrontLocations} from '../src/explore.js';
import {corridorBuildingProfiles,corridorRestoredBuildings} from '../data/hongya-chaotian-survey.js';
import {waterfrontRecords} from '../src/waterfront-model.js';
import {corridorFacadeAudit} from '../src/corridor-frontages.js';
import {frontageStats} from '../src/waterfront.js';
import {inside} from '../src/geography.js';
const d=createDistrict();
buildChongqing({scene:new T.Scene(),put:m=>m,box:()=>new T.Mesh(),mat:()=>new T.MeshBasicMaterial(),tex:()=>new T.Texture(),rnd:()=>.42,TICK:[],NOINK:[],GLOW:[],LOOP:12000,district:d});
configureWaterfrontLocations(d);
for(const id of ['1128460274','1128460275','1128462224']){
 const rows=corridorFacadeAudit.filter(p=>String(p.id)===id);
 assert(rows.length>0,`${id}: facade missing`);
 assert(rows.every(p=>p.shopSigns.length===0),`${id}: residential tower acquired false retail`);
}
const noodle=corridorFacadeAudit.filter(p=>p.role==='photo-referenced-noodle-shop');
assert.equal(noodle.length,1,'The one photographed restaurant must not be repeated');
assert.equal(noodle[0].id,950181634);
assert.equal(noodle[0].edge,2);
for(const id of ['486221616','748910914','950181639','950181634']){
 const s=corridorBuildingProfiles.find(p=>p.id===id),r=waterfrontRecords.get(id);
 assert.equal(r.heightMeters,s.heightMeters,`${id}: recorded floor-based height lost`);
 assert.deepEqual(r.rings,s.rings,`${id}: facade edge indices no longer match outline`);
}
const podium=corridorBuildingProfiles.find(p=>p.id==='1307164454').rings[0];
for(const id of ['486221616','748910914'])for(const [x,z] of waterfrontRecords.get(id).rings[0])assert(!inside(podium,x,z),`${id}: swallowed by Raffles`);
assert.equal(corridorRestoredBuildings.length,1);
for(const key of ['chaqian','haiyun','jiliang','tianjiao'])assert(locations[key],`Missing usable street bookmark: ${key}`);
console.log(JSON.stringify({surveyedBuildings:corridorBuildingProfiles.length,rendered:frontageStats.corridorBuildings,retainingFaces:frontageStats.corridorRetainingFaces,photoShop: noodle,views:Object.fromEntries(['chaqian','haiyun','jiliang','tianjiao'].map(k=>[k,locations[k]]))},null,2));
