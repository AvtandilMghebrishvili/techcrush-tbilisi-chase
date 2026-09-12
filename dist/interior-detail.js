import * as THREE from "./vendor/three.module.js";
import { box, mesh, metal } from "./customization.js";
import { engineTelemetry } from "./audio-model.js";

export const CABIN_STYLES = {
  classic: {
    accent: "#ea493b",
    name: "458 · HERITAGE",
    analog: true,
    trim: "#202127",
  },
  gt: {
    accent: "#e7d3a5",
    name: "APEX · SPORT CHRONO",
    analog: true,
    trim: "#503d33",
  },
  rally: {
    accent: "#e9d538",
    name: "VECTOR · CORSA",
    analog: false,
    trim: "#20232a",
  },
  suv: {
    accent: "#5bbbee",
    name: "VEYRA · GRAND TOUR",
    analog: true,
    trim: "#233d51",
  },
};
Object.assign(CABIN_STYLES, {
  falcon: {
    accent: "#ff873f",
    name: "FALCON / RALLY RS",
    analog: true,
    trim: "#3e302b",
  },
  rioni: {
    accent: "#63e4b3",
    name: "RIONI / GRAND TOUR",
    analog: true,
    trim: "#23463f",
  },
  coast: {
    accent: "#55b5ff",
    name: "COAST / TRACK X",
    analog: false,
    trim: "#172f48",
  },
  creator: {
    accent: "#ff3158",
    name: "TECHCRUSH / CREATOR",
    analog: false,
    trim: "#321e2b",
  },
});
export function addCabinDetails(car, id) {
  const style = CABIN_STYLES[id] || CABIN_STYLES.gt,
    root = new THREE.Group();
  root.name = "cabin-instruments";
  const trim = metal(style.trim, 0.68),
    chrome = metal("#abb4bd", 0.25),
    accent = metal(style.accent, 0.48);
  car.add(root);
  // The original licensed cabin is preserved. Each additional cluster is flush with its dash.
  const classic = id === "classic",
    x = 0.36,
    y = classic ? 0.917 : 0.948,
    z = classic ? 0.565 : 0.29;
  if (classic)
    for (const name of ["leather", "steering_leather"]) {
      const m = car.userData.body.getObjectByName(name);
      if (m)
        m.material = new THREE.MeshStandardMaterial({
          color: name === "leather" ? "#343034" : "#161b21",
          roughness: 0.85,
        });
    }
  const housing = mesh(
    root,
    new THREE.CapsuleGeometry(0.077, 0.245, 6, 32),
    trim,
    x,
    y,
    z,
  );
  housing.rotation.z = Math.PI / 2;
  housing.scale.z = 0.38;
  for (const side of [-1, 1]) {
    if (!classic) {
      const vent = mesh(
        root,
        new THREE.TorusGeometry(0.038, 0.006, 8, 32),
        chrome,
        x + side * 0.26,
        y - 0.055,
        z + 0.008,
      );
      vent.rotation.y = Math.PI;
      for (let i = 0; i < 4; i++)
        box(
          root,
          0.055,
          0.004,
          0.01,
          trim,
          x + side * 0.26,
          y - 0.075 + i * 0.012,
          z,
        );
    }
  }
  if (!classic) {
    const wide = id === "suv";
    car.userData.steering.rotor.parent.position.y -= 0.115;
    const roof = id === "rally" ? 1.22 : id === "gt" ? 1.35 : 1.37;
    const lining = new THREE.MeshStandardMaterial({
      color: "#1b2028",
      roughness: 0.96,
    });
    const upholstery = new THREE.MeshStandardMaterial({
      color: style.trim,
      roughness: 0.84,
    });
    box(root, 1.13, 0.012, 0.74, lining, 0, roof - 0.012, -0.32);
    box(root, 1.25, 0.032, 1.42, lining, 0, 0.445, -0.17);
    for (const side of [-1, 1]) {
      box(root, 0.038, 0.27, 0.97, upholstery, side * 0.65, 0.68, -0.2);
      box(root, 0.048, 0.03, 0.22, chrome, side * 0.617, 0.77, -0.13);
      // Padded seat bolsters and contrast piping follow the existing seat backs.
      for (const edge of [-1, 1]) {
        const bolster = mesh(
          root,
          new THREE.CapsuleGeometry(0.038, 0.31, 5, 12),
          upholstery,
          side * 0.37 + edge * 0.2,
          0.83,
          -0.59,
        );
        bolster.rotation.x = -0.1;
        const stitch = mesh(
          root,
          new THREE.CapsuleGeometry(0.003, 0.3, 3, 8),
          accent,
          side * 0.37 + edge * 0.166,
          0.83,
          -0.555,
        );
        stitch.rotation.x = -0.1;
      }
    }
    if (id === "rally") {
      const rotor = car.userData.steering.rotor,
        rim = rotor.children[0];
      rim.geometry.dispose();
      const points = Array.from({ length: 65 }, (_, i) => {
        const a = (i / 64) * Math.PI * 2;
        return new THREE.Vector3(
          Math.sin(a) * 0.168,
          Math.max(-0.127, Math.cos(a) * 0.168),
          0,
        );
      });
      rim.geometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        64,
        0.023,
        10,
        false,
      );
    }
    const rotor = car.userData.steering.rotor;
    box(rotor, 0.039, 0.012, 0.006, accent, 0, 0.168, -0.027);
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++)
        box(
          rotor,
          0.008,
          0.006,
          0.008,
          chrome,
          side * 0.091,
          0.02 - i * 0.019,
          -0.016,
        );
    box(root, 1.21, 0.025, 0.06, accent, 0, 0.837, 0.257);
    box(root, 0.17, 0.045, 0.56, trim, -0.055, 0.704, -0.06);
    if (wide) {
      const dial = mesh(
        root,
        new THREE.CylinderGeometry(0.044, 0.044, 0.024, 32),
        chrome,
        -0.055,
        0.746,
        0.12,
      );
      for (let i = 0; i < 12; i++) {
        let a = (i / 12) * Math.PI * 2;
        box(
          root,
          0.005,
          0.025,
          0.005,
          accent,
          dial.position.x + Math.cos(a) * 0.044,
          0.746,
          0.12 + Math.sin(a) * 0.044,
        );
      }
    }
    const shift = mesh(
      root,
      new THREE.CylinderGeometry(0.018, 0.027, 0.1, 12),
      chrome,
      -0.055,
      0.768,
      -0.1,
    );
    mesh(
      root,
      new THREE.SphereGeometry(0.031, 12, 8),
      trim,
      shift.position.x,
      0.833,
      -0.1,
    );
    for (let i = 0; i < (wide ? 5 : 3); i++)
      box(root, 0.032, 0.007, 0.04, chrome, -0.13 + i * 0.037, 0.734, 0.075);
    for (const side of [-1, 1]) {
      box(root, 0.035, 0.055, 0.69, trim, side * 0.765, 0.743, -0.19);
      box(root, 0.036, 0.007, 0.6, accent, side * 0.774, 0.779, -0.19);
    }
  }
  car.userData.cabinStyle = id;
  if (typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 288;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.disposable = true;
  const outline = new THREE.Shape(),
    w = 0.35,
    h = 0.127,
    r = 0.025;
  outline.moveTo(-w / 2 + r, -h / 2);
  outline.lineTo(w / 2 - r, -h / 2);
  outline.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  outline.lineTo(w / 2, h / 2 - r);
  outline.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  outline.lineTo(-w / 2 + r, h / 2);
  outline.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  outline.lineTo(-w / 2, -h / 2 + r);
  outline.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geometry = new THREE.ShapeGeometry(outline),
    uv = geometry.attributes.uv,
    pos = geometry.attributes.position;
  for (let i = 0; i < uv.count; i++)
    uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  const panel = mesh(
    root,
    geometry,
    new THREE.MeshBasicMaterial({ map: texture }),
    x,
    y,
    z - 0.031,
  );
  panel.rotation.y = Math.PI;
  car.userData.instrument = { canvas, texture, style, last: "" };
  updateInterior(car, { speed: 0, boostStrength: 0, carId: id });
}
export function updateInterior(car, p, dt = 1 / 60, input = {}) {
  const d = car.userData.instrument;
  if (!d) return;
  d.engine = engineTelemetry(p, input, d.engine || {}, dt);
  const speed = Math.round(Math.abs(p.speed || 0) * 3.6),
    gear = p.speed < -0.7 ? "R" : String(d.engine.gear),
    rpm = Math.round((d.engine.rpm / d.engine.voice.redline) * 20) / 20;
  const key = `${speed}:${gear}:${rpm}`;
  if (d.last === key) return;
  d.last = key;
  const c = d.canvas.getContext("2d"),
    accent = d.style.accent;
  c.fillStyle = "#070c12";
  c.fillRect(0, 0, 768, 288);
  c.strokeStyle = accent;
  c.lineWidth = 6;
  if (d.style.analog) {
    for (const [cx, value] of [
      [144, speed / 350],
      [624, rpm],
    ]) {
      c.beginPath();
      c.arc(cx, 143, 103, 0.7, 5.58);
      c.stroke();
      c.strokeStyle = "#aebdca";
      c.lineWidth = 2;
      for (let n = 0; n < 13; n++) {
        const a = 0.7 + (n / 12) * 4.88;
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * 84, 143 + Math.sin(a) * 84);
        c.lineTo(cx + Math.cos(a) * 97, 143 + Math.sin(a) * 97);
        c.stroke();
      }
      const a = 0.7 + Math.min(1, value) * 4.88;
      c.strokeStyle = accent;
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(cx, 143);
      c.lineTo(cx + Math.cos(a) * 77, 143 + Math.sin(a) * 77);
      c.stroke();
    }
  } else {
    for (let i = 0; i < 22; i++) {
      c.fillStyle = i < rpm * 22 ? accent : "#26303a";
      c.fillRect(40 + i * 31, 46, 23, 28);
    }
  }
  c.textAlign = "center";
  c.fillStyle = "#f4f7f9";
  c.font = "bold 85px monospace";
  c.fillText(String(speed).padStart(3, "0"), 384, 153);
  c.fillStyle = accent;
  c.font = "bold 28px monospace";
  c.fillText(`KM/H  ·  ${gear}`, 384, 194);
  c.fillStyle = "#b5c1ce";
  c.font = "20px sans-serif";
  c.fillText(d.style.name, 384, 260);
  d.texture.needsUpdate = true;
}
