import * as THREE from 'three';

// The two TYLin bridges share a single cable plane and shuttle-shaped pylons.
// Pylon centres come from the retained OSM snapshot, not camera composition.
export const bridgeLandmarks={
  chaotianmen:{name:'朝天门大桥',center:[57,48,910],shot:[0,14000]},
  dongshuimen:{name:'东水门大桥',center:[410,38,-163],shot:[30000,42000],pylons:[[332.84,-140.69],[486.29,-185.99]]},
  qiansimen:{name:'千厮门大桥',center:[-4.21,38,140.31],shot:[59000,77000],pylons:[[-4.21,140.31]]}
};

export function spindleTower({put,beam,mat,center,deck,top,axis,halfWidth=4.6}){
  const [x,z]=center, [ax,az]=axis, cross=[-az,ax];
  const concrete=mat('#9c8f80',{emissive:'#bca27b',emissiveIntensity:.22});
  const rim=mat('#f1c18a',{emissive:'#ffbd72',emissiveIntensity:.92});
  const collar=mat('#655a54');
  const point=(t,side,along=0)=>{
    const width=halfWidth*(1-t)**.68+.40*Math.sin(Math.PI*t);
    return [x+cross[0]*width*side+ax*along,deck+(top-deck)*t,z+cross[1]*width*side+az*along];
  };
  for(const side of [-1,1]){
    const positions=[],uv=[];
    const ring=t=>{
      const p=point(t,side),thick=.62+.44*(1-t),depth=1.7+.35*(1-t);
      return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>[p[0]+cross[0]*a*thick+ax*b*depth,p[1],p[2]+cross[1]*a*thick+az*b*depth]);
    };
    for(let i=0;i<24;i++){
      const a=ring(i/24),b=ring((i+1)/24);
      for(let j=0;j<4;j++){
        const n=(j+1)%4;
        positions.push(...a[j],...b[j],...b[n],...a[j],...b[n],...a[n]);
        uv.push(0,0,0,1,1,1,0,0,1,1,1,0);
      }
      for(const edge of [-1,1])beam(point(i/24,side,edge*1.76),point((i+1)/24,side,edge*1.76),.065,rim);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();
    put(new THREE.Mesh(g,concrete),0,0,0);
    const foot=point(0,side);beam([foot[0],1,foot[2]],foot,2.05,concrete,3.7);
    for(let t=.70;t<.99;t+=.065)beam(point(t,-.32),point(t,.32),.20,collar);
  }
  beam([x,top-.6,z],[x,top+.9,z],.28,rim);
}

export function bridgeEdgeDetails({box,beam,mat,point,start,end,halfWidth,step=4.5}){
  const rail=mat('#8a8585'),red=mat('#833b3b'),edge=mat('#ff9d61',{emissive:'#ff683d',emissiveIntensity:1.1});
  const lamp=mat('#ffe3ac',{emissive:'#ffd18c',emissiveIntensity:1.7});
  for(let t=start;t<end;t+=step){
    const a=point(t),b=point(Math.min(t+step,end)),dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
    for(const side of [-1,1]){
      const p=[a[0]+nx*side*halfWidth,a[1],a[2]+nz*side*halfWidth];
      const q=[b[0]+nx*side*halfWidth,b[1],b[2]+nz*side*halfWidth];
      for(const h of [.15,.46])beam([p[0],p[1]+h,p[2]],[q[0],q[1]+h,q[2]],.037,rail);
      beam([p[0],p[1]-.45,p[2]],[q[0],q[1]-.45,q[2]],.065,edge);
      for(let j=0;j<3;j++){const u=j/3;const x=p[0]+(q[0]-p[0])*u,z=p[2]+(q[2]-p[2])*u;
        box(.035,.45,.035,rail,x,p[1]+.23,z);
      }
      if(Math.round((t-start)/step)%4===0){
        beam(p,[p[0],p[1]+2.5,p[2]],.055,red);
        beam([p[0],p[1]+2.5,p[2]],[p[0]-nx*side*.6,p[1]+2.65,p[2]-nz*side*.6],.05,rail);
        box(.24,.07,.24,lamp,p[0]-nx*side*.6,p[1]+2.64,p[2]-nz*side*.6);
      }
    }
  }
}
