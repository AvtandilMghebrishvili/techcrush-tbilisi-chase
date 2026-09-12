"""Rebuild the ODbL Kutaisi driving graph from the archived Overpass snapshot.
Google Maps and supplied photos were visual references, never embedded map tiles.
Streets are widened/bidirectional; the pedestrian White Bridge is an arcade crossing.
"""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
raw=json.loads((ROOT/'data/kutaisi-osm-raw.json').read_text(encoding='utf8'))['elements']
def geo(p): return [round(-(p['lon']-42.704)*82380,3), round((p['lat']-42.269)*111320,3)]
def inside(p): return 42.254<p['lat']<42.2825 and 42.686<p['lon']<42.719
nodes=[]; edges=[]; seen=set(); nodeids={}; bridges=[]
def point(p):
 x,z=geo(p); key=(round(x/2),round(z/2))
 if key not in nodeids:nodeids[key]=len(nodes);nodes.append([x,z])
 return nodeids[key]
for w in raw:
 t=w.get('tags',{});kind=t.get('highway','');name=t.get('name:en',t.get('name','Local street'))
 if kind not in ['primary','secondary','tertiary','residential','living_street','unclassified','primary_link','secondary_link','tertiary_link','pedestrian']:continue
 if t.get('access')=='private':continue
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
# Give the photographed fountain its central island when widening its roundabout.
f=next(w for w in raw if w['id']==355787217)['geometry'][:-1]
fp=[geo(p) for p in f];cx=sum(p[0] for p in fp)/len(fp);cz=sum(p[1] for p in fp)/len(fp)
for p in nodes:
 r=math.hypot(p[0]-cx,p[1]-cz)
 if 1<r<80:
  scale=(r+(1-r/80)*20)/r;p[0]=round(cx+(p[0]-cx)*scale,3);p[1]=round(cz+(p[1]-cz)*scale,3)
# Original stunt approach roads are explicitly documented as gameplay additions.
for points,name in [([[1540,-1050],[1540,-894]],'Skybox Service Road'),([[-235,-665],[-130,-665]],'Rioni East Stunt Apron'),([[60,-665],[174,-665]],'Rioni West Landing')]:
 nearest=min(range(len(nodes)),key=lambda i:math.dist(nodes[i],points[0]))
 previous=nearest
 for p in points:
  current=len(nodes);nodes.append(p);edges.append([previous,current,18,name]);previous=current
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
roads={'center':[42.269,42.704],'nodes':[nodes[i] for i in sorted(keep)],'edges':[[ids[a],ids[b],w,n] for a,b,w,n in edges if a in keep and b in keep]}
river=[geo(p) for w in raw if w['id']==206501805 for p in w['geometry'] if 42.238<p['lat']<42.296 and 42.675<p['lon']<42.735]
features={}
for label,id in [('bagrati',305121337),('fountain',355787217),('palace',1181029627)]:
 w=next(w for w in raw if w['id']==id);g=w['geometry'][:-1];pts=[geo(p) for p in g];features[label]={'x':sum(p[0] for p in pts)/len(pts),'z':sum(p[1] for p in pts)/len(pts)}
lots=[]
for w in json.loads((ROOT/'data/kutaisi-buildings-raw.json').read_text(encoding='utf8'))['elements']:
 g=[geo(p) for p in w.get('geometry',[])];t=w.get('tags',{})
 if len(g)<4 or t.get('historic') or t.get('name:en') in ['Bagrati Cathedral','Okros Chardakhi']:continue
 a,b=max(zip(g,g[1:]),key=lambda ab:math.dist(*ab));angle=math.atan2(-(b[1]-a[1]),b[0]-a[0]);c,s=math.cos(angle),math.sin(angle)
 local=[[c*x-s*z,s*x+c*z] for x,z in g];xs=[p[0] for p in local];zs=[p[1] for p in local];lx,lz=(min(xs)+max(xs))/2,(min(zs)+max(zs))/2
 width,depth=max(xs)-min(xs),max(zs)-min(zs)
 if min(width,depth)<5 or max(width,depth)>95:continue
 try:height=min(28,max(6,float(t.get('building:levels',2))*3.4))
 except ValueError:height=9
 lots.append({'x':round(c*lx+s*lz,2),'z':round(-s*lx+c*lz,2),'w':round(width,2),'d':round(depth,2),'angle':round(angle,5),'h':height,'source':w['id']})
meta={'river':river,'bridges':bridges,'features':features,'lots':lots}
for name,symbol,data in [('kutaisi-road-data','ROAD_DATA',roads),('kutaisi-geo-data','KUTAISI_GEO',meta)]:
 (ROOT/'dist'/f'{name}.js').write_text('// © OpenStreetMap contributors, ODbL 1.0. Snapshot 2026-09-13. See ASSETS.md.\nexport const '+symbol+' = '+json.dumps(data,separators=(',',':'))+';\n',encoding='utf8')
print('Kutaisi:',len(roads['nodes']),'nodes,',len(roads['edges']),'segments,',len(bridges),'bridge decks;',len(river),'Rioni points')
print('Bounds',min(p[0] for p in roads['nodes']),max(p[0] for p in roads['nodes']),min(p[1] for p in roads['nodes']),max(p[1] for p in roads['nodes']))
