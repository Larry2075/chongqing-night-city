import * as THREE from 'three';

export const flightDuration=105000;
export const line6Shot={start:67000,end:73000,offset:11000};
export const flightChapters=[
 [0,'朝天门大桥 · 钢拱'],[16000,'两江交汇'],[30000,'东水门大桥 · 双塔'],
 [44000,'朝天门 · 来福士水晶连廊'],[58500,'嘉陵江沿岸'],[64000,'6号线 · 千厮门过桥'],
 [77500,'洪崖洞 · 吊脚楼'],[94000,'沿崖回望 · 洪崖洞'],[98000,'两江夜景收尾']
];
// One continuous 105-second flight. All three modelled river bridges receive
// dedicated views; ordinary transit yields time to the landmark silhouettes.
export const flightKeys=[
 [0,[50,52,1120],[57,42,913],54],
 [4000,[20,47,1010],[57,46,913],59],
 [8000,[-12,39,918],[72,40,910],62],
 [11000,[30,39,864],[150,40,780],62],
 [16000,[145,59,730],[310,55,235],60],
 [23000,[285,60,480],[325,64,145],61],
 [29000,[410,50,240],[427,39,-130],62],
 [34000,[455,38,35],[414,37,-162],60],
 [38000,[460,31,-92],[415,30,-165],60],
 [41000,[425,40,-66],[360,48,-90],60],
 [45000,[405,66,65],[305,91,105],60],
 [49000,[385,115,150],[299,101,122],59],
 [54000,[360,120,230],[299,101,122],58],
 [60000,[175,50,210],[50,34,140],60],
 [64000,[57,23,151],[-1,19,145],60],
 [67000,[17,19.1,137],[-1,19.1,139],55],
 [70000,[22,19.1,122],[4,19.1,121],55],
 [73000,[28,19.1,106],[8,19.1,98],55],
 [75000,[42,24,91],[5,18,25],59],
 [78500,[-1,26,65],[2,15,8],59],
 [81000,[17,15,27],[14,11,5],59],
 [85000,[15,10.7,11.8],[10,10.5,4.5],61],
 [89000,[-5,14,12],[-2,16,1],61],
 [94000,[-29,17,15],[-15,16,3],62],
 [96000,[-49,22,17],[-20,21,0],63],
 [98000,[-70,29,25],[-35,21,0],60],
 [101000,[-69,46,60],[-9,19,3],55],
 [103500,[-57,61,100],[-3,19,5],51],
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
