import { SceneView } from "./view.js";
import {
  ChaseSimulation,
  CHECKPOINTS,
  distance,
  angleDelta,
  routeBetween,
} from "./simulation.js";
const $ = (id) => document.getElementById(id),
  keys = new Set();
let sim,
  view,
  muted = true,
  audio,
  engine,
  engineGain,
  siren,
  sirenGain,
  last = 0,
  accumulator = 0,
  toastUntil = 0,
  uiTime = 0;
const touch = matchMedia("(pointer: coarse)").matches || innerWidth < 650;
let agentInput = null;
if (document.modelContext?.registerTool) {
  try {
    Promise.resolve(
      document.modelContext.registerTool({
        name: "drive_chase_car",
        description:
          "Drive the running car with throttle and steering for up to five seconds. Uses the same controls as the keyboard; keyboard input takes priority.",
        inputSchema: {
          type: "object",
          properties: {
            throttle: { type: "number", minimum: -1, maximum: 1 },
            steer: { type: "number", minimum: -1, maximum: 1 },
            seconds: { type: "number", minimum: 0.1, maximum: 5 },
            brake: { type: "boolean" },
            boost: { type: "boolean" },
          },
          required: ["throttle", "steer", "seconds"],
          additionalProperties: false,
        },
        execute: async (v) => {
          if (
            !v ||
            !Number.isFinite(v.throttle) ||
            !Number.isFinite(v.steer) ||
            Math.abs(v.throttle) > 1 ||
            Math.abs(v.steer) > 1 ||
            !Number.isFinite(v.seconds) ||
            v.seconds < 0.1 ||
            v.seconds > 5
          )
            throw Error(
              "Use throttle and steer from -1 to 1, and seconds from 0.1 to 5",
            );
          if (sim?.phase !== "running")
            throw Error("Start or resume a run first");
          if (agentInput)
            throw Error("A driving action is already in progress");
          agentInput = {
            throttle: v.throttle,
            steer: v.steer,
            brake: !!v.brake,
            boost: !!v.boost,
          };
          try {
            await new Promise((resolve) =>
              setTimeout(resolve, v.seconds * 1000),
            );
            updateHUD();
            return sim.snapshot();
          } finally {
            agentInput = null;
          }
        },
      }),
    ).catch(() => {});
  } catch {}
}
function input() {
  if (agentInput && keys.size === 0) return agentInput;
  return {
    throttle:
      (keys.has("w") || keys.has("ArrowUp") ? 1 : 0) -
      (keys.has("s") || keys.has("ArrowDown") ? 1 : 0),
    steer:
      (keys.has("d") || keys.has("ArrowRight") ? 1 : 0) -
      (keys.has("a") || keys.has("ArrowLeft") ? 1 : 0),
    brake: keys.has(" "),
    boost: keys.has("Shift"),
  };
}
function initAudio() {
  if (audio) return;
  audio = new AudioContext();
  engine = audio.createOscillator();
  engine.type = "sawtooth";
  engineGain = audio.createGain();
  engineGain.gain.value = 0;
  const lowpass = audio.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 450;
  engine.connect(lowpass).connect(engineGain).connect(audio.destination);
  engine.start();
  siren = audio.createOscillator();
  siren.type = "sine";
  sirenGain = audio.createGain();
  sirenGain.gain.value = 0;
  siren.connect(sirenGain).connect(audio.destination);
  siren.start();
}
function toggleSound() {
  initAudio();
  audio.resume();
  muted = !muted;
  $("sound").textContent = muted ? "SOUND OFF" : "SOUND ON";
  $("sound").setAttribute("aria-label", muted ? "Enable sound" : "Mute sound");
}
function audioTick() {
  if (!audio) return;
  const active = !muted && sim.phase === "running";
  engine.frequency.setTargetAtTime(
    42 + Math.abs(sim.player.speed) * 3.8,
    audio.currentTime,
    0.12,
  );
  engineGain.gain.setTargetAtTime(active ? 0.024 : 0, audio.currentTime, 0.08);
  siren.frequency.setTargetAtTime(
    600 + Math.sin(sim.time * 5) * 230,
    audio.currentTime,
    0.03,
  );
  sirenGain.gain.setTargetAtTime(
    active ? Math.max(0, 1 - (sim.closestPolice || 100) / 100) * 0.016 : 0,
    audio.currentTime,
    0.1,
  );
}
function start() {
  keys.clear();
  sim.start();
  view.startGame(sim);
  $("intro").hidden = true;
  $("mission-card").hidden = true;
  $("hud").hidden = false;
  $("modal").hidden = true;
  $("touch-controls").hidden = !touch;
  $("pause").disabled = false;
  document.body.classList.add("playing");
  accumulator = 0;
  updateHUD();
}
function pause() {
  if (!["running", "paused"].includes(sim.phase)) return;
  if (sim.phase === "running") {
    sim.phase = "paused";
    keys.clear();
    showModal("PAUSED.", "Your getaway can wait.", "TAKE A BREATHER", false);
  } else {
    sim.phase = "running";
    $("modal").hidden = true;
    accumulator = 0;
  }
  audioTick();
}
function showModal(title, copy, kicker, end) {
  $("modal-title").textContent = title;
  $("modal-copy").textContent = copy;
  $("modal-kicker").textContent = kicker;
  $("resume").hidden = end;
  $("restart").textContent = end ? "RUN IT BACK ↗" : "RESTART RUN";
  $("result-score").textContent = end
    ? Math.floor(sim.score).toLocaleString() + " POINTS"
    : "";
  $("modal").hidden = false;
  (end ? $("restart") : $("resume")).focus();
}
function finish() {
  const won = sim.phase === "won";
  showModal(
    won ? "GONE." : "CHASE OVER.",
    won
      ? "All six checkpoints cleared. The police lost your trail."
      : sim.phase === "busted"
        ? "The police boxed you in. Keep moving and use nitro to break away."
        : "Your car took too much damage. Brake before turns and give traffic some room.",
    won ? "CLEAN GETAWAY" : sim.phase === "busted" ? "BUSTED" : "CAR WRECKED",
    true,
  );
  keys.clear();
  $("pause").disabled = true;
}
function toast(text) {
  if (text === "COLLISION") {
    view.shake = 0.4;
    return;
  }
  $("toast").textContent = text;
  $("toast").classList.add("visible");
  toastUntil = sim.time + 2.8;
}
function updateHUD() {
  const p = sim.player;
  $("score").textContent = Math.floor(sim.score).toString().padStart(6, "0");
  $("progress").textContent = sim.checkpoint + " / 6";
  $("dots").innerHTML = CHECKPOINTS.map(
    (_, i) => `<i class="${i < sim.checkpoint ? "done" : ""}"></i>`,
  ).join("");
  $("speed").textContent = Math.round(Math.abs(p.speed) * 3.6);
  $("health").textContent = Math.ceil(p.health) + "%";
  $("health-bar").style.width = p.health + "%";
  $("health-bar").style.background = p.health < 30 ? "#ff796e" : "#e8ff76";
  $("nitro-bar").style.width = p.nitro + "%";
  $("heat").textContent = sim.police.length === 3 ? "● ● ●" : "● ● ○";
  const escape = sim.checkpoint === 6;
  $("bust-bar").style.width =
    (escape ? sim.escape / 8 : sim.bust / 4) * 100 + "%";
  $("bust-bar").style.background = escape ? "#73e6ed" : "#ff796e";
  $("heat-label").textContent = escape ? "BREAK CONTACT" : "POLICE PURSUIT";
  $("pursuit-text").textContent =
    sim.bust > 1
      ? "BOXED IN — ACCELERATE!"
      : escape
        ? sim.escape > 0
          ? "Losing them… " + Math.ceil(8 - sim.escape) + "s"
          : "Break line of sight and pull away."
        : "Keep moving. Don’t get boxed in.";
  const cp = CHECKPOINTS[sim.checkpoint];
  $("objective").textContent = cp
    ? "Reach " + cp.name
    : "Lose the police for 8 seconds";
  $("district").textContent = cp ? cp.name.toUpperCase() : "ESCAPE ROUTE";
  if (cp) {
    const route = routeBetween(p, cp),
      next = route.find((q) => distance(p, q) > 20) || cp;
    const delta = angleDelta(Math.atan2(next.x - p.x, next.z - p.z), p.angle);
    $("direction").textContent =
      Math.abs(delta) < 0.45
        ? "↑"
        : Math.abs(delta) > 2.4
          ? "↶"
          : delta > 0
            ? "→"
            : "←";
    $("distance").textContent = Math.round(distance(p, cp)) + " M";
  } else {
    $("direction").textContent = "↗";
    $("distance").textContent = "ESCAPE";
  }
  $("route-cue").querySelector("small").textContent = cp
    ? "NEXT CHECKPOINT"
    : "LOSE THE HEAT";
  drawMap();
}
function drawMap() {
  const c = $("map").getContext("2d"),
    s = 230 / 1020,
    ox = 115,
    oz = 115;
  c.clearRect(0, 0, 230, 230);
  c.fillStyle = "#112531";
  c.fillRect(0, 0, 230, 230);
  c.strokeStyle = "#344954";
  c.lineWidth = 6;
  for (let i = -3; i <= 3; i++) {
    c.beginPath();
    c.moveTo(ox + i * 140 * s, 5);
    c.lineTo(ox + i * 140 * s, 225);
    c.moveTo(5, oz - i * 140 * s);
    c.lineTo(225, oz - i * 140 * s);
    c.stroke();
  }
  const cp = CHECKPOINTS[sim.checkpoint];
  if (cp) {
    c.strokeStyle = "#73e6ed";
    c.lineWidth = 1.6;
    c.setLineDash([4, 3]);
    c.beginPath();
    c.moveTo(ox + sim.player.x * s, oz - sim.player.z * s);
    for (const q of routeBetween(sim.player, cp))
      c.lineTo(ox + q.x * s, oz - q.z * s);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = "#73e6ed";
    c.beginPath();
    c.arc(ox + cp.x * s, oz - cp.z * s, 5, 0, Math.PI * 2);
    c.fill();
  }
  for (const cop of sim.police) {
    c.fillStyle = "#ff706a";
    c.beginPath();
    c.arc(ox + cop.x * s, oz - cop.z * s, 3, 0, Math.PI * 2);
    c.fill();
  }
  c.save();
  c.translate(ox + sim.player.x * s, oz - sim.player.z * s);
  c.rotate(sim.player.angle);
  c.fillStyle = "#e8ff76";
  c.beginPath();
  c.moveTo(0, -7);
  c.lineTo(4, 5);
  c.lineTo(0, 3);
  c.lineTo(-4, 5);
  c.fill();
  c.restore();
}
function frame(now) {
  const dt = Math.min((now - last) / 1000 || 0, 0.05);
  last = now;
  if (sim.phase === "running") {
    accumulator += dt;
    while (accumulator >= 1 / 120) {
      sim.update(1 / 120, input());
      accumulator -= 1 / 120;
      if (sim.phase !== "running") {
        finish();
        break;
      }
    }
    for (const event of sim.events.splice(0)) toast(event);
    if (sim.time > toastUntil) $("toast").classList.remove("visible");
  }
  view.render(sim, dt, input());
  uiTime += dt;
  if (uiTime > 0.08) {
    if (sim.phase !== "ready") updateHUD();
    audioTick();
    uiTime = 0;
  }
  requestAnimationFrame(frame);
}
function registerTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const life = new AbortController();
  addEventListener("pagehide", () => life.abort(), { once: true });
  const tools = [
    {
      name: "get_chase_status",
      description:
        "Read the current Nightshift run score, checkpoint progress, speed, condition, and chase state.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => sim.snapshot(),
    },
    {
      name: "start_chase_run",
      description:
        "Start or restart Nightshift from the beginning, resetting the score and checkpoint progress.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: () => {
        start();
        return sim.snapshot();
      },
    },
    {
      name: "set_chase_paused",
      description: "Pause or resume the current Nightshift run.",
      inputSchema: {
        type: "object",
        properties: { paused: { type: "boolean" } },
        required: ["paused"],
        additionalProperties: false,
      },
      execute: (v) => {
        if (typeof v?.paused !== "boolean")
          throw Error("paused must be a boolean");
        if (!["paused", "running"].includes(sim.phase))
          throw Error("Start a run first");
        if ((sim.phase === "paused") !== v.paused) pause();
        return sim.snapshot();
      },
    },
  ];
  for (const tool of tools) {
    try {
      Promise.resolve(
        context.registerTool(tool, { signal: life.signal }),
      ).catch(() => {});
    } catch {}
  }
}
try {
  sim = new ChaseSimulation();
  view = new SceneView($("world"));
  await view.loadTextures();
  view.setupGame(sim);
  $("loading").hidden = true;
  $("start").onclick = start;
  $("pause").onclick = pause;
  $("pause").disabled = true;
  $("resume").onclick = pause;
  $("restart").onclick = start;
  $("sound").onclick = toggleSound;
  const relevant = [
    "w",
    "a",
    "s",
    "d",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    " ",
    "Shift",
    "p",
    "Escape",
    "r",
    "m",
    "Enter",
  ];
  addEventListener("keydown", (e) => {
    let k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!relevant.includes(k)) return;
    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k))
      e.preventDefault();
    keys.add(k);
    if (!e.repeat) {
      if (k === "p" || k === "Escape") pause();
      if (k === "r") sim.recover();
      if (k === "m") toggleSound();
      if (k === "Enter" && sim.phase === "ready") start();
    }
  });
  addEventListener("keyup", (e) =>
    keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key),
  );
  addEventListener("blur", () => {
    keys.clear();
    if (sim.phase === "running") pause();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && sim.phase === "running") pause();
  });
  for (const btn of document.querySelectorAll("[data-key]")) {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      keys.add(btn.dataset.key);
      btn.classList.add("pressed");
    });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
      btn.addEventListener(name, () => {
        keys.delete(btn.dataset.key);
        btn.classList.remove("pressed");
      });
  }
  registerTools();
  requestAnimationFrame(frame);
} catch (e) {
  $("loading").hidden = true;
  $("error").hidden = false;
  $("error").textContent =
    "The city could not load. Try reloading in a browser with WebGL enabled. " +
    e.message;
  console.error(e);
}
