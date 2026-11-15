import * as THREE from 'three';

// Four storeys per tile. All facade dimensions use the scene's 0.35 units/metre.
// These painted materials express the documented building types, not photo scans.
export function waterfrontMaterials(tex){
 const themes=[
  {wall:'#30353e',joint:'#353945',frame:'#263a47',sill:'#777b7b'},
  {wall:'#494540',joint:'#5c5c5e',frame:'#324d4b',sill:'#b0a69a'},
  {wall:'#483a33',joint:'#403d3e',frame:'#44372e',sill:'#ab9172'},
  {wall:'#79602f',joint:'#866833',frame:'#50322a',sill:'#d0af70'},
  {wall:'#283d49',joint:'#253943',frame:'#849398',sill:'#859b9e'},
  {wall:'#746b5d',joint:'#877d6e',frame:'#3d4d4a',sill:'#ddd2ba'}
 ];
 return themes.map((p,style)=>new THREE.MeshBasicMaterial({side:THREE.DoubleSide,map:tex(1024,1024,(c,w,h)=>{
  c.fillStyle=p.wall;c.fillRect(0,0,w,h);
  if(style===2||style===3){
   for(let row=0;row<100;row++)for(let col=-1;col<40;col++){
    const x=col*28+(row%2)*14,y=row*10.24;
    c.fillStyle=['#9a746621','#251f2429','#dab18d16'][(row*7+col+300)%3];c.fillRect(x+1,y+1,26,8.7);
   }
  }else if(style===1){
   c.strokeStyle='#d4cab018';c.lineWidth=1;
   for(let i=0;i<w;i+=8){c.beginPath();c.moveTo(i,0);c.lineTo(i,h);c.stroke();}
   for(let i=0;i<h;i+=12){c.beginPath();c.moveTo(0,i);c.lineTo(w,i);c.stroke();}
  }
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
   const x=col*256,y=row*256,s=(row*13+col*7+style*11)%11,lit=s<4;
   const left=style===4?8:45,ww=style===4?240:166,top=style===4?14:57,hh=style===4?219:145;
   c.fillStyle=p.joint;c.fillRect(x, y+246,256,10);
   c.fillStyle='#202a33';c.fillRect(x+left-6,y+top-6,ww+12,hh+13);
   const grad=c.createLinearGradient(x,y+top,x+ww,y+top+hh);
   grad.addColorStop(0,lit?'#e4b573':style===4?'#536d7e':'#40494d');
   grad.addColorStop(.55,lit?'#a57648':'#27343d');grad.addColorStop(1,lit?'#746149':'#1c2931');
   c.fillStyle=grad;c.fillRect(x+left,y+top,ww,hh);
   if(lit){
    c.fillStyle='#f0d29b';c.fillRect(x+left+8,y+top+5,ww-16,5);
    c.fillStyle='#634e4677';c.fillRect(x+left+12,y+top+hh*.63,ww*.56,hh*.37);
    c.fillStyle='#edd7b55c';c.fillRect(x+left+3,y+top+3,ww*.22,hh-6);
    c.fillStyle='#302d2f50';c.fillRect(x+left+ww*.72,y+top+hh*.24,ww*.17,hh*.76);
   }
   c.strokeStyle=p.frame;c.lineWidth=5;c.strokeRect(x+left,y+top,ww,hh);
   c.fillStyle=p.frame;c.fillRect(x+left+ww*.5-2,y+top,4,hh);
   if(style!==4)c.fillRect(x+left,y+top+hh*.33,ww,4);
   if(style===2||style===3){
    for(const a of [.25,.75])c.fillRect(x+left+ww*a-1,y+top,3,hh);
    c.fillRect(x+left,y+top+hh*.70,ww,4);
   }
   c.fillStyle=p.sill;c.fillRect(x+left-10,y+top+hh+4,ww+20,7);
   c.fillStyle='#191f2750';c.fillRect(x+left-6,y+top+hh+11,ww+12,7);
   if(style===5){c.fillStyle=p.sill;c.fillRect(x+left-12,y+top-17,ww+24,9);}
   if(style!==4&&s===7){
    c.fillStyle='#aaa99d';c.fillRect(x+185,y+210,43,25);c.fillStyle='#454f54';
    for(let k=0;k<5;k++)c.fillRect(x+190,y+214+k*4,30,2);
   }
   // Rain streaks stay anchored to masonry, not to the screen.
   if(style!==4){c.fillStyle='#2d30361b';for(let k=0;k<4;k++)c.fillRect(x+12+k*69,y+208,3,35);}
  }
 })}));
}
