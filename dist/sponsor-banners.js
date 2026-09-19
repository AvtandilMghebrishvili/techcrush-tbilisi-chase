import { EVENT_ID, ARTIFACT_BANNERS, HUNT_CITIES } from "./event-rules.js";
import { ACTIVE_MAP } from "./map-selection.js";
import * as THREE from "./vendor/three.module.js";
import { registerBreakable } from "./breakable-props.js";
import { SPONSOR_SITES } from "./sponsor-sites.js";
function artwork(reward = false, logo) {
  const artifact = Number.isInteger(reward) ? reward : 0;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const c = canvas.getContext("2d");
  c.fillStyle = reward ? "#271b11" : "#14151d";
  c.fillRect(0, 0, 1024, 512);
  c.fillStyle = reward ? "#ffc454" : "#fc234e";
  c.fillRect(0, 0, 1024, 12);
  c.fillRect(0, 500, 1024, 12);
  if (logo) {
    c.save();
    c.beginPath();
    c.arc(97, 98, 60, 0, Math.PI * 2);
    c.clip();
    c.drawImage(logo, 37, 38, 120, 120);
    c.restore();
  }
  c.textAlign = "left";
  c.fillStyle = "#fff";
  c.font = "900 76px Arial";
  c.fillText("TECHCRUSH", 178, 125, 810);
  c.textAlign = "center";
  c.fillStyle = reward ? "#ffe4a0" : "#ffffff";
  c.font = "900 " + (reward ? 64 : 94) + 'px "Segoe UI",sans-serif';
  c.fillText(
    (reward ? "დაამტვრიე ეს ბანერი" : "გამოიწერე!").toUpperCase(),
    512,
    276,
    945,
  );
  c.fillStyle = reward ? "#ffd26c" : "#ff91a7";
  c.font = "bold " + (reward ? 99 : 62) + 'px "Segoe UI",sans-serif';
  c.fillText(reward ? "+4,000 🪙" : "რას ელოდები? :დდ 😂", 512, 402, 940);
  c.font = "bold 24px Arial";
  c.fillStyle = "#bdc6d2";
  c.fillText(
    reward
      ? "SMASH & COLLECT · 3 PER RUN"
      : "GEORGIAN STREETS / TECHCRUSH COMMUNITY",
    512,
    466,
  );
  if (artifact) {
    c.fillStyle = "#062830";
    c.fillRect(0, 152, 1024, 360);
    c.fillStyle = "#73f0ea";
    c.font = "900 95px Arial";
    c.fillText(
      ["", "FUEL CELL", "GEAR CORE", "SPARK KEY", "RACE WHEEL", "AERO WING"][
        artifact
      ],
      512,
      277,
      940,
    );
    c.font = "900 70px Arial";
    c.fillText("ARTIFACT 0" + artifact + " / 05", 512, 378, 940);
    c.fillStyle = "#ffffff";
    c.font = "bold 29px Arial";
    c.fillText("SMASH · COLLECT · UNLOCK THE SECRET", 512, 470, 960);
  }
  return canvas;
}
export function buildSponsorBanners(v) {
  v.sponsorBanners = [];
  v.sponsorTextures = [false, true, 1, 2, 3, 4, 5].map((r) => {
    const t = new THREE.CanvasTexture(artwork(r));
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
  v.sponsorMaterials = v.sponsorTextures.map(
    (map) => new THREE.MeshBasicMaterial({ map, side: THREE.FrontSide }),
  );
  const face = new THREE.PlaneGeometry(10, 5),
    frame = new THREE.MeshStandardMaterial({
      color: "#262c36",
      metalness: 0.65,
      roughness: 0.6,
    }),
    rim = new THREE.MeshBasicMaterial({ color: "#f93359" });
  for (const s of SPONSOR_SITES) {
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    g.rotation.y = s.angle;
    v.decor.add(g);
    const faces = [];
    for (const side of [1, -1]) {
      const mesh = new THREE.Mesh(face, v.sponsorMaterials[0]);
      mesh.position.set(0, 3.05, side * 0.12);
      mesh.rotation.y = side === 1 ? 0 : Math.PI;
      g.add(mesh);
      faces.push(mesh);
    }
    v.box(10.2, 0.12, 0.3, rim, 0, 5.61, 0, g);
    v.box(10.2, 0.12, 0.3, rim, 0, 0.49, 0, g);
    for (const sx of [-4, -2, 0, 2, 4]) {
      v.box(0.16, 0.55, 0.18, frame, sx, 0.275, 0, g);
      const e = registerBreakable(
        v,
        g,
        s.x + Math.cos(s.angle) * sx,
        s.z - Math.sin(s.angle) * sx,
        5.7,
        0.16,
        "metal",
      );
      e.definition.bannerId = s.id;
      e.definition.bannerAnchor = sx === 0;
    }
    v.sponsorBanners.push({ id: s.id, root: g, faces });
  }
}
export function brandSponsorBanners(v, logo) {
  for (const [i, t] of v.sponsorTextures.entries()) {
    const next = artwork(i > 1 ? i - 1 : i === 1, logo);
    t.image.getContext("2d").drawImage(next, 0, 0);
    t.needsUpdate = true;
  }
}
export function updateSponsorBanners(v, sim) {
  if (v.sponsorRun === sim.cashBannerIds) return;
  v.sponsorRun = sim.cashBannerIds;
  for (const b of v.sponsorBanners || []) {
    const reward = sim.phase !== "ready" && sim.cashBannerIds.includes(b.id);
    const artifact =
      sim.runOptions?.event === EVENT_ID && HUNT_CITIES.includes(ACTIVE_MAP)
        ? ARTIFACT_BANNERS.indexOf(b.id)
        : -1;
    for (const f of b.faces)
      f.material =
        v.sponsorMaterials[artifact >= 0 ? artifact + 2 : reward ? 1 : 0];
  }
}
