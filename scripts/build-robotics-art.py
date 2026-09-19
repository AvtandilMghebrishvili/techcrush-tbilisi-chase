"""Prepare the supplied Robotics poster and trace its gear logo for a 3D mesh.

Run with Pillow: python scripts/build-robotics-art.py [gear.jpg] [poster.jpg]
The reference photos stay in the ignored Challenge directory.
"""
from pathlib import Path
from collections import Counter, deque
import json
import math
import sys
from PIL import Image

root = Path(__file__).resolve().parents[1]
gear = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "Challenge/432232296_122105267930258974_1872157052180846017_n.jpg"
poster = Path(sys.argv[2]) if len(sys.argv) > 2 else root / "Challenge/778972167_122249288264258974_6759167115735965274_n.jpg"
im = Image.open(gear).convert("RGB")
is_red = lambda c: c[0] > 180 and c[1] < 110 and c[2] < 130
color = Counter(c for c in im.getdata() if is_red(c)).most_common(1)[0][0]
small = im.resize((256, 256))
queue = deque([(128, 128)])
hole = set(queue)
while queue:
    x, y = queue.popleft()
    for p in [(x-1, y), (x+1, y), (x, y-1), (x, y+1)]:
        if 0 <= p[0] < 256 and 0 <= p[1] < 256 and p not in hole and not is_red(small.getpixel(p)):
            hole.add(p)
            queue.append(p)
cx = (sum(p[0] for p in hole) / len(hole) + .5) * im.width / 256
cy = (sum(p[1] for p in hole) / len(hole) + .5) * im.height / 256
outer, inner = [], []
for n in range(256):
    a = n * math.tau / 256
    hits = []
    for r in range(1, im.width):
        x, y = round(cx + math.cos(a)*r), round(cy - math.sin(a)*r)
        if not (0 <= x < im.width and 0 <= y < im.height):
            break
        if is_red(im.getpixel((x, y))):
            hits.append(r)
    outer.append([math.cos(a)*max(hits), math.sin(a)*max(hits)])
    inner.append(min(hits))
radius = max(math.hypot(*p) for p in outer)
outline = [[round(x/radius, 5), round(y/radius, 5)] for x,y in outer]
data = "// Traced from the user-supplied Robotics gear; retain its eight rounded teeth.\n"
data += "export const ROBOTICS_COLOR = '" + ('#%02x%02x%02x' % color) + "';\n"
data += "export const GEAR_HOLE = " + str(round(sum(inner)/len(inner)/radius, 5)) + ";\n"
data += "export const GEAR_OUTLINE = " + json.dumps(outline, separators=(',', ':')) + ";\n"
(root / "dist/robotics-logo-data.js").write_text(data, encoding="utf-8")
out = root / "dist/assets/robotics"
out.mkdir(exist_ok=True)
art = Image.open(poster).convert("RGB")
art.thumbnail((1280,1280), Image.Resampling.LANCZOS)
art.save(out / "robo-battle.webp", quality=90, method=6)
print('Robotics color:', color, 'Poster bytes:', (out / 'robo-battle.webp').stat().st_size)
