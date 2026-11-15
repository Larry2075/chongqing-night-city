import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {transportNetwork as network} from '../data/transport-network.js';
import {terrainHeight,coreGround,inside,geo} from './geography.js';
import {coreHeight,levels,UNIT} from '../data/site-survey.js';
import {archDeck} from './river-route.js';

const clamp=THREE.MathUtils.clamp;
export const railLevel=(key,x)=>key==='chaotianmen'?archDeck(x)-4.9:key==='qiansimen'?coreHeight(27.25)-2.45:23-2.45;
const roadBridge=road=>road.name.includes('朝天门大桥')?'chaotianmen':road.name.includes('千厮门')?'qiansimen':road.name.includes('东水门大桥')?'dongshuimen':null;
export function pathSampler(points) {
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(...points[i].map((n,k)=>n-points[i-1][k])));
  return {points,length:lengths.at(-1),sample(distance){
    let i=lengths.findIndex(n=>n>distance);i=i<0?points.length-1:Math.max(1,i);
    const a=points[i-1],b=points[i],t=clamp((distance-lengths[i-1])/(lengths[i]-lengths[i-1]||1),0,1);
    return {p:a.map((n,k)=>n+(b[k]-n)*t),yaw:Math.atan2(a[2]-b[2],b[0]-a[0]),pitch:Math.atan2(b[1]-a[1],Math.hypot(b[0]-a[0],b[2]-a[2]))};
  }};
}
function roadPoints(road) {
  const key=roadBridge(road),lower=road.name.includes('下层');
  const ends=road.points.filter((_,i)=>i===0||i===road.points.length-1);
  const bridgeY=road.bridge?Math.max(14,...ends.map(([x,z])=>terrainHeight(x,z)+.8)):0;
  const h=(x,z)=>key==='chaotianmen'?archDeck(x)-(lower?4.9:0)+.035:key==='qiansimen'?coreHeight(27.25)+.035:key==='dongshuimen'?23.035:
    road.bridge?bridgeY:(x>-169&&x<136&&z<-17&&z>-177?coreGround(x,z):terrainHeight(x,z))+.055;
  const out=[];
  for(let i=1;i<road.points.length;i++) {
    const a=road.points[i-1],b=road.points[i],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2.3));
    for(let j=i===1?0:1;j<=n;j++){const x=a[0]+(b[0]-a[0])*j/n,z=a[1]+(b[1]-a[1])*j/n;out.push([x,h(x,z),z]);}
  }
  return out;
}
export const transportRoutes=network.roads.map(road=>({...road,lanes:road.name.includes('朝天门大桥下层')?1:road.lanes,key:roadBridge(road),path:pathSampler(roadPoints(road))}));
// Existing detailed Hongyadong street shares the same scene calibration.
transportRoutes.push({id:'jiabin-detail',name:'嘉滨路 · 洪崖洞段',kind:'secondary',lanes:2,oneway:false,key:null,detail:true,path:pathSampler([[-148,coreHeight(2.112)+.025,9.6],[146,coreHeight(2.112)+.025,9.6]])});
export const trainRoutes=network.rails.map((rail,index)=>{
  const all=[],visible=[];let length=0;
  for(const segment of rail.segments){
    const p=segment.points.map(([x,z])=>[x,railLevel(rail.bridgeId,x)+.04,z]);
    const part=pathSampler(p);
    if(!segment.tunnel)visible.push([length,length+part.length]);
    length+=part.length;all.push(...(all.length?p.slice(1):p));
  }
  return {...rail,path:pathSampler(all),visible,index};
});
export const transportStats={roadSegments:network.roads.length,tracks:trainRoutes.length,cars:0,trainCars:36};

export function buildTransport({scene,put,box,mat,beam,panel,TICK,NOINK}) {
  const asphalt=mat('#28313c'),paint=mat('#a8a797'),steel=mat('#55616d'),concrete=mat('#3f4651');
  const roadVertices=[],markVertices=[];
  function strip(out,a,b,width,offset=0,dy=0) {
    const dx=b[0]-a[0],dz=b[2]-a[2],L=Math.hypot(dx,dz);if(!L)return;
    const nx=-dz/L,nz=dx/L;
    const p=[-width/2,width/2].map(v=>[a[0]+nx*(v+offset),a[1]+dy,a[2]+nz*(v+offset)]);
    const q=[-width/2,width/2].map(v=>[b[0]+nx*(v+offset),b[1]+dy,b[2]+nz*(v+offset)]);
    out.push(...p[0],...p[1],...q[1],...p[0],...q[1],...q[0]);
  }
  for(const road of transportRoutes){
    if(road.path.length<.2||road.detail)continue;
    const width=(road.name.includes('朝天门大桥下层')?2:road.lanes)*3.5*UNIT;
    const p=road.path.points;
    for(let i=1;i<p.length;i++){
      const a=p[i-1],b=p[i],x=(a[0]+b[0])/2,z=(a[2]+b[2])/2;
      if(!road.key&&x>-170&&x<145&&z>-177&&z<16)continue;
      strip(roadVertices,a,b,width+.18);
      if(i%3===0&&road.kind!=='residential')for(let lane=1;lane<road.lanes;lane++)strip(markVertices,a,b,.027,lane*1.225-width/2,.009);
      if(road.bridge&&i%10===0&&!road.key){
        const ground=Object.values(geo.lands).some(r=>inside(r,x,z))?terrainHeight(x,z):0;
        if(a[1]-ground>1)box(.55,a[1]-ground,.55,concrete,x,(a[1]+ground)/2,z);
      }
    }
  }
  for(const [p,m] of [[roadVertices,asphalt],[markVertices,paint]]){
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();
    m.side=THREE.DoubleSide;const mesh=put(new THREE.Mesh(g,m),0,0,0);mesh.userData.noMerge=true;mesh.userData.hideInIllustration=true;
  }
  const sleepers=[];
  for(const rail of trainRoutes){
    for(const [start,end] of rail.visible){
      const points=rail.path.points;
      // Use source centreline, with one pair of standard-gauge rails per track.
      const sample=[];for(let d=start;d<end;d+=6)sample.push(rail.path.sample(d).p);sample.push(rail.path.sample(end).p);
      for(let i=1;i<sample.length;i++){
        const a=sample[i-1],b=sample[i],L=Math.hypot(b[0]-a[0],b[2]-a[2]),nx=-(b[2]-a[2])/L,nz=(b[0]-a[0])/L;
        const deck=box(L+.015,.16,1.35,concrete,(a[0]+b[0])/2,(a[1]+b[1])/2-.14,(a[2]+b[2])/2,Math.atan2(a[2]-b[2],b[0]-a[0]));
        deck.rotateZ(Math.atan2(b[1]-a[1],L));
        for(const s of [-1,1])beam([a[0]+nx*s*.251,a[1],a[2]+nz*s*.251],[b[0]+nx*s*.251,b[1],b[2]+nz*s*.251],.025,steel);
        beam([a[0],a[1]+1.73,a[2]],[b[0],b[1]+1.73,b[2]],.012,steel);
      }
      for(let d=start;d<end;d+=.24)sleepers.push(rail.path.sample(d));
      for(let d=start+5;d<end-2;d+=12){const {p:[x,y,z],yaw}=rail.path.sample(d),nx=Math.sin(yaw),nz=Math.cos(yaw);
        box(.045,1.79,.045,steel,x+nx*.76,y+.88,z+nz*.76);
        beam([x+nx*.76,y+1.77,z+nz*.76],[x,y+1.77,z],.035,steel);
      }
      // A dark portal makes the tunnel transition legible instead of an exposed train reset.
      for(const d of [start,end]){
        const {p:[x,y,z],yaw}=rail.path.sample(d);
        const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=yaw;scene.add(group);
        const portal=mat('#181e29');
        for(const side of [-1,1]){const m=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.9,.22),concrete);m.position.set(0,.85,side*.70);group.add(m);}
        const roof=new THREE.Mesh(new THREE.BoxGeometry(1.4,.22,1.62),concrete);roof.position.y=1.84;group.add(roof);
      }
    }
  }
  const sleeperMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.065,.055,.86),concrete,sleepers.length);
  const matrix=new THREE.Matrix4(),quat=new THREE.Quaternion(),pos=new THREE.Vector3(),scale=new THREE.Vector3(1,1,1),euler=new THREE.Euler();
  sleepers.forEach((s,i)=>{pos.set(s.p[0],s.p[1]-.045,s.p[2]);quat.setFromEuler(euler.set(0,s.yaw,0));matrix.compose(pos,quat,scale);sleeperMesh.setMatrixAt(i,matrix);});
  sleeperMesh.frustumCulled=false;scene.add(sleeperMesh);

  // One instanced draw per component keeps a populated city usable in the browser.
  const white=mat('#dce4e4'),glass=mat('#193544',{emissive:'#365963',emissiveIntensity:.6});
  const rubber=mat('#111923'),head=mat('#fff1c5',{emissive:'#ffe1a1',emissiveIntensity:3.5}),tail=mat('#ed453a',{emissive:'#ff3025',emissiveIntensity:2.2});
  const pink=mat('#df7eb2',{emissive:'#e06499',emissiveIntensity:.65}),yellow=mat('#efc05e',{emissive:'#d4a640',emissiveIntensity:.6});
  const unitBox=new THREE.BoxGeometry(1,1,1);
  function partGroup(parts){return mergeGeometries(parts.map(([x,y,z,w,h,d])=>unitBox.clone().scale(w,h,d).translate(x,y,z)),false);}
  function component(parts,material,count){const mesh=new THREE.InstancedMesh(partGroup(parts),material,count);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.userData.noMerge=true;scene.add(mesh);return mesh;}
  const cars=[];
  const candidates=transportRoutes.filter(r=>r.path.length>18);
  for(const road of candidates){
    const important=road.key||road.detail||/嘉滨|滨江|南滨|北滨|朝千|沧白|长江滨江/.test(road.name);
    if(!important&&Number(road.sourcewayId)%5!==0)continue;
    const count=road.key?Math.max(1,Math.ceil(road.path.length/80)):road.detail?12:important?Math.min(7,Math.ceil(road.path.length/65)):2;
    for(let i=0;i<count;i++){
      const lane=i%road.lanes,direction=road.oneway?1:(lane<Math.ceil(road.lanes/2)?1:-1);
      cars.push({road,lane,direction,phase:(i+.35)/count, speed:(road.key?48:road.kind==='residential'?20:32)/3.6*UNIT,bus:!road.key&&cars.length%19===0});
    }
  }
  transportStats.cars=cars.length;
  const body=component([[0,.29,0,1.55,.36,.64]],white,cars.length);
  const roofs=component([[-.12,.54,0,.83,.22,.55]],glass,cars.length);
  const wheels=component([[-.49,.145,-.32,.23,.25,.10],[.48,.145,-.32,.23,.25,.10],[-.49,.145,.32,.23,.25,.10],[.48,.145,.32,.23,.25,.10]],rubber,cars.length);
  const front=component([[.79,.29,-.20,.035,.09,.13],[.79,.29,.20,.035,.09,.13]],head,cars.length);
  const rear=component([[-.79,.30,-.22,.035,.08,.12],[-.79,.30,.22,.035,.08,.12]],tail,cars.length);
  const carMeshes=[body,roofs,wheels,front,rear];
  const colours=['#d6d4c6','#ddb942','#59929d','#834d55','#5873a1','#b7c2c9'];
  cars.forEach((c,i)=>body.setColorAt(i,new THREE.Color(colours[i%colours.length])));
  const trainPaint=mat('#e2e6e7',{emissive:'#a7b8c6',emissiveIntensity:.24});
  const trainGlass=mat('#71929a',{emissive:'#b8d8d7',emissiveIntensity:.85});
  const trainBody=component([[0,.80,0,6.65,1.02,.98]],trainPaint,36);
  const trainRoof=component([[0,1.35,0,6.55,.12,1.01]],steel,36);
  const windowParts=[];for(const side of [-1,1])for(let x=-2.65;x<3;x+=.73)windowParts.push([x,.97,side*.495,.54,.38,.018]);
  windowParts.push([3.34,.98,0,.015,.43,.75],[-3.34,.98,0,.015,.43,.75]);
  const trainWindows=component(windowParts,trainGlass,36);
  const doorParts=[];
  for(const side of [-1,1])for(const x of [-2.25,-.75,.75,2.25]){
    for(const dx of [-.24,0,.24])doorParts.push([x+dx,.81,side*.512,.035,.96,.022]);
    doorParts.push([x,.34,side*.512,.51,.035,.022]);
  }
  const trainDoors=component(doorParts,steel,36);
  const stripe6=component([[0,.61,-.497,6.66,.14,.018],[0,.61,.497,6.66,.14,.018]],pink,36);
  const stripeRing=component([[0,.61,-.498,6.66,.14,.018],[0,.61,.498,6.66,.14,.018]],yellow,36);
  const trainWheels=component([[-2.1,.20,0,.85,.25,.77],[2.1,.20,0,.85,.25,.77]],rubber,36);
  const trainLights=component([[3.34,.54,-.27,.045,.10,.12],[3.34,.54,.27,.045,.10,.12]],head,36);
  const trains=[trainBody,trainRoof,trainWindows,trainDoors,stripe6,stripeRing,trainWheels,trainLights];
  const zero=new THREE.Matrix4().makeScale(0,0,0);
  function pose(sample,lateral=0,reverse=false,sizes=[1,1,1]){
    const yaw=sample.yaw+(reverse?Math.PI:0),nx=Math.sin(sample.yaw),nz=Math.cos(sample.yaw);
    pos.set(sample.p[0]+nx*lateral,sample.p[1],sample.p[2]+nz*lateral);
    quat.setFromEuler(euler.set(0,yaw,reverse?-sample.pitch:sample.pitch,'YXZ'));
    matrix.compose(pos,quat,scale.set(...sizes));return matrix;
  }
  TICK.push((_,elapsed,cinematic=false)=>{
    const seconds=(elapsed??_)/1000;
    cars.forEach((car,i)=>{
      const {road}=car,L=road.path.length,cycle=L+9;
      let d=(seconds*car.speed+car.phase*cycle)%cycle-4.5;
      if(d<0||d>L){carMeshes.forEach(m=>m.setMatrixAt(i,zero));return;}
      if(car.direction<0)d=L-d;
      const lane=road.name.includes('朝天门大桥下层')?.6:(car.lane+.5-road.lanes/2)*1.225;
      const sample=road.path.sample(d),m=pose(sample,lane,car.direction<0,car.bus?[2.25,1.48,1.2]:[1,1,1]);
      carMeshes.forEach(mesh=>mesh.setMatrixAt(i,m));
    });
    trainRoutes.forEach((route,r)=>{
      const speed=(route.bridgeId==='chaotianmen'?56:48)/3.6*UNIT,L=route.path.length;
      const [entry,exit]=route.visible[0];
      // Southbound Line 6 is midway across Qiansimen during the 53–65s tracking shot.
      const initial=cinematic && route.id==='rail-327734436'?0:entry+(exit-entry)*(r%2?.58:.62);
      const headDistance=(seconds*speed+initial+45)%(L+170)-45;
      for(let j=0;j<6;j++){
        const i=r*6+j,d=headDistance-j*6.902;
        const visible=route.visible.some(([a,b])=>d>=a&&d<=b);
        if(!visible){trains.forEach(m=>m.setMatrixAt(i,zero));continue;}
        const m=pose(route.path.sample(d));
        for(const mesh of trains)mesh.setMatrixAt(i,mesh===stripe6&&route.bridgeId==='chaotianmen'||mesh===stripeRing&&route.bridgeId!=='chaotianmen'||mesh===trainLights&&j!==0?zero:m);
      }
    });
    [...carMeshes,...trains].forEach(m=>m.instanceMatrix.needsUpdate=true);
  });
  return {cars,carBody:body,trainBody,update:TICK.at(-1)};
}
