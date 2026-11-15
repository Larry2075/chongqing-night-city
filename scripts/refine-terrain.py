"""Adaptively tessellate the existing DEM model at path/door scale; no surveyed heights are invented."""
import json,subprocess
from pathlib import Path
from shapely.geometry import Polygon,box
from shapely.ops import triangulate
root=Path(__file__).resolve().parents[1];p=root/'data/geography.js';text=p.read_text();geo=json.loads(text[text.index(' = ')+3:].strip().rstrip(';'))
# Refine where the rendered planar triangles would deviate from the same height
# function used for walking. Both possible diagonals are checked at each cell.
code="""
import {terrainHeight,nearestWalk,geo} from './src/geography.js';
const memo=new Map(),cells=[];
function h(x,z){const k=x+','+z;if(!memo.has(k))memo.set(k,terrainHeight(x,z));return memo.get(k);}
function cell(x,z,nx,nz,depth=0){
 const mx=(x+nx)/2,mz=(z+nz)/2,a=h(x,z),b=h(nx,z),c=h(nx,nz),d=h(x,nz),m=h(mx,mz);
 const near=nearestWalk(mx,mz).distance<14,limit=near?.038:.22;
 const error=Math.max(Math.abs(m-(a+c)/2),Math.abs(m-(b+d)/2),Math.abs(h(mx,z)-(a+b)/2),Math.abs(h(nx,mz)-(b+c)/2),Math.abs(h(mx,nz)-(c+d)/2),Math.abs(h(x,mz)-(d+a)/2));
 if(error>limit&&depth<(near?6:3)) {cell(x,z,mx,mz,depth+1);cell(mx,z,nx,mz,depth+1);cell(x,mz,mx,nz,depth+1);cell(mx,mz,nx,nz,depth+1);}
 else cells.push([x,z,nx,nz]);
}
for(let j=1;j<geo.zs.length;j++)for(let i=1;i<geo.xs.length;i++)cell(geo.xs[i-1],geo.zs[j-1],geo.xs[i],geo.zs[j]);
console.log(JSON.stringify(cells));
"""
cells=json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=root));out={}
for name,ring in geo['lands'].items():
 land=Polygon(ring).buffer(0);tri=[]
 for coords in cells:
  cell=box(*coords)
  if not land.intersects(cell):continue
  clipped=land.intersection(cell)
  parts=[clipped] if clipped.geom_type=='Polygon' else list(getattr(clipped,'geoms',[]))
  for poly in parts:
   if poly.geom_type!='Polygon':continue
   for t in triangulate(poly):
    if not poly.covers(t.representative_point()):continue
    tri.extend(round(c,4) for pt in list(t.exterior.coords)[:3] for c in pt)
 out[name]=tri
geo['triangles']=out
geo['refinement']={'adaptive':True,'nearRouteMinimumGridUnits':14/64,'nearRouteErrorTargetUnits':.038,'sourceDemUnchanged':True}
p.write_text(text[:text.index(' = ')+3]+json.dumps(geo,separators=(',',':'))+';\n')
print('terrain triangles',sum(len(p)//6 for p in out.values()))
