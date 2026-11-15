import * as T from 'three';import fs from 'node:fs';
import{buildChongqing}from '../src/chongqing.js';import{createDistrict}from '../src/district.js';import{configureWaterfrontLocations,locations}from '../src/explore.js';
const scene=new T.Scene(),d=createDistrict();
function put(m,x=0,y=0,z=0,rx=0,ry=0,rz=0){m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.userData.origin=new Error().stack.split('\n').slice(2,4).join(' ');scene.add(m);return m;}
const box=(w,h,depth,m,x,y,z,yaw=0)=>put(new T.Mesh(new T.BoxGeometry(w,h,depth),m),x,y,z,0,yaw);
buildChongqing({scene,put,box,mat:(c)=>new T.MeshBasicMaterial({color:c,side:T.DoubleSide}),tex:()=>new T.Texture(),rnd:()=>.42,TICK:[],NOINK:[],GLOW:[],LOOP:12000,district:d});configureWaterfrontLocations(d);scene.updateMatrixWorld(true);
const camera=new T.PerspectiveCamera(67,16/9,.12,1900),p=locations[process.argv[2]||'waterfrontJiabin'];camera.rotation.order='YXZ';camera.position.set(p.x,p.y+.588,p.z);camera.rotation.set(p.pitch,p.yaw,0);camera.updateMatrixWorld(true);
const ray=new T.Raycaster();const report=[];
for(const xy of [[0,0],[0,-.5],[.4,0],[-.4,0],[0,.5]]){ray.setFromCamera(new T.Vector2(...xy),camera);const hits=ray.intersectObjects(scene.children,true).filter(h=>h.distance>.12).slice(0,2);report.push({xy,hits:hits.map(h=>({point:h.point.toArray(),distance:h.distance,instance:h.instanceId,color:h.object.material?.color?.getHexString(),origin:h.object.userData.origin}))});}
console.log(JSON.stringify({location:p,report},null,2));
