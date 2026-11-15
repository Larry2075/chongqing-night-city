import {writeFile} from 'node:fs/promises';
import {cityBuildings} from '../data/city-buildings.js';
import {waterfrontRestoredBuildings} from '../data/waterfront-survey.js';
import {buildings} from '../data/hongyadong.js';
import {geography as geo} from '../data/geography.js';
import {transportNetwork as net} from '../data/transport-network.js';
import {riverwalks,lowerQuay} from '../src/river-route.js';
const W=980,H=1120,scale=.50,p=(x,z)=>[(x+650)*scale+50,(1450-z)*scale+50];
const line=pts=>pts.map(([x,z])=>p(x,z).map(n=>n.toFixed(1)).join(',')).join(' ');
let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img"><title>完整场景建筑、道路及轨道覆盖图</title><rect width="980" height="1120" rx="18" fill="#111e32"/>`;
for(const ring of Object.values(geo.lands))svg+=`<polygon points="${line(ring)}" fill="#223b40"/>`;
for(const road of net.roads)svg+=`<polyline points="${line(road.points)}" fill="none" stroke="#8a8f84" stroke-width=".65"/>`;
for(const [id,rings,h,method,source] of [...cityBuildings,...waterfrontRestoredBuildings]){const d=rings.map(r=>`M${line(r).replaceAll(' ','L')}Z`).join('');svg+=`<path d="${d}" fill="${source==='osm'?'#8acbd9':'#b7a0c7'}" fill-rule="evenodd" opacity=".82"/>`;}
for(const [,rings] of buildings)svg+=`<polygon points="${line(rings[0])}" fill="#eed3a0"/>`;
for(const path of [...Object.values(riverwalks),lowerQuay])svg+=`<polyline points="${line(path.map(([x,y,z])=>[x,z]))}" fill="none" stroke="#efba70" stroke-width="1.4"/>`;
for(const rail of net.rails)for(const seg of rail.segments)if(!seg.tunnel)svg+=`<polyline points="${line(seg.points)}" fill="none" stroke="${rail.line==='环线'?'#f5db65':'#f381c3'}" stroke-width="1.7"/>`;
for(const [name,x,z] of [['洪崖洞',0,0],['来福士',299,120],['朝天门大桥',50,930],['千厮门大桥',-4,155],['东水门大桥',443,-166]]){const [u,v]=p(x,z);svg+=`<text x="${u+6}" y="${v-10}" font-family="sans-serif" font-size="14" fill="#fff2d6" stroke="#102033" stroke-width="3" paint-order="stroke">${name}</text>`;}
svg+='<text x="906" y="35" font-family="sans-serif" font-size="20" fill="#d8e4e8">N ↑</text><text x="35" y="1085" font-family="sans-serif" font-size="12" fill="#acc1cf">WGS84 · OSM / Overture Maps · East Asian footprints: Qian Shi et al.</text></svg>';
await writeFile(new URL('../data/building-coverage.svg',import.meta.url),svg);console.log('Full coverage map saved.');
