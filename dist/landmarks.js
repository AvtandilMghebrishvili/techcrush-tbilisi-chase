import * as THREE from "./vendor/three.module.js";

const stone = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
function link(group, start, end, radius, material) {
  const a = new THREE.Vector3(...start),
    b = new THREE.Vector3(...end);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.15, a.distanceTo(b), 8),
    material,
  );
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    b.sub(a).normalize(),
  );
  group.add(mesh);
}

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
  const statue = new THREE.Group();
  statue.name = "Kartlis Deda — stylized sword and bowl";
  statue.position.set(-190, 155, 915);
  statue.rotation.y = Math.PI;
  statue.scale.setScalar(3.1);
  horizon.add(statue);
  const silver = stone("#d5dfdc", {
    metalness: 0.38,
    roughness: 0.46,
    emissive: "#788683",
    emissiveIntensity: 0.23,
    fog: false,
  });
  const pale = stone("#a9b4b3", { metalness: 0.32, fog: false });
  v.box(14, 4, 12, stone("#7d8580", { fog: false }), 0, 2, 0, statue);
  const dress = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 4.5, 16, 10),
    silver,
  );
  dress.position.y = 12;
  dress.scale.z = 0.66;
  statue.add(dress);
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 2.5, 7.5, 8),
    silver,
  );
  torso.position.y = 22.5;
  torso.scale.z = 0.62;
  statue.add(torso);
  v.box(5.8, 0.65, 3.6, pale, 0, 18.8, 0, statue);
  link(statue, [0, 25.5, 0], [0, 28, 0], 1.05, silver);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8), silver);
  head.position.set(0, 29.1, 0.1);
  head.scale.set(0.78, 1.2, 0.85);
  statue.add(head);
  const hair = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.65, 5, 8),
    pale,
  );
  hair.position.set(0, 27.8, -0.7);
  hair.scale.z = 0.65;
  statue.add(hair);
  // Left arm offers the bowl; the right holds a downward-pointing sword.
  link(statue, [2.7, 24.7, 0], [5.7, 22.4, 0.8], 0.95, silver);
  link(statue, [5.7, 22.4, 0.8], [8.8, 23.4, 2.2], 0.72, silver);
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(
      2.1,
      12,
      6,
      0,
      Math.PI * 2,
      Math.PI / 2,
      Math.PI / 2,
    ),
    silver,
  );
  bowl.position.set(8.8, 24.4, 2.2);
  bowl.scale.y = 0.5;
  statue.add(bowl);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.16, 5, 18), silver);
  rim.rotation.x = Math.PI / 2;
  rim.position.copy(bowl.position);
  statue.add(rim);
  link(statue, [-2.7, 24.7, 0], [-5.1, 20.8, 0], 0.95, silver);
  link(statue, [-5.1, 20.8, 0], [-5.5, 18.9, 1.1], 0.72, silver);
  v.box(0.55, 4.2, 0.65, pale, -5.5, 19.4, 1.1, statue);
  v.box(4, 0.45, 0.7, silver, -5.5, 17.7, 1.1, statue);
  const blade = new THREE.Mesh(new THREE.ConeGeometry(0.85, 13, 4), silver);
  blade.rotation.z = Math.PI;
  blade.position.set(-5.5, 10.9, 1.1);
  blade.scale.z = 0.28;
  statue.add(blade);
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
  c.fillText("TBILISI  /  NIGHT RUN GARAGE", 512, 202);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  v.garageSignCanvas = canvas;
  v.garageSignTexture = texture;
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
  });
  // Road-facing signs on opposite blocks are visible from both driving directions.
  for (const [x, z, angle] of [
    [-22.2, 44.5, Math.PI / 2],
    [22.2, 95.5, -Math.PI / 2],
  ]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(30, 7.5), mat);
    sign.position.set(x, 8, z);
    sign.rotation.y = angle;
    v.decor.add(sign);
    const bar = stone("#ff1644", {
      emissive: "#ff1644",
      emissiveIntensity: 1.8,
    });
    v.box(0.2, 0.22, 31, bar, x, 12, z, v.decor);
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
  c.fillText("TBILISI  /  NIGHT RUN GARAGE", 615, 221);
  v.garageSignTexture.needsUpdate = true;
}
