import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const {createDistrict}=await import(new URL('src/district.js',root));
const {buildChongqing}=await import(new URL('src/chongqing.js',root));
const {locations,configureWaterfrontLocations}=await import(new URL('src/explore.js',root));
const {riverwalks,lowerQuay,liftConnections}=await import(new URL('src/river-route.js',root));
const {EYE_HEIGHT,BODY_RADIUS}=await import(new URL('data/site-survey.js',root));
const {flightDuration,placeRiverFlight}=await import(new URL('src/river-flight.js',root));
const T=await import(new URL('node_modules/three/build/three.module.js',root));
const d=createDistrict();
const paths=[],path=d.path;d.path=(p,w,...opts)=>{path(p,w,...opts);paths.push({p,w,opts})};
buildChongqing({scene:new T.Scene(),put:m=>m,box:()=>new T.Mesh(),mat:()=>new T.MeshBasicMaterial(),tex:()=>new T.Texture(),rnd:()=>.42,TICK:[],NOINK:[],GLOW:[],LOOP:12000,district:d});
configureWaterfrontLocations(d);
const failures={places:[],paths:[],flight:[],lifts:[]};
for(const [label,{x,y,z,mode}] of Object.entries(locations))if(mode==='walk'){
 const floors=d.floors(x,z),blocked=d.blocked(x,y+EYE_HEIGHT,z,BODY_RADIUS);
 if(!floors.some(h=>Math.abs(h-y)<.06)||blocked)failures.places.push({label,floors,y,blocked});
}
let count=0;
for(const [n,{p}] of paths.entries())for(let j=1;j<p.length;j++)for(let k=0;k<=30;k++){
 const [x,y,z]=p[j-1].map((v,a)=>T.MathUtils.lerp(v,p[j][a],k/30)),floors=d.floors(x,z),blocked=d.blocked(x,y+EYE_HEIGHT,z,BODY_RADIUS);
 if(!floors.some(h=>Math.abs(h-y)<.025)||blocked){if(!failures.paths.some(f=>f.n===n&&f.j===j))failures.paths.push({n,j,k,x,y,z,floors,blocked});}count++;
}
for(const lift of liftConnections)for(const y of [lift.low,lift.high])if(!d.floors(lift.x,lift.z).some(h=>Math.abs(h-y)<.05))failures.lifts.push(lift.id+' '+y);
const camera=new T.PerspectiveCamera();let maxStep=0;
for(let ms=0;ms<=flightDuration;ms+=50){const last=camera.position.clone();placeRiverFlight(camera,ms);const{x,y,z}=camera.position;if((![x,y,z,camera.fov].every(Number.isFinite)||d.blocked(x,y,z,.8,true))&&failures.flight.length<5)failures.flight.push({ms,x,y,z});if(ms)maxStep=Math.max(maxStep,last.distanceTo(camera.position));}
console.log(JSON.stringify({count,paths:paths.length,maxStep,failures},null,2));

const consecutive=[];let stepCount=0;
for(const [label,p] of Object.entries({...riverwalks,lowerQuay,plazaReturn:[...riverwalks.plazaAccess].reverse(),qianReturn:[...riverwalks.qiansimenLanding].reverse()})){
 let ground=p[0][1],fail=null;
 for(let j=1;j<p.length&&!fail;j++){
  const a=p[j-1],b=p[j],steps=Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/.08);
  for(let k=0;k<=steps;k++){
   const [x,y,z]=a.map((v,axis)=>T.MathUtils.lerp(v,b[axis],k/steps));
   const candidates=d.floors(x,z).filter(h=>h-ground<.24&&ground-h<.28).sort((u,v)=>Math.abs(u-ground)-Math.abs(v-ground));
   const floor=candidates.find(h=>!d.blocked(x,h+EYE_HEIGHT,z,BODY_RADIUS));
   if(floor===undefined||Math.abs(floor-y)>.16){fail={label,j,k,x,y,z,ground,floor,candidates};break;}
   ground=floor;stepCount++;
  }
 }
 if(fail)consecutive.push(fail);
}
console.log(JSON.stringify({stepCount,consecutive},null,2));
assert(Object.values(failures).every(rows=>rows.length===0),'Navigation/flight samples failed');
assert.equal(consecutive.length,0,'A continuous walking route was interrupted');
assert(maxStep<2.5,'Flight camera discontinuity');
console.log(`Navigation and ${flightDuration/1000}-second camera checks passed.`);
