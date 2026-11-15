import * as THREE from 'three';
import { buildDistrict } from './district.js';
import { buildFrontages } from './frontages.js';
import { buildRivers } from './rivers.js';
import { qiansimenX } from './geography.js';
import { lowerQuay } from './river-route.js';
import { buildTransport } from './transport.js';
import { coreHeight, CORE_SLOPE, UNIT } from '../data/site-survey.js';
import { calibratedDistrict, calibrateCoreObjects } from './elevation-model.js';

export function buildChongqing({ scene, box, mat, tex, put, rnd, TICK, NOINK, GLOW, LOOP, district:worldDistrict }) {
  const district=calibratedDistrict(worldDistrict);
  const before=new Set(scene.children);
  const wood = mat('#713837');
  const darkWood = mat('#342a3d');
  const infill = mat('#b7a17e');
  const stone = mat('#49475b');
  const cliff = ['#3b3b50','#4c485b','#585064','#534a53'].map(color => mat(color));
  const leaf = ['#263f4a','#304e53','#38535b'].map(color => mat(color));
  const roof = mat('#302738');
  const gold = mat('#ffb353', { emissive:'#ff972f', emissiveIntensity:1.75 });
  const amber = mat('#ffe5a0', { emissive:'#ffc45d', emissiveIntensity:1.85 });
  const red = mat('#b42844', { emissive:'#740d29', emissiveIntensity:.48 });
  const redLight = mat('#e43759', { emissive:'#e52b48', emissiveIntensity:1.6 });
  const road = mat('#333845');
  const river = mat('#192d49', { emissive:'#101b34', emissiveIntensity:.42 });
  const line = mat('#b4aaa6');
  const windows = [
    mat('#4e393d'), mat('#9b583c', {emissive:'#ff7f32',emissiveIntensity:.58}),
    mat('#e69952', {emissive:'#ffab45',emissiveIntensity:1.12})
  ];

  function beam(a, b, thickness, material, depth = thickness) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const center = start.clone().lerp(end, .5);
    const mesh = box(thickness, start.distanceTo(end), depth, material, ...center.toArray());
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), end.sub(start).normalize());
    return mesh;
  }

  function panel(text, x, y, z, width, height, { bg='#682b3b', fg='#ffdf9b', vertical=false, angle=0, subtitle='' } = {}) {
    const texture = tex(vertical ? 128 : 512, vertical ? 384 : 128, (ctx,w,h) => {
      ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);
      ctx.strokeStyle=fg; ctx.lineWidth=3; ctx.strokeRect(8,8,w-16,h-16);
      ctx.strokeStyle=fg+'70'; ctx.lineWidth=1; ctx.strokeRect(14,14,w-28,h-28);
      ctx.fillStyle=fg; ctx.textAlign='center'; ctx.textBaseline='middle';
      if (vertical) {
        ctx.font='bold 64px "PingFang SC","Microsoft YaHei",sans-serif';
        [...text].forEach((glyph,i) => ctx.fillText(glyph,w/2,h*(i+.5)/text.length, w-35));
      } else {
        ctx.font='bold 68px "PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillText(text,w/2,subtitle ? h*.40 : h/2,w-55);
        if(subtitle){
          ctx.font='600 25px "PingFang SC","Microsoft YaHei",sans-serif';
          ctx.fillText(subtitle,w/2,h*.77,w-58);
        }
      }
    });
    const mesh = put(new THREE.Mesh(new THREE.PlaneGeometry(width,height),
      new THREE.MeshBasicMaterial({ map:texture, side:THREE.DoubleSide })),x,y,z,0,angle);
    mesh.castShadow = false;
    return mesh;
  }
  const frontages=buildFrontages({box,mat,put,panel,tex});

  function pitchedRoof(x,y,z,w,d, tiled = false) {
    const eave = .26, ridge = d*.24;
    const points = [
      [-w/2,eave,d/2], [0,-.25,d/2], [w/2,eave,d/2],
      [w*.36,ridge,0], [0,ridge+.14,0], [-w*.36,ridge,0],
      [-w/2,eave,-d/2], [0,-.25,-d/2], [w/2,eave,-d/2]
    ].map(([a,b,c])=>[x+a,y+b,z+c]);
    const triangles = [0,1,4,0,4,5,1,2,3,1,3,4,5,4,7,5,7,6,4,3,8,4,8,7,0,5,6,2,8,3];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(triangles.flatMap(i=>points[i]),3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(triangles.flatMap(i=>[points[i][0], points[i][2]]),2));
    geometry.computeVertexNormals();
    put(new THREE.Mesh(geometry,tiled ? mat('#423448',{side:THREE.DoubleSide}) : roof),0,0,0);
    for (const [a,b] of [[0,1],[1,2],[0,5],[5,4],[4,3],[3,2],[5,6],[3,8]]) {
      beam(points[a],points[b],.13,gold);
    }
    if (!tiled) return;
    const ribs = mat('#514056');
    for (const [low, middle, right, highLeft, highMiddle, highRight] of [[0,1,2,5,4,3],[6,7,8,5,4,3]]) {
      const intervals = Math.ceil(w / 1.18);
      for (let i=1;i<intervals;i++) {
        const u=i/intervals, t=(u*2)%1;
        const [a,b,c,e] = u < .5 ? [low,middle,highLeft,highMiddle] : [middle,right,highMiddle,highRight];
        const lerp = (start,end) => points[start].map((v,k)=>THREE.MathUtils.lerp(v,points[end][k],t));
        const foot=lerp(a,b), ridge=lerp(c,e);
        foot[1]+=.07;
        ridge[1]+=.07;
        beam(foot,ridge,.085,ribs);
      }
    }
  }
  roof.side = THREE.DoubleSide;

  function gallery(x, base, front, width, depth, height, hasRoof = true, detailedRoof = false) {
    const z=front-depth/2;
    box(width,.42,depth+.85,stone,x,base+.21,z+.36);
    box(width-.32,height-.43,depth-.45,infill,x,base+height*.51,z-.16);
    for(const level of [.16,.86])box(width-.15,.13,.11,darkWood,x,base+height*level,front-.18);
    district.block(x,z-.16,width-.32,depth-.45,base+.29,base+height);
    const bays=Math.max(2,Math.round(width/2.2));
    const bay=width/bays;
    for(let i=0;i<=bays;i++){
      const px=x-width/2+i*bay;
      box(.21,height,.29,darkWood,px,base+height/2,front+.04);
      box(.09,height*.82,.07,gold,px+.11,base+height/2,front+.2);
      if(i===bays) continue;
      const wx=px+bay*.5;
      box(bay*.73,height*.57,.08,windows[Math.floor(rnd()*3)],wx,base+height*.56,front-.25);
      for(const frac of [-.22,0,.22]) box(.055,height*.56,.055,darkWood,wx+bay*frac,base+height*.56,front-.18);
      box(bay*.72,.07,.055,darkWood,wx,base+height*.61,front-.17);
      box(bay*.98,.35,.13,wood,wx,base+.61,front+.45);
    }
    for (const side of [-1,1]) {
      const sideX=x+side*(width/2-.07);
      for(let p=1;p<depth-.9;p+=1.6){
        box(.11,height*.56,1.04,windows[Math.floor(rnd()*3)],sideX,base+height*.56,front-p);
        box(.16,height,.16,darkWood,sideX+side*.05,base+height*.5,front-p+.6);
      }
    }
    box(width+.2,.13,.14,gold,x,base+.39,front+.47);
    if(hasRoof) pitchedRoof(x,base+height,front-depth*.5,width+1,depth+1.55,detailedRoof);
    else box(width+.46,.32,depth+.7,darkWood,x,base+height,front-depth*.5);
  }

  // From the river: Dai Jia Xiang is on the left, Hongyadong is layered into the
  // middle of the escarpment, and Qiansimen crosses out from its eastern side.
  box(5400,.6,10000,river,0,-.32,0).userData.worldElevation=true;
  box(350,11,177,stone,0,4,-87);
  box(333,28,160,cliff[0],-2.5,12,-97);
  box(333,.12,160,mat('#454653'),-2.5,26,-97);
  box(71,1.6,4.75,stone,-1,1.3,4.6);
  district.path([[-35,2.1,4.7],[33,2.1,4.7]],4.5);
  for(let i=0;i<75;i++){
    const x=-155+i*4.1;
    const behindHongya = x > -33 && x < 33;
    const front = (behindHongya ? -25 : -10) + 3.2*Math.sin(i*.2) + 3.1*Math.cos(i*.61);
    const high = 22 + 7*rnd()+3*Math.sin(i*.33);
    const geometry = new THREE.DodecahedronGeometry(1,0);
    const rock = put(new THREE.Mesh(geometry,cliff[i%cliff.length]),x,high*.4,front);
    rock.scale.set(7+rnd()*6,high*.83,6+rnd()*5);
    rock.rotation.set(.18*rnd(),rnd()*3,.5*(rnd()-.5));
  }
  box(302,1.8,11,stone,-2,1.02,9);
  box(302,.2,7.4,road,-2,2,9.8);
  box(302,.2,1.4,stone,-2,2.18,14.15);
  box(302,.22,.22,line,-2,2.28,14.9);
  district.path([[137,2.28,14.15],[140,2.28,14.15],[140,2.12,12]],1.55);

  panel('洪崖洞',54,4.61,20.6,2.8,.60,{bg:'#245469',subtitle:'嘉滨路 · 沿江步道'});
  for(let x=-143;x<146;x+=5.7){
    box(2.1,.022,.105,line,x,2.112,9.7);
    if(Math.abs(x-17)>.95)box(.095,.88,.095,darkWood,x,2.62,14.91);
  }
  for(const [a,b] of [[-150,16.25],[17.75,150]])box(b-a,.085,.09,darkWood,(a+b)/2,3.04,14.91);

  const hongya = [
    { x:-2,w:51,start:4,count:3,front:4.2,depth:10 },
    { x:-5,w:36,start:13.6,count:3,front:1.6,depth:12 },
    { x:12,w:23,start:13.6,count:4,front:-1.5,depth:13 },
    { x:-12,w:17,start:23.2,count:3,front:-2.5,depth:12 },
    { x:6,w:22,start:26.4,count:3,front:-5.5,depth:11 },
    { x:23,w:11,start:26.4,count:3,front:-8.2,depth:11 },
    { x:-26,w:10,start:8,count:2,front:0,depth:8 }
  ];
  for(const block of hongya){
    for(let floor=0;floor<block.count;floor++){
      gallery(block.x,block.start+floor*3.2,block.front-floor*.22,block.w,block.depth,3.2,
        floor===block.count-1||floor%2===1, floor===block.count-1);
    }
  }
  for(const [x,z,base] of [[-11,-6,32.8],[9,-9,36],[23,-10,36]]){
    gallery(x,base,z,7.2,6.1,2.8);
    pitchedRoof(x,base+4,z-2.6,5.5,5);
  }
  for(let x=-24;x<28;x+=2.4) {
    const z = x > 15 ? .5 : 3.1;
    box(.2,1.65,.23,darkWood,x,2.75,z);
    box(.12,.39,.13,amber,x,3.6,z);
  }
  for(let i=0;i<17;i++){
    const x=-25+i*3;
    box(.43,3.4,.45,darkWood,x,2.5,3.8);
    beam([x-.5,.9,4],[x+.8,4.1,-.8],.19,wood);
  }

  panel('洪崖洞',-3,17.5,3.5,11.5,2.72,{bg:'#632739',subtitle:'重庆 · 洪崖洞民俗风貌区'});
  panel('天成巷',24,19.8,.38,1.85,6,{vertical:true,bg:'#792939'});
  panel('纸盐河巷',-21,8.88,4.59,4.4,.65,{bg:'#632739'});
  // Public identification and unlettered timber openings; no unverified chain-store names.
  for(const [x,w,title,subtitle] of [
    [-19,4.2,'游船售票中心','洪崖洞 · 两江游'],[-10,6.3,'游客接待中心','洪崖洞 1F'],
    [3.8,5.5,'洪崖洞民俗风貌区','嘉陵江滨江路 88 号'],[12,3.1,'',''],[18.2,5.4,'','']
  ])frontages.storefront(frontages.face([x+w/2,4.08],[x-w/2,4.08],2.1),'hongya',title,subtitle);
  for(const [x,w,title] of [[-17,3.2,'纸盐河巷'],[-10.8,5.3,''],[-3.8,3.9,''],[3.2,5.4,'']]){
    frontages.storefront(frontages.face([x+w/2,4.31],[x-w/2,4.31],7.57),'hongya',title);
  }
  // 2025 municipal archive photo: one orange-red 徐鼎盛 group at the right lower gallery.
  // Stone arch, a side-hung vertical plaque and a broad glazed bay are distinct from timber shops.
  const archStone=mat('#777566'), archDark=mat('#393b37');
  const shopX=13.8,shopY=7.57,shopZ=4.40;
  box(7.4,3.8,.14,archDark,shopX,shopY+1.85,shopZ);
  for(const x of [shopX-2.5,shopX-.6,shopX+1.3,shopX+3.2]){
    box(1.65,2.35,.09,windows[1],x,shopY+1.19,shopZ+.10);
    for(const d of [-.78,0,.78])box(.045,2.39,.10,darkWood,x+d,shopY+1.18,shopZ+.17);
    box(1.65,.065,.18,archStone,x,shopY+.07,shopZ+.19);
  }
  for(const x of [shopX-3.9,shopX-1.2])box(.32,2.15,.33,archStone,x,shopY+1.05,shopZ+.24);
  const archMesh=put(new THREE.Mesh(new THREE.TorusGeometry(1.35,.17,6,24,Math.PI),archStone),shopX-2.55,shopY+2.02,shopZ+.25);
  archMesh.scale.y=.76;
  for(let i=0;i<9;i++){
    const a=i/8*Math.PI;
    box(.055,.28,.36,archDark,shopX-2.55+Math.cos(a)*1.35,shopY+2.02+Math.sin(a)*1.02,shopZ+.25,0,0,a-Math.PI/2);
  }
  panel('徐鼎盛',shopX+1.25,shopY+2.48,shopZ+.38,4.25,.42,{bg:'#3f211b',fg:'#ff641e',subtitle:'煎蒸'});
  panel('徐鼎盛',shopX-4.25,shopY+1.72,shopZ+.37,.66,1.95,{vertical:true,bg:'#51241b',fg:'#ffa12d'});
  for(let x=shopX-3.3;x<shopX+3.5;x+=.85){
    box(.025,.25,.025,darkWood,x,shopY+3.77,shopZ+.68);
    const lantern=put(new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),redLight),x,shopY+3.53,shopZ+.68);lantern.scale.y=1.23;
    box(.055,.16,.055,amber,x,shopY+3.26,shopZ+.68);
  }
  panel('嘉滨路',-8,4.22,13.1,2.65,.63,{bg:'#245469',fg:'#eef2e5',subtitle:'JIALINGJIANG BINJIANG LU'});
  box(.105,2.35,.105,darkWood,-8,3.26,13.04);
  panel('洪崖洞',-9,29.22,-29.97,6.2,1.22,{bg:'#562d33',subtitle:'沧白路入口 · 11F',angle:Math.PI});
  for(const x of [-12.45,-5.55]) {
    box(.44,3.8,.55,wood,x,27.96,-29.4);
    box(.67,.25,.68,stone,x,26.28,-29.4);
  }
  box(7.34,.15,2.31,stone,-9,26.04,-30.12);
  box(6.6,2.95,.29,darkWood,-9,27.59,-28.09);
  for(const x of [-10.7,-9,-7.3]){
    box(1.40,2.18,.055,windows[1],x,27.30,-28.258);
    for(const offset of [-.43,0,.43]) box(.06,2.15,.071,wood,x+offset,27.30,-28.30);
    for(const y of [26.63,27.84,28.35]) box(1.36,.07,.1,wood,x,y,-28.3);
  }
  pitchedRoof(-9,29.83,-29.38,8.3,3.55,true);
  panel('沧白路',-12,28.3,-35.2,2.8,.64,{bg:'#245469',fg:'#eef2e5',subtitle:'CANGBAI LU'});
  box(.104,2.75,.102,darkWood,-12,27.4,-35.24);

  // Cliff walk and stair flights. Each landing alternates direction.
  const walk = [[-72,24,-9],[-69,24,-7],[-68,24,-2.6],[-65.8,24,-1.5],[-48,24,-1.5],[-45,24,-3],
    [-62,19,2],[-41,19,5],[-62,13,8],[-45,13,10],[-56,6,13],[-36,6,13]];
  const upperLink = [[-74,26.06,-40],[-69,26.06,-39],[-69,26.06,-33.2],[-70.1,26.06,-30],
    [-70.6,26.06,-22],[-72,26.06,-18],[-72,24,-9]];
  const lowerLink = [[-36,6,13],[-30,5,12],[-28,2.12,9]];
  const hongyaLink = [[31,2.12,6],[34,7,2],[31,13,-1],[35,18.5,-4],[32,24,-8],[36,26.06,-20]];
  function stairs(route) {
    district.path(route.map(([x,y,z])=>[x,y+.24,z]),1.02);
    for(let i=1;i<route.length;i++){
    const a=route[i-1], b=route[i];
    const yaw=Math.atan2(-(b[2]-a[2]),b[0]-a[0]);
    const run=Math.hypot(b[0]-a[0],b[2]-a[2]);
    const count=Math.abs(a[1]-b[1])>0 ? Math.max(1,Math.ceil(Math.abs(a[1]-b[1])*CORE_SLOPE/(.175*UNIT))) : 1;
    for(let step=0;step<count;step++){
      const t=(step+.5)/count;
      box(run/count+.012,.08,1.05,stone,
        THREE.MathUtils.lerp(a[0],b[0],t),THREE.MathUtils.lerp(a[1],b[1],t)+.20,THREE.MathUtils.lerp(a[2],b[2],t),yaw);
    }
    for(let t=.13;t<.99;t+=.24) {
      const x=THREE.MathUtils.lerp(a[0],b[0],t), y=THREE.MathUtils.lerp(a[1],b[1],t);
      const z=THREE.MathUtils.lerp(a[2],b[2],t);
      const bottom=Math.max(2,y-8);
      box(.19,y-bottom,.21,darkWood,x,(y+bottom)/2,z+1.06);
      beam([x,bottom,z+1.05],[x,y-.32,z-2.6],.13,wood);
    }
    beam([a[0],a[1]+.9,a[2]+.49],[b[0],b[1]+.9,b[2]+.49],.12,gold);
    beam([a[0],a[1]+.38,a[2]+.49],[b[0],b[1]+.38,b[2]+.49],.16,wood);
    for(let step=0;step<=run;step+=1.7){
      const t=step/run;
      box(.055,.66,.055,darkWood, THREE.MathUtils.lerp(a[0],b[0],t),THREE.MathUtils.lerp(a[1],b[1],t)+.57,THREE.MathUtils.lerp(a[2],b[2],t)+.49);
    }
    }
  }
  for (const route of [walk, upperLink, lowerLink, hongyaLink]) stairs(route);
  // Public galleries that branch off the east-side stairs.
  const promenades = [
    {y:7.57,x0:-23,x1:34,z:5.90,accessZ:2.10},
    {y:19.13,x0:-19,x1:35,z:4.05,accessZ:-4.04}
  ];
  for(const {y,x0,x1,z,accessZ} of promenades) {
    const width=x1-x0, mid=(x0+x1)/2, outer=z+.995;
    box(width,.28,2.1,stone,mid,y-.14,z);
    box(width,.11,.13,gold,mid,y+.92,outer);
    for(let x=x0+.25;x<x1;x+=2.08) {
      box(.10,.92,.10,darkWood,x,y+.46,outer);
      box(.13,.38,.13,wood,x+.28,y+.19,outer);
    }
    district.path([[x0,y,z],[x1,y,z],[x1,y,accessZ]],1.75);
    box(1.75,.28,Math.abs(z-accessZ)+.08,stone,x1,y-.14,(z+accessZ)/2);
    for(let x=x0+1.1;x<x1-4;x+=7.9) {
      const support=3.3;
      beam([x,y-support,z-2.4],[x,y-.19,z+.58],.16,darkWood);
    }
  }
  gallery(-58,24,-2.5,13,8,3.5,true,true);
  gallery(-58,27.5,-4.5,10,7.5,3.2,true,true);
  gallery(-80,26,-8,9,9,3.6,true,true);
  panel('戴家巷',-58,26.5,-1.95,8,2.05,{bg:'#295b5d'});
  panel('崖壁步道',-43,19.65,6.7,5.4,1.05,{bg:'#323945'});

  // A projecting terrace on the west side of the cliff walk gives the camera
  // a close layer to pass before it lifts toward Hongyadong.
  const terrace = [
    { x:-92, front:42, width:20, base:16, depth:11 },
    { x:-79, front:31, width:19, base:17.8, depth:11 },
    { x:-72, front:20, width:12, base:20, depth:10 }
  ];
  for (const {x,front,width,base,depth} of terrace) {
    const z=front-depth/2;
    const rock=put(new THREE.Mesh(new THREE.DodecahedronGeometry(1,0),cliff[1]),x-3,base*.41,z-4,0,.26,.12);
    rock.scale.set(width*.72,base*.72,depth*1.58);
    gallery(x,base,front,width,depth,3.5,false);
    pitchedRoof(x,base+3.5,z,width+2.8,depth+3.4,true);
    box(width+1.25,.26,1.8,wood,x,base+.28,front+.6);
    for(let offset=-width/2+1.3;offset<width/2;offset+=2.8) {
      const px=x+offset;
      box(.17,1.6,.20,darkWood,px,base+3,front+.82);
      box(.46,.61,.45,amber,px,base+2.35,front+.82);
      box(.50,.09,.49,wood,px,base+2.68,front+.82);
      box(.50,.09,.49,wood,px,base+2.02,front+.82);
    }
  }
  panel('戴家巷',-80,20.38,31.13,7.8,1.82,{bg:'#34545f',fg:'#ffd8a2'});

  const treeG=new THREE.IcosahedronGeometry(1,1);
  for(let i=0;i<92;i++){
    const x=-151+rnd()*302;
    const onCliff=x<-30 || x>31;
    const z=onCliff ? -24+rnd()*38 : -25-rnd()*10;
    const y=onCliff ? (z>5 ? 4 : 12)+rnd()*10 : 28+rnd()*6;
    const s=.85+rnd()*2.3;
    const rotation=rnd()*3;
    if(z < -17) continue;
    box(.2,2,.2,darkWood,x,y-.4,z);
    put(new THREE.Mesh(treeG,leaf[i%3]),x,y+.9,z,0,rotation).scale.set(s,s*1.22,s*.9);
  }

  // Concrete pylons and cable fan. Longitudinal axis turns out across the water.
  const bx = qiansimenX;
  const bridgeDeck = 27;
  const bridgeWidth = 7.8;
  const start = 0, end = 306;
  const bridgeAngle = Math.atan(-.40226658);
  const redSteel = mat('#612f49');
  district.path([[bx(start),bridgeDeck+.25,start],[bx(286),bridgeDeck+.25,286]],bridgeWidth-.15);
  for(let z=start+2;z<end;z+=4){
    box(bridgeWidth,.5,4.24,road,bx(z),bridgeDeck,z,bridgeAngle);
    for(const side of [-1,1]){
      const px=bx(z)+side*3.8;
      box(.24,.35,4.2,redLight,px,bridgeDeck-.33,z,bridgeAngle);
      box(.27,.2,4.2,red,px,bridgeDeck-3,z,bridgeAngle);
      beam([px,bridgeDeck-.52,z-2],[px-1.612,bridgeDeck-2.92,z+2],.22,red);
      beam([px,bridgeDeck-.52,z+2],[px+1.612,bridgeDeck-2.92,z-2],.15,redSteel);
      box(.13,.12,4.24,gold,px,bridgeDeck+.5,z,bridgeAngle);
    }
  }
  for (const pylonZ of [64,204]) {
  const towerX=bx(pylonZ);
  for(const side of [-1,1]){
    beam([towerX+side*5.2,-1,pylonZ],[towerX+side*4.55,bridgeDeck-1,pylonZ],2.5,stone,3.5);
    beam([towerX+side*4.55,bridgeDeck-1,pylonZ],[towerX+side*.86,59,pylonZ],2.1,red,2.5);
    beam([towerX+side*4.6,bridgeDeck,pylonZ+1.32],[towerX+side*.89,59,pylonZ+1.32],.17,redLight);
    for(const dir of [-1,1]){
      for(let i=0;i<10;i++){
        const z=pylonZ+dir*(8+i*7);
        beam([towerX+side*(1.1+i*.085),58-i*.51,pylonZ],
          [bx(z)+side*3.5,bridgeDeck+.65,z],.076,redLight);
      }
    }
  }
  box(2.9,2.2,2.75,red,towerX,59,pylonZ);
  box(2.85,.2,2.67,amber,towerX,60.2,pylonZ);
  }
  for(const z of [12,138,264]){
    for(const side of [-1,1])box(1.05,26,1.4,stone,bx(z)+side*3.45,13,z);
    box(8.25,.6,2.0,stone,bx(z),26.1,z);
  }
  // The approach joins the upper street above the riverfront level.
  const approach = [[39,26.10,-40],[39,26.37,-38.5],[38.5,26.52,-37.5],[37.5,26.73,-36.4],
    [36.5,26.93,-35.5],[35,27.25,-35],[35,27.25,-32],[33.5,27.25,-29.8],
    [33.7,27.25,-26],[33,27.25,-24],[33,27.25,-10.5],[34.5,27.25,-9.5],[36,27.25,-8.9],[36,27.25,-.2],[bx(start),27.25,-.2],[bx(start),27.25,start]];
  district.path(approach,1.7);
  for (let i=1;i<approach.length;i++) {
    const [x,y,z]=approach[i-1], [nx,ny,nz]=approach[i];
    const run=Math.hypot(nx-x,nz-z);
    box(run+.12,.35,1.82,road,(x+nx)/2,(y+ny)/2-.15,(z+nz)/2,Math.atan2(z-nz,nx-x));
    if(z>-18) {
      beam([x-.93,y+.87,z],[nx-.93,ny+.87,nz],.09,redLight);
      box(.09,.9,.12,red,x-.9,y+.42,z);
    }
  }
  const coreObjects=scene.children.filter(o=>!before.has(o));
  calibrateCoreObjects(coreObjects);
  buildDistrict({mat,box,put,tex,beam,panel,district:worldDistrict,frontages});
  buildRivers({mat,box,put,beam,panel,district:worldDistrict,tex,TICK,NOINK,GLOW,scene});
  const afterWorld=new Set(scene.children);

  for(let x=-132;x<135;x+=6.4){
    box(.11,3.6,.11,darkWood,x,3.96,13.7);
    box(.45,.11,.37,amber,x-.18,5.63,13.7);
  }
  function movingGroup(x,y,z){
    const group=new THREE.Group();
    group.position.set(x,y,z); group.userData.noMerge=true; scene.add(group);
    return group;
  }
  function attach(group,w,h,d,m,x,y,z){
    const mesh=box(w,h,d,m,x,y,z);
    group.add(mesh);
    return mesh;
  }
  const boat=movingGroup(-13,.25,34);boat.userData.worldElevation=true;
  attach(boat,7.8,.48,2.3,darkWood,0,.48,0);
  attach(boat,6.8,.85,1.9,wood,0,1,0);
  attach(boat,6.2,.28,2.05,roof,0,1.58,0);
  for(let i=0;i<8;i++) attach(boat,.42,.45,.07,amber,i*.68-2.3,1.1,1);
  attach(boat,6.1,.1,.07,gold,0,1.5,1.05);
  attach(boat,7.4,.10,2.4,gold,0,.76,0);
  TICK.push(ms=>{
    const t=ms/LOOP;
    boat.position.x=-18+9*Math.sin(t*Math.PI*2);
    boat.position.z=49+3*Math.cos(t*Math.PI*2);
    boat.position.y=.12+.08*Math.sin(t*Math.PI*4);
  });

  // The upstream wet-surface pass handles ripples and reflectivity. Warm
  // streaks under the complex help its lamps read in the wide river view.
  const ripple = ['#ad613c','#ca823e','#7e5367','#a83856'].map(color =>
    new THREE.MeshBasicMaterial({color,transparent:true,opacity:.26,depthWrite:false}));
  for(let i=0;i<84;i++){
    const z=16+rnd()*76;
    const x=i%6===0 ? bx(z)+5*(rnd()-.5) : -10+(rnd()-.5)*(56+z*.56);
    const m=put(new THREE.Mesh(new THREE.PlaneGeometry(.23+rnd()*1.6,.1+rnd()*.48),ripple[i%4]),x,.015,z,-Math.PI/2);
    m.castShadow=false; m.receiveShadow=false; m.userData.noMerge=true;m.userData.worldElevation=true;
    NOINK.push(m); GLOW.push(m);
  }
  calibrateCoreObjects(scene.children.filter(o=>!afterWorld.has(o)));
  buildTransport({scene,box,put,mat,tex,beam,panel,district:worldDistrict,TICK,NOINK});
}
