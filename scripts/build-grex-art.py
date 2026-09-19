"""Exact supplied GREX artwork + a traced, low-vertex silhouette for the world."""
from pathlib import Path
from PIL import Image, ImageFilter
from collections import Counter
import json, math
root = Path(__file__).resolve().parents[1]
source = root/'Challenge/686058929_122109903891043705_6571833843857450437_n.jpg'
im = Image.open(source).convert('RGB')
asset = root/'dist/assets/grex'; asset.mkdir(parents=True, exist_ok=True)
im.resize((768,768), Image.Resampling.LANCZOS).save(asset/'grex.webp', quality=92, method=6)
mask = {(x,y) for y in range(im.height) for x in range(im.width) if (lambda c:c[0]>130 and c[1]>180 and c[2]<100)(im.getpixel((x,y)))}
color = Counter(im.getpixel(p) for p in mask).most_common(1)[0][0]
# Remove one-pixel JPEG pinholes before tracing the logo boundary.
binary=Image.new('L', im.size);binary.putdata([255 if (x,y) in mask else 0 for y in range(im.height) for x in range(im.width)])
binary=binary.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
mask={(x,y) for y in range(im.height) for x in range(im.width) if binary.getpixel((x,y))}
edges = {}
for x,y in mask:
 for neighbor,a,b in [((x,y-1),(x,y),(x+1,y)),((x+1,y),(x+1,y),(x+1,y+1)),((x,y+1),(x+1,y+1),(x,y+1)),((x-1,y),(x,y+1),(x,y))]:
  if neighbor not in mask: edges.setdefault(a,[]).append(b)
loops=[]
while edges:
 start=next(iter(edges));p=start;loop=[];direction=None
 while p in edges:
  loop.append(p)
  options=edges[p]
  def rank(q):
   if direction is None:return 0
   dx,dy=direction;ex,ey=q[0]-p[0],q[1]-p[1];cross=dx*ey-dy*ex;dot=dx*ex+dy*ey
   return 0 if cross>0 else 1 if dot>0 else 2 if cross<0 else 3
  q=min(options,key=rank);options.remove(q)
  if not options:del edges[p]
  direction=(q[0]-p[0],q[1]-p[1]);p=q
  if p==start:break
 if p==start and len(loop)>20:loops.append(loop)
loops.sort(key=len,reverse=True)
def simplify(points,tolerance=1.3):
 if len(points)<3:return points
 a,b=points[0],points[-1];dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy)
 distances=[abs(dx*(a[1]-p[1])-(a[0]-p[0])*dy)/length if length else math.dist(a,p) for p in points]
 index=max(range(len(points)),key=lambda i:distances[i])
 return simplify(points[:index+1])+simplify(points[index:])[1:] if distances[index]>tolerance else [a,b]
outline=loops[0];xs=[p[0] for p in outline];ys=[p[1] for p in outline];cx=(min(xs)+max(xs))/2;cy=(min(ys)+max(ys))/2;scale=(max(xs)-min(xs))/2
def convert(loop):
 half=len(loop)//2;points=simplify(loop[:half+1])+simplify(loop[half:]+[loop[0]])[1:-1]
 return [[round((x-cx)/scale,5),round((cy-y)/scale,5)] for x,y in points]
data='export const GREX_COLOR = "#%02x%02x%02x";\n'%color
data+='export const GREX_OUTLINE = '+json.dumps(convert(loops[0]))+';\n'
data+='export const GREX_EYE = '+json.dumps(convert(loops[1]))+';\n'
(root/'dist/grex-logo-data.js').write_text(data,encoding='utf-8')
print('GREX texture:',(asset/'grex.webp').stat().st_size,'bytes; silhouette:',len(convert(loops[0])),'vertices; color:',color)
