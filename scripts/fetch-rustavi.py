"""Refresh the compact Rustavi snapshot from four bounded OSM map API requests.

Raw XML is cached outside shipped source. Normal builds use the checked-in JSON.
No Google imagery is downloaded or redistributed.
"""
from pathlib import Path
import json
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "artifacts" / "rustavi" / "osm"
BOXES = {
    "core": "44.99,41.53,45.03,41.56",
    "west": "44.925,41.545,44.99,41.585",
    "south": "44.96,41.51,45.035,41.545",
    "north": "44.97,41.56,45.035,41.585",
}


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    nodes, ways = {}, {}
    for name, bbox in BOXES.items():
        target = CACHE / f"rustavi-{name}.osm"
        if not target.exists():
            request = urllib.request.Request(
                "https://api.openstreetmap.org/api/0.6/map?bbox=" + bbox,
                headers={"User-Agent": "TechcrushMapBuilder/1.0"},
            )
            with urllib.request.urlopen(request, timeout=55) as response:
                content = response.read()
            ET.fromstring(content)
            target.write_bytes(content)
        tree = ET.parse(target).getroot()
        for node in tree.findall("node"):
            nodes[node.get("id")] = {
                "lat": float(node.get("lat")), "lon": float(node.get("lon"))
            }
        for way in tree.findall("way"):
            tags = {t.get("k"): t.get("v") for t in way.findall("tag")}
            if tags.get("highway") or tags.get("waterway") == "river":
                ways[way.get("id")] = (
                    tags, [node.get("ref") for node in way.findall("nd")]
                )
    elements = []
    for identifier, (tags, refs) in ways.items():
        if not all(ref in nodes for ref in refs):
            continue
        elements.append({"type": "way", "id": int(identifier), "tags": tags,
                         "geometry": [nodes[ref] for ref in refs]})
    target = ROOT / "data" / "rustavi-osm-raw.json"
    target.write_text(json.dumps({
        "copyright": "OpenStreetMap contributors",
        "license": "https://opendatacommons.org/licenses/odbl/1-0/",
        "source": "https://api.openstreetmap.org/api/0.6/map",
        "elements": elements,
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
    print(f"Archived {len(elements)} road/river ways ({target.stat().st_size:,} bytes).")


if __name__ == "__main__":
    main()
