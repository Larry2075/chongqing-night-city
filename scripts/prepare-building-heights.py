"""OSM heights and floor counts outrank estimates. No random skyline heights."""
import json,math,xml.etree.ElementTree as E
from pathlib import Path
root=Path(__file__).resolve().parents[1];r=E.parse('/tmp/cq-rivers-map.osm').getroot();nodes={n.get('id'):(float(n.get('lon')),float(n.get('lat'))) for n in r.findall('node')};rows={}
for w in r.findall('way'):
 t={x.get('k'):x.get('v') for x in w.findall('tag')}
 if not t.get('building'):continue
 ps=[nodes[n.get('ref')] for n in w.findall('nd') if n.get('ref') in nodes]
 if not ps:continue
 x=sum((p[0]-106.57512184239037)*34865.67662295764 for p in ps)/len(ps);z=sum((p[1]-29.5649409009097)*38850.105189991904 for p in ps)/len(ps)
 height=None;method=''
 try:height=float(t['height'].replace('m','').strip());method='osm-height'
 except (KeyError,ValueError):
  try:
   floors=float(t['building:levels']);floorHeight=3.1 if t.get('building')=='residential' else 3.6 if t.get('building') in ['office','commercial','hotel'] else 3.3
   height=floors*floorHeight;method='osm-levels'
  except (KeyError,ValueError):pass
 rows[w.get('id')]={'x':x,'z':z,'name':t.get('name',''),'kind':t.get('building'),'heightMeters':height,'method':method,'levels':t.get('building:levels')}
# Structural engineer's published 64 m maximum supersedes the erroneous OSM 25 m.
rows['486221629'].update(heightMeters=64,method='engineer-published',source='https://www.sbp.de/zh-hans/project/重庆大剧院/')
rows['412612156'].update(heightMeters=51,method='architect-published',source='https://cadg.com.cn/cn/works/572/')
for id in ['661717190','661717191','748910918','748910919','748910920','748910921','748910916','748910917']:
 rows[id].update(heightMeters=350 if id in ['748910916','748910917'] else 250,method='owner-published',source='https://www.capitaland.com/cn/zh/newsroom/RCCQ-CTBUH.html')
known=[v for v in rows.values() if v['heightMeters'] is not None and v['heightMeters']<180 and v['kind'] not in ['theatre','temple']]
for v in rows.values():
 if v['heightMeters'] is not None:continue
 # Preserve low landmark / heritage uses. Else use nearby similar mapped buildings,
 # with conservative caps; record the estimate rather than claiming surveyed heights.
 if v['kind'] in ['temple','church'] or any(s in v['name'] for s in ['旧址','纪念馆','教堂','美术馆','报恩塔']):h=11;method='type-estimate'
 else:
  peers=sorted(known,key=lambda p:math.hypot(v['x']-p['x'],v['z']-p['z'])+(0 if p['kind']==v['kind'] else 60))[:5]
  weights=[1/(25+math.hypot(v['x']-p['x'],v['z']-p['z']))**2 for p in peers]
  h=sum(p['heightMeters']*w for p,w in zip(peers,weights))/sum(weights)
  h=max(12,min(100,h));method='nearby-level-estimate'
 v.update(heightMeters=round(h,1),method=method)
for v in rows.values():
 v['heightUnits']=round(v['heightMeters']*.35,4)
 v['x']=round(v['x'],2);v['z']=round(v['z'],2)
(root/'data/building-survey.js').write_text('// Heights © OSM contributors / named primary sources. Estimated records retain method labels.\nexport const buildingSurvey = '+json.dumps(rows,ensure_ascii=False,separators=(',',':'))+';\n')
from collections import Counter
print(dict(Counter(v['method'] for v in rows.values())))
