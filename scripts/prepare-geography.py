"""Rebuild checked WGS84 geometry. Dev dependencies: Pillow, shapely.
Input: OSM map API XML and public Mapzen Terrarium tiles cached in /tmp/cq-dem.
No imagery is redistributed with the site. Units retain the existing scene scale.
"""
import json, math, os, xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image
from shapely.geometry import Polygon, box
from shapely.ops import unary_union, triangulate
ROOT=Path(__file__).resolve().parents[1]
r=ET.parse('/tmp/cq-rivers-map.osm').getroot()
nodes={n.get('id'):(float(n.get('lon')),float(n.get('lat'))) for n in r.findall('node')}
ways={w.get('id'):w for w in r.findall('way')}
origin=[106.57512184239037,29.5649409009097]; scale=[34865.67662295764,38850.105189991904]
def xy(p):return [(p[i]-origin[i])*scale[i] for i in range(2)]
def ring(w):return [xy(nodes[n.get('ref')]) for n in w.findall('nd') if n.get('ref') in nodes]
def tags(w):return {t.get('k'):t.get('v') for t in w.findall('tag')}
def rounded(p):return [[round(x,2),round(z,2)] for x,z in list(p.exterior.coords)[:-1]]
water=unary_union([Polygon(ring(ways[k])).buffer(0) for k in ['31258061','34095908']])
lands=box(-650,-520,1100,1450).difference(water)
land={('nanan' if p.centroid.x>0 else 'jiangbei' if p.centroid.y>0 else 'peninsula'):p.simplify(.5,preserve_topology=True) for p in lands.geoms}
# Terrarium samples are source elevations, not exact contemporary street levels.
tiles={}
for path in Path('/tmp/cq-dem').glob('*.png'):
 x,y=map(int,path.stem.split('-'));tiles[x,y]=Image.open(path).convert('RGB')
def elevation(x,z):
 lon=origin[0]+x/scale[0];lat=origin[1]+z/scale[1]
 tx=(lon+180)/360*8192;ty=(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*8192
 px=(tx%1)*256;py=(ty%1)*256
 R,G,B=tiles[int(tx),int(ty)].getpixel((min(255,int(px)),min(255,int(py))))
 return round(R*256+G+B/256-32768,2)
step=14;xs=list(range(-650,1101,step));zs=list(range(-520,1451,step));xs.append(1100) if xs[-1]!=1100 else None;zs.append(1450) if zs[-1]!=1450 else None
heights=[[elevation(x,z) for x in xs] for z in zs]
triangles={}
for name,poly in land.items():
 ts=[]
 for z,nz in zip(zs,zs[1:]):
  for x,nx in zip(xs,xs[1:]):
   cell=poly.intersection(box(x,z,nx,nz))
   if cell.is_empty:continue
   polys=[cell] if cell.geom_type=='Polygon' else list(getattr(cell,'geoms',[]))
   for p in polys:
    if p.geom_type!='Polygon':continue
    for t in triangulate(p):
     if not p.covers(t.representative_point()):continue
     ts.extend(round(c,2) for pt in list(t.exterior.coords)[:3] for c in pt)
 triangles[name]=ts
buildings=[];landmarks=[]
for id,w in ways.items():
 t=tags(w)
 if not t.get('building'):continue
 ps=ring(w)
 if len(ps)<4:continue
 p=Polygon(ps).buffer(0)
 if p.geom_type!='Polygon' or p.area<.5 or not box(-640,-510,1090,1440).covers(p):continue
 cx,cz=p.centroid.coords[0]
 if not any(l.covers(p.centroid) for l in land.values()):continue
 if -175<cx<145 and -200<cz<35:continue
 try:h=float(t.get('height','').replace('m','').strip())*.35;known=True
 except ValueError:
  try:h=float(t.get('building:levels',''))*3.3*.35;known=True
  except ValueError:h=(11 if t.get('historic') else 30)*.35;known=False # explicit type estimate, overridden by building-survey
 buildings.append([int(id),rounded(p),round(max(2,min(h,155)),2),t.get('name',''),known])
 if '塔楼' in t.get('name','') or t.get('name')=='重庆大剧院':landmarks.append([t['name'],round(cx,2),round(cz,2),round(h,2)])
geo={'origin':origin,'scale':scale,'verticalScale':.35,'waterDatum':170,'bounds':[-650,-520,1100,1450],'lands':{n:rounded(p) for n,p in land.items()},'triangles':triangles,'xs':xs,'zs':zs,'heights':heights,'landmarks':landmarks}
(ROOT/'data/geography.js').write_text('// WGS84 OSM shorelines © OpenStreetMap contributors (ODbL).\n// Mapzen Terrarium / global SRTM data courtesy of USGS. Accessed 2026-11-14.\nexport const geography = '+json.dumps(geo,separators=(',',':'))+';\n')
(ROOT/'data/river-buildings.js').write_text('// WGS84 footprints © OpenStreetMap contributors, ODbL. Heights without source tags are estimated.\nexport const riverBuildings = '+json.dumps(buildings,ensure_ascii=False,separators=(',',':'))+';\n')
print('buildings',len(buildings),'terrain triangles',sum(len(t)//6 for t in triangles.values()))
print('terrain source elevations',[(x,z,elevation(x,z)) for x,z in [(0,-50),(320,200),(80,302),(-100,800),(570,300)]])
