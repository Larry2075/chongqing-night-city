import * as THREE from 'three';
import { geo, terrainHeight, inside, nearestWalk } from './geography.js';
import { riverwalks } from './river-route.js';

export function buildNightDetails({box,put,mat,beam,panel,tex,TICK,NOINK}) {
  const steel=mat('#172535'), foliage=mat('#183b3b'), trunk=mat('#34363e');
  const bronze=mat('#bd8f57',{emissive:'#f9a851',emissiveIntensity:1.2});
  const jade=mat('#5bbdad',{emissive:'#44c8ca',emissiveIntensity:1.15});
  const warm=mat('#fff0b1',{emissive:'#ffc778',emissiveIntensity:2.0});
  const globe=new THREE.SphereGeometry(1,7,5), leaf=new THREE.IcosahedronGeometry(1,1);
  const haloTexture=tex(64,64,(ctx,w,h)=>{
    const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'#ffffffb0');g.addColorStop(.2,'#ffffff50');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  });
  const haloMat=new THREE.MeshBasicMaterial({map:haloTexture,color:'#ffc471',transparent:true,opacity:.3,depthWrite:false,blending:THREE.AdditiveBlending});
  const haloGeo=new THREE.PlaneGeometry(1,1);
  function pool(x,y,z,r=4,color=haloMat) {
    const o=put(new THREE.Mesh(haloGeo,color),x,y+.025,z,-Math.PI/2);o.scale.set(r*2,r*2,1);NOINK.push(o);
  }
  // Small-scale cues: continuous lit handrails, rhythm of trees, stone planters,
  // shaded benches, glowing globes and drainage joints on both waterfronts.
  for(const name of ['yuzhong','jiangbei','nanan','qiansimenLanding']) {
    const points=riverwalks[name];
    const half=name==='yuzhong'?.86:name==='qiansimenLanding'?.48:1.12;
    for(let i=1;i<points.length;i++) {
      const [ax,ay,az]=points[i-1],[bx,by,bz]=points[i],dx=bx-ax,dz=bz-az,L=Math.hypot(dx,dz);
      const nx=-dz/L,nz=dx/L;
      for(const side of [-1,1]) beam([ax+nx*half*side,ay+.035,az+nz*half*side],[bx+nx*half*side,by+.035,bz+nz*half*side],.025,side===1?bronze:jade);
      for(let d=7;d<L;d+=12) {
        const t=d/L,x=ax+dx*t,z=az+dz*t,y=ay+(by-ay)*t;
        const side=name==='nanan'?1:-1,px=x+nx*side*4.8,pz=z+nz*side*4.8;
        if(Object.values(geo.lands).some(r=>inside(r,px,pz))) {
          const h=terrainHeight(px,pz);
          box(.8,.23,.65,steel,px,h+.115,pz);
          box(.18,3.2,.18,trunk,px,h+1.9,pz);
          put(new THREE.Mesh(leaf,foliage),px,h+4.0,pz).scale.set(2.0,2.5,1.8);
          beam([px-1.2,h+3.2,pz],[px+1.3,h+3.9,pz],.06,bronze);
          for(let k=0;k<4;k++) put(new THREE.Mesh(globe,warm),px-.95+k*.65,h+3.5+k*.1,pz).scale.set(.10,.10,.10);
        }
        pool(x,y,z,1.35);
        if((Math.floor(d/12)+i)%4===0) {
          box(.035,2.1,.035,steel,x+nx*half,y+1.05,z+nz*half);
          put(new THREE.Mesh(globe,warm),x+nx*half,y+2.12,z+nz*half).scale.set(.11,.09,.11);
        }
      }
    }
  }
  // Trees follow the measured land mask, leaving the water and paths clear.
  for(const name of ['jiangbei','nanan','peninsula']) {
    const coast=geo.lands[name];
    for(let i=0;i<coast.length;i+=2) {
      const [x,z]=coast[i];
      for(const offset of [8,16]) {
        const px=x+(name==='nanan'?offset:-offset),pz=z+(name==='peninsula'?-offset:0);
        if(!inside(coast,px,pz)||nearestWalk(px,pz).distance<6|| (px>205&&px<365&&pz>45&&pz<220))continue;
        if(px>-175&&px<145&&pz<30)continue;
        const y=terrainHeight(px,pz);
        put(new THREE.Mesh(leaf,foliage),px,y+2.4,pz).scale.set(2.4,3,2.4);
        box(.15,1.5,.15,trunk,px,y+.75,pz);
      }
    }
  }
  // River traffic is a readable scale cue in the long shot, with navigational
  // running lights and restrained wake strips anchored to the boat.
  const boatHull=mat('#253044'), boatCabin=mat('#56616b');
  for(const [x,z,yaw,size] of [[376,319,-.34,1],[243,378,-.48,.8],[439,94,.05,1.1],[52,127,1.5,.65]]) {
    box(16*size,.75,4.3*size,boatHull,x,.6,z,yaw);
    box(11.5*size,1.6,3.3*size,boatCabin,x,1.7,z,yaw);
    box(12*size,.15,3.6*size,warm,x,2.57,z,yaw);
    for(let q=-4;q<=4;q+=1.5) {
      const px=x+q*size*Math.cos(yaw),pz=z-q*size*Math.sin(yaw);
      box(.9*size,.55,.06,bronze,px,1.8,pz+1.7*size,yaw);
    }
    for(let q=0;q<6;q++) {
      const wake=box(3+q,.012,.08,jade,x-11*size-q*1.4,.04,z+q*.16,yaw);NOINK.push(wake);
    }
  }
}
