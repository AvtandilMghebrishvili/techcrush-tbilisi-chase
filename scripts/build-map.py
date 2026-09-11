"""Build the game road graph from the archived OSM Overpass responses.
Input files are kept outside the public assets. Output is an ODbL derived database.
Road closures and one-way restrictions are intentionally omitted for arcade play.
"""
import json, math, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
ways = {}
for filename in ['tbilisi-roads-raw.json', 'rustaveli-raw.json', 'links-raw.json']:
    for w in json.loads((root / 'data' / filename).read_text(encoding='utf8'))['elements']:
        ways[w['id']] = w
names = ['Shota Rustaveli Avenue', 'Nikoloz Baratashvili Avenue', 'Freedom Square',
         'Alexander Pushkin Street', 'Revaz Tabukashvili Street', 'Gia Chanturia Street',
         'Giorgi Atoneli Street', 'Lado Gudiashvili Street', 'Anton Purtseladze Street',
         'Vladimer Vekua Street', 'Vakhtang Orbeliani Street', 'Grigol Orbeliani Square',
         'Niko Sulkhanishvili Street', 'Soliko Virsaladze Street', 'Marie Brosset Street',
         'Mitropane Laghidze Street', 'Pavle Ingorokva Street', '9th April Street',
         'Taras Shevchenko Street', 'Archil Jorjadze Street', 'Aleksandre Griboedov Street',
         'Shio Chitadze Street', 'Giorgi Leonidze Street', 'Merab Kostava Street']
names += ['Nikoloz Baratashvili Bridge','Kote Abkhazi Street','Shalva Dadiani Street','Lado Asatiani Street','Galaktion Tabidze Street','Ivane Machabeli Street','Gia Abesadze Street','Vakhtang Beridze Street','Chakhrukhadze Street','Erekle Meori Square','Anton Katalikos Street','Harutyun Saiatnova Street','Ierusalimi Street','Betlemi Street','Kosta Khetagurov Street','Abo Tbilieli Street','Grigol Khandzteli Street']
reference=json.loads((root/'data/reference-streets.json').read_text(encoding='utf8'))
for i,p in enumerate(reference['roundabouts']):
    lat,lon=p['center'];rx,rz=p['radii']
    coords=[[lat+math.cos(j*math.pi/16)*rz/111320,lon+math.sin(j*math.pi/16)*rx/83140] for j in range(33)]
    reference['paths'].append({'name':p['name'],'width':p['width'],'points':coords})
for i,p in enumerate(reference['paths']):
    ways[-i-1]={'id':-i-1,'tags':{'name:en':p['name'],'highway':'residential','game:width':p['width']},'geometry':[{'lat':lat,'lon':lon} for lat,lon in p['points']]}
    names.append(p['name'])
points, edges, edgekeys = [], [], set()
def point(g):
    x, z = -(g['lon'] - 44.799) * 83140, (g['lat'] - 41.699) * 111320
    for i, p in enumerate(points):
        if math.hypot(p[0]-x,p[1]-z)<7: return i
    points.append([round(x,2),round(z,2)])
    return len(points)-1
for w in ways.values():
    name = w['tags'].get('name:en','')
    connector=w['tags'].get('highway','').endswith('_link')
    upper_connector=any(41.698 < p['lat'] < 41.704 and 44.792 < p['lon'] < 44.800 for p in w['geometry'])
    if name not in names and not ('Rustaveli' in name) and not connector and not upper_connector: continue
    if not name:name='Local street'
    if connector and not name:name='Connecting street'
    coords = w['geometry']
    width = w['tags'].get('game:width',30 if 'Rustaveli' in name else 20 if 'Baratashvili' in name or 'Freedom' in name else 15)
    for a,b in zip(coords,coords[1:]):
        if not all(41.6855 < g['lat'] < 41.7043 and 44.790 < g['lon'] < 44.817 for g in [a,b]): continue
        ia,ib=point(a),point(b)
        key=tuple(sorted([ia,ib]))
        if ia==ib or key in edgekeys:continue
        edgekeys.add(key);edges.append([ia,ib,width,name])
# Join geometry at crossings and near endpoint gaps introduced by divided carriageways.
for node,p in enumerate(points):
    for e in list(edges):
        if node in e[:2]:continue
        a,b=points[e[0]],points[e[1]];dx,dz=b[0]-a[0],b[1]-a[1]
        t=((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz)
        if .05<t<.95 and math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz)<9:
            edges.remove(e);edges.extend([[e[0],node,*e[2:]],[node,e[1],*e[2:]]])
# Remove redundant near-collinear geometry nodes, while retaining road intersections.
for _ in range(8):
    adj={i:[] for i in range(len(points))}
    for e in edges:
        adj[e[0]].append(e);adj[e[1]].append(e)
    changed=False
    for i,es in adj.items():
        if len(es)!=2 or es[0][3]!=es[1][3] or es[0] not in edges or es[1] not in edges:continue
        a=es[0][1] if es[0][0]==i else es[0][0]; b=es[1][1] if es[1][0]==i else es[1][0]
        if a==b:continue
        pa,pi,pb=points[a],points[i],points[b]
        d=math.dist(pa,pb)
        if d>100:continue
        if math.dist(pa,pi)+math.dist(pi,pb)-d<.18:
            edges.remove(es[0]);edges.remove(es[1]);edges.append([a,b,max(es[0][2],es[1][2]),es[0][3]]);changed=True
    if not changed:break
adj={i:set() for i in range(len(points))}
for a,b,*_ in edges:adj[a].add(b);adj[b].add(a)
components=[];seen=set()
for i in adj:
    if i in seen or not adj[i]:continue
    component=set([i]); stack=[i];seen.add(i)
    while stack:
        for j in adj[stack.pop()]:
            if j not in seen: seen.add(j);component.add(j);stack.append(j)
    components.append(component)
keep=max(components,key=len);ids={v:i for i,v in enumerate(sorted(keep))}
out={'center':[41.699,44.799], 'nodes':[points[i] for i in sorted(keep)],
     'edges':[[ids[a],ids[b],w,n] for a,b,w,n in edges if a in keep and b in keep]}
(root/'dist/road-data.js').write_text('// © OpenStreetMap contributors, ODbL 1.0. Snapshot 2026-09-11.\n// Simplified, widened and bidirectional for gameplay. See ASSETS.md.\n// Eastern/southern extensions also include original approximate reference-aligned connections.\nexport const ROAD_DATA = '+json.dumps(out,separators=(',',':'))+';\n',encoding='utf8')
print('Map:',len(out['nodes']),'nodes,',len(out['edges']),'segments; disconnected components omitted:',[len(c) for c in components if c != keep])
print('Streets:',sorted(set(e[3] for e in out['edges'])))
