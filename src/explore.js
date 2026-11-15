import {coreHeight, EYE_HEIGHT, BODY_RADIUS, WATER_DATUM, UNIT} from '../data/site-survey.js';
import * as THREE from 'three';
import { districtBounds } from './district.js';
import { riverLocations } from './rivers.js';
import { riverArea, qiansimenX } from './river-route.js';
import {frontageViews} from './waterfront.js';

export const locations = {
  river:{x:-12,y:2.28,z:14.18,yaw:-.27,pitch:.21,mode:'walk'},
  alley:{x:-84,y:26.06,z:-43.22,yaw:-2.88,pitch:.12,mode:'walk'},
  cats:{x:-59.6,y:26.06,z:-39.37,yaw:Math.PI,pitch:.22,mode:'walk',fov:74},
  upper:{x:-9,y:26.06,z:-35,yaw:Math.PI,pitch:.13,mode:'walk'},
  hongyaShop:{label:'洪崖洞 · 临江门头',description:'石拱、横竖招牌与木构廊檐',x:13.8,y:coreHeight(7.57)+1.2,z:10.7,yaw:0,pitch:.13,mode:'fly',fov:65},
  terrace:{x:-10.7,y:7.57,z:6.56,yaw:-.53,pitch:.16,mode:'walk'},
  bridge:{x:qiansimenX(78),y:27.25,z:78,yaw:-.38,pitch:-.06,mode:'walk'},
  sky:{x:-46,y:86,z:115,yaw:-.41,pitch:-.27,mode:'fly'},
  city:{label:'两江沿岸 · 全域建筑',description:'卫星影像轮廓与地图建筑覆盖',x:-270,y:210,z:520,yaw:-.858,pitch:-.33,mode:'fly',fov:68},
  railView:{label:'千厮门大桥 · 6 号线',description:'上层汽车 · 下层双线轨道',x:21,y:20.2,z:115,yaw:2.137,pitch:-.045,mode:'fly',fov:63},
  archTraffic:{label:'朝天门大桥 · 环线',description:'上层六车道 · 下层环线及双向车道',x:40,y:30,z:870,yaw:Math.PI,pitch:-.08,mode:'fly',fov:63},
  eastTraffic:{label:'东水门大桥 · 6 号线',description:'上层汽车 · 下层双线轨道',x:440,y:27,z:-102,yaw:0,pitch:-.10,mode:'fly',fov:63},
  ...riverLocations
};
for(const key of ['river','alley','cats','upper','terrace','bridge']) locations[key].y=coreHeight(locations[key].y);

export function configureWaterfrontLocations(district){
  const regions=[['Jiabin','jiabin','洪崖洞至朝天门 · 临街建筑'],['Changbin','changbin','长滨路 · 江边街景'],['Huguang','huguang','东水门 · 湖广会馆一带'],['Longmen','longmen','南滨路 · 龙门浩街景'],['Museum','museum','南滨路 · 故宫南迁一带'],['Danzishi','danzishi','南滨路 · 弹子石街景'],['Jiangbei','jiangbei','北滨二路 · 江北嘴街景']];
  for(const [key,region,label] of regions){
    const candidates=frontageViews.filter(p=>p.region===region&&p.mode==='walk'&&p.gradeDifference<.7).flatMap(p=>{
      const floors=district.floors(p.x,p.z).filter(y=>Math.abs(y-p.y)<.15).sort((a,b)=>Math.abs(a-p.y)-Math.abs(b-p.y));
      return floors.length&&!district.blocked(p.x,floors[0]+EYE_HEIGHT,p.z,BODY_RADIUS)?[{...p,y:floors[0]}]:[];
    });
    const preferred={Huguang:'huguang',Longmen:'xiahao',Museum:'palace',Danzishi:'danzishi'}[key];
    const score=p=>(preferred&&p.zone!==preferred?180:0)+p.walkDistance+p.gradeDifference*30+(p.width<3?20:0);
    candidates.sort((a,b)=>score(a)-score(b));
    if(candidates.length)locations['waterfront'+key]={...candidates[0],label,description:'近看门窗、店面与沿街建筑'};
  }
  for(const [key,id,label] of [
    ['chaqian',950181634,'朝千路 · 李板凳面'],
    ['haiyun',486221616,'陕西路 · 海韵大厦'],
    ['jiliang',748910914,'陕西路二巷 · 基良广场'],
    ['tianjiao',950181639,'朝千路 · 时代天骄']
  ]){
    const p=frontageViews.find(p=>String(p.id)===String(id)&&!district.blocked(p.x,p.y+EYE_HEIGHT,p.z,BODY_RADIUS)&&(p.mode==='fly'||district.floors(p.x,p.z).some(h=>Math.abs(h-p.y)<.15)));
    if(p)locations[key]={...p,label,description:'独立楼栋立面 · 夜间街景'};
  }
  if(locations.chaqian)locations.waterfrontJiabin=locations.chaqian;
}

export function setupExplore(canvas, root, district, render) {
  configureWaterfrontLocations(district);
  const camera=new THREE.PerspectiveCamera(56,16/9,.12,1900);
  camera.rotation.order='YXZ';
  const eye=EYE_HEIGHT, keys=new Set();
  const modeButtons=[...root.querySelectorAll('[data-mode]')];
  const placeButtons=[...root.querySelectorAll('[data-place]')];
  const help=root.querySelector('#explore-help');
  const whereName=document.querySelector('#where-name'), whereWay=document.querySelector('#where-way');
  const bounds=districtBounds;
  const clamp=THREE.MathUtils.clamp;
  const limits={x:[bounds.west+1,bounds.east-1],z:[bounds.inland+1,bounds.bank],y:[.5,240]};
  const moveKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight',
    'Space','KeyQ','KeyE','KeyC','ShiftLeft','ShiftRight','Equal','Minus','NumpadAdd','NumpadSubtract']);
  let active=false, mode='walk', ground, frame, start, last, lastDraw, drag;
  let zoom=56;
  const pointers=new Map();
  let pinchDistance;
  let ride=null,nearLift=null,focusPlace=null;
  const rideButton=root.querySelector('#ride-lift');
  function rideLift(){
    if(!nearLift||ride||mode!=='walk')return;
    const lift=nearLift,to=Math.abs(ground-lift.low)<1?lift.high:lift.low;
    ride={lift,from:ground,to,start:performance.now()};keys.clear();
  }
  rideButton.addEventListener('click',()=>{rideLift();canvas.focus({preventScroll:true});});

  function setMode(value) {
    if (value==='walk' && mode==='fly') {
      const {x,y,z}=camera.position;
      const floor=district.floors(x,z).filter(h=>h<y+.35 && !district.blocked(x,h+eye,z,BODY_RADIUS)).sort((a,b)=>b-a)[0];
      if (floor===undefined) jump('river');
      else { ground=floor; camera.position.y=ground+eye; }
    }
    mode=value;
    root.dataset.locomotion=mode;
    modeButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));
    const touch=matchMedia('(pointer: coarse)').matches || innerWidth<=650;
    help.textContent=touch ? '按住方向键移动 · 单指转头 · 双指缩放' : mode==='fly' ?
      'WASD 移动 · 拖动转头 · 空格上升 / Q 下降 · 滚轮缩放' :
      'WASD 行走 · Shift 快行 · 拖动转头 · E 乘电梯';
  }

  function jump(place) {
    ride=null;
    const target=locations[place];focusPlace=target;
    mode=target.mode;
    ground=target.y;
    camera.position.set(target.x,target.y+(mode==='walk'?eye:0),target.z);
    camera.rotation.set(target.pitch,target.yaw,0);
    zoom=target.fov ?? 56;
    setMode(target.mode);
    paint(performance.now());
  }

  function changeZoom(delta) {
    zoom=clamp(zoom+delta,27,76);
  }
  function move(dt) {
    if(ride)return;
    const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
    const side=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    const vertical=Number(keys.has('Space')||keys.has('KeyE'))-Number(keys.has('KeyQ')||keys.has('KeyC'));
    const fast=keys.has('ShiftLeft')||keys.has('ShiftRight');
    if (!forward && !side && (mode==='walk'||!vertical)) return;
    const angle=camera.rotation.y, magnitude=Math.max(1,Math.hypot(forward,side));
    const distance=dt*(mode==='walk'?(fast?3.5:.70):(fast?35:16))/magnitude;
    const dx=(side*Math.cos(angle)-forward*Math.sin(angle))*distance;
    const dz=(-forward*Math.cos(angle)-side*Math.sin(angle))*distance;
    const dy=mode==='fly'?vertical*distance:0;
    const position=camera.position;
    function tryStep(x,y,z) {
      x=clamp(x,...limits.x); y=clamp(y,...limits.y); z=clamp(z,...limits.z);
      if(mode==='fly') {
        if(!district.blocked(x,y,z,.38,true)) position.set(x,y,z);
        return;
      }
      const candidates=district.floors(x,z).filter(height=>height-ground<.24 && ground-height<.28);
      candidates.sort((a,b)=>Math.abs(a-ground)-Math.abs(b-ground));
      for(const height of candidates) {
        if(district.blocked(x,height+eye,z,BODY_RADIUS)) continue;
        ground=height;
        position.set(x,ground+eye,z);
        return;
      }
    }
    const steps=Math.ceil(Math.max(Math.abs(dx),Math.abs(dy),Math.abs(dz))/.08);
    for(let i=0;i<steps;i++) {
      tryStep(position.x+dx/steps,position.y,position.z);
      tryStep(position.x,position.y,position.z+dz/steps);
      if (dy) tryStep(position.x,position.y+dy/steps,position.z);
    }
  }
  function paint(now) {
    if(ride){
      const t=Math.min(1,(now-ride.start)/8500),u=t*t*(3-2*t);
      ground=THREE.MathUtils.lerp(ride.from,ride.to,u);
      camera.position.set(ride.lift.x,ground+eye,ride.lift.z);
      if(t===1)ride=null;
    }
    nearLift=mode==='walk' ? district.transfers.find(t=>Math.hypot(camera.position.x-t.x,camera.position.z-t.z)<1.5 && (Math.abs(ground-t.low)<.4||Math.abs(ground-t.high)<.4)) : null;
    rideButton.hidden=!(nearLift||ride);
    rideButton.disabled=!!ride;
    if(ride)rideButton.textContent='电梯运行中…';
    else if(nearLift)rideButton.textContent=Math.abs(ground-nearLift.low)<.4 ? 'E · 乘电梯上桥' : 'E · 乘电梯到滨江路';
    canvas.dataset.position=[camera.position.x,ground,camera.position.z].map(v=>v.toFixed(3)).join(',');
    if (camera.fov!==zoom) {
      camera.fov=zoom;
      camera.updateProjectionMatrix();
    }
    const nearPreset=focusPlace?.label&&Math.hypot(camera.position.x-focusPlace.x,camera.position.z-focusPlace.z)<3;
    const nearbyFacade=mode==='walk' ? frontageViews.find(p=>Math.hypot(p.x-camera.position.x,p.z-camera.position.z)<6&&Math.abs(p.y-ground)<1.2) : null;
    const [name,directions]=nearPreset?[focusPlace.label,focusPlace.description]:nearbyFacade?[nearbyFacade.name,'沿街漫游 · 看门面、屋檐与江景']:riverArea(camera.position.x,camera.position.y,camera.position.z);
    if(name!==whereName.textContent) whereName.textContent=name;
    if(directions!==whereWay.textContent) whereWay.textContent=directions;
    whereWay.hidden=!directions;
    document.querySelector('#where-elevation').textContent=`场景高程约 ${Math.round(WATER_DATUM+(camera.position.y-(mode==='walk'?eye:0))/UNIT)} 米`;
    render(camera,Math.max(0,now-start));
  }
  function loop(now) {
    if(!active) return;
    move(Math.min(.04,Math.max(0,(now-last)/1000)));
    last=now;
    if(now-lastDraw>=32) { lastDraw=now; paint(now); }
    frame=requestAnimationFrame(loop);
  }

  window.addEventListener('keydown',event=>{
    if (!active || !moveKeys.has(event.code) || event.metaKey || event.ctrlKey || event.altKey ||
      event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
    event.preventDefault();
    if(event.code==='KeyE'&&mode==='walk'){rideLift();return;}
    if (event.code==='Equal'||event.code==='NumpadAdd') changeZoom(-3);
    else if(event.code==='Minus'||event.code==='NumpadSubtract') changeZoom(3);
    else keys.add(event.code);
  });
  window.addEventListener('keyup',event=>keys.delete(event.code));
  window.addEventListener('blur',()=>keys.clear());
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden) keys.clear();
  });
  canvas.addEventListener('pointerdown',event=>{
    if(!active || event.button!==0) return;
    canvas.focus({preventScroll:true});
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===2){
      const [a,b]=[...pointers.values()];
      pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);
      drag=undefined;
      return;
    }
    drag={id:event.pointerId,x:event.clientX,y:event.clientY};
  });
  canvas.addEventListener('pointermove',event=>{
    if(!active || !pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===2){
      const [a,b]=[...pointers.values()];
      const distance=Math.hypot(a.x-b.x,a.y-b.y);
      changeZoom((pinchDistance-distance)*.12);
      pinchDistance=distance;
      return;
    }
    if(drag?.id!==event.pointerId) return;
    camera.rotation.y-=(event.clientX-drag.x)*.005;
    camera.rotation.x=clamp(camera.rotation.x-(event.clientY-drag.y)*.004,-1.4,1.4);
    drag.x=event.clientX; drag.y=event.clientY;
  });
  canvas.addEventListener('lostpointercapture',event=>{
    pointers.delete(event.pointerId);
    pinchDistance=undefined;
    const remaining=pointers.entries().next().value;
    drag=remaining ? {id:remaining[0],...remaining[1]} : undefined;
  });
  canvas.addEventListener('wheel',event=>{
    if(!active) return;
    event.preventDefault();
    changeZoom(Math.sign(event.deltaY)*3);
  },{passive:false});
  root.querySelectorAll('[data-key]').forEach(button=>{
    button.addEventListener('pointerdown',event=>{
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      keys.add(button.dataset.key);
    });
    button.addEventListener('lostpointercapture',()=>keys.delete(button.dataset.key));
  });
  root.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>changeZoom(Number(button.dataset.zoom))));
  modeButtons.forEach(button=>button.addEventListener('click',()=>{
    setMode(button.dataset.mode);
    canvas.focus({preventScroll:true});
  }));
  placeButtons.forEach(button=>{button.disabled=!locations[button.dataset.place];button.addEventListener('click',()=>{
    jump(button.dataset.place);
    canvas.focus({preventScroll:true});
  });});

  return {
    start(place) {
      active=true;
      start=last=performance.now();
      lastDraw=0;
      jump(Object.hasOwn(locations,place) ? place : 'river');
      canvas.focus({preventScroll:true});
      frame=requestAnimationFrame(loop);
    },
    stop() { ride=null;active=false; drag=undefined; pointers.clear(); pinchDistance=undefined; keys.clear(); cancelAnimationFrame(frame); }
  };
}
