import {corridorBuildingProfiles,corridorRestoredBuildings} from '../data/hongya-chaotian-survey.js';
import {cityBuildings} from '../data/city-buildings.js';
import {buildings as coreBuildings} from '../data/hongyadong.js';
import {buildingSurvey} from '../data/building-survey.js';
import {waterfrontHeightOverrides,waterfrontPlaces,waterfrontRestoredBuildings} from '../data/waterfront-survey.js';
import {terrainHeight,coreGround,inside,geo} from './geography.js';
import {riverwalks,lowerQuay} from './river-route.js';
import {coreHeight} from '../data/site-survey.js';

export const hashId=id=>String(id).split('').reduce((n,c)=>(n*31+c.charCodeAt(0))%65521,0);
const paths=[...['yuzhong','jiangbei','nanan','qiansimenLanding'].map(k=>riverwalks[k]),lowerQuay];
export function closestWaterfront(x,z){
 let best={distance:Infinity};
 for(const path of paths)for(let i=1;i<path.length;i++){
  const [ax,ay,az]=path[i-1],[bx,by,bz]=path[i],dx=bx-ax,dz=bz-az;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
  const px=ax+dx*t,pz=az+dz*t,distance=Math.hypot(x-px,z-pz);
  if(distance<best.distance)best={distance,x:px,z:pz,y:ay+(by-ay)*t};
 }
 return best;
}
export function districtStyle(x,z){
 if(inside(geo.lands.jiangbei,x,z))return {key:'jiangbei',street:'北滨二路',style:4};
 if(inside(geo.lands.nanan,x,z)){
  if(z<0)return {key:'longmen',street:'南滨路 · 龙门浩',style:2};
  if(z<240)return {key:'museum',street:'南滨路 · 故宫南迁',style:2};
  if(z<470)return {key:'ciyun',street:'南滨路 · 慈云寺',style:1};
  if(z<740)return {key:'danzishi',street:'南滨路 · 弹子石',style:5};
  return {key:'fuxing',street:'南滨路 · 复兴街',style:1};
 }
 if(x<-35&&z>-85&&z<0)return {key:'daijia',street:'戴家巷',style:1};
 if(z<-80&&x>190)return {key:'huguang',street:'长滨路 · 东水门',style:3};
 if(x>290&&z<75)return {key:'changbin',street:'长滨路',style:1};
 if(x>205&&z>45)return {key:'chaotian',street:'朝天门 · 长江滨江路',style:4};
 return {key:'jiabin',street:'嘉滨路',style:1};
}
const corridorById=new Map(corridorBuildingProfiles.map(p=>[String(p.id),p]));
export const waterfrontRecords=new Map();
function record(id,rings,heightMeters,method,source,name,core=false){
 const ring=rings[0],n=ring.length,x=ring.reduce((v,p)=>v+p[0]/n,0),z=ring.reduce((v,p)=>v+p[1]/n,0);
 const corridor=corridorById.get(String(id));
 const height=waterfrontHeightOverrides[id]||{},seed=hashId(id);
 heightMeters=corridor?.heightMeters||height.heightMeters||heightMeters;
 const near=closestWaterfront(x,z),edgeDistance=Math.min(near.distance,...ring.map(p=>closestWaterfront(...p).distance));
 const region=districtStyle(x,z),base=core?(z<-16?coreGround(x,z):coreHeight(z<2?23.2:15.5)):terrainHeight(x,z);
 const bottom=Math.min(base,...ring.map(p=>terrainHeight(...p)))-.12;
 const style=height.style??(heightMeters>42?(region.key==='jiangbei'?4:1):region.style);
 const historical=height.historic||/兵营|千佛寺|故宫|书院|文物|福音堂|东水门|会馆/.test(name);
 const detailed=!!corridor||edgeDistance<80||(core&&z>-105)||!!height.style;
 const known=waterfrontPlaces.filter(p=>p.buildingId!==undefined&&String(p.buildingId)===String(id));
 const roofProfile=height.roofProfile;
 const topAt=(x,z)=>base+(roofProfile?.type==='linear' ? roofProfile.maxMeters+(roofProfile.minMeters-roofProfile.maxMeters)*Math.max(0,Math.min(1,((roofProfile.axis==='z'?z:x)-roofProfile.highAt)/(roofProfile.lowAt-roofProfile.highAt))) : heightMeters)*.35;
 return {corridor,id,rings,x,z,base,bottom,top:base+heightMeters*.35,topAt,roofProfile,zone:height.zone,heritage:height.historic,heightMeters,method:height.method||method,name:height.name||name,seed,region,style,detailed,edgeDistance,historical,known,core,roof:height.roof||null};
}
for(const b of [...cityBuildings,...waterfrontRestoredBuildings,...corridorRestoredBuildings]){const r=record(...b);waterfrontRecords.set(String(r.id),r);}
export const coreWaterfrontRecords=[];
for(const [id,rings,oldHeight,kind,name] of coreBuildings){
 const s=buildingSurvey[id];const r=record(id,rings,s?.heightMeters||oldHeight/.35,s?.method,'osm',name,true);
 if(r.detailed)coreWaterfrontRecords.push(r);
}
export const waterfrontStats={buildings:[...waterfrontRecords.values()].filter(r=>r.detailed).length,coreBuildings:coreWaterfrontRecords.length,heightCorrections:Object.keys(waterfrontHeightOverrides).length};
