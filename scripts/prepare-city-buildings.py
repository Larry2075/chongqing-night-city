"""Compile the complete current scene footprint layer from cached public GIS data.

Inputs in /tmp/cq-building-assets/ were downloaded from the official OSM map API
and the Overture 2026-10-21.0 release. Runtime requires only data/city-buildings.js.
Requires Shapely. Run with /tmp/cq-geo-venv/bin/python scripts/prepare-city-buildings.py.
Keeps existing detailed core buildings and authored landmark geometry separately.
"""
import json, math, re, subprocess
from collections import Counter
from pathlib import Path
from shapely.geometry import Polygon, box, shape
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path('/tmp/cq-building-assets')
ORIGIN = [106.57512184239037, 29.5649409009097]
SCALE = [34865.67662295764, 38850.105189991904]
UNIT = .35
BOUNDS = box(-650, -520, 1100, 1450)
reference = json.loads(subprocess.check_output([
    'node', '--input-type=module', '-e',
    "import{buildings}from './data/hongyadong.js';import{buildingSurvey}from './data/building-survey.js';import{geography}from './data/geography.js';console.log(JSON.stringify({buildings,buildingSurvey,lands:geography.lands}));"
], cwd=ROOT))
land = unary_union([Polygon(ring).buffer(0) for ring in reference['lands'].values()])
core_ids = {str(row[0]) for row in reference['buildings']}
core_polygons = [Polygon(row[1][0], row[1][1:]).buffer(0) for row in reference['buildings']]
core_index = STRtree(core_polygons)
hand_landmarks = [
    ('raffles-podium', Polygon([[215,81],[250,52],[329,49],[354,97],[336,144],[296,173],[250,150],[221,116]])),
    ('grand-theatre', box(40,278,115,325)),
    ('hongyadong', box(-34,-18,35,8)),
    ('daijiaxiang-cliff', box(-115,-17,-35,35)),
]
exclusions = Counter()
excluded_ids = {}
repairs = Counter()
records = []
osm_records = []
seen_osm = set()

def exclude(reason, id):
    exclusions[reason] += 1
    excluded_ids.setdefault(reason, []).append(str(id))

def project(g):
    return transform(lambda x,y,z=None: ((x-ORIGIN[0])*SCALE[0], (y-ORIGIN[1])*SCALE[1]), g)

def parts(g):
    if g.geom_type == 'Polygon':
        return [g]
    return [p for p in getattr(g, 'geoms', []) if p.geom_type == 'Polygon']

def num(v):
    if v is None:
        return None
    match = re.search(r'-?\d+(?:\.\d+)?', str(v))
    return float(match.group(0)) if match else None

def height_value(v):
    h = num(v)
    if h is not None and ('ft' in str(v).lower() or "'" in str(v)):
        h *= .3048
    return h if h is not None and 1 <= h <= 600 else None

def explicit_height(properties, id, source):
    tags = properties.get('tags', {})
    survey = reference['buildingSurvey'].get(str(id), {})
    method = survey.get('method', '')
    if method in ['owner-published','engineer-published','architect-published','osm-height','osm-levels']:
        return survey['heightMeters'], method
    h = height_value(properties.get('height') or tags.get('height'))
    if h is not None:
        return h, 'osm-height' if source == 'osm' else 'overture-height'
    floors = num(properties.get('num_floors') or tags.get('building:levels'))
    if floors is not None and 0 < floors < 160:
        kind = tags.get('building') or properties.get('class') or properties.get('subtype') or ''
        floor_height = 3.1 if kind in ['residential','apartments','house','detached','terrace'] else 3.6 if kind in ['office','commercial','hotel','retail','mall'] else 3.3
        return floors*floor_height, 'osm-levels' if source == 'osm' else 'overture-levels'
    return None, None

def prepare(feature, source, id):
    properties = feature['properties']
    tags = properties.get('tags', {})
    names = properties.get('names') or {}
    name = properties.get('name') or names.get('primary') or tags.get('name') or ''
    kind = tags.get('building') or properties.get('class') or properties.get('subtype') or ''
    if str(id) in core_ids:
        exclude('detailed-core-id', id); return None
    if kind in ['roof','bridge'] or tags.get('man_made') == 'bridge' or name == '朝天门广场' or '电梯' in name:
        exclude('not-independent-building', id); return None
    g = project(shape(feature['geometry']))
    if not g.is_valid:
        g = g.buffer(0); repairs['repaired-invalid-geometry'] += 1
    if g.is_empty or not g.intersects(BOUNDS):
        exclude('outside-scene', id); return None
    g = g.intersection(BOUNDS)
    if g.area < .735: # 6 square metres; tiny edge fragments cannot define a useful building mass.
        exclude('tiny-or-edge-fragment', id); return None
    on_land = g.intersection(land)
    if on_land.is_empty or on_land.area/g.area < .20:
        exclude('water-only-or-mostly-water', id); return None
    if on_land.area < g.area-.02:
        repairs['clipped-to-shoreline'] += 1
    g = on_land
    if g.area < .735:
        exclude('tiny-or-edge-fragment', id); return None
    for label, polygon in hand_landmarks:
        overlap = g.intersection(polygon).area
        if overlap/g.area >= .20 or polygon.covers(g.representative_point()):
            exclude('authored-'+label, id); return None
    for index in core_index.query(g):
        existing = core_polygons[index]
        overlap = g.intersection(existing).area
        if overlap/min(g.area,existing.area) >= .20 or existing.covers(g.representative_point()):
            exclude('detailed-core-overlap', id); return None
    h, method = explicit_height(properties,id,source)
    return {'id':id,'geom':g,'height':h,'method':method,'source':source,'name':name,'kind':kind,
            'area':g.area/UNIT**2,'cx':g.centroid.x,'cz':g.centroid.y}

osm = json.loads((CACHE/'osm-buildings.geojson').read_text())['features']
overture = json.loads((CACHE/'overture-buildings.geojson').read_text())['features']
for feature in osm:
    source_id = feature['properties']['id'].split('/')
    id = int(source_id[-1]) if source_id[-2] == 'way' else 'r'+source_id[-1]
    seen_osm.add(('w' if source_id[-2] == 'way' else 'r')+source_id[-1])
    record = prepare(feature,'osm',id)
    if record:
        osm_records.append(record)
        records.append(record)

osm_index = STRtree([r['geom'] for r in osm_records])
ml_records = []
for feature in overture:
    properties = feature['properties']
    sources = properties.get('sources') or []
    osm_source = next((s for s in sources if s.get('dataset') == 'OpenStreetMap'),None)
    if osm_source and (osm_source.get('record_id') or '').split('@')[0] in seen_osm:
        exclude('overture-duplicate-osm-id',feature['id']); continue
    source = 'overture-eastasia' if any(s.get('dataset') == 'doi:10.5281/zenodo.8174931' for s in sources) else 'overture-other'
    record = prepare(feature,source,feature['id'])
    if not record:
        continue
    g = record['geom']; duplicate = False
    for index in osm_index.query(g):
        existing = osm_records[index]['geom']
        overlap = g.intersection(existing).area
        if overlap/min(g.area,existing.area) >= .20 or existing.covers(g.representative_point()):
            exclude('overture-overlap-osm',record['id']); duplicate = True; break
    if not duplicate:
        ml_records.append(record)

# Overture has already merged its sources, but remove any substantial duplicate
# fragments still present after clipping. Adjacent roof pieces remain separate.
ml_index = STRtree([r['geom'] for r in ml_records])
kept = set()
for index in sorted(range(len(ml_records)), key=lambda i: ml_records[i]['area'], reverse=True):
    record = ml_records[index]; g = record['geom']; duplicate = False
    for other in ml_index.query(g):
        if int(other) not in kept:
            continue
        existing = ml_records[int(other)]['geom']
        if g.intersection(existing).area/min(g.area,existing.area) >= .65:
            exclude('overlapping-ml-duplicate',record['id']); duplicate = True; break
    if not duplicate:
        kept.add(index); records.append(record)

known = [r for r in records if r['height'] is not None and r['height'] <= 240 and r['area'] >= 20]
residential = {'residential','apartments','house','detached','terrace'}

def weighted_median(values):
    total = sum(w for h,w in values); at = 0
    for h,w in sorted(values):
        at += w
        if at >= total/2:
            return h
    return values[-1][0]

def estimate(record):
    area,kind = record['area'],record['kind']
    if kind in ['garage','garages','shed','hut','kiosk']:
        return 4.5, 'type-estimate'
    if kind in ['temple','church','chapel'] or any(label in record['name'] for label in ['纪念馆','教堂','旧址']):
        return 11, 'type-estimate'
    if area < 30:
        return 5.5, 'small-footprint-estimate'
    candidates = []
    for peer in known:
        distance = math.hypot(record['cx']-peer['cx'],record['cz']-peer['cz'])
        size_penalty = abs(math.log(max(20,area)/max(20,peer['area'])))
        same_kind = kind == peer['kind'] or (kind in residential and peer['kind'] in residential)
        score = distance + size_penalty*35 + (0 if same_kind or not kind else 35)
        candidates.append((score,distance,size_penalty,peer['height']))
    peers = sorted(candidates)[:9]
    h = weighted_median([(height, 1/((20+distance)**1.5*(1+size_penalty))) for score,distance,size_penalty,height in peers]) if peers else 18
    cap = 12 if area < 80 else 25 if area < 180 else 110
    rectangle = record['geom'].minimum_rotated_rectangle
    corners = list(rectangle.exterior.coords)
    sides = [math.dist(corners[i],corners[i+1]) for i in range(4)]
    if min(sides)>0 and max(sides)/min(sides)>8:
        cap = min(cap,18)
    h = max(6.6,min(cap,h))
    return round(h/3.3)*3.3, 'nearby-size-estimate'

for record in records:
    if record['height'] is None:
        record['height'],record['method'] = estimate(record)

def rings(polygon):
    def coords(ring):
        return [[round(x,2),round(z,2)] for x,z in list(ring.coords)[:-1]]
    return [coords(polygon.exterior),*[coords(ring) for ring in polygon.interiors]]

output=[]
rendered_record_ids=set()
for record in records:
    polygons=parts(record['geom'])
    for i,polygon in enumerate(polygons):
        if polygon.area < .735:
            repairs['tiny-clipped-component-dropped'] += 1
            continue
        id=record['id'] if len(polygons)==1 else str(record['id'])+':'+str(i)
        rounded_rings=rings(polygon)
        rounded=Polygon(rounded_rings[0],rounded_rings[1:])
        if not rounded.is_valid:
            rounded=rounded.buffer(0)
            repairs['repaired-coordinate-rounding'] += 1
        rounded_parts=parts(rounded)
        for j,part in enumerate(rounded_parts):
            if part.area < .735:
                repairs['tiny-rounded-component-dropped'] += 1
                continue
            part_id=id if len(rounded_parts)==1 else str(id)+':round'+str(j)
            output.append([part_id,rings(part),round(record['height'],1),record['method'],record['source'],record['name']])
            rendered_record_ids.add(str(record['id']))
output.sort(key=lambda row:str(row[0]))
(ROOT/'data/city-buildings.js').write_text(
    '// Scene-wide building footprints: OSM and Overture Maps Foundation (ODbL).\n'
    '// East Asian ML footprints: Qian Shi et al., doi:10.5281/zenodo.8174931 (CC BY 4.0).\n'
    '// [id, rings in scene x/z, height in metres, height method, geometry source, name].\n'
    '// Named source heights and estimates remain explicitly distinguishable.\n'
    'export const cityBuildings = '+json.dumps(output,ensure_ascii=False,separators=(',',':'))+';\n')
methods=Counter(row[3] for row in output);sources=Counter(row[4] for row in output)
old_ids=set()
old_file=ROOT/'data/river-buildings.js'
if old_file.exists():
    previous=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{riverBuildings}from './data/river-buildings.js';console.log(JSON.stringify(riverBuildings));"],cwd=ROOT))
    old_ids={str(row[0]) for row in previous}
retained_old=rendered_record_ids&old_ids
old_reasons={id:reason for reason,ids in excluded_ids.items() for id in ids if id in old_ids}
manifest={
    'generatedOn':'2026-11-14','overtureRelease':'2026-10-21.0',
    'bboxWGS84':[ORIGIN[0]-650/SCALE[0],ORIGIN[1]-520/SCALE[1],ORIGIN[0]+1100/SCALE[0],ORIGIN[1]+1450/SCALE[1]],
    'sceneBounds':[-650,-520,1100,1450],'sceneUnitsPerMeter':UNIT,
    'inputFeatures':{'osm':len(osm),'overture':len(overture)},
    'compiledIndependentFootprints':len(rendered_record_ids),'deduplicatedRecordsBeforeRounding':len(records),'renderedPolygonParts':len(output),
    'retainedDetailedCoreRecords':len(reference['buildings']),
    'geometrySources':dict(sources),'heightMethods':dict(methods),
    'estimatedHeightParts':sum(count for method,count in methods.items() if 'estimate' in method),
    'sourceHeightOrFloorParts':sum(count for method,count in methods.items() if 'estimate' not in method),
    'previousGenericRiverLayer':{'previousRecords':len(old_ids),'retainedInNewLayer':len(retained_old),'excludedReasons':dict(Counter(old_reasons.values())),'excludedIds':old_reasons,'note':'Old river-buildings.js is a comparison reference only; the generic renderer now uses cityBuildings.'},
    'newFootprintRecordsVersusPreviousRiverAndCore':len(rendered_record_ids-(old_ids|core_ids)),
    'exclusions':dict(exclusions),'geometryRepairs':dict(repairs),
    'validation':{'uniqueOutputIds':len({str(row[0]) for row in output}),'validOutputPolygons':sum(Polygon(row[1][0],row[1][1:]).is_valid for row in output),'finitePositiveHeights':all(math.isfinite(row[2]) and row[2]>0 for row in output)},
    'excludedFeatureIds':excluded_ids,
    'sources':[
        {'name':'OpenStreetMap','url':'https://www.openstreetmap.org/copyright','license':'ODbL-1.0','accessedOn':'2026-11-14'},
        {'name':'Overture Maps Foundation buildings','url':'https://docs.overturemaps.org/guides/buildings/','license':'ODbL-1.0','release':'2026-10-21.0'},
        {'name':'Qian Shi et al. East Asian buildings','url':'https://doi.org/10.5281/zenodo.8174931','license':'CC BY 4.0','sourceVersionInOverture':'2024-11-01'},
        {'name':'Published landmark heights and core OSM floor counts','file':'data/building-survey.js'}],
    'heightPolicy':'Published/known OSM measurements and floor counts take priority. Missing heights use a deterministic weighted median of nine nearby, similarly sized known buildings, with footprint/use caps. Small roofs and heritage types use explicit low-rise estimates. No random heights.',
    'deduplicationPolicy':'Current full-extent OSM first. Exclude retained detailed-core IDs and substantial overlaps, authored landmarks, non-building roofs/bridges/elevators, water-only features and tiny clipped fragments. Overture fills non-overlapping gaps. Walking paths do not cause building removal.',
    'limits':['Counts refer to available GIS footprint features and clipped polygon components, not a verified present-day census of all physical buildings.','ML roofprints may contain omissions, classification errors or split roofs. Source update dates do not establish imagery capture dates.','Most building heights remain estimated; this is not survey-grade 3D reconstruction.','Existing detailed-core buildings and authored landmarks are rendered by their own modules and are excluded from the new footprint layer.']
}
(ROOT/'docs/building-coverage.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({key:manifest[key] for key in ['compiledIndependentFootprints','renderedPolygonParts','retainedDetailedCoreRecords','geometrySources','heightMethods','previousGenericRiverLayer','newFootprintRecordsVersusPreviousRiverAndCore','exclusions','geometryRepairs']},ensure_ascii=False,indent=2))
