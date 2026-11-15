import * as THREE from 'three';
import {liftConnections} from './river-route.js';
export function buildLifts({box,put,mat,beam,panel,district}) {
  const frame=mat('#414d5b'),light=mat('#b7e5dd',{emissive:'#62c8cd',emissiveIntensity:.75});
  const glass=new THREE.MeshBasicMaterial({color:'#3b6873',transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide});
  for(const lift of liftConnections) {
    const {x,z,low,high}=lift,H=high-low;
    // A pair of narrow shafts at the arch bridge; one representative working cabin
    // at each landing. Two stop elevations remain separate navigation surfaces.
    const count=lift.id.startsWith('arch')?2:1;
    for(let i=0;i<count;i++) {
      const cx=x+(i===0?0:1.32);
      for(const dx of [-.46,.46])for(const dz of [-.43,.43])box(.065,H+.8,.065,frame,cx+dx,(low+high)/2+.4,z+dz);
      for(let y=low;y<=high+.1;y+=1.4){
        box(1.04,.055,.97,frame,cx,y,z);
        beam([cx-.45,y,z-.44],[cx+.45,Math.min(high+.6,y+1.4),z-.44],.025,frame);
      }
      box(.94,H,.85,glass,cx,(low+high)/2,z);
      box(1.1,.16,1.03,frame,cx,high+.7,z);
      box(.035,H,.035,light,cx-.50,(low+high)/2,z+.45);
    }
    for(const [y,label] of [[low,lift.lowLabel],[high,lift.highLabel]]) {
      box(2.0,.13,1.9,frame,x+.25,y-.065,z);
      district.path([[x-.55,y,z],[x+.8,y,z]],1.6,true);
      panel(label,x,y+.93,z+.52,1.55,.25,{bg:'#224553'});
      panel('E · 乘电梯',x,y+.65,z+.52,1.1,.21,{bg:'#263744',fg:'#ffdc96'});
    }
    district.transfer(lift);
  }
}
