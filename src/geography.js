import { levels,coreHeight } from '../data/site-survey.js';
import { geography as geo } from '../data/geography.js';
import { riverwalks, lowerQuay, qiansimenX } from './river-route.js';
export { qiansimenX };
export const sceneToGeo = (x,z) => [geo.origin[0]+x/geo.scale[0], geo.origin[1]+z/geo.scale[1]];
export function inside(ring,x,z) {
  let result=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [ax,az]=ring[i],[bx,bz]=ring[j];
    if((az>z)!==(bz>z) && x<(bx-ax)*(z-az)/(bz-az)+ax) result=!result;
  }
  return result;
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(v)=>{v=clamp(v,0,1);return v*v*(3-2*v);};
export function sourceElevation(x,z) {
  const ix=clamp(Math.floor((x-geo.xs[0])/14),0,geo.xs.length-2);
  const iz=clamp(Math.floor((z-geo.zs[0])/14),0,geo.zs.length-2);
  const u=clamp((x-geo.xs[ix])/(geo.xs[ix+1]-geo.xs[ix]),0,1);
  const v=clamp((z-geo.zs[iz])/(geo.zs[iz+1]-geo.zs[iz]),0,1);
  const a=geo.heights[iz][ix]*(1-u)+geo.heights[iz][ix+1]*u;
  const b=geo.heights[iz+1][ix]*(1-u)+geo.heights[iz+1][ix+1]*u;
  return a*(1-v)+b*v;
}
const paths=[riverwalks.yuzhong,riverwalks.jiangbei,riverwalks.nanan,riverwalks.qiansimenLanding,riverwalks.plazaAccess,riverwalks.hongyaQuayAccess,riverwalks.eastSouthAccess,lowerQuay];
export function nearestWalk(x,z) {
  let best={distance:Infinity,height:0},cutHeight=Infinity;
  for(const path of paths) for(let i=1;i<path.length;i++) {
    const [ax,ay,az]=path[i-1],[bx,by,bz]=path[i];
    const dx=bx-ax,dz=bz-az,t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz),0,1);
    const distance=Math.hypot(x-ax-dx*t,z-az-dz*t);
    const height=ay+(by-ay)*t;
    if(distance<best.distance) best={distance,height};
    if(distance<2.2)cutHeight=Math.min(cutHeight,height);
  }
  return {...best,cutHeight};
}
// The street terrace uses the engineering road-to-road difference near Hongyadong;
// inland slopes blend back into DEM relief, rather than extending a flat slab.
export function coreGround(x,z) {
  const slope=smooth((-z-48)/115);
  const interior=clamp((sourceElevation(x,z)-geo.waterDatum)*geo.verticalScale,levels.cangbai,levels.cangbai+14);
  return levels.cangbai+(interior-levels.cangbai)*slope;
}
export function terrainHeight(x,z) {
  let h=clamp((sourceElevation(x,z)-geo.waterDatum)*geo.verticalScale,1.1,105);
  if(x>-175&&x<145&&z>-190&&z<15) {
    const cliff=smooth((-z-1)/16);
    h=levels.jiabin-.08+(coreGround(x,z)-levels.jiabin+.08)*cliff;
    if(z<-17&&z>-177&&x>-169&&x<136)return coreGround(x,z);
  }
  // Actual graded platforms replace the old rectangular, nearly river-level cut.
  if(x>207&&x<360&&z>44&&z<216) {
    const edge=Math.min(x-207,360-x,z-44,216-z),t=smooth(edge/10);
    const bench=z>177 ? levels.plazaLower : levels.rafflesGrade;
    h=h*(1-t)+bench*t;
  }
  const near=nearestWalk(x,z);
  const blend=1-smooth((near.distance-2.2)/4.5);
  if(near.distance<6.7)h=h*(1-blend)+((Number.isFinite(near.cutHeight)?near.cutHeight:near.height)-.06)*blend;
  return h;
}
export {geo};
