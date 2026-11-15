import { levels, coreHeight } from '../data/site-survey.js';
// Least-squares centerline of OSM ways 345984427 and 804790928, in scene coordinates.
export const qiansimenX = z => 52.73471188 - .40226658 * z;
export const bridgeHeight = levels.archNorth;
export const archDeck = x => levels.archNorth+(levels.archSouth-levels.archNorth)*(x+128)/405;
// Mean of the mapped opposing road axes; shared by deck, cars and bridge walks.
export const bridgeZ = x => {
 const points=[[-197.22,890.598],[242.67,925.184],[286,927.8],[330,928.0],[420,926.74]];
 let i=points.findIndex(p=>p[0]>x);i=i<0?points.length-1:Math.max(1,i);
 const [a,b]=[points[i-1],points[i]];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);
};
export const eastBridgeZ=x=>-130.7405+(x-300.4345)*(-77.508/263.028);


export const lowerQuay=[[145,3.5,20],[145,3.5,40],[112,3.5,47],[82,3.5,40],[53,3.5,39],[42,3.5,34],[22,3.5,20]];

export const riverwalks = {
  yuzhong: [[140,2.12,20],[140.5,2.20,34],[160.5,2.8,67],[164,2.96,76],[197,3.6,107],
    [222,4.2,134],[244,5.5,158],[275,6.4,183],[295,7.4,195],[312,8.6,205],
    [334,8.6,191],[350,7.95,150],[361,7.95,97],[365,8,-12],[353,7.95,-65],[331,7.95,-132],
    [347,8,-145],[358,8,-153]],
  jiangbei: [[99,8.6,252],[119,8.6,256],[142,8.6,258],[163,8.6,287],[168,8.6,309],
    [146,8.6,347],[120,8.6,389],[98,8.6,434],[76,8.6,487],[66,8.6,537],
    [48,8.6,575],[11,8.6,612],[-42,8.6,674],[-67,8.6,737],[-83,8.6,806],
    [-108,9.1,845],[-128,11.4,867],[-141,16,880],[-153,22,888],[-128,29,899]],
  nanan: [[551,9.43,-195],[548,9.43,-168],[547,9.43,-47],[552,9.43,51],[542,9.43,130],
    [523,9.43,225],[487,9.43,289],[436,9.43,361],[379,9.43,418],[319,9.43,476],
    [253,9.43,538],[216,9.43,585],[188,9.43,641],[175,9.43,723],[172,9.43,800],
    [175,9.43,864],[186,14,906],[213,22,924],[250,29,936]],
  qiansimenLanding: [[qiansimenX(286),27.25,286],[-51,27.25,283],[-35,20,279],[-12,15,270],[17,10,258],[46,8.6,246],[99,8.6,252]],
  bridgewalk: [[-128,29,899],[-122,29,892],[245,29,926.4],[250,29,936],[277,29,937]],
  dongshuimen: [[358,8,-153],[378,14.8,-155],[394,23,-156],[526,23,-192],[537,17,-194],[547,9.43,-195],[551,9.43,-195]]
};
riverwalks.yuzhong=riverwalks.yuzhong.map(([x,y,z])=>[x,levels.riverwalk,z]);
// Footway 1499726159 and its mapped western approach: avoid cutting through the riverside buildings.
riverwalks.yuzhong=[...[[145,20],[145,38],[142,39.3],[137.9,39.3],[138.7,43.1],[139.9,46.4],[143.4,51],[170.1,62.4],[186.4,70.4],[191.4,75.3],[191.5,77.2],[198.4,104.6]].map(([x,z])=>[x,levels.riverwalk,z]),...riverwalks.yuzhong.slice(5)];
riverwalks.jiangbei=riverwalks.jiangbei.slice(0,17).map(([x,y,z])=>[x,levels.bankRoad,z]);
riverwalks.jiangbei.push([-114,levels.bankRoad,864],[-124,levels.bankRoad,879],[-124,levels.bankRoad,bridgeZ(-124)-7.4]);
riverwalks.nanan=riverwalks.nanan.slice(0,16).map(([x,y,z])=>[x,levels.bankRoad,z]);
riverwalks.nanan.push([190,levels.bankRoad,894],[196,levels.bankRoad,896],[209,levels.bankRoad,896],[220,levels.bankRoad,912],[247.2,levels.bankRoad,917]);
riverwalks.nanan.splice(1,0,[544,levels.bankRoad,-191],[544,levels.bankRoad,-176]);
riverwalks.jiangbei.splice(8,0,[88,levels.bankRoad,441],[87.8,levels.bankRoad,453.5]);
riverwalks.bridgewalk=[[-128,archDeck(-128),bridgeZ(-128)],[-124,archDeck(-124),bridgeZ(-124)-7.4],
  [245,archDeck(245),bridgeZ(245)-7.4],[250,archDeck(250),bridgeZ(250)],[277,archDeck(277),bridgeZ(277)]];
// OSM pedestrian graph: real north-side detour, flights of steps and park paths.
const northAccess=[
 [-58.84,289.77,0],[-52.2,292.22,1],[-52.5,292.98,1],[-58.61,290.77,0],[-68.54,286.96,0],
 [-68.06,285.96,0],[-67.59,284.98,0],[-61.16,269.41,0],[-59.72,265.7,0],[-53.76,252.13,1],
 [-52.09,248.38,1],[-51.43,246.83,0],[-50.14,243.28,0],[-70.71,235.73,0],[-71.04,236.41,0],
 [-83.28,232.53,1],[-69.47,232.29,0],[-58.31,233.29,0],[-54.35,222.65,1],[-54.79,214.32,1],
 [-53.36,213.86,0],[-52.07,212.88,0],[-51.7,211.62,0],[-41.83,210.54,1],[-31.28,210.38,1],
 [-26.7,201.29,1],[-14.66,206.51,0],[-2.13,206.65,0],[5.3,204.06,0],[8.43,202.96,0],
 [23.35,204.33,0],[34.27,207.71,0],[44.45,211.02,0],[50.92,219.08,0],[57.63,228.71,0],
 [63.37,230.28,0],[68.47,233.26,0],[68.51,235.07,0],[70.79,235,0],[74.99,237.95,0],
 [87.46,234.1,0],[95.95,247.72,0],[102.67,250.99,0],[99,252,0]
];
const stairLength=northAccess.slice(1).reduce((sum,p,i)=>sum+(p[2]?Math.hypot(p[0]-northAccess[i][0],p[1]-northAccess[i][1]):0),0);
let descend=0;
riverwalks.qiansimenLanding=[[qiansimenX(286),coreHeight(27.25),286],...northAccess.map(([x,z,stair],i)=>{
 if(i&&stair)descend+=Math.hypot(x-northAccess[i-1][0],z-northAccess[i-1][1]);
 return [x,coreHeight(27.25)-(coreHeight(27.25)-levels.bankRoad)*descend/stairLength,z];
})];
export const qiansimenStepSegments=new Set(northAccess.map((p,i)=>p[2]?i+1:-1).filter(i=>i>0));
// Door locations follow the mapped southern shaft; the northern shaft location is approximate.
export const liftConnections=[
 {id:'arch-north',name:'朝天门大桥 · 江北观光电梯',x:-124,z:bridgeZ(-124)-7.4,low:levels.bankRoad,high:archDeck(-124),lowLabel:'北滨二路',highLabel:'朝天门大桥人行道'},
 {id:'arch-south',name:'朝天门大桥 · 南岸观光电梯',x:247.2,z:917,low:levels.bankRoad,high:archDeck(247.2),lowLabel:'复兴街 · 南滨路',highLabel:'朝天门大桥人行道'},
 {id:'east-north',name:'东水门大桥 · 渝中观光电梯',x:358,z:eastBridgeZ(358)+3.65,low:levels.riverwalk,high:23,lowLabel:'湖广会馆 · 两江汇步道',highLabel:'东水门大桥人行道'},
 {id:'east-south',name:'东水门大桥 · 南岸观光电梯',x:547,z:eastBridgeZ(547)+3.65,low:levels.bankRoad,high:23,lowLabel:'龙门浩 · 南滨路',highLabel:'东水门大桥人行道'}
];
riverwalks.archSouthAccess=[[247.2,archDeck(247.2),917],[247.2,archDeck(247.2),bridgeZ(247.2)-7.4],[250,archDeck(250),bridgeZ(250)]];
riverwalks.plazaAccess=[[312,levels.riverwalk,205],[327,levels.riverwalk,198],[321,levels.square,183]];
riverwalks.hongyaQuayAccess=[[22,levels.riverwalk,20],[17,levels.riverwalk,20],[17,coreHeight(2.28),14.18],[22,coreHeight(2.28),14.18]];
// East crossing retains the mapped bridge line but now meets the 180m and 193m walks.
riverwalks.dongshuimen=[358,378,394,526,537,547].map(x=>[x,23,eastBridgeZ(x)+3.65]);
riverwalks.yuzhong.at(-1)[2]=eastBridgeZ(358)+3.65;
riverwalks.eastSouthAccess=[[547,levels.bankRoad,eastBridgeZ(547)+3.65],[551,levels.bankRoad,-195]];

export const riverMarkers = [
  {title:'青草坝 · 江北桥头', next:'观光电梯上桥 · 江滩步道向南', route:'jiangbei', at:18},
  {title:'江北嘴江滩公园', next:'沿江 → 三洞桥', route:'jiangbei', at:14},
  {title:'三洞桥一带', next:'沿江 → 重庆大剧院', route:'jiangbei', at:8},
  {title:'重庆大剧院 · 江滩', next:'沿江 → 千厮门大桥', route:'jiangbei', at:3},
  {title:'千厮门大桥 · 江北桥头', next:'经公园梯道 → 千厮门大桥', route:'jiangbei', at:0},
  {title:'两江汇滨江步道', next:'沿嘉陵江 → 洪崖洞 · 嘉滨路', route:'yuzhong', at:8},
  {title:'朝天门码头', next:'两江汇步道 → 千厮门大桥', route:'yuzhong', at:12},
  {title:'朝天门广场', next:'嘉陵江一侧 → 洪崖洞', route:'yuzhong', at:14},
  {title:'长江侧亲水步道', next:'往半岛尖 → 朝天门广场', route:'yuzhong', at:17},
  {title:'朝天门大桥 · 南岸桥头', next:'沿南滨路 → 东水门大桥', route:'nanan', at:18},
  {title:'南滨路 · 长嘉汇一带', next:'沿长江上行 → 东水门大桥', route:'nanan', at:11},
  {title:'东水门大桥', next:'过桥 → 长江侧两江汇步道', route:'dongshuimen', at:3},
  {title:'两江汇步道 · 长江侧', next:'沿江 → 朝天门广场', route:'yuzhong', at:21}
];

for(const marker of riverMarkers){
 if(marker.route==='yuzhong'&&marker.at>=1)marker.at+=2;
 if(marker.route==='jiangbei'&&marker.at>=8)marker.at+=2;
 if(marker.route==='nanan'&&marker.at>=1)marker.at+=marker.at>=17?4:2;
}

export function riverArea(x,y,z) {
  if(z>880 && x>=-155 && x<279 && y>23) return ['朝天门长江大桥','江北岸 → 千厮门大桥　南岸 → 东水门大桥'];
  if(x>367 && x<547 && z<-142 && z>-206 && y>9) return ['东水门大桥','往渝中岸 → 两江汇步道 · 朝天门广场'];
  if(z>22 && z<286 && Math.abs(x-qiansimenX(z))<12 && y>18 && y<24) {
    return ['千厮门大桥','过江 → 洪崖洞 · 沧白路'];
  }
  let nearest=null;
  let best=52**2;
  for(const marker of riverMarkers){
    const [px,py,pz]=riverwalks[marker.route][marker.at];
    const distance=(px-x)**2+(pz-z)**2+((py-y)*.7)**2;
    if(distance<best){best=distance;nearest=marker;}
  }
  if(nearest) return [nearest.title,nearest.next];
  if(x>205 && x<364 && z>48 && z<183) return ['重庆来福士','沿广场大梯道 → 朝天门码头'];
  if(z<-16 && x<-35 && x>-116 && z>-80) return ['戴家巷','下崖壁步道 → 嘉滨路'];
  if(x>-35 && x<40 && z>-46 && z<17) return [z<-17?'沧白路':'洪崖洞 · 嘉滨路','沿江向东 → 朝天门广场'];
  if(z>197 && z<890 && x<195) return ['江北岸 · 江滩步道','向千厮门大桥 → 洪崖洞'];
  if(x>395 || (x>169 && z>490)) return ['南岸 · 长江沿岸','朝天门大桥 → 江北岸'];
  return ['重庆 · 两江沿岸',''];
}
