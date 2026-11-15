import {inHongyaChaotian,makeCorridorFrontages} from './corridor-frontages.js';
import {corridorStreets} from '../data/hongya-chaotian-survey.js';
import * as THREE from 'three';
import {waterfrontRecords,coreWaterfrontRecords,closestWaterfront} from './waterfront-model.js';
import {waterfrontPlaces,waterfrontHeritageZones} from '../data/waterfront-survey.js';
import {alleyBuildings} from './frontages.js';
import {terrainHeight,inside,geo} from './geography.js';
import {transportNetwork} from '../data/transport-network.js';
import {riverwalks,lowerQuay} from './river-route.js';

export const frontageStats={buildings:0,faces:0,shops:0,windows:0,roofs:0,signs:0,instances:0,corridorBuildings:0,corridorRetainingFaces:0};
export const frontageViews=[];
const detailMeshes=[];
export function updateWaterfrontView(camera,illustration=0){
 for(const {mesh,center,radius,hidden,range} of detailMeshes)mesh.visible=!(illustration>.001&&hidden)&&camera.position.distanceTo(center)<radius+range;
}
export function buildWaterfront({put,mat,tex,scene,district}){
 Object.keys(frontageStats).forEach(k=>frontageStats[k]=0);frontageViews.length=0;detailMeshes.length=0;
 const palette={
  stone:mat('#827d71'),dark:mat('#29353a'),frame:mat('#536b66'),wood:mat('#69503d'),
  plaster:mat('#a29983'),brick:mat('#8b6857'),ochre:mat('#af8a45'),glass:mat('#314853',{emissive:'#476167',emissiveIntensity:.14}),
  interior:mat('#b9a17b',{emissive:'#dfb67f',emissiveIntensity:.28}),
  gold:mat('#deb982',{emissive:'#ffcc7a',emissiveIntensity:.65}),
  lamp:mat('#f9d7a2',{emissive:'#ffcc80',emissiveIntensity:1.1}),
  red:mat('#8c4138'),green:mat('#395c50'),tile:mat('#515861'),metal:mat('#728184'),leaf:mat('#3e6252')
 };
 const archGeometry=new THREE.TorusGeometry(.5,.026,5,14,Math.PI);
 const unitBox=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D(),batches=new Map(),quads=new Map();
 const materialKeys=new Map(Object.entries(palette).map(([k,v])=>[v,k]));
 const sector=(x,z)=>`${Math.floor(x/150)}:${Math.floor(z/150)}`;
 const hidden=(x,z)=>inside(geo.lands.jiangbei,x,z);
 function cube(w,h,d,m,x,y,z,yaw=0,rx=0){
  if(Math.min(w,h,d)<=0)return;
  const key=sector(x,z)+':'+materialKeys.get(m),group=batches.get(key)||{m,matrices:[],hidden:hidden(x,z)};batches.set(key,group);
  dummy.position.set(x,y,z);dummy.rotation.set(rx,yaw,0);dummy.scale.set(w,h,d);dummy.updateMatrix();group.matrices.push(dummy.matrix.clone());
 }
 function arch(f,w,h,t,y){
  const [x,z]=f.point(t,.15),key=sector(x,z)+':arch',g=batches.get(key)||{m:palette.plaster,geometry:archGeometry,matrices:[],hidden:hidden(x,z)};batches.set(key,g);
  dummy.position.set(x,y,z);dummy.rotation.set(0,f.yaw,0);dummy.scale.set(w,h,1);dummy.updateMatrix();g.matrices.push(dummy.matrix.clone());
 }
 function quad(points,uv,m,x,z){
  const key=sector(x,z)+':'+(materialKeys.get(m)||m.uuid),g=quads.get(key)||{m,p:[],uv:[],hidden:hidden(x,z)};quads.set(key,g);
  for(const i of [0,1,2,0,2,3]){g.p.push(...points[i]);g.uv.push(...uv[i]);}
 }
 const signRows=[],signMap=new Map(),signMat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 materialKeys.set(signMat,'signs');
 const signStyles=[['#343e40','#eee1be'],['#5b4639','#ffe1a2'],['#a05535','#ffeac1'],['#295751','#f3e6c8'],['#29506a','#f0eee0'],['#ede0be','#4c554e'],['#742c2b','#ffd2a0'],['#182b39','#e6dcc2'],['#d8d3c2','#b92e24']];
 function sign(face,title,w,h,along,y,out=.13,style=0,small=''){
  const key=title+'|'+style+'|'+small;let id=signMap.get(key);
  if(id===undefined){id=signRows.length;signMap.set(key,id);signRows.push({title,style,small});}
  const c=id%4,r=Math.floor(id/4),u0=(c*512+2)/2048,u1=((c+1)*512-2)/2048;
  // UV v is completed once the atlas height is known.
  const points=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([dx,dy])=>{const [x,z]=face.point(along+dx,out);return [x,y+dy,z];});
  quad(points,[[u0,-(r+1)],[u1,-(r+1)],[u1,-r],[u0,-r]],signMat,face.x,face.z);frontageStats.signs++;
 }
 function face(a,b){
  const width=Math.hypot(b[0]-a[0],b[1]-a[1]),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
  return {x,z,width,nx:0,nz:0,yaw:0,point(t,out){return [x+this.nz*t+this.nx*out,z-this.nx*t+this.nz*out]},
   box(w,h,d,m,t,y,out=0){const [px,pz]=this.point(t,out);cube(w,h,d,m,px,y,pz,this.yaw);}};
 }
 function buildingFaces(p){
  const ring=p.rings[0],area=ring.reduce((sum,a,i)=>{const b=ring[(i+1)%ring.length];return sum+a[0]*b[1]-a[1]*b[0]},0),orientation=area>0?1:-1;
  return ring.map((a,i)=>{const b=ring[(i+1)%ring.length],f=face(a,b);f.nx=(b[1]-a[1])/f.width*orientation;f.nz=-(b[0]-a[0])/f.width*orientation;f.yaw=Math.atan2(f.nx,f.nz);f.edgeIndex=i;return f;}).filter(f=>f.width>.45);
 }
 // Local roads choose the shop-facing edge; footpaths choose the close-detail budget.
 const roadGrid=new Map();
 for(const r of [...transportNetwork.roads,...corridorStreets.map(p=>({...p,points:p.path,layer:0})),...waterfrontPlaces.filter(p=>p.kind==='street'&&p.path&&!p.name.includes('隧道')).map(p=>({name:p.name,points:p.path,layer:0}))])if(!r.bridge&&r.layer<=0)for(let i=1;i<r.points.length;i++){
  const a=r.points[i-1],b=r.points[i],seg={a,b,name:r.name};
  for(let ix=Math.floor(Math.min(a[0],b[0])/25);ix<=Math.floor(Math.max(a[0],b[0])/25);ix++)for(let iz=Math.floor(Math.min(a[1],b[1])/25);iz<=Math.floor(Math.max(a[1],b[1])/25);iz++){
   const key=ix+','+iz;if(!roadGrid.has(key))roadGrid.set(key,[]);roadGrid.get(key).push(seg);
  }
 }
 function streetNear(x,z){
  let best=closestWaterfront(x,z);const ix=Math.floor(x/25),iz=Math.floor(z/25);
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const {a,b,name} of roadGrid.get((ix+dx)+','+(iz+dz))||[]){
   const ux=b[0]-a[0],uz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*ux+(z-a[1])*uz)/(ux*ux+uz*uz))),px=a[0]+ux*t,pz=a[1]+uz*t,distance=Math.hypot(x-px,z-pz);
   if(distance<best.distance)best={distance,x:px,z:pz,name};
  }return best;
 }
 function windows(f,p){
  const rows=Math.max(1,Math.round((p.top-p.base)/1.155)),fh=(p.top-p.base)/rows;
  const cols=Math.max(1,Math.round(f.width/(p.style===4?1.18:1.05))),cw=f.width/cols;
  // Recesses, projecting sills and air conditioners at pedestrian scale.
  const count=Math.min(rows,p.edgeDistance<22?5:3);
  for(let row=1;row<count;row++)for(let col=0;col<cols;col++){
   const x=(col+.5)*cw-f.width/2,y=p.base+(row+.5)*fh;
   const w=cw*.65,h=fh*.57;if(terrainHeight(...f.point(x,.1))>y-h*.45)continue;
   f.box(w+.09,.045,.10,palette.stone,x,y-h*.5-.022,.07);
   f.box(.024,h+.065,.07,palette.frame,x-w/2,y,.05);
   f.box(.024,h+.065,.07,palette.frame,x+w/2,y,.05);
   f.box(w,.024,.065,palette.frame,x,y+h/2,.05);
   if(p.style!==4&&(p.seed+row*13+col)%7===2){
    f.box(.28,.18,.18,palette.metal,x+w*.28,y-h*.60-.1,.13);
    for(let k=0;k<4;k++)f.box(.18,.013,.02,palette.dark,x+w*.28,y-h*.60-.155+k*.038,.23);
   }
   if(p.style===1&&(p.seed+col)%4===1){
    f.box(w+.12,.06,.38,palette.stone,x,y-h*.5-.08,.22);
    f.box(w+.12,.025,.026,palette.frame,x,y-h*.5+.30,.42);
    for(let k=0;k<4;k++)f.box(.015,.34,.02,palette.frame,x-w*.46+k*w*.31,y-h*.5+.13,.42);
   }
   frontageStats.windows++;
  }
 }
 const shopTitles=['小面','茶','火锅','杂货','咖啡','面包','小吃','茶室'];
 function shop(f,p,index,along,width,base,full){
  const seq=(p.seed+index*7)%19,modern=p.style===4,heritage=p.style===2||p.style===3||p.style===5;
  const storeH=modern?1.57:1.34,wood=heritage?palette.wood:palette.frame;
  const awning=seq%3===0?palette.red:seq%3===1?palette.green:palette.wood;
  // A recessed black opening, warm inner volume, split shopfront and threshold.
  f.box(width-.035,storeH,.05,palette.dark,along,base+storeH/2,.025);
  f.box(width-.14,.76,.035,palette.interior,along,base+.48,.058);
  if(full){
   f.box(width*.42,.24,.07,palette.wood,along-width*.20,base+.20,.082);
   f.box(width*.42,.025,.12,palette.stone,along-width*.20,base+.33,.10);
   f.box(width*.42,.028,.035,palette.lamp,along-width*.20,base+.83,.085);
   for(let i=0;i<3;i++)f.box(.10,.12,.035,i===1?palette.red:palette.plaster,along-width*.34+i*width*.13,base+.41,.10);
  }
  const doorX=along+width*.23,doorW=width*.34;
  f.box(doorW,.79,.026,palette.glass,doorX,base+.47,.097);
  for(const dx of [-doorW/2,0,doorW/2])f.box(.022,.84,.034,wood,doorX+dx,base+.46,.12);
  for(const dy of [.06,.87])f.box(width-.10,.028,.034,wood,along,base+dy,.12);
  for(const dx of [-.48,-.08,.48])f.box(.035,.84,.04,wood,along+dx*width,base+.46,.12);
  f.box(.015,.11,.025,palette.gold,doorX+.04,base+.44,.15);
  f.box(width,.035,.22,palette.stone,along,base+.018,.10);
  f.box(width-.05,.29,.09,awning,along,base+1.065,.08);
  const title=shopTitles[(p.seed+index)%shopTitles.length];
  sign(f,title,width*.80,.235,along,base+1.068,.134,seq%4);
  if(full&&seq%5===1){
   f.box(width-.12,.74,.06,palette.metal,along,base+.46,.13);
   for(let k=0;k<9;k++)f.box(width-.13,.012,.016,palette.dark,along,base+.12+k*.08,.17);
  }
  if(!modern){
   f.box(width+.055,.06,.39,awning,along,base+1.29,.23);
   f.box(width+.055,.12,.03,awning,along,base+1.23,.43);
   if(full)for(let dx=-width*.4;dx<width*.48;dx+=.19)f.box(.035,.014,.38,palette.plaster,along+dx,base+1.325,.23);
  }else{
   f.box(width+.04,.03,.55,palette.glass,along,base+1.39,.30);
   f.box(width+.04,.018,.02,palette.metal,along,base+1.41,.57);
  }
  f.box(width*.92,.015,.025,palette.lamp,along,base+1.205,.16);
  // These are type labels, not invented real businesses or addresses.
  frontageStats.shops++;
 }
 function groundFront(f,p,near){
  const length=f.width;if(length<1.1)return;
  const streetLabel=waterfrontHeritageZones.find(z=>z.id===p.zone)?.name||near.street||p.region.street;
  const n=Math.min(24,Math.max(1,Math.floor(length/1.65))),w=length/n;
  const full=near.distance<35||p.heritage,modern=p.style===4;
  const wall=p.style===2?palette.brick:p.style===3?palette.ochre:p.style===5?palette.plaster:palette.stone;
  for(let i=0;i<n;i++){
   const t=(i+.5)*w-length/2,[x,z]=f.point(t,.18),ground=terrainHeight(x,z)+.035;
   const base=Math.max(p.bottom+.03,ground);
   const apron=[[-w/2,.18],[w/2,.18],[w/2,1.15],[-w/2,1.15]].map(([a,b])=>{const [px,pz]=f.point(t+a,b);return [px,terrainHeight(px,pz)+.026,pz];});
   if(Math.max(...apron.map(p=>p[1]))-Math.min(...apron.map(p=>p[1]))<.6)quad(apron,[[0,0],[1,0],[1,1],[0,1]],palette.stone,x,z);
   if(p.top-base<1.65)continue;
   const commercial=p.style!==3&&!['palace','ciyun','huguang'].includes(p.zone)&&!/故宫|南迁|文物|书院|讲堂|展厅|佛寺|福音堂|慈云|会馆|东水门|兵营|科技馆|会展/.test(p.name||'');
   if(commercial){shop(f,p,i,t,w,base,full);}
   else {
    f.box(w-.025,1.43,.055,wall,t,base+.70,.02);
    const opening=.53,door=i===Math.floor(n/2);
    f.box(opening,door?.85:.63,.035,palette.dark,t,base+(door?.46:.72),.064);
    f.box(opening-.06,door?.80:.57,.025,door?palette.wood:palette.interior,t,base+(door?.46:.72),.09);
    for(const dx of [-.25,0,.25])f.box(.025,door?.85:.65,.05,palette.wood,t+dx,base+(door?.46:.72),.12);
    f.box(.65,.07,.20,palette.stone,t,base+(door?.035:.38),.13);
    f.box(.62,.055,.12,wall,t,base+(door?.91:1.06),.09);
    if(p.style===5){f.box(.08,1.45,.11,palette.plaster,t-w/2+.05,base+.72,.10);arch(f,.62,.35,t,base+1.03);}
   }
   if(full&&i%4===0){
    f.box(.022,Math.min(4,p.top-base),.035,palette.metal,t-w/2+.025,base+Math.min(4,p.top-base)/2,.08);
   }
  }
  const ground=terrainHeight(...f.point(0,.20));
  if(full){
   const known=p.known.find(v=>v.kind!=='street');
   if(p.name&&(!/^\d+[幢栋]$/.test(p.name)))sign(f,p.name.replace(/ [A-Za-z].*$/,''),Math.min(length*.75,5.2),.42,0,Math.max(p.base+1.68,ground+1.77),.16,p.style===4?4:1);
   else if(known)sign(f,known.name,Math.min(length*.72,4),.38,0,ground+1.7,.15,1);
   if(length>3)sign(f,streetLabel,Math.min(2.3,length*.48),.29,-length*.25,ground+1.59,.18,4);
   const [vx,vz]=f.point(Math.min(1.7,f.width*.22),3.5),vy=terrainHeight(vx,vz);
   if(inside(geo.lands[p.region.key==='jiangbei'?'jiangbei':['daijia','jiabin','huguang','changbin','chaotian'].includes(p.region.key)?'peninsula':'nanan'],vx,vz)){
    frontageViews.push({id:p.id,name:p.name||streetLabel,region:p.region.key,zone:p.zone,walkDistance:closestWaterfront(vx,vz).distance,gradeDifference:Math.abs(vy-ground),width:f.width,faceX:f.x,faceZ:f.z,x:vx,y:vy,z:vz,yaw:Math.atan2(vx-f.x,vz-f.z),pitch:.06,mode:'walk',fov:67});
   }
  }
 }
 function roof(faces,p){
  if(p.roofProfile)return;
  for(const f of faces){
   f.box(f.width+.03,.17,.11,palette.stone,0,p.top+.08,0);
   if((p.style===4||p.style===3)&&f.width>3)f.box(f.width,.025,.025,palette.gold,0,p.top+.015,.08);
  }
  if(p.roof==='pitched'||(p.historical&&p.style!==4&&p.heightMeters<22)){
   for(const f of faces){
    if(f.width<1.0)continue;
    // The projecting eave remains legible from below, even on an irregular footprint.
    f.box(f.width+.20,.09,.61,palette.tile,0,p.top+.12,.18);
    f.box(f.width+.19,.075,.06,palette.wood,0,p.top+.055,.50);
    for(let x=-f.width/2;x<f.width/2;x+=.18)f.box(.025,.045,.62,palette.metal,x,p.top+.173,.18);
    for(const side of [-1,1])f.box(.20,.17,.64,palette.tile,side*f.width*.5,p.top+.20,.18);
    if(p.style===3){
     f.box(f.width,.025,.035,palette.gold,0,p.top+.04,.53);
     const cols=Math.max(1,Math.round(f.width/1.4));
     for(let i=0;i<=cols;i++)f.box(.055,p.top-p.base,.075,palette.wood,-f.width/2+i*f.width/cols,(p.base+p.top)/2,.045);
     for(let y=p.base+1.1;y<p.top;y+=1.1)f.box(f.width,.065,.075,palette.wood,0,y,.045);
    }
   }
   const f=faces.reduce((a,b)=>a.width>b.width?a:b),coords=p.rings[0].map(([x,z])=>[(x-p.x)*f.nz-(z-p.z)*f.nx,(x-p.x)*f.nx+(z-p.z)*f.nz]);
   const xs=coords.map(p=>p[0]),zs=coords.map(p=>p[1]);let w=(Math.max(...xs)-Math.min(...xs))*.88,d=(Math.max(...zs)-Math.min(...zs))*.88;
   const cx=(Math.max(...xs)+Math.min(...xs))/2,cz=(Math.max(...zs)+Math.min(...zs))/2;
   const cxw=p.x+f.nz*cx+f.nx*cz,czw=p.z-f.nx*cx+f.nz*cz;
   const point=(a,b)=>[cxw+f.nz*a+f.nx*b,czw-f.nx*a+f.nz*b];
   for(let i=0;i<8;i++){if([[-w/2,-d/2],[-w/2,d/2],[w/2,-d/2],[w/2,d/2]].every(v=>inside(p.rings[0],...point(...v))))break;w*=.84;d*=.84;}
   if(w<1||d<1)return;
   const rise=Math.min(1.9,d*.20),y=p.top+.14;
   for(const side of [-1,1]){
    const ps=[[-w/2,y,side*d/2],[w/2,y,side*d/2],[w/2,y+rise,0],[-w/2,y+rise,0]].map(([a,b,c])=>{const [x,z]=point(a,c);return [x,b,z]});
    quad(ps,[[0,0],[1,0],[1,1],[0,1]],palette.tile,p.x,p.z);
    for(let t=-w/2;t<=w/2;t+=.19){
     const [x,z]=point(t,side*d/4);cube(.025,Math.hypot(d/2,rise),.025,palette.metal,x,y+rise/2+.02,z,f.yaw,side*Math.atan2(d/2,rise));
    }
   }
   const [rx,rz]=point(0,0);cube(w+.15,.10,.14,palette.tile,rx,y+rise,rz,f.yaw);
   for(const side of [-1,1]){const [x,z]=point(0,side*d/2);cube(w+.15,.09,.10,palette.wood,x,y,z,f.yaw);}
   district.polygon(p.rings,p.top,p.top+rise+.3);frontageStats.roofs++;
  }else if(p.heightMeters<50&&p.edgeDistance<45){
   // Roof equipment stays inside the footprint, away from the parapet.
   const x=p.x,z=p.z;if(![[-.7,-.5],[.7,.5]].every(([dx,dz])=>inside(p.rings[0],x+dx,z+dz)))return;
   cube(1.1,.45,.75,palette.metal,x,p.top+.23,z);
   for(let i=0;i<5;i++)cube(.82,.022,.02,palette.dark,x,p.top+.10+i*.065,z+.385);
   frontageStats.roofs++;
  }
 }
 const corridorFront=makeCorridorFrontages({palette,sign,quad,frontageStats,frontageViews,district,closestWaterfront});
 const profiles=[...waterfrontRecords.values(),...coreWaterfrontRecords];
 for(const p of profiles){
  if(!p.detailed||alleyBuildings[p.id]||p.id===412612156)continue;
  const faces=buildingFaces(p);if(!faces.length)continue;
  frontageStats.buildings++;roof(faces,p);
  if(p.corridor)frontageStats.corridorBuildings++;
  for(const f of faces){
   const walk=closestWaterfront(f.x,f.z),near=streetNear(f.x,f.z);
   const facing=(near.x-f.x)*f.nx+(near.z-f.z)*f.nz;
   const surveyed=p.corridor&&(p.corridor.streetEdges.includes(f.edgeIndex)||p.corridor.frontEdges.includes(f.edgeIndex));
   if(!surveyed&&(facing<.2||near.distance>25||(!p.heritage&&walk.distance>65)))continue;
   // Do not add an inhabited facade on an interior courtyard or shared wall.
   const [outsideX,outsideZ]=f.point(0,.36);
   if(district.blocked(outsideX,Math.max(p.base+.6,terrainHeight(outsideX,outsideZ)+.6),outsideZ,.05))continue;
   if(inHongyaChaotian(p)){corridorFront(f,p,near);frontageStats.faces++;continue;}
   if(walk.distance<38)windows(f,p);
   groundFront(f,p,{...walk,street:near.name});frontageStats.faces++;
  }
 }
 // Small, correctly named public wayfinding is separate from inferred shop types.
 const placeNames=waterfrontPlaces.filter(p=>p.kind==='street'||p.kind==='public-sign');
 for(const p of placeNames){
  if(!Number.isFinite(p.x)||!Number.isFinite(p.z))continue;
  const walk=closestWaterfront(p.x,p.z);if(walk.distance>55)continue;
  const y=terrainHeight(p.x,p.z),f=face([p.x-.55,p.z],[p.x+.55,p.z]);f.nx=0;f.nz=1;
  if(district.blocked(p.x,y+.7,p.z,.2))continue;
  cube(.035,.93,.035,palette.metal,p.x,y+.465,p.z);
  sign(f,p.name,1.35,.30,0,y+.86,.04,4);
 }
 // Paving follows the existing graded path exactly; joints and tactile bands
 // are actual world-sized details rather than a stretched texture per segment.
 const paving=new THREE.MeshBasicMaterial({side:THREE.DoubleSide,map:tex(256,256,(c,w,h)=>{
  c.fillStyle='#282c34';c.fillRect(0,0,w,h);
  for(let row=0;row<4;row++)for(let col=-1;col<3;col++){
   const x=col*128+(row%2)*64,y=row*64;c.fillStyle=['#42454c','#353b45','#484a50','#333a44'][(row*3+col+9)%4];c.fillRect(x+2,y+2,124,60);
   c.fillStyle='#a4adbb20';c.fillRect(x+4,y+3,121,2);
  }
 })});materialKeys.set(paving,'paving');
 for(const points of [riverwalks.yuzhong,riverwalks.jiangbei,riverwalks.nanan,lowerQuay])for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[2]-a[2],L=Math.hypot(dx,dz),nx=-dz/L,nz=dx/L,half=points===riverwalks.yuzhong||points===lowerQuay?.80:1.04;
  const ps=[[-1,a],[1,a],[1,b],[-1,b]].map(([side,p])=>[p[0]+nx*half*side,p[1]+.018,p[2]+nz*half*side]);
  quad(ps,[[0,0],[half*2/.8,0],[half*2/.8,L/.8],[0,L/.8]],paving,a[0],a[2]);
  for(let d=1;d<L;d+=1.4){
   const t=d/L,x=a[0]+dx*t+nx*half*.67,z=a[2]+dz*t+nz*half*.67,y=a[1]+(b[1]-a[1])*t;
   for(const shift of [-.055,0,.055])cube(.016,.012,.32,palette.gold,x+nx*shift,y+.026,z+nz*shift,Math.atan2(dx,dz));
  }
 }
 const atlasRows=Math.max(1,Math.ceil(signRows.length/4)),atlasH=2**Math.ceil(Math.log2(atlasRows*128));
 signMat.map=tex(2048,atlasH,(c,w,h)=>{
  c.fillStyle='#30383b';c.fillRect(0,0,w,h);
  signRows.forEach(({title,style,small},i)=>{
   const x=i%4*512,y=Math.floor(i/4)*128,[bg,fg]=signStyles[style%signStyles.length];
   c.fillStyle=bg;c.fillRect(x,y,512,128);c.strokeStyle=fg+'88';c.lineWidth=2;c.strokeRect(x+9,y+9,494,110);
   c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.font='600 61px "PingFang SC","Microsoft YaHei",sans-serif';if(style!==8)c.fillText(title,x+256,y+(small?49:65),470);
   if(style===8){
    c.fillStyle='#b92e24';c.beginPath();c.ellipse(x+67,y+60,42,32,0,0,Math.PI*2);c.fill();
    c.fillStyle='#ffdc69';c.font='bold 48px \"PingFang SC\",sans-serif';c.fillText('李',x+67,y+62,72);
    c.fillStyle='#b92e24';c.font='900 82px \"PingFang SC\",sans-serif';c.fillText('板凳面',x+306,y+66,340);
   }
   if(small){c.font='22px "PingFang SC",sans-serif';c.fillText(small,x+256,y+99,465);}
  });
 });signMat.needsUpdate=true;
 for(const g of quads.values()){
  if(g.m===signMat)for(let i=1;i<g.uv.length;i+=2)g.uv[i]=1+g.uv[i]*128/atlasH;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(g.p,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(g.uv,2));geometry.computeVertexNormals();
  const mesh=put(new THREE.Mesh(geometry,g.m),0,0,0);mesh.userData.noMerge=true;mesh.userData.hideInIllustration=g.hidden;geometry.computeBoundingSphere();detailMeshes.push({mesh,center:geometry.boundingSphere.center.clone(),radius:geometry.boundingSphere.radius,hidden:g.hidden,range:g.m===paving?300:140});
 }
 for(const g of batches.values()){
  const mesh=new THREE.InstancedMesh(g.geometry||unitBox,g.m,g.matrices.length);g.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
  mesh.userData.noMerge=true;mesh.userData.hideInIllustration=g.hidden;put(mesh,0,0,0);detailMeshes.push({mesh,center:mesh.boundingSphere.center.clone(),radius:mesh.boundingSphere.radius,hidden:g.hidden,range:145});frontageStats.instances+=g.matrices.length;
 }
}
