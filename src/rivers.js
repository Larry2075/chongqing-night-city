import {corridorBuildingProfiles} from '../data/hongya-chaotian-survey.js';
import { levels,UNIT,coreHeight } from '../data/site-survey.js';
import { buildingSurvey } from '../data/building-survey.js';
import { buildLifts } from './lifts.js';
import * as THREE from 'three';
import { buildCity } from './city.js';
import { bridgeHeight, bridgeZ, eastBridgeZ, archDeck, riverMarkers, riverwalks, lowerQuay, qiansimenStepSegments } from './river-route.js';

import { geo, terrainHeight, nearestWalk } from './geography.js';
import { buildNightDetails } from './night-details.js';
const {peninsula,jiangbei,nanan}=geo.lands;

export const riverLocations = {
  confluence:{x:327,y:levels.plazaLower,z:198,yaw:Math.atan2(6,15),pitch:.25,mode:'walk'},
  arch:{x:-89,y:archDeck(-89),z:bridgeZ(-89)-7.4,yaw:1.65,pitch:.055,mode:'walk'},
  theatre:{x:161,y:levels.bankRoad,z:283.5,yaw:1.38,pitch:.10,mode:'walk'},
  archLift:{x:-124,y:levels.bankRoad,z:bridgeZ(-124)-7.4,yaw:.25,pitch:0,mode:'walk'},
  plazaUpper:{x:321,y:levels.square,z:183,yaw:Math.PI,pitch:-.14,mode:'walk'},
  quay:{x:277,y:levels.riverwalk,z:184.2,yaw:.97,pitch:.035,mode:'walk'}
};

function contains(points,x,z) {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [ax,az]=points[i],[bx,bz]=points[j];
    if((az>z)!==(bz>z) && x<(bx-ax)*(z-az)/(bz-az)+ax) inside=!inside;
  }
  return inside;
}

export function buildRivers({mat,box,put,beam,panel,district,tex,TICK=[],NOINK=[],GLOW=[],scene}) {
  const embankment=mat('#29313d'), land=mat('#30343e'), promenade=mat('#343842');
  const slate=mat('#3e434e'), steel=mat('#40313e'), green=mat('#345452');
  const warm=mat('#ffca85',{emissive:'#ffab55',emissiveIntensity:1.1});
  const litRed=mat('#de5754',{emissive:'#e53532',emissiveIntensity:.86});
  const paintedRed=mat('#943d44',{emissive:'#6e202a',emissiveIntensity:.54});
  const silver=mat('#a6a5ae');
  const tile=mat('#383b44');
  const amber=mat('#b77f53',{emissive:'#b36f3b',emissiveIntensity:.38});
  const darkGold=mat('#67604e');

  function solid(ring,base,height,top,side=top) {
    const shape=new THREE.Shape(ring.map(([x,z])=>new THREE.Vector2(x,-z)));
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:1});
    put(new THREE.Mesh(geometry,[top,side]),0,base,0,-Math.PI/2);
  }
  const shores=[[peninsula,terrainHeight],[jiangbei,terrainHeight],[nanan,terrainHeight]];
  const terrainMaterial=new THREE.ShaderMaterial({side:THREE.DoubleSide,
    vertexShader:`varying vec3 p;varying vec3 n;void main(){p=position;n=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 p;varying vec3 n;float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
      void main(){vec3 normal=normalize(n);float slope=1.-smoothstep(.55,.92,abs(normal.y));
      vec2 q=vec2(abs(normal.x)>abs(normal.z)?p.z:p.x,p.y)/vec2(.65,.28);q.x+=mod(floor(q.y),2.)*.5;
      vec2 cell=fract(q),aa=max(fwidth(q),vec2(.002));
      float joint=(1.-smoothstep(.025-aa.x,.025+aa.x,min(cell.x,1.-cell.x)));
      joint=max(joint,1.-smoothstep(.035-aa.y,.035+aa.y,min(cell.y,1.-cell.y)));
      // Charcoal and blue-grey ground keep the warm night lighting prominent.
      vec3 stone=mix(vec3(.030,.034,.041),vec3(.049,.051,.057),hash(floor(q)));stone*=1.-joint*.28;
      vec3 ground=vec3(.011,.014,.020)*(1.+.12*hash(floor(p.xz*2.)));
      float shade=.72+.28*max(0.,dot(normal,normalize(vec3(-.5,1.,.5))));
      gl_FragColor=vec4(mix(ground,stone,slope)*shade,1.);}`});
  for(const [name,ring] of Object.entries(geo.lands)) {
    const points=geo.triangles[name],positions=[];
    for(let i=0;i<points.length;i+=2) positions.push(points[i],terrainHeight(points[i],points[i+1]),points[i+1]);
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();
    terrainMaterial.side=THREE.DoubleSide;
    put(new THREE.Mesh(g,terrainMaterial),0,0,0);
    const sides=[];
    for(let i=0;i<ring.length;i++) {
      const [x,z]=ring[i],[nx,nz]=ring[(i+1)%ring.length];
      const y=terrainHeight(x,z),ny=terrainHeight(nx,nz);
      sides.push(x,-.8,z,nx,-.8,nz,nx,ny,nz,x,-.8,z,nx,ny,nz,x,y,z);
    }
    const side=new THREE.BufferGeometry();side.setAttribute('position',new THREE.Float32BufferAttribute(sides,3));side.computeVertexNormals();
    embankment.side=THREE.DoubleSide;put(new THREE.Mesh(side,embankment),0,0,0);
    district.terrain(ring,terrainHeight);
  }

  function ribbon(points,width,material,thickness=1.3,walkable=true,aboveGround=false) {
    if(walkable) district.path(points,width-.10,aboveGround);
    for(let i=1;i<points.length;i++){
      const [ax,ay,az]=points[i-1],[bx,by,bz]=points[i];
      const dx=bx-ax, dz=bz-az, run=Math.hypot(dx,dz);
      const piece=box(run+.54,thickness,width,material,(ax+bx)/2,(ay+by)/2-thickness/2,(az+bz)/2,Math.atan2(-dz,dx));
      piece.rotateZ(Math.atan2(by-ay,run));
      const sideX=-dz/run*(width*.45),sideZ=dx/run*(width*.45);
      beam([ax+sideX,ay+.39,az+sideZ],[bx+sideX,by+.39,bz+sideZ],.061,steel);
      for(let distance=2.4;distance<run;distance+=4.9){
        const t=distance/run,x=ax+dx*t+sideX,z=az+dz*t+sideZ,y=THREE.MathUtils.lerp(ay,by,t);
        box(.035,.39,.035,steel,x,y+.195,z);
        if(distance%10<5){
          box(.055,1.75,.055,steel,x,y+.875,z);
          box(.28,.12,.25,warm,x,y+1.76,z);
        }
      }
      if(material===promenade){
        const yaw=Math.atan2(-dz,dx);
        for(let distance=1.5;distance<run;distance+=2.5){
          const t=distance/run, y=THREE.MathUtils.lerp(ay,by,t);
          const x=ax+dx*t,z=az+dz*t;
          box(.027,.014,width-.22,embankment,x,y+.011,z,yaw);
          if(Math.floor(distance/2.5)%4!==1) continue;
          box(1.25,.055,.07,amber,x+sideX*.80,y+.035,z+sideZ*.80,yaw);
        }
      }
    }
  }
  ribbon(riverwalks.yuzhong,1.9,promenade,.18);
  ribbon(riverwalks.jiangbei,2.45,promenade,.18);
  ribbon(riverwalks.nanan,2.45,promenade,.18);
  for(let i=1;i<riverwalks.qiansimenLanding.length;i++) {
    const a=riverwalks.qiansimenLanding[i-1],b=riverwalks.qiansimenLanding[i];
    if(qiansimenStepSegments.has(i)) squareStairs(a,b,1.05);
    else ribbon([a,b],1.05,promenade,.18,true,true);
  }
  ribbon(lowerQuay,1.8,promenade,.18);
  ribbon(riverwalks.hongyaQuayAccess.slice(0,2),1.8,promenade,.18);
  squareStairs(riverwalks.hongyaQuayAccess[1],riverwalks.hongyaQuayAccess[2],1.25);
  ribbon(riverwalks.hongyaQuayAccess.slice(2),1.3,promenade,.18);
  ribbon(riverwalks.archSouthAccess,1.05,promenade,.15,true,true);
  ribbon(riverwalks.eastSouthAccess,1.05,promenade,.15,true,true);
  ribbon(riverwalks.bridgewalk,.875,mat('#82444c'),.18);
  ribbon(riverwalks.dongshuimen,1.05,slate,.24,true,true);
  {
    const [x,y,z]=[300.4345,23,eastBridgeZ(300.4345)], [nx,ny,nz]=[563.4625,23,eastBridgeZ(563.4625)];
    const length=Math.hypot(nx-x,nz-z), angle=Math.atan2(z-nz,nx-x);
    box(length,.50,8.4,slate,(x+nx)/2,y-.25,(z+nz)/2,angle);
    for(const t of [.24,.73]) {
      const px=THREE.MathUtils.lerp(x,nx,t), pz=THREE.MathUtils.lerp(z,nz,t);
      for(const side of [-1,1]) {
        beam([px,y-8,pz+side*3.8],[px,y+26,pz+side*.7],1.1,paintedRed);
        for(const offset of [-24,-17,-10,10,17,24]){
          beam([px,y+24-Math.abs(offset)*.13,pz+side*.7],
            [px+offset,ny,pz+offset*(nz-z)/(nx-x)+side*2.2],.12,litRed);
        }
      }
      box(3.8,y,6,embankment,px,y*.35,pz);
    }
  }

  const archY=bridgeHeight, archEnds=[-197.22,242.67,286,330,420].map(x=>[x,archDeck(x),bridgeZ(x)]);
  ribbon(archEnds,12,slate,2.05,false);
  ribbon(archEnds.map(([x,y,z])=>[x,y-4.9,z]),10.8,slate,.79,false);
  const archDepth=13, archWidth=204, archCenter=57;
  const archAt=x=>Math.max(0,1-((x-archCenter)/(archWidth/2))**2)*45+archY-6;
  const spanZ=bridgeZ;
  for(const side of [-1,1]){
    beam([-128,archY-4,spanZ(-128)+side*archDepth*.5],[277,archY-4,spanZ(277)+side*archDepth*.5],.65,paintedRed);
    for(let x=archCenter-archWidth/2;x<archCenter+archWidth/2;x+=6){
      const next=Math.min(x+6,archCenter+archWidth/2), z=spanZ(x)+side*archDepth*.5;
      beam([x,archAt(x),z],[next,archAt(next),spanZ(next)+side*archDepth*.5],1.32,litRed);
      beam([x,archY-5,z],[next,archY-5,spanZ(next)+side*archDepth*.5],.24,litRed);
      if(archAt(x)>archY+.4) beam([x,archY,z],[x,archAt(x),z],.19,silver);
      beam([x,archY-4.7,z],[next,archY-.25,spanZ(next)+side*archDepth*.5],.22,paintedRed);
      if((x-archCenter+archWidth/2)%12===0 && archAt(x)>archY+5) {
        beam([x,archAt(x),spanZ(x)-archDepth*.5],[x,archAt(x),spanZ(x)+archDepth*.5],.43,paintedRed);
      }
    }
  }
  for(const x of [-111,-48,157,235,271]){
    const z=spanZ(x);
    box(5.8,26,10,embankment,x,10,z);
    box(10.7,1.6,12,slate,x,23.4,z);
  }
  for(let x=-123;x<271;x+=5.5){
    const z=spanZ(x);
    box(2.45,.022,.105,warm,x,archDeck(x)+.023,z,-.094);
    if(Math.round((x+123)/5.5)%3===0) for(const side of [-1,1]){
      box(.11,3.8,.11,steel,x,archDeck(x)+1.9,z+side*5.43);
      box(.37,.11,.26,warm,x,archDeck(x)+3.76,z+side*4.97);
    }
  }
  for(let x=-113;x<244;x+=3.7){
    for(const offset of [-7.9,-7.0]){
      const z=spanZ(x)+offset;
      box(.025,.40,.025,silver,x,archDeck(x)+.20,z);
      beam([x,archDeck(x)+.41,z],[x+3.7,archDeck(x+3.7)+.41,spanZ(x+3.7)+offset],.068,silver);
      beam([x,archDeck(x)+.14,z],[x+3.7,archDeck(x+3.7)+.14,spanZ(x+3.7)+offset],.043,silver);
    }
  }
  panel('朝天门长江大桥',-106,30.8,spanZ(-106)-8.04,4.8,.88,
    {bg:'#294959',subtitle:'步行道 · 江北桥头',angle:Math.PI/2});

  function routeSign(title,desc,x,y,z,angle) {
    const nx=Math.sin(angle), nz=Math.cos(angle);
    box(.035,.85,.035,steel,x,y+.425,z);
    box(1.45,.35,.05,steel,x,y+.85,z,angle);
    panel(title,x+nx*.061,y+.85,z+nz*.061,1.43,.33,{bg:'#245065',fg:'#f4e5d6',subtitle:desc,angle});
    panel(title,x-nx*.061,y+.85,z-nz*.061,1.43,.33,{bg:'#245065',fg:'#f4e5d6',subtitle:desc,angle:angle+Math.PI});
  }
  for(const {title,next,route,at} of riverMarkers) {
    const points=riverwalks[route];
    const [x,y,z]=points[at];
    const [ax,,az]=points[Math.max(0,at-1)];
    const [bx,,bz]=points[Math.min(points.length-1,at+1)];
    const run=Math.hypot(bx-ax,bz-az), dx=(bx-ax)/run, dz=(bz-az)/run;
    routeSign(title,next,x-dz*1.1,y,z+dx*1.1,Math.atan2(dx,dz));
  }
  routeSign('江北桥头','从人行道下行 → 江滩步道',-125.5,29,894,1.15);
  routeSign('两江汇滨江步道','朝天门广场 ←  ·  洪崖洞 →',137,2.12,6.6,1.57);

  function overlook(x,y,z,turn) {
    y=nearestWalk(x,z).height;
    box(10,.32,6.6,tile,x,y-.16,z,turn);
    for(let i=-4;i<=4;i++){
      box(.075,.93,.078,steel,x+i,y+.46,z+3.12);
      box(.03,.02,6.32,embankment,x+i,y+.011,z);
    }
    box(10,.065,.064,silver,x,y+.94,z+3.12);
    for(const offset of [-2.3,2.3]){
      box(1.62,.09,.46,darkGold,x+offset,y+.51,z+1.5);
      box(.10,.48,.34,steel,x+offset-.60,y+.24,z+1.5);
      box(.10,.48,.34,steel,x+offset+.60,y+.24,z+1.5);
    }
    district.path([[x-4.9,y,z],[x+4.9,y,z]],5.7);
  }
  overlook(168,8.6,311,0);
  overlook(76,8.6,488,0);
  overlook(224,4.2,135,0);
  overlook(330,8.6,192,0);
  for(let [x,y,z,heading] of [[152,8.6,277,-.58],[137,8.6,366,.57],[82,8.6,463,.46],
    [-13,8.6,638,-.70],[-91,8.6,813,-.57],[194,3.6,108,-.69],
    [273,6.4,185,-.57],[352,7.95,151,.23],[535,9.43,154,.19],[189,9.43,640,.35]]){
    y=nearestWalk(x,z).height;
    box(1.0,.045,.17,darkGold,x,y+.17,z,heading);
    for(const offset of [-.33,.33]) box(.065,.17,.15,steel,x+offset*Math.cos(heading),y+.085,z-offset*Math.sin(heading),heading);
    box(1,.14,.035,darkGold,x+.075*Math.sin(heading),y+.29,z+.075*Math.cos(heading),heading);
  }

  const rafLow=mat('#41485c'), rafRoof=mat('#74768b');
  const podium=corridorBuildingProfiles.find(p=>p.id==='1307164454').rings[0];
  solid(podium,levels.rafflesGrade,levels.rafflesPodium-levels.rafflesGrade,rafRoof,rafLow);
  district.polygon([podium],levels.rafflesGrade,levels.rafflesPodium);
  const canopy=mat('#8f919c');
  const facadeGlass=mat('#3a5569',{emissive:'#324e6c',emissiveIntensity:.58});
  const garden=mat('#293237');
  for(let i=0;i<podium.length;i++){
    const [a,b]=podium[i],[c,d]=podium[(i+1)%podium.length];
    for(const y of [9.8,11.7,13.8,15.8,17.65]){
      beam([a,y,b],[c,y,d],.38,canopy);
    }

    const length=Math.hypot(c-a,d-b), angle=Math.atan2(b-d,c-a);
    const nx=-(d-b)/length,nz=(c-a)/length;
    const panes=Math.max(1,Math.floor(length/2.65)),paneWidth=length/panes;
    for(let k=0;k<panes;k++){
      const j=(k+.5)*paneWidth;
      const x=a+(c-a)*j/length-nx*.15,z=b+(d-b)*j/length-nz*.15;
      box(Math.max(.04,paneWidth-.16),4.2,.21,facadeGlass,x,12.6,z,angle);
      box(.085,4.7,.26,canopy,x,12.7,z,angle);
      if(k%3===1) box(Math.min(1.67,paneWidth*.7),.13,.31,warm,x,10.98,z,angle);
    }
  }
  const glass=new THREE.MeshBasicMaterial({map:tex(96,128,(ctx,w,h)=>{
    ctx.fillStyle='#14293a';ctx.fillRect(0,0,w,h);
    for(let x=1;x<w;x+=12){
      ctx.fillStyle=x%3===1?'#577a8c':'#1a3749';ctx.fillRect(x,0,2,h);
      for(let y=4;y<h;y+=8){
        if((x*7+y*3)%13<3){ctx.fillStyle='#f2bf7b';ctx.fillRect(x+3,y,6,2);}
      }
    }
  })});
  const towers=[
    [231.83,109.56,78.75,13.5,18],[263.67,134.15,78.75,13.4,18.5],
    [288.80,127.76,78.75,14.5,18],[310.58,119.48,78.75,16.0,18],
    [333.16,107.27,78.75,17,18],[338.57,67.63,78.75,17,19],
    [295.26,150.36,113.75,16,15.2],[322.04,139.85,113.75,16,15.2]
  ];
  for(const [x,z,h,w,d] of towers){
    const slices=24, phi=.25;
    const contour=(i,j)=>{
      const t=i/slices, width=w*(1-.21*t), depth=d*(1-.085*t);
      const corners=[[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]];
      const [u,v]=corners[j%4];
      return [x+u*Math.cos(phi)+v*Math.sin(phi)+1.9*t*t,levels.rafflesPodium+h*t,z-u*Math.sin(phi)+v*Math.cos(phi)+3.1*t*t];
    };
    const anchors=[],uv=[];
    for(let level=0;level<slices;level++){
      for(let side=0;side<4;side++){
        const p=contour(level,side),q=contour(level+1,side),r=contour(level+1,side+1),s=contour(level,side+1);
        anchors.push(...p,...q,...r,...p,...r,...s);
        const low=level*h/slices/26,high=(level+1)*h/slices/26;
        uv.push(0,low,0,high,1,high,0,low,1,high,1,low);
      }
    }
    const geom=new THREE.BufferGeometry();
    geom.setAttribute('position',new THREE.Float32BufferAttribute(anchors,3));
    geom.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geom.computeVertexNormals();
    glass.side=THREE.DoubleSide;
    put(new THREE.Mesh(geom,glass),0,0,0);
    for(let side=0;side<4;side++){
      for(let i=0;i<slices;i+=3) beam(contour(i,side),contour(i+3,side),.16,warm);
      for(let i=2;i<slices;i+=3) beam(contour(i,side),contour(i,side+1),.065,facadeGlass);
    }
    box(w*.78,.55,d*.91,rafRoof,x+1.9,levels.rafflesPodium+h,z+3.1,phi);
    district.block(x+2.9,z+2,w+3,d+2.4,levels.rafflesPodium,levels.rafflesPodium+h);
  }
  // The Crystal spans the four lower central towers. Its rounded glass
  // shell and diagonal steel bands are visible from either bank.
  const axis=new THREE.Vector3(1,0,-.388).normalize();
  const cross=new THREE.Vector3(-axis.z,0,axis.x);
  const crystal=new THREE.Vector3(299,levels.rafflesGrade+250*UNIT+26.5*UNIT/2,122);
  const crystalL=300*UNIT-8.8, crystalW=32.5*UNIT/2, crystalH=26.5*UNIT/2;
  const rawCrystal=mat('#326575',{emissive:'#204a59',emissiveIntensity:.45,side:THREE.DoubleSide});
  const skin=new THREE.CylinderGeometry(1,1,crystalL,20,1,true);
  skin.rotateZ(Math.PI/2);
  skin.scale(1,crystalH,crystalW);
  skin.rotateY(-Math.atan2(axis.z,axis.x));
  put(new THREE.Mesh(skin,rawCrystal),...crystal.toArray());
  for(const side of [-1,1]){
    put(new THREE.Mesh(new THREE.SphereGeometry(1,20,12),rawCrystal),
      crystal.x+axis.x*side*crystalL/2,crystal.y,crystal.z+axis.z*side*crystalL/2,
      0,-Math.atan2(axis.z,axis.x)).scale.set(4.4,crystalH,crystalW);
  }
  const crystalPoint=(long,angle)=>[
    crystal.x+axis.x*long+cross.x*crystalW*Math.cos(angle),
    crystal.y+crystalH*Math.sin(angle),
    crystal.z+axis.z*long+cross.z*crystalW*Math.cos(angle)
  ];
  for(let long=-crystalL/2;long<crystalL/2;long+=3.5){
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,b=(i+1)*Math.PI/6;
      beam(crystalPoint(long,a),crystalPoint(long,b),.128,canopy);
      if(long+3.5<=crystalL/2) beam(crystalPoint(long,a),crystalPoint(long+3.5,b),.075,silver);
    }
  }
  for(const side of [-1,1]) beam(crystalPoint(-crystalL/2,side*.32+.78),crystalPoint(crystalL/2,side*.32+.78),.19,warm);
  for(const [x,z] of [[283,101],[301,99],[326,115],[259,92]]){
    box(11.8,.28,7.6,garden,x,levels.rafflesPodium+.14,z);
  }
  routeSign('重庆来福士','朝天扬帆 · 水晶连廊',333,3.5,187,1.05);
  panel('朝天门广场',310,5.5,206.5,3.9,.8,{bg:'#285264',subtitle:'两江交汇 · 来福士'});
  for(const x of [303.5,311.4]) box(.10,2.1,.10,steel,x,4.53,206.40);
  const squareRing=[[286,184],[299,177],[323,173],[344,184],[338,200],[322,211],[308,207]];
  solid(squareRing,.5,3.0,tile,embankment);
  district.terrain(squareRing,3.5);
  for(let i=0;i<9;i++) box(26,.017,.034,embankment,318,3.514,182+i*2.3);
  for(const [x,z,w] of [[298,183,6],[336,188,6.5],[324,205,5]]){
    box(w,.53,2.4,promenade,x,3.765,z);
    box(w-.34,.055,2.04,garden,x,4.051,z);
    box(w-.55,.09,.30,amber,x,4.11,z-1.2);
  }
  const lamps=[[290,188],[299,204],[314,207],[335,201],[341,188]];
  for(const [x,z] of lamps) {
    box(.76,.23,.76,embankment,x,3.58,z);
    box(.14,4.3,.14,steel,x,5.68,z);
    box(.49,.125,.48,warm,x,7.89,z);
  }
  for(const [a,b] of [[310,6],[320,8],[330,5]]) {
    box(b,.031,.14,amber,a,3.526,196.3);
  }
  const upperSquare=[[293,174],[330,159],[346,168],[340,183],[317,194],[298,188]];
  // Cut the two stair mouths into the upper slab, so the ascent never passes through its fascia.
  const upperSlab=[[346,168],[330,159],[293,174],[297.975,187.929],[299.858,183.625],[306.142,186.375],[304.529,190.062],[317,194],[319.684,192.716],[316.515,184.794],[325.485,181.206],[328.418,188.539],[340,183]];
  solid(upperSlab,7.7,1.4,tile,embankment);
  district.terrain(upperSquare,9.1);
  function squareStairs(from,to,width) {
    district.path([from,to],width-.20,true);
    const [x,y,z]=from,[nx,ny,nz]=to;
    const run=Math.hypot(nx-x,nz-z);
    const angle=Math.atan2(z-nz,nx-x);
    const count=Math.max(1,Math.ceil(Math.abs(ny-y)/(.175*UNIT)));
    for(let i=0;i<count;i++){
      const t=(i+.5)/count;
      const py=THREE.MathUtils.lerp(y,ny,t);
      const px=THREE.MathUtils.lerp(x,nx,t),pz=THREE.MathUtils.lerp(z,nz,t);
      box(run/count+.005,.065,width,promenade,px,py-.0325,pz,angle);
      if(i%5===0) box(.036,.025,width-.27,tile,px,py+.014,pz,angle);
    }
    for(const side of [-1,1]){
      const shift=(width/2-.17)*side;
      const dx=Math.sin(angle)*shift,dz=Math.cos(angle)*shift;
      beam([x+dx,y+.39,z+dz],[nx+dx,ny+.39,nz+dz],.066,silver);
      for(let i=0;i<=count;i+=5){
        const t=i/count;
        box(.025,.39,.025,steel,THREE.MathUtils.lerp(x,nx,t)+dx,THREE.MathUtils.lerp(y,ny,t)+.195,THREE.MathUtils.lerp(z,nz,t)+dz);
      }
    }
  }
  squareStairs([327,3.5,198],[321,9.1,183],9.5);
  squareStairs([303,9.1,185],[296,3.5,201],6.7);
  routeSign('朝天门广场','大梯道 · 古渝雄关 · 两江交汇',318,9.1,182,0);
  function stoneGate(x,y,z) {
    const stone=mat('#877b79'), joints=mat('#5b5861');
    for(const [offset,r] of [[-6.0,1.07],[0,2.0],[6.0,1.07]]){
      const height=2.95-r*.20;
      for(const side of [-1,1]) for(let row=0;row<5;row++){
        box(.53,.45,1.25,row%2===0 ? stone : tile,x+offset+side*(r+.21),y+.25+row*.46,z);
      }
      for(let k=0;k<=10;k++){
        const angle=k*Math.PI/10;
        const wedge=box(.53,.35,1.31,k%3===0 ? joints : stone,
          x+offset+Math.cos(angle)*r,y+height+Math.sin(angle)*r,z);
        wedge.rotation.z=angle-Math.PI/2;
      }
      box(2*r+.63,.31,1.52,stone,x+offset,y+height+r+.37,z);
    }
    panel('古渝雄关',x,y+5.3,z+.77,4,.75,{bg:'#514544',fg:'#f0d6a0'});
  }
  stoneGate(318,3.5,185);
  squareStairs([290,3.5,192],[290,1.36,222],4.1);
  ribbon([[290,1.36,222],[283,1.31,232],[274,1.31,236]],5.85,slate,.64);
  routeSign('朝天门码头','临江梯道 · 返回朝天门广场',289,1.36,223,1.15);
  for(const [x,z,width] of [[278,238,14],[296,228,17]]){
    box(width,.72,4.2,embankment,x,.48,z,-.25);
    box(width*.83,1.82,3.5,rafRoof,x,1.48,z,-.25);
    box(width*.83,.18,3.8,canopy,x,2.48,z,-.25);
    for(let offset=-width*.3;offset<=width*.3;offset+=1.2) {
      box(.75,.65,.09,facadeGlass,x+offset,1.69,z+1.66+offset*.25,-.25);
    }
  }

  const theatre=mat('#4c807e',{emissive:'#2c5a56',emissiveIntensity:.34});
  const theatreBase=terrainHeight(84,303);
  // 64 m is the maximum fly-tower roof, not the height of every glass wing.
  for(const [x,z,w,d,h,turn] of [[78,299,68,24,31*UNIT,.025],[98,304,31,24,40*UNIT,-.17],[66,296,29,25,64*UNIT,.18]]) {
    box(w,h,d,theatre,x,theatreBase+h/2,z,turn);
    box(w+.31,.12,d+.32,rafRoof,x,theatreBase+h,z,turn);
    district.block(x,z,w,d,theatreBase,theatreBase+h);
  }
  panel('重庆大剧院',87,theatreBase+2.1,286.8,8,1.2,{bg:'#275750',angle:Math.PI});

  buildCity({put,mat,district,tex,scene});
  buildLifts({box,put,mat,beam,panel,district});
  buildNightDetails({box,put,mat,beam,panel,tex,TICK,NOINK});
  const treeGeo=new THREE.IcosahedronGeometry(1,1);
  for(const [x,z] of [[146,215],[150,250],[151,310],[104,405],[65,516],[32,589],[-4,625],[-56,690],[-77,752],
    [-111,835],[218,106],[262,156],[285,179],[332,191],[352,139],[540,174],[496,279],[302,497],[177,723]]){
    const y=shores.some(([poly])=>contains(poly,x,z)) ? terrainHeight(x,z) : undefined;
    if(y===undefined)continue;
    box(.23,2.3,.22,steel,x,y+1.15,z);
    put(new THREE.Mesh(treeGeo,green),x,y+3,z).scale.set(1.75,2.15,1.7);
  }
}
