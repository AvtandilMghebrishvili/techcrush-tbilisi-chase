"""Build a compressed, connected arcade interpretation of Rustavi's OSM streets.
The OSM snapshot and user satellite references remain offline; no map tiles ship.
"""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
raw=json.loads((ROOT/'data/rustavi-osm-raw.json').read_text(encoding='utf8'))['elements']
def geo(p): return [round(-(p['lon']-44.985)*41600,3),round((p['lat']-41.55)*55660,3)]
def inside(p): return 41.518<p['lat']<41.583 and 44.93<p['lon']<45.035
nodes=[];edges=[];ids={};seen=set();bridges=[]
def point(p):
 x,z=geo(p)
 # Keep photographed medians intact after widening half-scale traffic lanes.
 # Offset the carriageways outward, tapering smoothly into their original junctions.
 for px,pz,length,width,angle,shift in [(-246.25,36.95,75,11.4,-math.atan(.5),5),(-265.7,-75.1,123,16,-2.025,2.5)]:
  dx,dz=x-px,z-pz;c,s=math.cos(angle),math.sin(angle)
  along=dx*c-dz*s;side=dx*s+dz*c
  if abs(along)<length/2+15 and 2<abs(side)<width/2+9:
   blend=min(1,max(0,(length/2+15-abs(along))/18))
   offset=math.copysign(shift*blend,side);x+=s*offset;z+=c*offset
 key=(round(x/1.2),round(z/1.2))
 if key not in ids: ids[key]=len(nodes);nodes.append([x,z])
 return ids[key]
for w in raw:
 t=w['tags'];kind=t.get('highway');g=w.get('geometry',[])
 if kind not in ['motorway','motorway_link','trunk','trunk_link','primary','primary_link','secondary','secondary_link','tertiary','tertiary_link','residential','unclassified','raceway','service']:continue
 if kind=='residential' and not any((41.535<p['lat']<41.553 and 44.987<p['lon']<45.026) or (41.551<p['lat']<41.574 and 44.966<p['lon']<44.989) for p in g):continue
 if kind=='service' and not any(44.94<p['lon']<44.963 and p['lat']>41.562 for p in g):continue
 if kind=='raceway' and str(w['id']) not in ['167355166','167355177']:continue
 name=t.get('name:en',t.get('name','Rustavi local street'))
 if kind=='raceway': name='RUSTAVI INTERNATIONAL MOTORPARK' if str(w['id'])=='167355166' else 'MOTORPARK PIT LANE'
 width=26 if kind in ['motorway','trunk','primary'] else 22 if kind in ['secondary','raceway'] else 16
 if kind=='service':width=14
 # Preserve the real divided boulevard's median and the memorial island.
 # Applying a 26m arcade width to each half-scale carriageway erases both.
 if any(math.hypot(geo(p)[0]+308.065,geo(p)[1]-8.878)<185 for p in g):width=9
 if name=='Gmirta Square':width=7
 if kind=='service' and t.get('service') in ['parking_aisle','driveway']:continue
 for a,b in zip(g,g[1:]):
  if not inside(a) or not inside(b):continue
  ia,ib=point(a),point(b);key=tuple(sorted([ia,ib]))
  if ia==ib or key in seen:continue
  seen.add(key);edges.append([ia,ib,width,name])
  if t.get('bridge')=='yes':
   p,q=nodes[ia],nodes[ib]
   bridges.append({'name':'MTKVARI BRIDGE','x':(p[0]+q[0])/2,'z':(p[1]+q[1])/2,'angle':math.atan2(q[0]-p[0],q[1]-p[1]),'length':math.dist(p,q)+2,'width':width+2})
# Join only near intersections and entrance roads, never infer a bridge across water.
for i,p in enumerate(nodes):
 for e in list(edges):
  if i in e[:2]:continue
  a,b=nodes[e[0]],nodes[e[1]];dx,dz=b[0]-a[0],b[1]-a[1];den=dx*dx+dz*dz
  if not den:continue
  u=((p[0]-a[0])*dx+(p[1]-a[1])*dz)/den
  if .01<u<.99 and math.hypot(p[0]-a[0]-u*dx,p[1]-a[1]-u*dz)<2:
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
  if d<225 and math.dist(nodes[a],nodes[i])+math.dist(nodes[i],nodes[b])-d<.65:
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
keep=max(components,key=len)
# Motorpark entrance is a deliberately opened private gate for the arcade route.
for c in components:
 if c==keep or not any('MOTORPARK' in e[3] and e[0] in c for e in edges):continue
 a,b=min(((a,b) for a in c for b in keep),key=lambda pair:math.dist(nodes[pair[0]],nodes[pair[1]]))
 if math.dist(nodes[a],nodes[b])<180:edges.append([a,b,18,'MOTORPARK ACCESS']);keep|=c
mapping={v:i for i,v in enumerate(sorted(keep))}
roads={'center':[41.55,44.985],'scale':.5,'nodes':[nodes[i] for i in sorted(keep)],'edges':[[mapping[a],mapping[b],w,n] for a,b,w,n in edges if a in keep and b in keep]}
# Main Mtkvari chain, ordered by OSM endpoints. Branches are omitted, not joined by guessed lines.
riverWays=[w for w in raw if w['tags'].get('waterway')=='river' and w['tags'].get('name:en')=='Mtkvari']
chain=max(riverWays,key=lambda w:len(w['geometry']))['geometry'][:]
pending=[w['geometry'][:] for w in riverWays if w['geometry']!=chain]
def same(a,b):return abs(a['lat']-b['lat'])+abs(a['lon']-b['lon'])<1e-7
while pending:
 found=False
 for i,g in enumerate(pending):
  if same(chain[-1],g[0]):chain+=g[1:]
  elif same(chain[-1],g[-1]):chain+=g[-2::-1]
  elif same(chain[0],g[-1]):chain=g[:-1]+chain
  elif same(chain[0],g[0]):chain=g[:0:-1]+chain
  else:continue
  pending.pop(i);found=True;break
 if not found:break
river=[geo(p) for p in chain if 41.495<p['lat']<41.606]
meta={'river':river,'bridges':bridges}
for name,symbol,data in [('rustavi-road-data','ROAD_DATA',roads),('rustavi-geo-data','RUSTAVI_GEO',meta)]:
 (ROOT/'dist'/f'{name}.js').write_text('// © OpenStreetMap contributors, ODbL 1.0. Snapshot 2026-09-19. Arcade scale 0.5.\nexport const '+symbol+' = '+json.dumps(data,separators=(',',':'))+';\n',encoding='utf8')
print('Rustavi:',len(roads['nodes']),'nodes,',len(roads['edges']),'roads,',len(river),'river points;',len(bridges),'bridge pieces')
