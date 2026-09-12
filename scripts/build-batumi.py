"""Rebuild the ODbL Batumi driving graph from the archived Overpass snapshot.
Google Maps and official tourism pages inform the interpretation; no map tiles are embedded.
Streets and boulevard paths are widened/bidirectional for arcade driving.
"""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
raw=json.loads((ROOT/'data/batumi-osm-raw.json').read_text(encoding='utf8'))['elements']
def geo(p): return [round(-(p['lon']-41.621)*83180,3), round((p['lat']-41.640)*111320,3)]
def inside(p): return 41.625<p['lat']<41.661 and 41.593<p['lon']<41.651
nodes=[]; edges=[]; seen=set(); nodeids={}; bridges=[]
def point(p):
 x,z=geo(p); key=(round(x/2),round(z/2))
 if key not in nodeids:nodeids[key]=len(nodes);nodes.append([x,z])
 return nodeids[key]
for w in raw:
 t=w.get('tags',{});kind=t.get('highway','');name=t.get('name:en',t.get('name','Local street'))
 if kind not in ['primary','secondary','tertiary','residential','living_street','unclassified','primary_link','secondary_link','tertiary_link','pedestrian']:continue
 if t.get('access')=='private':continue
 if kind=='pedestrian' and not t.get('name'):continue
 g=w.get('geometry',[])
 if len(g)<2:continue
 width=26 if kind=='primary' else 22 if kind=='secondary' else 18 if kind in ['tertiary','pedestrian'] else 16
 if name=='White Bridge':width=12
 if 'bridge' in t and all(inside(p) for p in g):
  a,b=geo(g[0]),geo(g[-1]);bridges.append({'name':name.upper(),'x':(a[0]+b[0])/2,'z':(a[1]+b[1])/2,'angle':math.atan2(b[0]-a[0],b[1]-a[1]),'length':math.dist(a,b)+5,'width':width+2})
 for a,b in zip(g,g[1:]):
  if not inside(a) or not inside(b):continue
  ia,ib=point(a),point(b);key=tuple(sorted([ia,ib]))
  if ia==ib or key in seen:continue
  seen.add(key);edges.append([ia,ib,width,name])
# Original service road for the optional rooftop stunt, connected to the real graph.
points=[[-2270,-1350],[-2270,-1196]]
previous=min(range(len(nodes)),key=lambda i:math.dist(nodes[i],points[0]))
for q in points:
 current=len(nodes);nodes.append(q);edges.append([previous,current,18,'TECHCRUSH Skybox Service Road']);previous=current
# Join near intersections, not opposite riverbanks or unrelated parallel roads.
for i,p in enumerate(nodes):
 for e in list(edges):
  if i in e[:2]:continue
  a,b=nodes[e[0]],nodes[e[1]];dx,dz=b[0]-a[0],b[1]-a[1];den=dx*dx+dz*dz
  u=((p[0]-a[0])*dx+(p[1]-a[1])*dz)/den
  if .01<u<.99 and math.hypot(p[0]-a[0]-u*dx,p[1]-a[1]-u*dz)<3:
   edges.remove(e);edges.extend([[e[0],i,*e[2:]],[i,e[1],*e[2:]]])
for _ in range(12):
 adj={i:[] for i in range(len(nodes))}
 for e in edges:adj[e[0]].append(e);adj[e[1]].append(e)
 changed=False
 for i,es in adj.items():
  if len(es)!=2 or es[0][3]!=es[1][3] or es[0] not in edges or es[1] not in edges:continue
  a=es[0][1] if es[0][0]==i else es[0][0];b=es[1][1] if es[1][0]==i else es[1][0]
  if a==b:continue
  d=math.dist(nodes[a],nodes[b])
  if d<155 and math.dist(nodes[a],nodes[i])+math.dist(nodes[i],nodes[b])-d<.28:
   edges.remove(es[0]);edges.remove(es[1]);edges.append([a,b,max(es[0][2],es[1][2]),es[0][3]]);changed=True
 if not changed:break
adj={i:set() for i in range(len(nodes))}
for a,b,*_ in edges:adj[a].add(b);adj[b].add(a)
components=[];visited=set()
for i in adj:
 if i in visited or not adj[i]:continue
 component={i};stack=[i];visited.add(i)
 while stack:
  for j in adj[stack.pop()]:
   if j not in visited:visited.add(j);component.add(j);stack.append(j)
 components.append(component)
keep=max(components,key=len);ids={v:i for i,v in enumerate(sorted(keep))}
roads={'center':[41.640,41.621],'nodes':[nodes[i] for i in sorted(keep)],'edges':[[ids[a],ids[b],w,n] for a,b,w,n in edges if a in keep and b in keep]}
# Join the coastline's source ways; the Black Sea lies northwest of this chain.
ways=[w['geometry'][:] for w in raw if w.get('tags',{}).get('natural')=='coastline']
chain=ways.pop(0)
def same(a,b):return abs(a['lat']-b['lat'])+abs(a['lon']-b['lon'])<1e-7
while ways:
 found=False
 for i,g in enumerate(ways):
  if same(chain[-1],g[0]):chain+=g[1:]
  elif same(chain[-1],g[-1]):chain+=list(reversed(g))[1:]
  elif same(chain[0],g[-1]):chain=g[:-1]+chain
  elif same(chain[0],g[0]):chain=list(reversed(g))[:-1]+chain
  else:continue
  ways.pop(i);found=True;break
 if not found:break
if chain[0]['lat']<chain[-1]['lat']:chain.reverse()
coast=[geo(p) for p in chain]
# Extend the outside of the sea well beyond the playable world.
sea=coast+[[6500,-6500],[6500,6500],[-6500,6500],coast[0]]
meta={'coast':coast,'sea':sea}
for name,symbol,data in [('batumi-road-data','ROAD_DATA',roads),('batumi-geo-data','BATUMI_GEO',meta)]:
 (ROOT/'dist'/f'{name}.js').write_text('// © OpenStreetMap contributors, ODbL 1.0. Snapshot 2026-09-13. See ASSETS.md.\nexport const '+symbol+' = '+json.dumps(data,separators=(',',':'))+';\n',encoding='utf8')
print('Batumi:',len(roads['nodes']),'nodes,',len(roads['edges']),'segments;',len(coast),'coast points')
