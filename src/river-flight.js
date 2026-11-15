import * as THREE from 'three';

export const flightDuration=105000;
export const flightChapters=[
 [0,'朝天门大桥'],[18000,'沿江飞向朝天门'],[33000,'朝天门广场 · 来福士'],
 [44000,'嘉陵江沿岸'],[53000,'6号线 · 千厮门过桥'],[67000,'洪崖洞'],
 [84000,'戴家巷屋檐'],[96000,'两江夜景收尾']
];
// Continuous camera in local survey coordinates (0.35 units/metre).
// The Line 6 pass is synchronized only in flight mode, leaving free roam unchanged.
export const flightKeys=[
 [0,[50,52,1120],[57,42,913],54],
 [5000,[20,47,1010],[57,46,913],59],
 [10000,[-12,39,918],[72,40,910],62],
 [14000,[30,39,864],[150,40,780],62],
 [18000,[111,48,817],[255,50,540],60],
 [23000,[194,65,640],[306,52,283],59],
 [28000,[283,55,435],[322,29,197],58],
 [33000,[338,27,252],[319,17,181],58],
 [37000,[367,28,200],[322,43,145],58],
 [41000,[350,61,213],[294,71,119],57],
 [44000,[276,62,235],[218,31,166],59],
 [48000,[175,44,210],[94,25,151],60],
 [51000,[88,30,168],[16,20,148],60],
 [53000,[57,23,151],[-1,19,145],60],
 [56000,[17,19.1,137],[-1,19.1,139],55],
 [59000,[22,19.1,122],[4,19.1,121],55],
 [62000,[28,19.1,106],[8,19.1,98],55],
 [64500,[42,24,91],[5,18,25],59],
 [67000,[-1,26,65],[2,15,8],59],
 [71000,[17,15,27],[14,11,5],59],
 [75000,[15,10.7,11.8],[10,10.5,4.5],61],
 [79000,[-5,14,12],[-15,15,3],61],
 [84000,[-29,17,15],[-45,20,5],62],
 [88000,[-43,19,18],[-57,22,5],63],
 [92000,[-59,23,13],[-62,24,-2],64],
 [96000,[-70,29,17],[-47,23,0],61],
 [100000,[-69,46,60],[-9,19,3],55],
 [103000,[-57,61,100],[-3,19,5],51],
 [105000,[-53,64,112],[-3,19,5],50]
];
const times=flightKeys.map(k=>k[0]);
let lastYaw;
const values=flightKeys.map(([,p,target,fov])=>{
 const dx=target[0]-p[0],dy=target[1]-p[1],dz=target[2]-p[2];
 let yaw=Math.atan2(-dx,-dz);
 if(lastYaw!==undefined){while(yaw-lastYaw>Math.PI)yaw-=Math.PI*2;while(yaw-lastYaw< -Math.PI)yaw+=Math.PI*2;}lastYaw=yaw;
 return [...p,yaw,Math.atan2(dy,Math.hypot(dx,dz)),fov];
});
// Shape-preserving velocities; zero acceleration at each knot gives a C2
// quintic curve. Start and end settle gently, with no camera cuts or roll.
const slopes=values.map((row,i)=>row.map((_,axis)=>{
 if(i===0||i===values.length-1)return 0;
 const a=(row[axis]-values[i-1][axis])/(times[i]-times[i-1]);
 const b=(values[i+1][axis]-row[axis])/(times[i+1]-times[i]);
 return a*b>0 ? 2*a*b/(a+b) : 0;
}));
export function flightState(ms){
 const time=THREE.MathUtils.clamp(ms,0,flightDuration),next=times.findIndex(t=>t>time),i=next<0?times.length-2:Math.max(0,next-1);
 const dt=times[i+1]-times[i],u=(time-times[i])/dt;
 return values[i].map((a,j)=>{
  const delta=values[i+1][j]-a,v0=slopes[i][j]*dt,v1=slopes[i+1][j]*dt;
  return a+v0*u+(10*delta-6*v0-4*v1)*u**3+(-15*delta+8*v0+7*v1)*u**4+(6*delta-3*v0-3*v1)*u**5;
 });
}
export function placeRiverFlight(camera,ms){
 const [x,y,z,yaw,pitch,fov]=flightState(ms);
 camera.position.set(x,y,z);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);
 camera.fov=fov;camera.updateProjectionMatrix();
}
