import assert from 'node:assert/strict';const root=new URL('../',import.meta.url);
const {geo,terrainHeight}=await import(new URL('src/geography.js',root));
const {riverwalks,lowerQuay}=await import(new URL('src/river-route.js',root));
const buckets=new Map();let triangles=0;
for(const points of Object.values(geo.triangles))for(let i=0;i<points.length;i+=6){
 const t=[];for(let j=0;j<6;j+=2)t.push([points[i+j],terrainHeight(points[i+j],points[i+j+1]),points[i+j+1]]);triangles++;
 const xs=t.map(p=>p[0]),zs=t.map(p=>p[2]);
 for(let x=Math.floor(Math.min(...xs)/14);x<=Math.floor(Math.max(...xs)/14);x++)for(let z=Math.floor(Math.min(...zs)/14);z<=Math.floor(Math.max(...zs)/14);z++){const key=x+','+z;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(t);}
}
const problems=[];
for(const [name,path] of Object.entries({...riverwalks,lowerQuay})){
 let max=-Infinity,worst=null;
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],steps=Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/.5);
  for(let j=0;j<=steps;j++){
   const [x,y,z]=a.map((v,k)=>v+(b[k]-v)*j/steps);
   for(const [a,b,c] of buckets.get(Math.floor(x/14)+','+Math.floor(z/14))||[]){
    const den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
    const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den,w=1-u-v;
    if(Math.min(u,v,w)<-1e-6)continue;const h=u*a[1]+v*b[1]+w*c[1];
    if(h-y>max){max=h-y;worst={x,y,z,h};}
   }
  }
 }
 if(max>.12)problems.push({name,max,worst});
}
console.log(JSON.stringify({triangles,problems},null,2));
assert.equal(problems.length,0,'Rendered terrain intrudes into the walking route');
