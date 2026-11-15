import { coreHeight, EYE_HEIGHT } from '../data/site-survey.js';
import { coreGround } from './geography.js';
import { buildingSurvey } from '../data/building-survey.js';
import * as THREE from 'three';
import { buildings, streets } from '../data/hongyadong.js';
import { alleyBuildings } from './frontages.js';
import {waterfrontHeightOverrides} from '../data/waterfront-survey.js';

export const districtBounds = { west:-620, east:1070, inland:-490, bank:1410 };

export function createDistrict() {
  const surfaces = [];
  const obstacles = [];
  const land = [];
  const approaches = [];
  const transfers=[];

  function contains(ring, x, z) {
    let inside = false;
    for (let i=0, j=ring.length-1; i<ring.length; j=i++) {
      const [ax, az] = ring[i], [bx, bz] = ring[j];
      if ((az>z) !== (bz>z) && x < (bx-ax)*(z-az)/(bz-az)+ax) inside = !inside;
    }
    return inside;
  }
  function polygon(rings, base, top) {
    const xs=rings[0].map(p=>p[0]), zs=rings[0].map(p=>p[1]);
    obstacles.push({ rings, base, top, west:Math.min(...xs), east:Math.max(...xs), in:Math.min(...zs), out:Math.max(...zs) });
  }
  function block(x,z,w,d,base,top) {
    polygon([[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]]],base,top);
  }
  function path(points, width, aboveGround = false) {
    const radius=width/2;
    for (let i=1;i<points.length;i++) {
      const [x,y,z]=points[i-1], [bx,by,bz]=points[i];
      const dx=bx-x, dz=bz-z, length2=dx*dx+dz*dz;
      if (!length2) continue;
      const levelAt=(px,pz)=>{
        const projection=((px-x)*dx+(pz-z)*dz)/length2;
        const t=THREE.MathUtils.clamp(projection,0,1);
        const distance=(px-x-dx*t)**2+(pz-z-dz*t)**2;
        return distance<=radius**2 ? { height:THREE.MathUtils.lerp(y,by,t), distance } : null;
      };
      (aboveGround ? approaches : surfaces).push(levelAt);
    }
  }
  function floors(x,z) {
    const ramps=approaches.map(at=>at(x,z)).filter(Boolean);
    const hides=height=>ramps.some(ramp=>ramp.height>height+.035 && ramp.height<height+2.6);
    // Prefer the nearest connected path at bends; preserve separate elevator decks.
    const samples=[...surfaces.map(at=>at(x,z)).filter(Boolean),...ramps];
    const levels=samples.filter(a=>!samples.some(b=>b.distance+1e-7<a.distance && Math.abs(b.height-a.height)<.65 && Math.abs(b.height-a.height)>.025)).map(a=>a.height);
    const addGround=height=>{
      if(levels.some(level=>level>=height-.08 && level<=height+.32)) return;
      if(hides(height)) return;
      levels.push(height);
    };
    if (z<=-17 && z>=-177 && x>=-169 && x<=164) addGround(coreGround(x,z));
    if (z>=5 && z<=14.94 && x>=-151 && x<=147) addGround(coreHeight(z>13.45 ? 2.28 : 2.12));
    for (const [ring,height] of land) if (contains(ring,x,z)) addGround(typeof height==='function' ? height(x,z) : height);
    return levels;
  }
  function blocked(x,y,z,r=.33, flying=false) {
    if (flying && land.some(([ring,h])=>typeof h==='function' && contains(ring,x,z) && y<h(x,z)+.18)) return true;
    if (flying && (y<.38 || floors(x,z).some(h => y<h+.16 && y>=h-1.3) ||
      (z<-17 && z>=-177 && x>=-169 && x<=164 && y<coreHeight(26.13)))) return true;
    for (const obstacle of obstacles) {
      if (y < obstacle.base || y > obstacle.top || x+r < obstacle.west || x-r > obstacle.east || z+r < obstacle.in || z-r > obstacle.out) continue;
      for (const [dx,dz] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]]) {
        if (contains(obstacle.rings[0],x+dx,z+dz) && !obstacle.rings.slice(1).some(ring=>contains(ring,x+dx,z+dz))) return true;
      }
    }
    return false;
  }
  return { polygon, block, path, floors, blocked, transfers, transfer:t=>transfers.push(t), terrain:(ring,height)=>land.push([ring,height]) };
}

export function buildDistrict({ mat, box, put, tex, beam, panel, district, frontages }) {
  const wallColors=['#635763','#5b6276','#66505c','#5a5156','#525a70','#6d6262','#526477','#756964'];
  const residents=['#80634b','#ad824f','#9c795b','#b4784d','#b58a58','#926873','#94aebd'];
  const slab=mat('#494652');
  const pavement=mat('#51505a');
  const asphalt=mat('#343742');
  const line=mat('#84776d');
  const steel=mat('#2b3041');
  const gold=mat('#ffc688',{emissive:'#ff9f50',emissiveIntensity:.85});
  const modern=mat('#373b50');
  const red=['#702b3f','#8b3548','#ac4351','#7c344a'].map(color=>mat(color));
  const gloss=mat('#b23d49',{emissive:'#e33a48',emissiveIntensity:.48});
  const shopColors=['#6e473b','#433a5a','#346166','#9a613d'];
  const wallMaterial = wallColors.map((color,index)=>new THREE.MeshBasicMaterial({map:tex(96,96,(ctx,w,h)=>{
    ctx.fillStyle=color; ctx.fillRect(0,0,w,h);
    const high=index===6||index===7;
    ctx.fillStyle=high?'#242e48':'#313244';
    ctx.fillRect(17,19,62,49);
    if ((index%3)!==0) {
      ctx.fillStyle=residents[index];
      ctx.fillRect(20,22,56,43);
    }
    ctx.fillStyle='#323146';
    ctx.fillRect(47,19,3,49);
    ctx.fillRect(17,40,62,2);
    ctx.fillStyle='#938081';
    ctx.fillRect(14,68,68,2);
    if (!high) {
      ctx.fillStyle='#4f454d';
      ctx.fillRect(10,74,76,2);
      ctx.fillRect(10,79,76,2);
    }
  })}));
  const darkWindows=wallColors.map(color=>new THREE.MeshBasicMaterial({map:tex(64,64,(ctx,w,h)=>{
    ctx.fillStyle=color; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#313244'; ctx.fillRect(11,12,42,33);
    ctx.fillStyle='#504755'; ctx.fillRect(9,46,46,2);
    ctx.fillStyle='#5d5561'; ctx.fillRect(31,12,2,33);
  })}));

  function outline(path, ring) {
    ring.forEach(([x,z],index)=>index ? path.lineTo(x,-z) : path.moveTo(x,-z));
    path.closePath();
    return path;
  }
  function surface(rings,y,material) {
    const shape=outline(new THREE.Shape(),rings[0]);
    shape.holes=rings.slice(1).map(ring=>outline(new THREE.Path(),ring));
    put(new THREE.Mesh(new THREE.ShapeGeometry(shape),material),0,y,0,-Math.PI/2);
  }
  function wall(a,b,base,height,material,cells,floors) {
    const [x,z]=a, [bx,bz]=b;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute([x,base,z,bx,base,bz,bx,base+height,bz,x,base+height,z],3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,cells,0,cells,floors,0,floors],2));
    g.setIndex([0,1,2,0,2,3]); g.computeVertexNormals();
    material.side=THREE.DoubleSide;
    put(new THREE.Mesh(g,material),0,0,0);
  }
  function simpleRoof(ring,y,materials) {
    const xs=ring.map(p=>p[0]), zs=ring.map(p=>p[1]);
    const w=Math.max(...xs)-Math.min(...xs), d=Math.max(...zs)-Math.min(...zs);
    const x=(Math.max(...xs)+Math.min(...xs))/2, z=(Math.max(...zs)+Math.min(...zs))/2;
    box(w*.26,1.12,d*.29,materials,x,y+.58,z);
    box(w*.30,.14,d*.33,slab,x,y+1.2,z);
    if (w>10 && d>9) box(.06,2.3,.06,steel,x,y+2.25,z);
  }
  function oldStreetRoof(rings,y,id) {
    const ring=rings[0];
    const xs=ring.map(([x])=>x), zs=ring.map(([,z])=>z);
    const x=(Math.min(...xs)+Math.max(...xs))/2, z=(Math.min(...zs)+Math.max(...zs))/2;
    const w=Math.max(...xs)-Math.min(...xs), d=Math.max(...zs)-Math.min(...zs);
    for(const [index,point] of ring.entries()){
      const next=ring[(index+1)%ring.length];
      beam([point[0],y+.51,point[1]],[next[0],y+.51,next[1]],.17,slab);
    }
    if(w<3||d<3) return;
    const cover=mat('#42434d');
    const tile=mat('#5b5359');
    const shedW=w*.39, shedD=d*.42;
    const forward=id%2===0 ? 1 : -1;
    box(shedW,.89,shedD,slab,x,y+.445,z);
    for(const side of [-1,1]){
      const sideRoof=box(shedW+.45,.095,shedD*.60,cover,x,y+1.06,z+side*shedD*.27);
      sideRoof.rotateX(side*.24);
      for(let at=-shedW/2;at<=shedW/2;at+=.28) {
        const rib=box(.047,.053,shedD*.59,tile,x+at,y+1.115,z+side*shedD*.27);
        rib.rotateX(side*.24);
      }
    }
    box(shedW+.47,.13,.14,tile,x,y+1.30,z);
    box(.52,1.49,.57,pavement,x+w*.19*forward,y+.72,z-d*.12);
    box(.63,.09,.68,slab,x+w*.19*forward,y+1.48,z-d*.12);
  }
  function cathay(y) {
    const x=-56,z=-80, length=24;
    box(25,5,22,steel,x,y+2.5,z);
    for(let i=0;i<15;i++) {
      const offset=(i-7)*1.25, lift=5.2+(i%4)*.65;
      box(length+Math.abs(offset)*.25,.71,.76,red[i%4],x+.09*offset,y+lift,z+offset,.12);
      box(.70,.70,length*.82+Math.abs(offset)*.32,red[(i+2)%4],x+offset,y+lift+1.25,z-1,.12);
      box(.71,8.1,.76,red[i%4],x+offset,y+4.12,z+8+.15*offset,.12);
      if(i%3===0) box(.69,.10,3.3,gloss,x+offset,y+lift+1.6,z+7,.12);
    }
    panel('国泰艺术中心',x,y+2.25,z+11.08,8.3,1.18,{bg:'#4a3446'});
  }

  for(const [id,rings,oldHeight,kind,name] of buildings) {
    const ring=rings[0];
    const center=ring.reduce(([x,z],[px,pz])=>[x+px/ring.length,z+pz/ring.length],[0,0]);
    const [cx,cz]=center;
    const base=cz<-16 ? coreGround(cx,cz) : coreHeight(cz<2 ? 23.2 : 15.5);
    const surveyed=buildingSurvey[id];
    const revised=waterfrontHeightOverrides[id];
    const totalHeight=revised?.heightMeters ? revised.heightMeters*.35 : surveyed?.heightUnits ?? oldHeight;
    const height=id===412612156 ? Math.max(3,totalHeight-8.8) : totalHeight;
    const foundation = cz > -17 ? (cz > 13 ? -.4 : coreHeight(2.11)) : Math.min(base,...ring.map(([x,z])=>coreGround(x,z)))-.12;
    district.polygon(rings,foundation,base+height+1.3);
    const signature=id===412612156, tall=height>=27, floors=Math.max(2,(revised ? Math.round(height/1.155) : Number(surveyed?.levels))||Math.round(height/(tall?1.25:1.1)));
    const palette=(kind==='residential' ? id%6 : id)%wallMaterial.length;
    const detail=alleyBuildings[id];
    const clockwise=ring.reduce((sum,[x,z],i)=>{
      const [nx,nz]=ring[(i+1)%ring.length];
      return sum+x*nz-z*nx;
    },0)<0;
    surface(rings,base+height, tall ? modern : slab);
    ring.forEach((p,index)=>{
      const q=ring[(index+1)%ring.length], dist=Math.hypot(p[0]-q[0],p[1]-q[1]);
      if (dist<.06) return;
      if (foundation < base) wall(p,q,foundation,base-foundation,slab,1,1);
      const facade=(palette+index*3)%wallMaterial.length;
      const cells=Math.max(1,Math.round(dist/(tall?2.6:2.1)));
      if(detail){
        const material=frontages.materials[index===2&&id===809713527?'brick':detail.wall];
        wall(p,q,base,height,material,Math.max(1,dist/2.25),height/2.6);
        frontages.detailWall(frontages.face(p,q,base,clockwise?-1:1),floors,height,detail,index);
        beam([p[0],base+height+.13,p[1]],[q[0],base+height+.13,q[1]],.32,slab);
        return;
      }
      // Subdivide long faces so adjacent flats have different illuminated windows.
      for(let cell=0;cell<cells;cell++){
        const a=p.map((v,i)=>THREE.MathUtils.lerp(v,q[i],cell/cells));
        const b=p.map((v,i)=>THREE.MathUtils.lerp(v,q[i],(cell+1)/cells));
        const lit=(id*3+index*17+cell*13)%11<6;
        const material=signature ? red[index%red.length] : lit ? wallMaterial[(facade+cell%3)%8] : darkWindows[facade];
        wall(a,b,base,height,material,1,floors);
      }
      beam([p[0],base+height+.06,p[1]],[q[0],base+height+.06,q[1]],.23,slab);
      const dx=q[0]-p[0],dz=q[1]-p[1], yaw=Math.atan2(dx,dz)-Math.PI/2;
      if (!tall && dist>4 && cz<-16 && (index+id)%3===0) {
        const x=(p[0]+q[0])/2,z=(p[1]+q[1])/2;
        const material=mat(shopColors[(id+index)%4]);
        box(Math.min(dist*.64,8),.13,1.05,material,x,base+2.2,z,yaw);
        box(Math.min(dist*.53,6),.32,.26,gold,x,base+2.31,z,yaw);
      }
    });
    rings.slice(1).forEach(hole=>hole.forEach((p,i)=>{
      wall(p,hole[(i+1)%hole.length],base,height,darkWindows[palette],3,floors);
    }));
    if(signature) cathay(base+height);
    else if(detail) oldStreetRoof(rings,base+height,id);
    else if(rings.length===1) simpleRoof(ring,base+height,tall?modern:slab);
    if(name && id!==412612156 && height<32) {
      const front=Math.max(...ring.map(p=>p[1]));
      panel(name,cx,base+height+1,front+.25,Math.min(8,name.length*1.5),1.05,{bg:'#45425a'});
    }
  }

  function junction(x,z,width) {
    const mesh=put(new THREE.Mesh(new THREE.CircleGeometry(width*.5,10),asphalt),x,coreGround(x,z)+.045,z,-Math.PI/2);
    mesh.castShadow=false;
  }
  for(const [,width,points] of streets) {
    for(let i=1;i<points.length;i++) {
      const [ax,az]=points[i-1], [bx,bz]=points[i];
      const x=(ax+bx)/2,z=(az+bz)/2;
      if(z>-17.5 || z<-176 || Math.abs(x)>163) continue;
      const length=Math.hypot(bx-ax,bz-az);
      if(length<.1) continue;
      const yaw=Math.atan2(az-bz,bx-ax);
      const divisions=Math.ceil(length/2),roadPoints=[];
      for(let j=0;j<=divisions;j++) {
        const t=j/divisions,px=ax+(bx-ax)*t,pz=az+(bz-az)*t;
        roadPoints.push([px,coreGround(px,pz)+.042,pz]);
        if(!j)continue;
        const a=roadPoints[j-1],b=roadPoints[j],run=length/divisions;
        const center=[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2];
        const pitch=Math.atan2(b[1]-a[1],run),span=Math.hypot(run,b[1]-a[1]);
        box(span+.04,.055,width+1.55,pavement,center[0],center[1]-.057,center[2],yaw).rotateZ(pitch);
        box(span+.035,.037,width,asphalt,center[0],center[1]-.019,center[2],yaw).rotateZ(pitch);
      }
      junction(bx,bz,width);
      district.path(roadPoints,width);
      if(width>4 && length>2) {
        for(let step=1.4;step<length;step+=3) {
          const t=step/length;
          box(1.1,.025,.07,line,ax+(bx-ax)*t,coreGround(ax+(bx-ax)*t,az+(bz-az)*t)+.05,az+(bz-az)*t,yaw);
        }
        if(i%2===0) {
          const px=x+(bz-az)*.44, pz=z-(bx-ax)*.44;
          const offset=(width/2+.45)/Math.max(.01,Math.hypot(px-x,pz-z));
          const lx=x+(px-x)*offset, lz=z+(pz-z)*offset;
          box(.10,2.9,.10,steel,lx,coreGround(lx,lz)+1.49,lz);
          box(.36,.14,.34,gold,lx,coreGround(lx,lz)+2.94,lz);
        }
      }
    }
  }
  for(const [label,roman,x,z] of [['戴家巷','DAIJIA XIANG',-72,-42],['沧白路','CANGBAI LU',-25,-40],
    ['临江路','LINJIANG LU',-74,-62],['棉花街','MIANHUA JIE',91,-25]]) {
    box(.10,2.8,.10,steel,x,coreGround(x,z)+1.38,z);
    panel(label,x,coreGround(x,z)+2.62,z+.06,2.9,.65,{bg:'#254754',fg:'#dce9e2',subtitle:roman});
  }
}
