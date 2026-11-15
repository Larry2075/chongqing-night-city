import * as THREE from 'three';
import {terrainHeight,inside,geo} from './geography.js';

// Observed building identities are separate from inferred door/window geometry.
export const corridorFacadeAudit=[];
export function inHongyaChaotian(p){return !!p.corridor||(p.x>36&&p.x<355&&p.z>-65&&p.z<170&&inside(geo.lands.peninsula,p.x,p.z));}
export function corridorMaterialKey(s){
 if(s.id==='486221616')return 'haiyun';
 if(s.id==='748910914')return 'jiliang';
 if(s.id==='950181639')return 'tianjiao';
 if(s.facadeFamily==='residential-slab')return 'slab';
 if(s.facadeFamily==='office-midrise')return 'office';
 if(/market|podium/.test(s.facadeFamily))return 'market';
 if(s.levels>=25)return 'tower';
 return 'housing';
}
export function corridorMaterials(tex){
 const specs={
  haiyun:['#30383d','#182b3c',.23,.82],jiliang:['#393a36','#172c36',.09,.72],
  tianjiao:['#373438','#20323b',.17,.68],slab:['#333535','#152b32',.28,.56],
  office:['#343a3a','#192d38',.04,.86],market:['#3c3932','#1b2c37',.06,.54],
  tower:['#363638','#182c35',.21,.76],housing:['#3e3a35','#1b2a30',.25,.53]
 };
 return Object.fromEntries(Object.entries(specs).map(([key,[wall,glass,inset,wh]])=>[key,new THREE.MeshBasicMaterial({side:THREE.DoubleSide,map:tex(1024,1024,(c)=>{
  c.fillStyle=wall;c.fillRect(0,0,1024,1024);
  for(let r=0;r<4;r++)for(let col=0;col<4;col++){
   const x=col*256,y=r*256,wx=x+inset*256,w=256*(1-inset*2),h=wh*256,wy=y+(256-h)*.5;
   if(key==='housing'){c.strokeStyle='#c5b89b13';c.lineWidth=1;for(let a=0;a<256;a+=12){c.beginPath();c.moveTo(x+a,y);c.lineTo(x+a,y+256);c.stroke();}}
   c.fillStyle=glass;c.fillRect(wx,wy,w,h);
   if((r*7+col*11)%9<2){c.fillStyle='#b39367';c.fillRect(wx+5,wy+5,w-10,h-10);c.fillStyle='#635346';c.fillRect(wx+w*.58,wy+4,w*.35,h-8);}
   c.fillStyle='#637077';c.fillRect(wx+w*.5,wy,3,h);c.fillRect(wx-4,wy+h,w+8,4);
   if(['haiyun','office'].includes(key)){c.fillStyle='#777e7e';c.fillRect(x+7,y,6,256);c.fillRect(x,y+252,256,4);}
   else if(['slab','tianjiao'].includes(key)){c.fillStyle='#7a7b742c';c.fillRect(x+18,y+214,220,23);c.fillStyle='#101c26';c.fillRect(wx,wy+h-24,w,4);for(let k=0;k<5;k++)c.fillRect(wx+k*w/4,wy+h-23,3,24);}
   else {c.fillStyle='#171f2855';c.fillRect(x,y+248,256,8);}
   if(key==='market'||key==='jiliang'){c.fillStyle='#63645b';c.fillRect(x,y+226,256,14);}
  }
 })})]));
}

export function makeCorridorFrontages({palette:M,sign,quad,frontageStats,frontageViews,district,closestWaterfront}){
 corridorFacadeAudit.length=0;
 function grille(f,t,y,w,h,depth=.15){
  f.box(w,h,.045,M.dark,t,y,depth);
  for(let k=0;k<8;k++)f.box(w,.014,.028,M.metal,t,y-h/2+k*h/7,depth+.03);
 }
 function door(f,t,base,w,h,{double=true,wood=false}={}){
  const frame=wood?M.wood:M.metal;
  f.box(w+.16,h+.12,.12,M.dark,t,base+h/2,.08);
  f.box(w,h,.035,M.glass,t,base+h/2,.16);
  for(const dx of [-w/2,w/2,...(double?[0]:[])])f.box(.026,h+.025,.055,frame,t+dx,base+h/2,.20);
  for(const dy of [0,h])f.box(w+.05,.025,.055,frame,t,base+dy,.20);
  for(const dx of double?[-.055,.055]:[w*.3])f.box(.015,.17,.04,M.gold,t+dx,base+h*.48,.23);
  f.box(w+.25,.045,.31,M.stone,t,base+.02,.18);
 }
 function view(f,p,s,ground,lookHeight=.8){
  if(f.width<2.0)return;
  // Prefer a clear view of the entrance; a valid foot position alone may still face a hillside.
  const candidates=[];
  for(const out of (f.preferredOut?[f.preferredOut]:[2.7,4.3,6,9,12]))for(const t of [0,-f.width*.20,f.width*.20,-f.width*.40,f.width*.40]){
   const [x,z]=f.point(t,out),y=f.viewFloor??terrainHeight(x,z);
   if(!inside(geo.lands.peninsula,x,z)||district.blocked(x,y+.60,z,.15))continue;
   const [fx,fz]=f.point(0,.24),distance=Math.hypot(fx-x,fz-z),pitch=Math.atan2(ground+lookHeight-y-.60,distance);
   if(Math.abs(pitch)>.7)continue;
   let occluded=false;
   for(let k=1;k<20&&!occluded;k++)for(const dt of [-Math.min(3,f.width*.43),0,Math.min(3,f.width*.43)]){
    const u=k/20,[tx,tz]=f.point(dt,.25),rx=x+(tx-x)*u,rz=z+(tz-z)*u,ry=y+.60+(ground+lookHeight-y-.60)*u;
    if(terrainHeight(rx,rz)>ry-.12||district.blocked(rx,ry,rz,.025))occluded=true;
   }
   if(occluded)continue;
   const score=Math.abs(pitch)*3+Math.abs(out-(f.preferredOut||Math.min(8,f.width*.72)))*.2+Math.abs(t)*.11;
   candidates.push({score,id:p.id,name:s.name||s.street,region:p.region.key,zone:p.zone,corridor:true,street:s.street,walkDistance:closestWaterfront(x,z).distance,gradeDifference:0,width:f.width,faceX:fx,faceZ:fz,x,y,z,yaw:Math.atan2(x-fx,z-fz),pitch,mode:'walk',fov:68});
  }
  candidates.sort((a,b)=>a.score-b.score);if(candidates.length)frontageViews.push(candidates[0]);
  else if(s.id==='486221616'){
   // The west frontage is tucked beneath a steep mapped street. Offer a clear flying
   // inspection view instead of presenting an obstructed point as a walkable entrance.
   const out=9,inspectHeight=2.7,[x,z]=f.point(0,out),[fx,fz]=f.point(0,.25);
   for(const rise of [3,5,7,9]){
    const y=Math.max(terrainHeight(x,z)+1,ground+rise);if(district.blocked(x,y,z,.38,true))continue;
    let clear=true;for(let k=1;k<20;k++)for(const dt of [-1,0,1]){
     const u=k/20,[tx,tz]=f.point(dt,.25),rx=x+(tx-x)*u,rz=z+(tz-z)*u,ry=y+(ground+inspectHeight-y)*u;
     if(terrainHeight(rx,rz)>ry-.15||district.blocked(rx,ry,rz,.025))clear=false;
    }
    if(!clear)continue;
    frontageViews.push({id:p.id,name:s.name,region:p.region.key,corridor:true,street:s.street,walkDistance:closestWaterfront(x,z).distance,gradeDifference:0,width:f.width,faceX:fx,faceZ:fz,x,y,z,yaw:Math.atan2(x-fx,z-fz),pitch:Math.atan2(ground+inspectHeight-y,out),mode:'fly',fov:58});break;
   }
  }
 }
 function noodleShop(f,p,s){
  // The shop is independently photographed at 朝千路41号. Its exact door plane is approximated
  // on the POI's corresponding street edge; it is not copied onto other faces or buildings.
  const poi=s.pois.find(p=>p.kind==='restaurant'),t=THREE.MathUtils.clamp((poi.x-f.x)*f.nz-(poi.z-f.z)*f.nx,-f.width/2+1.1,f.width/2-1.1);
  const ground=terrainHeight(...f.point(t,.28)),base=Math.max(ground,terrainHeight(...f.point(t+.95,.3)))+.025,w=1.88,h=1.02;
  // A small raised frontage landing resolves the coarse hillside at this photographed
  // street-level doorway. Dimensions/elevation are an explicit working approximation.
  const corners=[[-1.12,.23],[1.12,.23],[1.12,2.55],[-1.12,2.55]].map(([a,b])=>{const[x,z]=f.point(t+a,b);return[x,base+.018,z]});
  quad(corners,[[0,0],[1,0],[1,1],[0,1]],M.stone,f.x,f.z);
  for(let i=0;i<4;i++){
   const a=corners[i],b=corners[(i+1)%4],low=Math.min(terrainHeight(a[0],a[2]),terrainHeight(b[0],b[2]));
   quad([[a[0],low,a[2]],[b[0],low,b[2]],b,a],[[0,0],[1,0],[1,1],[0,1]],M.dark,f.x,f.z);
  }
  const A=f.point(t-1.10,1.39),B=f.point(t+1.10,1.39);district.path([[A[0],base,A[1]],[B[0],base,B[1]]],2.30);
  // Connect the landing back to the existing street surface with shallow stone steps.
  const P=f.point(t-1.10,.72),Q=f.point(t-3.20,.72),end=terrainHeight(...Q),steps=Math.max(1,Math.ceil(Math.abs(base-end)/.062));
  district.path([[P[0],base,P[1]],[Q[0],end,Q[1]]],.72);
  for(let i=0;i<steps;i++){const u=(i+.5)/steps;f.box(2.10/steps+.015,.065,.72,M.stone,t-1.10-u*2.10,base+(end-base)*u-.034,.72);}

  f.box(w+.28,1.48,.13,M.brick,t,base+.73,.10);
  // Individually coursed reddish masonry flanking a single open bay.
  for(const dx of [-w/2-.055,w/2+.055])for(let k=0;k<15;k++){
   f.box(.18,.045,.04,k%3===0?M.red:M.wood,t+dx,base+.07+k*.08,.18);
  }
  f.box(w,h,.04,M.dark,t,base+h/2+.03,.19);
  f.box(w*.57,.83,.035,M.interior,t-w*.17,base+.48,.205);
  f.box(w*.37,.63,.04,M.dark,t+w*.29,base+.49,.22);
  // Red exhaust fan and stainless prep utensils visible in the reference kitchen.
  const fanT=t-w*.31,fanY=base+.79;
  f.box(.33,.31,.045,M.metal,fanT,fanY,.225);
  for(let k=0;k<18;k++){
   const a=k*Math.PI/9,b=(k+1)*Math.PI/9;
   const pts=[[0,0],[Math.cos(a)*.125,Math.sin(a)*.125],[Math.cos(b)*.125,Math.sin(b)*.125],[0,0]].map(([dx,dy])=>{const[x,z]=f.point(fanT+dx,.252);return[x,fanY+dy,z]});
   quad(pts,[[0,0],[1,0],[1,1],[0,1]],M.red,f.x,f.z);
  }
  for(let k=0;k<4;k++)f.box(.26,.009,.014,M.frame,fanT,fanY-.10+k*.065,.264);
  for(const dx of [-.35,-.10]){f.box(.14,.13,.12,M.metal,t+dx,base+.43,.38);f.box(.18,.018,.14,M.stone,t+dx,base+.50,.38);}
  // Rear prep counter, steel shutter hood and the unlit black menu board.
  f.box(w*.52,.30,.29,M.metal,t-w*.18,base+.18,.38);
  f.box(w*.55,.035,.34,M.stone,t-w*.18,base+.35,.40);
  sign(f,'板凳面',w*.50,.20,t-w*.18,base+.21,.555,6);
  f.box(.32,.39,.035,M.dark,t+w*.28,base+.70,.255);
  for(let k=0;k<6;k++)f.box(.24,.009,.016,M.plaster,t+w*.28,base+.55+k*.055,.28);
  for(let k=0;k<5;k++)f.box(w,.024,.10,M.metal,t,base+1.02+k*.032,.23);
  sign(f,'李板凳面',w+.15,.31,t,base+1.50,.245,8);
  sign(f,'朝千路41号',.30,.14,t-w/2-.10,base+1.13,.26,4);
  f.box(w+.34,.045,.34,M.red,t,base+1.22,.35);
  f.box(w*.55,.018,.04,M.lamp,t-w*.17,base+.99,.22);
  for(let k=0;k<12;k++)f.box((w+.34)/12,.07+(k%2)*.035,.035,M.red,t-(w+.34)/2+(k+.5)*(w+.34)/12,base+1.18,.535);
  // Stackable plastic stools, different heights; retain the pedestrian passage.
  for(const [dx,dy] of [[-.55,.20],[.35,.13]]){
   f.box(.25,.035,.23,M.red,t+dx,base+dy,.77);
   for(const side of [-1,1])f.box(.035,dy,.17,M.red,t+dx+side*.09,base+dy/2,.77);
  }
  view({...f,x:f.point(t,0)[0],z:f.point(t,0)[1],width:3,preferredOut:2.1,viewFloor:base,point:(a,b)=>f.point(t+a,b)},p,{...s,name:'朝千路 · 李板凳面'},base,.8);
  frontageStats.shops++;
  corridorFacadeAudit.push({id:p.id,edge:f.edgeIndex,role:'photo-referenced-noodle-shop',base,buildingBase:p.base,shopSigns:['李板凳面'],address:'朝千路41号',source:'https://dimg04.c-ctrip.com/images/0101f120009ru1vetD9DC.jpg',placement:'mapped-building-and-poi; door-plane-and-height-approximate'});
 }
 function render(f,p,near){
  const s=p.corridor,key=s?corridorMaterialKey(s):'housing',street=!!s?.streetEdges.includes(f.edgeIndex),main=street&&f.edgeIndex===s.streetEdges[0];
  const ground=terrainHeight(...f.point(0,.25)),floor=p.base,fh=(p.top-p.base)/(s?.levels||Math.max(1,Math.round(p.heightMeters/3.3))),width=f.width;
  if(width<.9)return;
  const bay=key==='haiyun'?1.18:key==='office'?1.38:key==='slab'?1.16:key==='market'?2.1:1.4;
  const n=Math.max(1,Math.round(width/bay)),cw=width/n;
  // The river-side exposed foundation is stone, ventilation and drainage — not retail.
  if(floor-ground>.8){
   const h=Math.min(floor-ground,9),bottom=floor-h;
   for(let i=0;i<n;i++){
    const t=(i+.5)*cw-width/2;f.box(.06,h,.10,M.stone,t-cw/2,bottom+h/2,.07);
    if(i%3===1)grille(f,t,floor-.46,Math.min(.5,cw*.5),.24,.10);
   }
   for(let y=bottom+.55;y<floor;y+=.52)f.box(width,.022,.032,M.dark,0,y,.11);
   frontageStats.corridorRetainingFaces++;
  }
  const rows=Math.min(s?.levels||6,key==='haiyun'?24:key==='tianjiao'?32:14);
  for(let row=1;row<rows;row++){
   const y=floor+(row+.5)*fh;
   if(key==='haiyun'||key==='jiliang'||key==='market')f.box(width,.055,.15,M.stone,0,floor+row*fh,.08);
   for(let col=0;col<n;col++){
    const t=(col+.5)*cw-width/2,w=cw*(key==='office'?.92:key==='haiyun'?.73:.61),h=fh*(key==='housing'?.52:.68);
    if(terrainHeight(...f.point(t,.12))>y-h/2)continue;
    const balcony=(key==='slab'&&col%2===0)||(key==='tianjiao'&&col%3!==1);
    f.box(w+.10,.045,balcony?.31:.15,M.stone,t,y-h/2-.03,.08);
    for(const dx of [-w/2,0,w/2])f.box(.018,h,.045,M.metal,t+dx,y,.07);
    f.box(w,.022,.045,M.frame,t,y+h/2,.08);
    if(balcony){
     f.box(w+.10,.025,.026,M.frame,t,y-h*.16,.37);
     for(let k=0;k<5;k++)f.box(.012,h*.36,.02,M.frame,t-w*.46+k*w*.23,y-h*.34,.37);
    }else if(key==='housing'&&row<5){
     for(let k=0;k<4;k++)f.box(.014,h,.035,M.frame,t-w/2+k*w/3,y,.16);
     if((row+col)%4===0)grille(f,t+cw*.37,y-h*.48,.26,.17,.17);
    }
    frontageStats.windows++;
   }
  }
  // Full-height fins distinguish the rounded office tower from tile-clad housing.
  if(key==='haiyun'||key==='office')for(let i=0;i<=n;i++)f.box(.045,p.top-floor,.10,M.metal,-width/2+i*cw,(p.top+floor)/2,.075);
  if(key==='tianjiao')for(const t of [-width*.46,width*.46])f.box(.085,p.top-floor,.17,M.plaster,t,(p.top+floor)/2,.10);
  if(!street){corridorFacadeAudit.push({id:p.id,edge:f.edgeIndex,role:'river-residential-or-service',shopSigns:[]});return;}
  const base=Math.max(floor,ground),usable=p.top-base;
  if(usable<1.2)return;
  const office=key==='haiyun'||key==='office',mall=key==='market'||key==='jiliang';
  const wall=office?M.metal:key==='tianjiao'?M.wood:M.stone,entryWidth=Math.min(width*.55,mall?3.5:office?2.6:1.25);
  // No repetitive vendor strip. A single lobby or market entrance belongs to its building.
  f.box(width,1.55,.09,wall,0,base+.76,.06);
  if(main){
   door(f,0,base+.03,entryWidth,office?1.24:1.04,{double:office||mall,wood:key==='housing'});
   f.box(Math.min(width,entryWidth+.8),.065,office?.75:.40,office?M.glass:M.stone,0,base+1.40,.34);
   f.box(entryWidth+.25,.022,.022,M.lamp,0,base+1.36,.50);
   if(s.name)sign(f,s.name,Math.min(width*.85,5.5),.37,0,base+1.79,.20,key==='haiyun'?7:key==='jiliang'?6:1);
   if(width>3){
    const label=s.street==='Changjiang Binjiang Road'?'长江滨江路':s.street;
    sign(f,label,1.6,.25,-width*.31,base+1.15,.19,4);
   }
  }
  for(let i=0;i<n;i++){
   const t=(i+.5)*cw-width/2;if(main&&Math.abs(t)<entryWidth*.7)continue;
   if(mall){
    f.box(cw*.84,1.05,.045,M.glass,t,base+.65,.12);
    f.box(.035,1.12,.07,M.metal,t-cw*.44,base+.65,.16);
   }else if(office){
    f.box(cw*.80,.93,.03,M.glass,t,base+.70,.12);f.box(cw*.83,.025,.065,M.metal,t,base+.24,.16);
   }else if(i%3===0)grille(f,t,base+.8,cw*.55,.62,.14);
   else {
    f.box(cw*.64,.68,.03,M.glass,t,base+.83,.13);
    for(let k=0;k<5;k++)f.box(.013,.70,.045,M.frame,t-cw*.31+k*cw*.155,base+.83,.18);
   }
  }
  // POI-only businesses are not stamped onto an arbitrary 1F door. Names stay in the survey.
  if(String(p.id)==='950181634'&&f.edgeIndex===2)noodleShop(f,p,s);
  else if(main)view(f,p,s,base,1.15);
  corridorFacadeAudit.push({id:p.id,edge:f.edgeIndex,role:main?(mall?'market-entrance':'building-entrance'):'street-windows',base,buildingBase:floor,shopSigns:[],buildingSign:main?s.name:undefined});
 }
 return render;
}
