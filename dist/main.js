import { ROADS } from "./city-map.js";
import { ProfileClient } from "./profile-client.js";
import { GarageUI } from "./garage-ui.js";
import { upgradedSpec } from "./progression.js";
const career = new ProfileClient();
let workshop,
  runId = null,
  settlement = null,
  transitioning = false;
import { RIVER_POLYGON } from "./district-data.js";
import { RAMPS } from "./stunts.js";
import { SceneView } from "./view.js";
import {
  CARS,
  CAMERAS,
  carSpec,
  GRID_RADIUS,
  MAP_SIZE,
  TOWER,
} from "./config.js";
import { normalizeKey, drivingInput } from "./controls.js";
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
let selectedCar = "gt";
let turboGain,
  turboWhine,
  turboWhineGain,
  boostWasOn = false,
  releaseUntil = 0;
if (document.modelContext?.registerTool) {
  try {
    Promise.resolve(
      document.modelContext.registerTool({
        name: "drive_chase_car",
        description:
          "Drive with throttle and steering for up to five seconds. Negative steer turns left, positive turns right. Keyboard input takes priority.",
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
  return drivingInput(keys);
}
function chooseCar(id) {
  selectedCar = carSpec(id).id;
  sim.selectedCar = selectedCar;
  sim.player.carId = selectedCar;
  const equipment = career.profile?.cars[selectedCar] || {};
  sim.player.equipment = structuredClone(equipment);
  sim.player.performance = upgradedSpec(carSpec(selectedCar), equipment);
  view.selectCar(selectedCar, equipment);
  for (const button of document.querySelectorAll("[data-car]"))
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.car === selectedCar),
    );
  const c = upgradedSpec(carSpec(id), equipment);
  $("car-details").textContent =
    c.description + " · " + Math.round(c.topSpeed * 3.6) + " km/h";
}
function setupGarage() {
  const garage = $("garage");
  garage.innerHTML = CARS.map(
    (c) =>
      `<button type="button" data-car="${c.id}" aria-pressed="${c.id === selectedCar}"><i style="background:${c.color}"></i><b>${c.name}</b><small>${c.type}</small></button>`,
  ).join("");
  for (const button of garage.querySelectorAll("button"))
    button.onclick = () => chooseCar(button.dataset.car);
  chooseCar(selectedCar);
  $("garage-back").onclick = async () => {
    if (transitioning) return;
    transitioning = true;
    try {
      await bankRun();
    } catch (error) {
      $("modal-copy").textContent = error.message;
      transitioning = false;
      return;
    }
    keys.clear();
    agentInput = null;
    sim.reset();
    $("modal").hidden = true;
    $("hud").hidden = true;
    $("intro").hidden = false;
    $("mission-card").hidden = false;
    $("touch-controls").hidden = true;
    document.body.classList.remove("playing", "turbo-active", "rewinding");
    view.player.visible = true;
    view.cockpit.root.visible = false;
    view.camera.position.set(11, 7.5, -49);
    view.camera.lookAt(-5, 2, -4);
    chooseCar(selectedCar);
    view.player.position.set(4, 0, -30);
    view.player.rotation.set(0, 0, 0);
    view.resetPreview();
    transitioning = false;
    workshop.car = selectedCar;
    workshop.open();
  };
}
async function bankRun() {
  if (settlement) return settlement;
  if (!runId) return;
  const id = runId;
  settlement = (async () => {
    if (career.pending) await career.retry();
    if (!career.profile.settled.includes(id))
      await career.mutate({
        type: "settle",
        runId: id,
        level: sim.level,
        cash: sim.runCash,
        result: ["won", "wrecked", "busted"].includes(sim.phase)
          ? sim.phase
          : "abandoned",
      });
    runId = null;
  })();
  try {
    await settlement;
  } finally {
    settlement = null;
  }
}
function switchCamera(id) {
  const mode = id ? view.setCamera(id) : view.cycleCamera();
  $("camera-toggle").textContent = "C · " + mode.label;
  $("camera-toggle").setAttribute(
    "aria-label",
    "Camera: " + mode.label + "; click to switch",
  );
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
  const noiseBuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++)
    noiseData[i] = (Math.random() * 2 - 1) * 0.5;
  const noise = audio.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2300;
  filter.Q.value = 0.65;
  turboGain = audio.createGain();
  turboGain.gain.value = 0;
  noise.connect(filter).connect(turboGain).connect(audio.destination);
  noise.start();
  turboWhine = audio.createOscillator();
  turboWhine.type = "sine";
  turboWhineGain = audio.createGain();
  turboWhineGain.gain.value = 0;
  turboWhine.connect(turboWhineGain).connect(audio.destination);
  turboWhine.start();
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
  const p = sim.player;
  if (active && boostWasOn && !p.boosting)
    releaseUntil = audio.currentTime + 0.34;
  boostWasOn = active && p.boosting;
  const release = Math.max(0, (releaseUntil - audio.currentTime) / 0.34);
  turboGain.gain.setTargetAtTime(
    active ? (p.boosting ? p.boostStrength * 0.025 : release * 0.045) : 0,
    audio.currentTime,
    0.045,
  );
  turboWhine.frequency.setTargetAtTime(
    620 + p.boostStrength * 1100,
    audio.currentTime,
    0.1,
  );
  turboWhineGain.gain.setTargetAtTime(
    active && p.boosting ? p.boostStrength * 0.006 : 0,
    audio.currentTime,
    0.06,
  );
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
async function start() {
  if (transitioning || $("workshop").open || $("loot-dialog").open) return;
  transitioning = true;
  try {
    await bankRun();
    if (career.pending) await career.retry();
    if (career.profile.selectedCar !== selectedCar)
      await career.mutate({ type: "select", car: selectedCar });
    keys.clear();
    agentInput = null;
    sim.start(selectedCar, {
      level: career.profile.level,
      equipment: career.profile.cars[selectedCar],
    });
    runId = crypto.randomUUID();
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
  } catch (error) {
    showModal("SAVE PENDING", error.message, "YOUR GARAGE", true);
  } finally {
    transitioning = false;
  }
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
  $("result-reward").textContent = "";
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
  if (won) {
    $("modal-title").textContent = `LEVEL ${sim.level} CLEAR.`;
    $("result-reward").textContent =
      "Saving your credits and three-part reward box…";
    void bankRun()
      .then(() => {
        $("result-reward").textContent =
          `+${(sim.runCash + 1800 + sim.level * 250).toLocaleString()} CR · +1 BOX · LEVEL ${career.profile.level} UNLOCKED`;
        $("restart").textContent = `START LEVEL ${career.profile.level} ↗`;
        $("garage-back").textContent = "GARAGE · OPEN BOX & UPGRADE";
      })
      .catch((error) => {
        $("result-reward").textContent =
          error.message + " Use Garage to retry.";
      });
  } else {
    $("result-reward").textContent =
      `${sim.runCash} CR earned · banked when you leave or retry. Q can still rewind this run.`;
    $("garage-back").textContent = "GARAGE · BANK CREDITS";
  }
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
  $("run-level").textContent = `LEVEL ${sim.level}`;
  $("run-cash").textContent = `+${sim.runCash.toLocaleString()} CR`;
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
  $("turbo-status").textContent = p.boosting
    ? p.boostStrength < 0.8
      ? "SPOOLING"
      : "BOOST ACTIVE"
    : p.nitroLocked
      ? "RECHARGING"
      : p.boostCooldown > 0
        ? "RECHARGE DELAY"
        : "READY";
  $("turbo-charge").textContent = Math.round(p.nitro) + "%";
  $("drift-status").textContent = p.isDrifting
    ? "DRIFT · " + Math.round((Math.abs(p.slip) * 180) / Math.PI) + "°"
    : "";
  if (p.airborne)
    $("drift-status").textContent =
      "AIR · " + p.airTime.toFixed(1) + "s · A/D ROLL";
  if (p.flipped) $("drift-status").textContent = "ROLLOVER · Q TO REWIND";
  const reversing = sim.phase === "rewinding";
  if (sim.phase === "running" || reversing) $("pause").disabled = false;
  document.body.classList.toggle("rewinding", reversing);
  $("rewind").disabled =
    !["running", "wrecked", "busted", "rewinding"].includes(sim.phase) ||
    (sim.timeline.available < 0.1 && !reversing);
  $("rewind-status").textContent = reversing
    ? "−" +
      (sim.timeline.end - sim.timeline.cursor).toFixed(1) +
      "s · RELEASE TO CONTINUE"
    : sim.timeline.available.toFixed(1) + "s AVAILABLE";
  $("rewind-fill").style.width =
    Math.min(100, (sim.timeline.available / 5) * 100) + "%";
  $("timeline-time").textContent = reversing
    ? "−" + (sim.timeline.end - sim.timeline.cursor).toFixed(1) + " SEC"
    : "";
  if (reversing) $("modal").hidden = true;
  document.body.classList.toggle(
    "turbo-active",
    sim.phase === "running" && p.boosting,
  );
  $("gear").textContent =
    p.speed < -0.4
      ? "R"
      : String(Math.min(5, Math.floor((Math.max(0, p.speed) * 3.6) / 46) + 1));
  $("takedowns").textContent = String(sim.takedowns);
  $("heat").textContent =
    sim.police.filter((c) => !c.destroyed).length +
    " UNITS · HEAT " +
    sim.heatLevel;
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
        : sim.roadblockAhead
          ? "ROADBLOCK AHEAD — FIND A GAP"
          : sim.police.length < sim.difficulty.maxUnits
            ? "REINFORCEMENTS IN " + Math.ceil(sim.nextWaveAt - sim.time) + "s"
            : `MAXIMUM PURSUIT — ${sim.difficulty.maxUnits} UNITS`;
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
            ? "←"
            : "→";
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
    s = 230 / 1100,
    ox = 115 + sim.player.x * s,
    oz = 115 + sim.player.z * s;
  c.clearRect(0, 0, 230, 230);
  c.fillStyle = "#112531";
  c.fillRect(0, 0, 230, 230);
  c.fillStyle = "#204853";
  c.beginPath();
  RIVER_POLYGON.forEach(([x, z], i) =>
    i ? c.lineTo(ox - x * s, oz - z * s) : c.moveTo(ox - x * s, oz - z * s),
  );
  c.closePath();
  c.fill();
  c.strokeStyle = "#344954";
  c.lineWidth = 6;
  for (const road of ROADS) {
    c.lineWidth = Math.max(1.3, road.width * s);
    c.beginPath();
    c.moveTo(ox - road.start.x * s, oz - road.start.z * s);
    c.lineTo(ox - road.end.x * s, oz - road.end.z * s);
    c.stroke();
  }
  const cp = CHECKPOINTS[sim.checkpoint];
  if (cp) {
    c.strokeStyle = "#73e6ed";
    c.lineWidth = 1.6;
    c.setLineDash([4, 3]);
    c.beginPath();
    c.moveTo(ox - sim.player.x * s, oz - sim.player.z * s);
    for (const q of routeBetween(sim.player, cp))
      c.lineTo(ox - q.x * s, oz - q.z * s);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = "#73e6ed";
    c.beginPath();
    c.arc(
      Math.max(9, Math.min(221, ox - cp.x * s)),
      Math.max(9, Math.min(221, oz - cp.z * s)),
      5,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  c.fillStyle = "#d3b37a";
  c.fillRect(ox - TOWER.x * s - 2, oz - TOWER.z * s - 2, 4, 4);
  for (const ramp of RAMPS) {
    const x = ox - ramp.x * s,
      y = oz - ramp.z * s;
    c.beginPath();
    c.moveTo(x, y - 4);
    c.lineTo(x + 4, y + 3);
    c.lineTo(x - 4, y + 3);
    c.closePath();
    c.fill();
  }
  for (const cop of sim.police) {
    if (cop.destroyed) continue;
    c.fillStyle = "#ff706a";
    c.beginPath();
    c.arc(ox - cop.x * s, oz - cop.z * s, 3, 0, Math.PI * 2);
    c.fill();
  }
  c.save();
  c.translate(ox - sim.player.x * s, oz - sim.player.z * s);
  c.rotate(-sim.player.angle);
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
  if (
    sim.phase === "running" ||
    sim.phase === "rewinding" ||
    (input().rewind && ["wrecked", "busted"].includes(sim.phase))
  ) {
    accumulator += dt;
    while (accumulator >= 1 / 120) {
      const previousPhase = sim.phase;
      sim.update(1 / 120, input());
      accumulator -= 1 / 120;
      if (["won", "wrecked", "busted"].includes(sim.phase)) {
        if (previousPhase !== sim.phase) finish();
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
      name: "set_chase_rewind",
      description:
        "Hold or release the same five-second rewind control as Q. Hold to play the recent chase backwards slowly; release to continue from there.",
      inputSchema: {
        type: "object",
        properties: { held: { type: "boolean" } },
        required: ["held"],
        additionalProperties: false,
      },
      execute: ({ held }) => {
        if (held) {
          if (
            !["running", "rewinding", "wrecked", "busted"].includes(sim.phase)
          )
            throw Error("Start or resume a run first");
          if (sim.timeline.available < 0.1)
            throw Error("Drive first to record some history");
          keys.add("q");
          sim.timeline.back(sim, 0);
        } else {
          keys.delete("q");
          sim.timeline.release(sim);
        }
        return sim.snapshot();
      },
    },
    {
      name: "select_chase_car",
      description:
        "Select a car before starting a run. Read current choices from the garage.",
      inputSchema: {
        type: "object",
        properties: { car: { type: "string", enum: CARS.map((c) => c.id) } },
        required: ["car"],
        additionalProperties: false,
      },
      execute: ({ car }) => {
        if (!CARS.some((c) => c.id === car)) throw Error("Unknown car");
        if (sim.phase !== "ready")
          throw Error("Finish this run or return to the garage first");
        chooseCar(car);
        return { car: selectedCar };
      },
    },
    {
      name: "set_chase_camera",
      description: "Change the game camera: chase, cockpit, hood, or aerial.",
      inputSchema: {
        type: "object",
        properties: {
          camera: { type: "string", enum: CAMERAS.map((c) => c.id) },
        },
        required: ["camera"],
        additionalProperties: false,
      },
      execute: ({ camera }) => {
        switchCamera(camera);
        return { camera: CAMERAS[view.cameraMode].id };
      },
    },
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
      execute: () => ({
        ...sim.snapshot(),
        camera: CAMERAS[view.cameraMode].id,
      }),
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
      execute: async () => {
        await start();
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
  await Promise.all([view.loadTextures(), career.init()]);
  view.setupGame(sim);
  $("loading").hidden = true;
  selectedCar = career.profile.selectedCar;
  setupGarage();
  workshop = new GarageUI(career, chooseCar);
  $("workshop-open").onclick = () => {
    workshop.car = selectedCar;
    workshop.open();
  };
  $("start").onclick = start;
  $("camera-toggle").onclick = () => switchCamera();
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
    "c",
    "q",
  ];
  addEventListener("keydown", (e) => {
    if ($("workshop").open || $("loot-dialog").open) return;
    const k = normalizeKey(e);
    if (!relevant.includes(k)) return;
    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k))
      e.preventDefault();
    keys.add(k);
    if (!e.repeat) {
      if (k === "p" || k === "Escape") pause();
      if (k === "r") sim.recover();
      if (k === "m") toggleSound();
      if (k === "c") switchCamera();
      if (k === "Enter" && sim.phase === "ready") start();
    }
  });
  addEventListener("keyup", (e) => keys.delete(normalizeKey(e)));
  addEventListener("blur", () => {
    keys.clear();
    if (sim.timeline.active) sim.timeline.release(sim);
    if (sim.phase === "running") pause();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && sim.timeline.active) {
      keys.clear();
      sim.timeline.release(sim);
    }
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
