import * as THREE from "./vendor/three.module.js";
import { makeKartlisDeda } from "./kartlis-deda.js";

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

export {
  buildSponsorBanners as buildTechcrushGarage,
  brandSponsorBanners as applyTechcrushBrand,
} from "./sponsor-banners.js";
