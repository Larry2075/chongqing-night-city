import * as THREE from 'three';

// OSM footprints locate the buildings. Reference storefronts are composed
// on their street-facing edges at scene scale.
export const alleyBuildings = {
  809713525:{wall:'brick', edges:{4:'noodles'}},
  809713526:{wall:'plaster',edges:{9:'tea'}},
  809713527:{wall:'brick',edges:{2:'cat'}},
  809713531:{wall:'brick',edges:{8:'hotpot'}},
  809713530:{wall:'plaster',edges:{7:'retail'}},
  809713534:{wall:'plaster',edges:{0:'retail'}},
  809713523:{wall:'brick',edges:{0:'retail'}},
  809713539:{wall:'plaster',edges:{6:'retail'}},
  809713507:{wall:'brick',edges:{}}
};

export function buildFrontages({box,mat,put,panel,tex}) {
  const black=mat('#26242c'), timber=mat('#513636'), walnut=mat('#784d3a');
  const green=mat('#285c53'), iron=mat('#3e454f'), sill=mat('#8a8180');
  const glass=mat('#56505c',{emissive:'#302840',emissiveIntensity:.65});
  const warm=mat('#d8904f',{emissive:'#ee9a45',emissiveIntensity:.70});
  const red=mat('#af3639'), cream=mat('#f4d6c9'), pink=mat('#d97a92');
  const pot=mat('#824441'), leaf=mat('#3a6150'), neon=mat('#f8bd7a',{emissive:'#ff9349',emissiveIntensity:1});
  const body = new THREE.SphereGeometry(1,11,7);
  const sprite = (b,x,y,z,sx,sy,sz,m) => {
    const [px,pz]=b.point(x,z);
    const scaleY=b.yScale||1;
    put(new THREE.Mesh(body,m),px,b.base+y*scaleY,pz).scale.set(sx,sy*scaleY,sz);
  };

  function face(a,b,base,orientation=1) {
    const width=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const ux=(b[0]-a[0])/width, uz=(b[1]-a[1])/width;
    const nx=uz*orientation,nz=-ux*orientation, yaw=Math.atan2(nx,nz);
    const x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
    const point=(across,out)=>[x+ux*across+nx*out,z+uz*across+nz*out];
    return {
      base,width,point,
      block(w,h,d,m,across,y,out,tilt=0){
        const [px,pz]=point(across,out);
        const item=box(w,h,d,m,px,base+y,pz,yaw);
        if(tilt) item.rotateX(tilt);
        return item;
      },
      sign(title,w,h,across,y,out,style={}){
        const [px,pz]=point(across,out);
        return panel(title,px,base+y,pz,w,h,{ angle:yaw,...style });
      }
    };
  }

  const brick=new THREE.MeshBasicMaterial({map:tex(192,192,(ctx,w,h)=>{
    ctx.fillStyle='#876158'; ctx.fillRect(0,0,w,h);
    const colors=['#78514b','#683f3a','#87534a','#794740','#936052','#6e4846'];
    for(let row=0;row<12;row++)for(let col=-1;col<6;col++){
      const x=col*38+(row%2)*19, y=row*16;
      ctx.fillStyle=colors[((row*13+col*7)%6+6)%6];
      ctx.fillRect(x+1,y+1,36,14);
      ctx.fillStyle='#c59a801f';ctx.fillRect(x+1,y+1,35,2);
      ctx.fillStyle='#33242933';ctx.fillRect(x+1,y+13,36,2);
    }
  })});
  const plaster=new THREE.MeshBasicMaterial({map:tex(192,192,(ctx,w,h)=>{
    ctx.fillStyle='#797071';ctx.fillRect(0,0,w,h);
    for(let i=0;i<38;i++){
      const x=i*79%w,y=i*43%h;
      ctx.fillStyle=i%2?'#655f6242':'#b6a69b36';ctx.fillRect(x,y,4+i%12,2+i%9);
    }
  })});

  function windowFrame(b,x,y,w,h,lit,frame=green,lattice=false) {
    b.block(w+.16,h+.14,.095,black,x,y,.036);
    b.block(w,h,.035,lit?warm:glass,x,y,.09);
    for(const side of [-1,1]) {
      b.block(.067,h+.02,.068,frame,x+side*w/2,y,.118);
      b.block(w+.075,.061,.068,frame,x,y+side*h/2,.118);
    }
    b.block(.055,h,.066,frame,x,y,.12);
    b.block(w,.048,.064,frame,x,y+h*.18,.12);
    if(lattice) {
      for(const along of [-.29,.29]) b.block(w*.052,h,.068,frame,x+w*along,y,.12);
      for(const offset of [-.25,.34]) b.block(w,.042,.065,frame,x,y+h*offset,.12);
    }
    b.block(w+.25,.075,.22,sill,x,y-h*.5-.055,.15);
  }

  function ac(b,x,y) {
    b.block(.54,.37,.29,sill,x,y,.20);
    b.block(.24,.24,.03,iron,x-.105,y,.356);
    for(let i=-2;i<=2;i++) b.block(.28,.012,.02,black,x-.1,y+i*.044,.375);
    b.block(.029,.79,.035,iron,x+.28,y-.25,.055);
  }

  function cats(b) {
    for(const [x,y,scale] of [[-.31,1.58,.39],[.07,2.05,.50],[.33,1.29,.29],[-.06,1.02,.22]]) {
      const at=x*b.width;
      sprite(b,at,y,.13,scale,scale*.69,.13,cream);
      for(const side of [-1,1]){
        sprite(b,at+side*.57*scale,y+scale*.58,.14,.30*scale,.40*scale,.11,cream);
        sprite(b,at+side*.58*scale,y+scale*.63,.235,.12*scale,.18*scale,.028,pink);
        sprite(b,at+side*.34*scale,y+.04,.274,.078*scale,.084*scale,.028,black);
        sprite(b,at+side*.15*scale,y-.17*scale,.274,.10*scale,.065*scale,.022,pink);
      }
    }
    b.sign('戴家巷 · 猫猫墙',Math.min(2.5,b.width*.65),.32,.05,2.72,.16,{bg:'#372936',fg:'#f5d7cb'});
  }

  function storefront(b,style,title,subtitle='') {
    const raw=b,scale=style==='hongya'?1:.47;
    b={...raw,yScale:scale,
      block(w,h,d,m,x,y,out,tilt=0){return raw.block(w,h*scale,d,m,x,y*scale,out,tilt);},
      sign(t,w,h,x,y,out,opts){return raw.sign(t,w,h*scale,x,y*scale,out,opts);}
    };
    if(style==='cat') { cats(b); return; }
    const width=b.width, wood=style==='hongya'||style==='noodles'||style==='tea';
    const material=wood?walnut:style==='hotpot'?red:green;
    b.block(width,.16,.31,black,0,.08,.122);
    b.block(width,2.23,.08,timber,0,1.16,.052);
    const bay=width/Math.max(2,Math.round(width/1.25));
    for(let x=-width/2+bay*.5;x<width/2-.2;x+=bay){
      windowFrame(b,x,1.12,bay*.80,1.90,true,material,wood);
      b.block(.065,.055,.12,neon,x+bay*.14,1.01,.17);
      if(wood) b.block(bay*.72,.30,.067,walnut,x,.36,.13);
    }
    for(const x of [-width/2+.08,width/2-.08]) b.block(.14,2.6,.15,material,x,1.34,.145);
    const signBg=style==='hotpot'?'#981c29':wood?'#513020':'#203d3a';
    if (title) b.sign(title,Math.min(width*.95,4.4),.61,0,2.43,.185,{bg:signBg,fg:'#fff0bc',subtitle});
    if (style==='hongya') {
      b.block(width+.32,.11,.69,timber,0,2.89,.36);
      for(const side of [-1,1]){
        const x=side*width*.41;
        b.block(.02,.31,.034,black,x,2.61,.62);
        sprite(b,x,2.40,.62,.12,.16,.12,red);
        b.block(.055,.09,.05,neon,x,2.24,.62);
      }
    } else {
      b.block(width+.17,.10,.57,material,0,2.85,.30,.22);
      for(let x=-width/2+.08;x<width/2;x+=.20) b.block(.038,.033,.54,sill,x,2.90,.30,.22);
    }
    if(style==='noodles'){
      for(const x of [-width*.32,width*.31]){
        b.block(.34,.095,.30,red,x,.38,.45);
        for(const s of [-1,1]) b.block(.055,.34,.22,red,x+s*.126,.17,.45);
      }
      b.sign('28号',.43,.24,-width*.35,1.68,.162,{bg:'#325c71',fg:'#fbf2dc'});
    }
    if(style==='tea'||style==='retail'){
      for(const x of [-width*.38,width*.38]) {
        b.block(.25,.26,.26,pot,x,.13,.37);
        sprite(b,x,.34,.36,.16,.17,.14,leaf);
      }
    }
  }

  const shopNames = {
    noodles:['周小波重庆小面','戴家巷 28号'], tea:['小波茶馆','戴家巷 28号'],
    hotpot:['朱氏胖子烂火锅','戴家巷老街']
  };
  function detailWall(b,floors,height,building,edge) {
    const store=building.edges[edge];
    const rows=Math.max(2,floors), floorHeight=height/rows;
    const columns=Math.floor(b.width/1.40);
    for(let row=store?1:0;row<rows;row++){
      for(let col=0;col<columns;col++){
        const x=(col+.5)*b.width/columns-b.width/2;
        const y=(row+.54)*floorHeight;
        windowFrame(b,x,y,Math.min(.73,b.width/columns*.65),floorHeight*.58,(edge*11+row*3+col)%7<3);
        if(row>0&&(edge+row+col)%7===1) ac(b,x+.32,y-floorHeight*.4);
      }
      if(b.width>4 && row>0) b.block(b.width,.076,.18,sill,0,row*floorHeight,.09);
    }
    if(store) storefront(b,store,...(shopNames[store]??[]));
    if(b.width>2.2) {
      const x=b.width*.46;
      b.block(.043,height,.058,iron,x,height/2,.105);
      b.block(b.width,.033,.029,black,0,2.73,.11);
    }
  }
  return {face,materials:{brick,plaster},detailWall,storefront};
}
