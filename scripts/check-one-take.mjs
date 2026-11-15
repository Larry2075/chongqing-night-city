import * as T from 'three';import fs from 'node:fs';
import{buildChongqing}from'../src/chongqing.js';import{createDistrict}from'../src/district.js';
import{flightDuration,flightKeys,flightState,placeRiverFlight}from'../src/river-flight.js';
const d=createDistrict();const obstacles=[],polygon=d.polygon;d.polygon=(rings,base,top)=>{obstacles.push({rings,base,top});polygon(rings,base,top)};
buildChongqing({scene:new T.Scene(),put:m=>m,box:()=>new T.Mesh(),mat:()=>new T.MeshBasicMaterial(),tex:()=>new T.Texture(),rnd:()=>.42,TICK:[],NOINK:[],GLOW:[],LOOP:12000,district:d});
const camera=new T.PerspectiveCamera(),bad=[],runs=[];let run=null,last=null,maxSpeed=0,maxAngular=0,distance=0;
for(let ms=0;ms<=flightDuration;ms+=25){placeRiverFlight(camera,ms);const[x,y,z]=camera.position.toArray();
 if(d.blocked(x,y,z,.50,true)){if(!run){run={start:ms,end:ms,from:[x,y,z]};runs.push(run);}run.end=ms;run.to=[x,y,z];if(bad.length<100)bad.push({ms,p:[x,y,z]});}else run=null;
 const state=flightState(ms);if(last){const step=camera.position.distanceTo(last.pos);distance+=step;maxSpeed=Math.max(maxSpeed,step/.025/.35);maxAngular=Math.max(maxAngular,Math.hypot(state[3]-last.state[3],state[4]-last.state[4])/.025*180/Math.PI);}last={pos:camera.position.clone(),state};}
const report={duration:flightDuration/1000,samples:flightDuration/25+1,distanceMeters:distance/.35,maxSpeedMetersPerSecond:maxSpeed,maxAngularDegreesPerSecond:maxAngular,runs};console.log(JSON.stringify(report,null,2));fs.writeFileSync('docs/one-take-camera-audit.json',JSON.stringify(report,null,2));
if(runs.length)process.exitCode=1;
