import {corridorRestoredBuildings} from '../data/hongya-chaotian-survey.js';
import {corridorMaterials,corridorMaterialKey} from './corridor-frontages.js';
import * as THREE from 'three';
import {cityBuildings} from '../data/city-buildings.js';
import {waterfrontRestoredBuildings} from '../data/waterfront-survey.js';
import {terrainHeight,coreGround,inside,geo} from './geography.js';
import {waterfrontRecords} from './waterfront-model.js';
import {waterfrontMaterials} from './waterfront-textures.js';
import {buildWaterfront} from './waterfront.js';

export const cityStats={buildings:cityBuildings.length+waterfrontRestoredBuildings.length+corridorRestoredBuildings.length};
export function buildCity({put,mat,district,tex,scene}) {
  const facadeMaterials=waterfrontMaterials(tex),corridorMats=corridorMaterials(tex);
  const batches=new Map();
  const shader=new THREE.ShaderMaterial({
    side:THREE.DoubleSide,
    vertexShader:`attribute float seed; varying vec2 vUv; varying float vSeed; void main(){vUv=uv;vSeed=seed;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;varying float vSeed;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+vSeed*37.1)*43758.5453);}
      void main(){vec2 cell=floor(vUv),p=fract(vUv);float s=hash(cell);
        vec2 aa=max(fwidth(vUv),vec2(.002));
        float window=smoothstep(.19-aa.x,.19+aa.x,p.x)*(1.-smoothstep(.79-aa.x,.79+aa.x,p.x))*smoothstep(.20-aa.y,.20+aa.y,p.y)*(1.-smoothstep(.76-aa.y,.76+aa.y,p.y));
        float distant=smoothstep(.2,.9,max(aa.x,aa.y));window=mix(window,.31,distant);
        vec3 warm=mix(vec3(.73,.47,.25),vec3(.48,.64,.69),step(.77,fract(vSeed*.17)));
        vec3 wall=mix(vec3(.009,.013,.020),vec3(.024,.022,.028),fract(vSeed*.13));
        float lit=mix(step(.68,s),.24,distant);vec3 c=wall+window*mix(vec3(.014,.026,.036),warm*(.39+s*.42),lit);
        c+=window*step(vUv.y,.8)*warm*.16;
        gl_FragColor=vec4(c,1.);}`
  });
  const roof=mat('#343d49',{side:THREE.DoubleSide}),baseMat=mat('#3a3e48',{side:THREE.DoubleSide});
  const edgeMat=new THREE.MeshBasicMaterial({color:'#bc8c57'});
  const get=(name,hidden)=>{
    const key=name+hidden;
    if(!batches.has(key))batches.set(key,{name,hidden,p:[],uv:[],seed:[]});
    return batches.get(key);
  };
  const vertex=(b,x,y,z,u=0,v=0,seed=0)=>{b.p.push(x,y,z);b.uv.push(u,v);b.seed.push(seed);};
  const quad=(b,a,c,d,e,uv,seed)=>{
    for(const i of [0,1,2,0,2,3])vertex(b,...[a,c,d,e][i],...uv[i],seed);
  };
  for(const [id,rings,heightMeters,method,source,name] of [...cityBuildings,...waterfrontRestoredBuildings,...corridorRestoredBuildings]) {
    const ring=rings[0];
    const [x,z]=ring.reduce(([x,z],p)=>[x+p[0]/ring.length,z+p[1]/ring.length],[0,0]);
    const sample=(x,z)=>x>-169&&x<136&&z<-17&&z>-177?coreGround(x,z):terrainHeight(x,z);
    const profile=waterfrontRecords.get(String(id));
    const base=profile.base,top=profile.top;
    const bottom=Math.min(base,...ring.map(p=>sample(...p)))-.12;
    const hidden=inside(geo.lands.jiangbei,x,z);
    const walls=get(profile.corridor?'corridor:'+corridorMaterialKey(profile.corridor):profile.detailed?'facade'+profile.style:'wall',hidden),roofs=get('roof',hidden),foundation=get('base',hidden);
    const seed=String(id).split('').reduce((n,c)=>(n*31+c.charCodeAt(0))%65521,0);
    const floors=profile.corridor?.levels||Math.max(1,Math.round((top-base)/1.155)), floorHeight=(top-base)/floors;
    for(const points of rings) for(let i=0;i<points.length;i++) {
      const a=points[i],b=points[(i+1)%points.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if(len<.015)continue;
      const topA=profile.topAt(...a),topB=profile.topAt(...b);
      const cells=Math.max(1,Math.round(len/(profile.style===4?1.18:1.05)));
      const uv=profile.detailed?[[0,0],[cells/4,0],[cells/4,(topB-base)/floorHeight/4],[0,(topA-base)/floorHeight/4]]:[[0,0],[len/1.02,0],[len/1.02,(top-base)/floorHeight],[0,(top-base)/floorHeight]];
      quad(walls,[a[0],base,a[1]],[b[0],base,b[1]],[b[0],topB,b[1]],[a[0],topA,a[1]],uv,seed);
      if(base-bottom>.03)quad(foundation,[a[0],bottom,a[1]],[b[0],bottom,b[1]],[b[0],base,b[1]],[a[0],base,a[1]],[[0,0],[1,0],[1,1],[0,1]],seed);
    }
    const contour=ring.map(p=>new THREE.Vector2(p[0],p[1]));
    const holes=rings.slice(1).map(r=>r.map(p=>new THREE.Vector2(p[0],p[1])));
    const all=[...contour,...holes.flat()];
    for(const t of THREE.ShapeUtils.triangulateShape(contour,holes))for(const i of t)vertex(roofs,all[i].x,profile.topAt(all[i].x,all[i].y),all[i].y,0,0,seed);
    district.polygon(rings,bottom,Math.max(top,...ring.map(p=>profile.topAt(...p))));
  }
  for(const batch of batches.values()) {
    if(!batch.p.length)continue;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(batch.p,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uv,2));
    g.setAttribute('seed',new THREE.Float32BufferAttribute(batch.seed,1));g.computeVertexNormals();
    const mesh=put(new THREE.Mesh(g,batch.name.startsWith('corridor:')?corridorMats[batch.name.slice(9)]:batch.name.startsWith('facade')?facadeMaterials[Number(batch.name.slice(6))]:batch.name==='wall'?shader:batch.name==='roof'?roof:baseMat),0,0,0);
    mesh.userData.hideInIllustration=batch.hidden;
    // Preserve the per-building seed attribute, and only submit six city batches.
    mesh.userData.noMerge=true;
  }
  buildWaterfront({put,mat,tex,scene,district});
}
