import {writeFile,readFile} from 'node:fs/promises';
import {transportNetwork} from '../data/transport-network.js';
const coverage=JSON.parse(await readFile(new URL('../docs/building-coverage.json',import.meta.url)));

import {geography as geo} from '../data/geography.js';
import {riverwalks,lowerQuay,liftConnections} from '../src/river-route.js';
import {levels,UNIT,WATER_DATUM,surveySources} from '../data/site-survey.js';
import {buildingSurvey} from '../data/building-survey.js';
import {qiansimenX} from '../src/geography.js';
const minX=-235,maxX=650,minZ=-220,maxZ=1040;
const W=710,H=920,pad=35,sc=Math.min((W-pad*2)/(maxX-minX),(H-pad*2)/(maxZ-minZ));
const p=(x,z)=>[pad+(x-minX)*sc,pad+(maxZ-z)*sc];
const line=ps=>ps.map(([x,z])=>p(x,z).map(v=>v.toFixed(1)).join(',')).join(' ');
let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title"><title id="title">朝天门大桥至洪崖洞位置核对图</title><defs><clipPath id="bounds"><rect x="20" y="20" width="670" height="880" rx="12"/></clipPath></defs><rect width="710" height="920" rx="18" fill="#101b2c"/><g clip-path="url(#bounds)">`;
for(const [name,ring] of Object.entries(geo.lands))svg+=`<polygon points="${line(ring)}" fill="#263b43" stroke="#567b7c" stroke-width="1.5"/>`;
for(const name of ['yuzhong','jiangbei','nanan','dongshuimen','bridgewalk','qiansimenLanding','archSouthAccess','plazaAccess'])svg+=`<polyline points="${line(riverwalks[name].map(([x,y,z])=>[x,z]))}" fill="none" stroke="#d9aa67" stroke-width="2.5"/>`;
for(const lift of liftConnections){const [u,v]=p(lift.x,lift.z);svg+=`<rect x="${u-5}" y="${v-5}" width="10" height="10" fill="#89e5de" stroke="#10283b" stroke-width="1.5"/>`;}
svg+=`<polyline points="${line([[36,0],[93,190]])}" stroke="#e77d90" stroke-dasharray="5 4" stroke-width="2" fill="none"/>`;
svg+=`<polyline points="${line([[qiansimenX(0),0],[qiansimenX(286),286]])}" stroke="#6fe3df" stroke-width="4" fill="none"/>`;
const places=[['朝天门大桥',55,918,12,-12],['南滨路',234,568,18,4],['江北嘴',50,428,-85,-12],['大剧院',84,303,-90,-14],['朝天门广场',322,199,14,-6],['来福士',299,122,20,24],['千厮门大桥',qiansimenX(117),117,-98,-10],['洪崖洞',0,0,-75,26],['戴家巷',-84,-43,-48,32],['东水门大桥',456,-174,-90,24]];
for(const [name,x,z,dx,dz] of places){const [u,v]=p(x,z);svg+=`<circle cx="${u}" cy="${v}" r="4" fill="#ffe0a5"/><text x="${u+dx}" y="${v+dz}" fill="#eef4f3" font-size="16" font-family="sans-serif">${name}</text>`;}
svg+=`<polyline points="${line(lowerQuay.map(([x,y,z])=>[x,z]))}" fill="none" stroke="#d9aa67" stroke-width="2.5"/>`;
svg+='</g><rect x="35" y="842" width="10" height="10" fill="#89e5de"/><text x="55" y="852" fill="#b8d7d6" font-family="sans-serif" font-size="13">方框：桥头观光电梯</text><path d="M650 76V35m-7 11 7-11 7 11" fill="none" stroke="#dce7eb" stroke-width="2"/><text x="644" y="96" fill="#dce7eb" font-family="sans-serif" font-size="17">N</text><text x="30" y="887" fill="#9bb1bd" font-family="sans-serif" font-size="12">岸线 © OpenStreetMap contributors · WGS84 坐标</text></svg>';
await writeFile(new URL('../data/map-audit.svg',import.meta.url),svg);
const audit={checkedOn:'2026-11-14',horizontalReference:'WGS84',projection:geo.origin,scale:geo.scale,
 imagery:{service:'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',checkedExtent:[106.556222,29.551556,106.606930,29.602264],acquisitionDate:'not verified; image is not assumed to be current'},
 shoreline:{source:'https://www.openstreetmap.org',ways:[31258061,34095908],simplificationSceneUnits:.5},
 qiansimen:{referenceOSMWays:[345984427,804790928],oldAxis:[[36,0],[93,190]],correctedAxis:[[qiansimenX(0),0],[qiansimenX(286),286]],note:'North connector follows OSM footway/steps graph. Stair elevations are interpolated between the deck and 193m bank level, not surveyed.'},
 terrain:{source:'https://registry.opendata.aws/terrain-tiles/',format:'Terrarium z13 / SRTM-derived',waterDatumMeters:170,sourceGridSceneUnits:14,nearRouteMeshGridSceneUnits:2,verticalScale:.35,edits:'Narrow route cut/fill corridors, 180/196m Chaotianmen levels, ~40m road-to-road difference at Hongyadong. Inland streets follow DEM relief instead of a single plane. Fine mesh does not increase DEM accuracy. Reference water datum is a scene convention, not observed current river level.'},
 levelsMeters:Object.fromEntries(Object.entries(levels).map(([key,y])=>[key,Number((WATER_DATUM+y/UNIT).toFixed(2))])),
 levelCaveats:'Cangbai 227m is inferred from a western Jiabin 187m report + approximately 40m difference, not a surveyed spot elevation. Raffles ground/podium and eastern bridge landings are working estimates. 180/196 are official public-space level names. No contemporary terrain-change claim can be made from the available DEM.',
 pedestrianReferenceWays:[1499726159,1416968845,1416968869,1430569098],
 bridgeTransfers:liftConnections.map(({id,x,z,low,high})=>({id,x,z,lowMeters:WATER_DATUM+low/UNIT,highMeters:WATER_DATUM+high/UNIT})),
 transferCaveats:'Built lift connections are confirmed by the city. Southern arch shaft follows mapped position; northern and eastern shaft entrances are approximate. New skywalks in the cited design proposal and unfinished 2026 Hongyadong escalators are not presented as completed.',
 buildings:{methods:Object.values(buildingSurvey).reduce((out,b)=>(out[b.method]=(out[b.method]||0)+1,out),{}),priority:'Primary published dimensions > OSM height > floor count times use-specific floor height > nearby comparable/type estimate',raffles:{towersMeters:[250,250,250,250,250,250,350,350],crystalMeters:[300,32.5,26.5]},grandTheatreMaxMeters:64,guotaiMaxMeters:51},
 sources:surveySources,
 lights:'Art-directed night treatment. Not an exact recreation of a dated municipal light show.'};
audit.buildings.coverage=coverage;
audit.transport={roadSegments:transportNetwork.roads.length,railTracks:transportNetwork.rails.length,bridges:transportNetwork.bridges,animation:'576 procedural cars/buses and 6 trains (six cars each); source road directions; not real-time traffic',verticalCaveat:'Lower track and lower road elevations are inferred from structural clearance, not surveyed. Only two lower automobile lanes are active on Chaotianmen; inspection lanes carry no simulated traffic.'};
await writeFile(new URL('../docs/geography-audit.json',import.meta.url),JSON.stringify(audit,null,2)+'\n');
console.log('Map audit and provenance saved.');
