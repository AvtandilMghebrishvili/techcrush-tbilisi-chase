import * as THREE from "./vendor/three.module.js";
import { IS_KUTAISI, CITY_NAME } from "./map-selection.js";
import { registerBreakable } from "./breakable-props.js";
import { makeKartlisDeda } from "./kartlis-deda.js";
import { ROADS, nearestRoad } from "./city-map.js";
import { riverDistance } from "./district-data.js";

const stone = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
export function buildDistantLandmarks(v) {
  const horizon = new THREE.Group();
  horizon.name = "Sololaki hills and Kartlis Deda";
  v.decor.add(horizon);
  // A continuous faceted ridge sits beyond the playable boundary, with a second, softer range behind it.
  for (let layer = 0; layer < 2; layer++) {
    const segments = 100,
      rows = 5,
      positions = [],
      indices = [],
      colors = [];
    for (let row = 0; row < rows; row++) {
      const radius = 740 + row * 110 + layer * 430;
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const peaks =
          100 +
          100 * Math.pow(Math.sin(a * 3 + 0.6), 2) +
          55 * Math.sin(a * 7 + 1.8);
        const height =
          Math.sin((row / (rows - 1)) * Math.PI) * (peaks + layer * 75) - 18;
        positions.push(Math.sin(a) * radius, height, Math.cos(a) * radius);
        const color = new THREE.Color(layer ? "#657989" : "#364d50");
        color.multiplyScalar(0.85 + row * 0.05 + Math.sin(a * 11) * 0.06);
        colors.push(color.r, color.g, color.b);
      }
    }
    for (let row = 0; row < rows - 1; row++)
      for (let i = 0; i < segments; i++) {
        const n = row * (segments + 1) + i;
        indices.push(
          n,
          n + 1,
          n + segments + 1,
          n + 1,
          n + segments + 2,
          n + segments + 1,
        );
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    horizon.add(
      new THREE.Mesh(
        geo,
        stone("#ffffff", {
          vertexColors: true,
          flatShading: true,
          side: THREE.DoubleSide,
          fog: false,
        }),
      ),
    );
  }
  const statue = makeKartlisDeda();
  statue.position.set(-190, 155, 915);
  statue.rotation.y = Math.PI;
  statue.scale.setScalar(3.1);
  horizon.add(statue);
  // A rocky shoulder connects the monument to the mountain silhouette.
  const hill = new THREE.Mesh(
    new THREE.CylinderGeometry(32, 180, 175, 11),
    stone("#425958", { flatShading: true, fog: false }),
  );
  hill.position.set(-190, 67.5, 915);
  hill.scale.z = 0.8;
  horizon.add(hill);
}

export function buildTechcrushGarage(v) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const c = canvas.getContext("2d");
  c.fillStyle = "#0b1820";
  c.fillRect(0, 0, 1024, 256);
  c.strokeStyle = "#e8ff76";
  c.lineWidth = 8;
  c.strokeRect(12, 12, 1000, 232);
  c.fillStyle = "#e8ff76";
  c.textAlign = "center";
  c.font = "900 108px Arial";
  c.fillText("TECHCRUSH", 512, 136);
  c.fillStyle = "#a5ddd9";
  c.font = "bold 35px Arial";
  c.fillText(CITY_NAME + "  /  NIGHT RUN GARAGE", 512, 202);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  v.garageSignCanvas = canvas;
  v.garageSignTexture = texture;
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.FrontSide,
  });
  // Road-facing signs on opposite blocks are visible from both driving directions.
  const placements = IS_KUTAISI
    ? []
    : [
        [-495, -252, -Math.PI / 2],
        [-550, -297, Math.PI / 2],
      ];
  for (const r of ROADS.filter((r) => r.length > 55 && r.id % 4 === 0)) {
    const x = (r.start.x + r.end.x) / 2 + Math.cos(r.angle) * (r.width / 2 + 4),
      z = (r.start.z + r.end.z) / 2 - Math.sin(r.angle) * (r.width / 2 + 4);
    if (
      riverDistance({ x, z }) < 48 ||
      placements.some((p) => Math.hypot(p[0] - x, p[1] - z) < 100)
    )
      continue;
    placements.push([x, z, r.angle - Math.PI / 2]);
    if (placements.length >= 22) break;
  }
  for (const [x, z, angle] of placements) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = angle;
    v.decor.add(group);
    for (const side of [1, -1]) {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), mat);
      sign.position.set(0, 4.8, side * 0.09);
      sign.rotation.y = side === 1 ? 0 : Math.PI;
      group.add(sign);
    }
    const bar = stone("#ff1644", {
      emissive: "#ff1644",
      emissiveIntensity: 1.8,
    });
    v.box(14.2, 0.12, 0.3, bar, 0, 6.65, 0, group);
    v.box(14.2, 0.12, 0.3, bar, 0, 2.98, 0, group);
    for (const sx of [-5.7, 5.7]) {
      v.box(0.18, 3, 0.18, stone("#344348"), sx, 1.5, 0, group);
      registerBreakable(
        v,
        group,
        x + Math.cos(angle) * sx,
        z - Math.sin(angle) * sx,
        6.7,
      );
    }
  }
}

export function applyTechcrushBrand(v, logo, wordmark) {
  const c = v.garageSignCanvas.getContext("2d");
  c.fillStyle = "#14151b";
  c.fillRect(0, 0, 1024, 256);
  c.strokeStyle = "#ff1644";
  c.lineWidth = 6;
  c.strokeRect(12, 12, 1000, 232);
  c.save();
  c.beginPath();
  c.arc(128, 128, 88, 0, Math.PI * 2);
  c.clip();
  c.drawImage(logo, 40, 40, 176, 176);
  c.restore();
  // Use the supplied lettering directly; omit the screenshot's surrounding UI and close icon.
  c.drawImage(wordmark, 211, 112, 310, 70, 248, 45, 730, 165);
  c.fillStyle = "#c9d5d9";
  c.textAlign = "center";
  c.font = "bold 25px Arial";
  c.fillText(CITY_NAME + "  /  NIGHT RUN GARAGE", 615, 221);
  v.garageSignTexture.needsUpdate = true;
}
