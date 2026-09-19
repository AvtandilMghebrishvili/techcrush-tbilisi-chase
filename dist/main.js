import { EventUI } from "./event-ui.js";
import { eventProgress } from "./event-rules.js";
import { MapSettings, mapPreferences } from "./map-settings.js";
import { radarScale } from "./map-preferences.js";
import { BackgroundMusic } from "./background-music.js";
import {
  carSilhouette,
  carRequirement,
  refreshRewards,
  rewardTiles,
  openCarReward,
} from "./reward-ui.js";
import { carUnlocked, totalTakedowns } from "./progression.js";
import { drivingFeel, setupDrivingFeel } from "./driving-feel.js";
import { QuestMap, QUEST_PINS, mapAtlas, MAP_EXTENT } from "./quest-map.js";
import { ScoreFeedback } from "./score-feedback.js";
import { ResultScreen } from "./result-screen.js";
import {
  ACTIVE_MAP,
  IS_KUTAISI,
  IS_BATUMI,
  IS_RUSTAVI,
  cityLevel,
  cityCommunity,
  mapUnlocked,
} from "./map-selection.js";
import { cityMenu } from "./city-menu.js";
import { levelCondition } from "./level-conditions.js";
import { CommunityUI } from "./community-ui.js";
import { RaceClock, TIME_COURSE, formatRaceTime } from "./race-timing.js";
import { ACHIEVEMENTS } from "./community-rules.js";
import { setupInterface, actionLabel } from "./interface.js";
import { ChaseAudio } from "./chase-audio.js";
import { FrameLoop } from "./frame-loop.js";
import {
  checkpointRoute as playerRoute,
  checkpointTarget as navigationTarget,
  secondaryRoute,
  secondaryTarget,
} from "./navigation-cache.js";
import { MobileControls } from "./mobile-ui.js";
import { LIGHTING_MODES } from "./city-lighting.js";
import { radarPoint, routeDistance } from "./hud-math.js";
import { ProfileClient } from "./profile-client.js";
import { GarageUI } from "./garage-ui.js";
import { upgradedSpec } from "./progression.js";
const career = new ProfileClient();
const raceClock = new RaceClock();
let eventUI,
  mapSettings,
  workshop,
  community,
  runId = null,
  settlement = null,
  transitioning = false;
import { LANDMARKS } from "./district-data.js";
import { RAMPS } from "./stunts.js";
import { SceneView } from "./view.js";
import { compileScene } from "./compile-scene.js";
import { prepareSceneAssets } from "./scene-assets.js";
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
} from "./simulation.js";
const $ = (id) => document.getElementById(id),
  keys = new Set();
setupInterface();
setupDrivingFeel();
const scoreFeedbackUI = new ScoreFeedback($("score-feedback"), $("score"));
const results = new ResultScreen(career);
let sim,
  view,
  mobile,
  muted = false,
  accumulator = 0,
  toastUntil = 0,
  uiTime = 0,
  lastHUDPhase = null;
let lastDotsKey = "";
let agentInput = null;
let selectedCar = "gt";
const soundscape = new ChaseAudio();
const music = new BackgroundMusic();
const pageLifetime = new AbortController();
let disposed = false,
  dialogs,
  sceneAssets;
function disposePage() {
  if (disposed) return;
  disposed = true;
  pageLifetime.abort();
  keys.clear();
  loop.setEnabled(false);
  dialogs?.disconnect();
  raceClock.setActive(false);
  results.stop();
  community?.stop();
  eventUI?.dispose();
  mobile?.syncActivity(false);
  workshop?.dispose();
  soundscape.dispose();
  music.dispose();
  view?.dispose();
  sceneAssets?.dispose();
  sceneAssets = null;
}
// Register before initialization can yield to a fetch or a shader compilation.
addEventListener("pagehide", disposePage);
addEventListener("pageshow", (event) => {
  // A browser may restore an external navigation from BFCache. Resources were
  // released deliberately, so rebuild from the saved profile, never a stale GPU.
  if (event.persisted && disposed) location.reload();
});
try {
  muted = localStorage.getItem("techcrush-muted") === "true";
} catch {}
soundscape.setMuted(muted);
actionLabel($("sound"), muted ? "MUTED" : "SOUND");
$("sound").setAttribute("aria-pressed", String(!muted));
try {
  const volume = Number(localStorage.getItem("techcrush-music-volume"));
  if (
    localStorage.getItem("techcrush-music-volume") !== null &&
    Number.isFinite(volume)
  )
    music.audio.volume = Math.max(0, Math.min(1, volume));
} catch {}
$("music-volume").value = Math.round(music.audio.volume * 100);
$("music-volume").oninput = (e) => {
  music.audio.volume = Number(e.target.value) / 100;
  try {
    localStorage.setItem("techcrush-music-volume", String(music.audio.volume));
  } catch {}
};
$("music-reset").onclick = () => {
  muted = false;
  soundscape.setMuted(false);
  music.audio.volume = 0.28;
  music.reset();
  $("music-volume").value = 28;
  actionLabel($("sound"), "SOUND");
  $("sound").setAttribute("aria-pressed", "true");
  try {
    localStorage.setItem("techcrush-muted", "false");
    localStorage.removeItem("techcrush-music-volume");
  } catch {}
  refreshActivity();
};
const unlockMusic = () => {
  music.unlock();
};
addEventListener("pointerdown", unlockMusic, { once: true });
addEventListener("keydown", unlockMusic, { once: true });

const loop = new FrameLoop(frame);
const wake = () => loop.invalidate();
function dialogOpen() {
  return [
    "workshop",
    "loot-dialog",
    "controls-dialog",
    "community-dialog",
    "quest-map",
    "car-reveal",
    "event-dialog",
  ].some((id) => $(id)?.open);
}
function refreshActivity() {
  if (disposed || !sim) return;
  raceClock.setActive(
    !document.hidden &&
      !dialogOpen() &&
      ["running", "rewinding"].includes(sim?.phase),
  );
  loop.setEnabled(!document.hidden);
  soundscape.setForeground(!document.hidden && !dialogOpen());
  music.sync(
    !document.hidden &&
      !dialogOpen() &&
      ["ready", "running"].includes(sim?.phase),
    !muted,
  );
  mobile?.syncActivity();
  document.body.classList.toggle(
    "idle",
    document.hidden ||
      dialogOpen() ||
      !["running", "rewinding"].includes(sim.phase),
  );
  wake();
}
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
  if (agentInput && keys.size === 0 && !mobile?.touch.size) return agentInput;
  const keyboard = drivingInput(keys);
  keyboard.steeringSensitivity = drivingFeel.steeringSensitivity;
  keyboard.driftStrength = drivingFeel.driftStrength;
  const controls = mobile ? mobile.read(keyboard, keys, sim?.phase) : keyboard;
  Object.assign(controls, drivingFeel);
  return controls;
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
  const strip = $("garage"),
    selected = strip.querySelector('[aria-pressed="true"]');
  if (selected && !$("intro").hidden) {
    const bounds = strip.getBoundingClientRect(),
      card = selected.getBoundingClientRect();
    if (card.left < bounds.left) strip.scrollLeft += card.left - bounds.left;
    else if (card.right > bounds.right)
      strip.scrollLeft += card.right - bounds.right;
  }
  const c = upgradedSpec(carSpec(id), equipment);
  $("menu-car-jump").textContent = c.name + " · CHANGE ↗";
  $("menu-car-jump").setAttribute(
    "aria-label",
    "Selected car: " + c.name + ". Change your car",
  );
  $("car-details").textContent =
    c.description + " · " + Math.round(c.topSpeed * 3.6) + " km/h";
  wake();
}
function setupGarage() {
  document.querySelector(".launch-summary").append($("driver-open"));
  const garage = $("garage");
  garage.innerHTML = CARS.map(
    (c) =>
      `<button type="button" data-car="${c.id}" aria-pressed="${c.id === selectedCar}">${carSilhouette(c.id)}<b>${c.name}</b><small>${c.type}</small></button>`,
  ).join("");
  $("route-selector").onchange = () => {
    sim.navQuest = $("route-selector").value || null;
    sim.waypoint = null;
    $("route-selector").blur();
    wake();
  };
  for (const button of garage.querySelectorAll("button[data-car]"))
    button.onclick = () => chooseCar(button.dataset.car);
  for (const [id, direction] of [
    ["car-prev", -1],
    ["car-next", 1],
  ])
    $(id).onclick = () =>
      garage.scrollBy({
        left: direction * (garage.clientWidth * 0.82),
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  chooseCar(selectedCar);
  if (career) refreshRewards(career);
  $("menu-car-jump").onclick = () => {
    const selected = garage.querySelector('[data-car][aria-pressed="true"]');
    selected.focus({ preventScroll: true });
    selected.scrollIntoView({ block: "center", behavior: "instant" });
  };
  $("garage-back").onclick = () => leaveRun(true);
}
async function leaveRun(showGarage = true) {
  if (disposed || transitioning) return false;
  transitioning = true;
  try {
    await bankRun();
  } catch (error) {
    $("modal-copy").textContent = error.message;
    transitioning = false;
    return false;
  }
  if (disposed) {
    transitioning = false;
    return false;
  }
  keys.clear();
  mobile?.clear();
  agentInput = null;
  results.reset();
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
  if (showGarage) {
    workshop.car = selectedCar;
    workshop.open();
  }
  refreshActivity();
  return true;
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
        autoOpenBox: true,
        metrics: {
          time: sim.time,
          score: Math.floor(sim.score),
          checkpoints: sim.checkpoint,
          takedowns: sim.takedowns,
          trafficWrecks: sim.trafficWrecks,
          decorWrecks: sim.decorWrecks,
          cashBanners: sim.cashBanners,
          artifacts: sim.runArtifacts,
          distance: sim.runDistance,
          driftSeconds: sim.runDriftSeconds,
          jumps: sim.runJumps,
          topSpeed: sim.runTopSpeed,
          quests: sim.runQuests,
          timing: raceClock.result(),
        },
        result: ["won", "wrecked", "busted"].includes(sim.phase)
          ? sim.phase
          : "abandoned",
      });
    runId = null;
  })();
  try {
    await settlement;
  } catch (error) {
    if (error.status === 400 || error.status === 409) {
      // A rejected/replaced ticket must not trap the player in a save loop.
      // Network failures retain the outbox and are retried with the same ID.
      const fresh = await career.request("/api/profile");
      career.accept(fresh);
      if (error.status === 400 || fresh.profile.activeRun?.id !== id)
        runId = null;
    }
    throw error;
  } finally {
    settlement = null;
  }
}
function switchCamera(id) {
  const mode = id ? view.setCamera(id) : view.cycleCamera();
  actionLabel($("camera-toggle"), mode.label);
  $("camera-toggle").setAttribute(
    "aria-label",
    "Camera: " + mode.label + "; click to switch",
  );
  wake();
}
function switchLighting() {
  const modes = LIGHTING_MODES,
    lighting = view.lighting;
  lighting.setMode(modes[(modes.indexOf(lighting.mode) + 1) % modes.length]);
  try {
    localStorage.setItem("techcrush-lighting", lighting.mode);
  } catch {}
  lighting.update(sim);
  updateLightingLabel();
  wake();
}
function updateLightingLabel() {
  const lighting = view.lighting;
  if (!lighting) return;
  const label =
    (lighting.mode === "auto" ? "AUTO · " : "") +
    lighting.level.label +
    (lighting.weather.mesh.visible ? " · RAIN" : "");
  actionLabel($("lighting-toggle"), label);
  $("lighting-toggle").setAttribute(
    "aria-label",
    `Lighting: ${lighting.mode === "auto" ? "automatic cycle" : lighting.mode}; ${lighting.level.label.toLowerCase()}; click to switch`,
  );
}
function loadingProgress(amount, stage) {
  $("loading-stage").textContent = stage;
  $("loading-percent").textContent = amount + "%";
  $("loading-fill").style.width = amount + "%";
  $("loading-fill").parentElement.setAttribute("aria-valuenow", String(amount));
}
async function toggleSound() {
  try {
    muted = !muted;
    soundscape.setMuted(muted);
    try {
      localStorage.setItem("techcrush-muted", String(muted));
    } catch {}
    music.sync(undefined, !muted);
    wake();
    actionLabel($("sound"), muted ? "MUTED" : "SOUND");
    $("sound").setAttribute("aria-pressed", String(!muted));
    $("sound").setAttribute(
      "aria-label",
      muted ? "Enable sound" : "Mute sound",
    );
    // Muting is immediate; only enabling sound needs the browser audio unlock.
    if (!muted) await soundscape.unlock();
  } catch {
    actionLabel($("sound"), "NO AUDIO");
  }
}
function audioTick(dt = 0) {
  soundscape.update(sim, input(), dt, CAMERAS[view.cameraMode].id);
}
async function start() {
  if (disposed || transitioning || dialogOpen()) return;
  if (community && !community.ensureDriver(start)) return;
  // Unlock the existing audio context while a tap still has user activation.
  if (!muted) void soundscape.unlock().catch(() => {});
  transitioning = true;
  keys.clear();
  mobile?.reset();
  agentInput = null;
  const startLabel = $("start").innerHTML;
  $("start").disabled = true;
  $("start").setAttribute("aria-busy", "true");
  $("start").textContent = "STARTING…";
  try {
    await bankRun();
    if (career.pending) await career.retry();
    if (career.profile.selectedCar !== selectedCar)
      await career.mutate({ type: "select", car: selectedCar });
    await career.mutate({
      type: "begin-run",
      map: ACTIVE_MAP,
      car: selectedCar,
      course: TIME_COURSE,
      event: eventUI.runEvent(),
    });
    if (disposed) return;
    results.reset();
    sim.start(selectedCar, {
      level: cityLevel(career.profile),
      equipment: career.profile.cars[selectedCar],
      completedQuests: career.profile.quests?.completed || [],
      bankedTakedowns: totalTakedowns(career.profile),
      runId: career.profile.activeRun.id,
      event: career.profile.activeRun.event,
      collectedArtifacts:
        career.profile.events?.[career.profile.activeRun.event]?.artifacts?.[
          ACTIVE_MAP
        ] || [],
    });
    sim.navQuest = $("route-selector").value || null;
    sim.waypoint = null;
    runId = career.profile.activeRun.id;
    view.startGame(sim);
    raceClock.reset();
    $("intro").hidden = true;
    $("mission-card").hidden = true;
    $("hud").hidden = false;
    $("modal").hidden = true;
    $("touch-controls").hidden = !mobile.visible;
    $("pause").disabled = false;
    document.body.classList.add("playing");
    accumulator = 0;
    updateHUD();
    refreshActivity();
  } catch (error) {
    showModal("SAVE PENDING", error.message, "YOUR GARAGE", true);
  } finally {
    transitioning = false;
    $("start").disabled = false;
    $("start").removeAttribute("aria-busy");
    $("start").innerHTML = startLabel;
  }
}
function pause() {
  raceClock.setActive(false);
  if (sim.phase === "rewinding") sim.timeline.release(sim);
  if (!["running", "paused"].includes(sim.phase)) return;
  if (sim.phase === "running") {
    sim.phase = "paused";
    keys.clear();
    mobile?.clear();
    showModal("PAUSED.", "Your getaway can wait.", "TAKE A BREATHER", false);
  } else {
    if (!muted) void soundscape.unlock().catch(() => {});
    mobile?.reset();
    sim.phase = "running";
    $("modal").hidden = true;
    $("pause").focus({ preventScroll: true });
    accumulator = 0;
  }
  document.body.dataset.phase = sim.phase;
  audioTick();
  refreshActivity();
}
function showModal(title, copy, kicker, end) {
  results.reset();
  mobile?.clear();
  document.body.dataset.phase = sim.phase;
  $("result-reward").textContent = "";
  $("result-time").textContent = "";
  $("modal-title").textContent = title;
  $("modal-copy").textContent = copy;
  $("modal-kicker").textContent = kicker;
  $("resume").hidden = end;
  $("restart").textContent = end ? "RUN IT BACK ↗" : "RESTART RUN";
  $("result-score").textContent = end
    ? Math.floor(sim.score).toLocaleString() + " POINTS"
    : "";
  $("result-community").textContent = "BANK & LEADERBOARD ↗";
  $("modal").hidden = false;
  (end ? $("restart") : $("resume")).focus();
}
function finish() {
  raceClock.setActive(false);
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
  results.show(sim.level, raceClock.result(), won);
  const resultGeneration = results.generation;
  keys.clear();
  $("pause").disabled = true;
  if (won) {
    $("modal-title").textContent = `LEVEL ${sim.level} CLEAR.`;
    $("result-reward").textContent =
      "Saving your credits and three-part reward box…";
    void bankRun()
      .then(() => {
        if (results.generation !== resultGeneration) return;
        const reward = cityCommunity(career.profile).lastReward;
        const badges = reward.badges
          .map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.name)
          .join(", ");
        $("result-reward").innerHTML = rewardTiles(
          reward,
          cityLevel(career.profile),
        );
        refreshRewards(career);
        if (reward.mysteryBoxes || reward.specialBoxes) {
          const bonusButton = document.createElement("button");
          bonusButton.className = "primary";
          bonusButton.textContent = "OPEN BONUS BOXES ↗";
          bonusButton.onclick = () => {
            workshop.open();
            workshop.switchTab("boxes");
          };
          $("result-reward").append(bonusButton);
        }
        if (career.profile.carBoxes.includes(ACTIVE_MAP)) {
          const rewardButton = document.createElement("button");
          rewardButton.className = "primary";
          rewardButton.textContent = "MYSTERY CAR EARNED · OPEN BOX ↗";
          rewardButton.onclick = async () => {
            rewardButton.disabled = true;
            try {
              await openCarReward(career, ACTIVE_MAP);
              rewardButton.textContent = "CAR SAVED TO YOUR GARAGE ✓";
            } catch (e) {
              rewardButton.textContent = e.message;
              rewardButton.disabled = false;
            }
          };
          $("result-reward").append(rewardButton);
        }
        const next =
          view.lighting.mode === "auto"
            ? levelCondition(cityLevel(career.profile)).label
            : view.lighting.mode.toUpperCase();
        $("restart").textContent =
          `NEXT · LEVEL ${cityLevel(career.profile)} · ${next} ↗`;
        results.saved(cityCommunity(career.profile).lastTime);
        $("garage-back").textContent = "GARAGE · FUSE & UPGRADE";
        if (career.profile.lastBox?.kind === "level") {
          workshop.car = selectedCar;
          void workshop.openBox(false, career.profile.lastBox);
        }
      })
      .catch((error) => {
        if (results.generation !== resultGeneration) return;
        $("restart").disabled = $("garage-back").disabled = false;
        $("result-rank-note").textContent =
          "Ranking appears after your result is saved.";
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
  if (/^(PATROL DESTROYED|NEAR MISS|DRIFT  \+|TRAFFIC WRECK)/.test(text))
    return;
  if (text === "BACK ON YOUR WHEELS" || text.startsWith("CAR RESET"))
    mobile?.clear();
  if (text === "COLLISION") {
    view.shake = 0.4;
    return;
  }
  $("toast").textContent = text;
  $("toast").classList.add("visible");
  toastUntil = sim.time + 2.8;
}
function updateHUD() {
  eventUI?.update(sim);
  document.body.dataset.phase = sim.phase;
  const p = sim.player;
  if ($("route-selector").value !== (sim.navQuest || ""))
    $("route-selector").value = sim.navQuest || "";
  $("run-level").textContent = `LEVEL ${sim.level}`;
  $("run-time").textContent = formatRaceTime(
    Math.ceil(raceClock.elapsedMs / 10) * 10,
  );
  $("run-cash").textContent = `+${sim.runCash.toLocaleString()} CR`;
  const scoreText = Math.floor(sim.score).toString().padStart(6, "0");
  if ($("score").textContent !== scoreText) $("score").textContent = scoreText;
  $("score-multiplier").textContent = "×" + sim.rewardRates.score.toFixed(2);
  scoreFeedbackUI.update(sim);
  $("progress").textContent = sim.checkpoint + " / 6";
  const dotsKey = sim.checkpoints.length + ":" + sim.checkpoint;
  if (dotsKey !== lastDotsKey) {
    $("dots").innerHTML = sim.checkpoints
      .map((_, i) => `<i class="${i < sim.checkpoint ? "done" : ""}"></i>`)
      .join("");
    lastDotsKey = dotsKey;
  }
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
    : p.understeer > 0.18
      ? "WIDE TURN · EASE OFF"
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
  $("gear").textContent = soundscape.telemetry.gearLabel || "1";
  $("takedowns").textContent = String(sim.takedowns);
  $("heat").textContent =
    sim.police.filter((c) => !c.destroyed).length +
    " UNITS · H" +
    sim.heatLevel +
    (sim.helicopter ? " · AIR" : "");
  const escape = sim.checkpoint === 6;
  $("bust-bar").style.width =
    (escape ? sim.escape / 8 : sim.bust / 4) * 100 + "%";
  $("bust-bar").style.background = escape ? "#73e6ed" : "#ff796e";
  $("heat-label").textContent = escape ? "ESCAPING" : "PURSUIT";
  $("pursuit-text").textContent =
    sim.bust > 1
      ? "BOXED IN — ACCELERATE!"
      : sim.helicopter?.tracking
        ? "AIR SUPPORT HAS VISUAL — BREAK SIGHT"
        : escape
          ? sim.escape > 0
            ? "Losing them… " + Math.ceil(8 - sim.escape) + "s"
            : "Break line of sight and pull away."
          : sim.roadblockAhead
            ? "ROADBLOCK AHEAD — FIND A GAP"
            : sim.police.length < sim.difficulty.maxUnits
              ? "REINFORCEMENTS IN " +
                Math.ceil(sim.nextWaveAt - sim.time) +
                "s"
              : `MAXIMUM PURSUIT — ${sim.difficulty.maxUnits} UNITS`;
  document.body.classList.toggle(
    "cockpit-mode",
    CAMERAS[view.cameraMode].id === "cockpit",
  );
  const cp = navigationTarget(sim);
  $("objective").textContent = cp
    ? "Reach " + cp.name
    : "Lose the police for 8 seconds";
  $("district").textContent = cp ? cp.name.toUpperCase() : "ESCAPE ROUTE";
  if (cp) {
    const route = playerRoute(sim),
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
    $("distance").textContent = Math.round(routeDistance(p, route)) + " M";
  } else {
    $("direction").textContent = "↗";
    $("distance").textContent = "ESCAPE";
  }
  $("route-cue").querySelector("small").textContent = cp
    ? "NEXT CHECKPOINT"
    : "LOSE THE HEAT";
  const secondary = secondaryTarget(sim);
  const cue = $("waypoint-cue");
  cue.hidden = !secondary;
  if (secondary) {
    const route = secondaryRoute(sim),
      next = route.find((q) => distance(p, q) > 12) || secondary;
    const delta = angleDelta(Math.atan2(next.x - p.x, next.z - p.z), p.angle);
    const arrived = distance(p, secondary) < 14;
    cue.textContent = arrived
      ? "◆ DESTINATION REACHED"
      : `${Math.abs(delta) < 0.45 ? "↑" : Math.abs(delta) > 2.4 ? "↶" : delta > 0 ? "←" : "→"} ${Math.round(routeDistance(p, route))} M · ${sim.waypoint ? "YOUR PIN" : "SIDE MISSION"}`;
  }
  drawMap();
}
const radarCanvas = $("map"),
  radarContext = radarCanvas.getContext("2d");
function drawMap() {
  const c = radarContext,
    s = radarScale(mapPreferences.zoom),
    ox = 115 + sim.player.x * s,
    oz = 115 + sim.player.z * s;
  c.setTransform(radarCanvas.width / 230, 0, 0, radarCanvas.height / 230, 0, 0);
  c.clearRect(0, 0, 230, 230);
  c.save();
  c.beginPath();
  c.arc(115, 115, 112, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = "#112531";
  c.fillRect(0, 0, 230, 230);
  c.translate(115, 115);
  c.rotate(sim.player.angle);
  c.translate(-115, -115);
  c.drawImage(
    mapAtlas(),
    ox - MAP_EXTENT * s,
    oz - MAP_EXTENT * s,
    MAP_EXTENT * 2 * s,
    MAP_EXTENT * 2 * s,
  );
  for (const target of sim.cashBannerTargets || [])
    if (!target.broken) {
      const marker = radarPoint(ox - target.x * s, oz - target.z * s);
      c.fillStyle = "#ffd166";
      c.beginPath();
      c.arc(marker.x, marker.y, 3.4, 0, Math.PI * 2);
      c.fill();
    }
  const cp = navigationTarget(sim);
  if (cp) {
    c.strokeStyle = "#73e6ed";
    c.lineWidth = 1.6;
    c.setLineDash([4, 3]);
    c.beginPath();
    c.moveTo(ox - sim.player.x * s, oz - sim.player.z * s);
    for (const q of playerRoute(sim)) c.lineTo(ox - q.x * s, oz - q.z * s);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = "#73e6ed";
    c.beginPath();
    const marker = radarPoint(ox - cp.x * s, oz - cp.z * s);
    c.arc(marker.x, marker.y, 5, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#ffffffaa";
    c.lineWidth = 1;
    c.beginPath();
    c.arc(marker.x, marker.y, 8, 0, Math.PI * 2);
    c.stroke();
  }
  const secondary = secondaryTarget(sim);
  if (secondary) {
    c.strokeStyle = "#ffd43b";
    c.lineWidth = 1.8;
    c.setLineDash([2, 3]);
    c.beginPath();
    c.moveTo(115, 115);
    for (const q of secondaryRoute(sim)) c.lineTo(ox - q.x * s, oz - q.z * s);
    c.stroke();
    c.setLineDash([]);
    const pin = radarPoint(ox - secondary.x * s, oz - secondary.z * s, 98);
    c.fillStyle = "#ffd43b";
    c.save();
    c.translate(pin.x, pin.y);
    c.rotate(-sim.player.angle);
    c.beginPath();
    c.moveTo(0, -6);
    c.lineTo(5, 0);
    c.lineTo(0, 6);
    c.lineTo(-5, 0);
    c.closePath();
    c.fill();
    c.restore();
  }
  const north = radarPoint(115, -10000, 101);
  c.save();
  c.translate(north.x, north.y);
  c.rotate(-sim.player.angle);
  c.fillStyle = "#fff";
  c.font = "bold 9px Arial";
  c.textAlign = "center";
  c.fillText("N", 0, 3);
  c.restore();
  c.fillStyle = "#d3b37a";
  const landmark = IS_RUSTAVI
    ? LANDMARKS.monument
    : IS_BATUMI
      ? LANDMARKS.alphabet
      : IS_KUTAISI
        ? LANDMARKS.bagrati
        : TOWER;
  c.fillRect(ox - landmark.x * s - 2, oz - landmark.z * s - 2, 4, 4);
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
  for (const q of QUEST_PINS) {
    const marker = radarPoint(ox - q.x * s, oz - q.z * s, 95);
    c.fillStyle = q.color;
    c.beginPath();
    c.arc(marker.x, marker.y, 8, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#10202a";
    c.font = "bold 10px Arial";
    c.textAlign = "center";
    c.save();
    c.translate(marker.x, marker.y);
    c.rotate(-sim.player.angle);
    c.fillText(q.symbol, 0, 3);
    c.restore();
    c.textAlign = "start";
  }
  for (const cop of sim.police) {
    if (cop.destroyed) continue;
    c.fillStyle = "#ff706a";
    c.beginPath();
    c.arc(ox - cop.x * s, oz - cop.z * s, 3, 0, Math.PI * 2);
    c.fill();
  }
  if (sim.helicopter) {
    const h = radarPoint(
      ox - sim.helicopter.x * s,
      oz - sim.helicopter.z * s,
      98,
    );
    c.strokeStyle = sim.helicopter.tracking ? "#ffdf56" : "#aaaee5";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(h.x - 5, h.y);
    c.lineTo(h.x + 5, h.y);
    c.moveTo(h.x, h.y - 5);
    c.lineTo(h.x, h.y + 5);
    c.stroke();
    c.beginPath();
    c.arc(h.x, h.y, 7, 0, Math.PI * 2);
    c.stroke();
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
  c.restore();
  c.strokeStyle = "#e9f4f688";
  c.lineWidth = 1.5;
  c.beginPath();
  c.arc(115, 115, 112, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = "#f22446";
  c.lineWidth = 3;
  c.beginPath();
  c.arc(115, 115, 112, -Math.PI * 0.65, -Math.PI * 0.35);
  c.stroke();
  mapSettings?.copyPreview(radarCanvas);
}
function frame(dt) {
  if (disposed) return false;
  eventUI?.checkDeadline();
  const blocked = dialogOpen();
  mobile?.tick(dt);
  if (
    !blocked &&
    (sim.phase === "running" ||
      sim.phase === "rewinding" ||
      (input().rewind && ["wrecked", "busted"].includes(sim.phase)))
  ) {
    raceClock.setActive(true);
    raceClock.rewind(!!input().rewind && sim.timeline.available > 0);
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
  audioTick(dt);
  if (!blocked) view.render(sim, dt, input());
  uiTime += dt;
  const moving = ["running", "rewinding"].includes(sim.phase);
  if (uiTime > 0.08 || sim.phase !== lastHUDPhase || sim.scoreEvents.length) {
    updateLightingLabel();
    if (sim.phase !== "ready") updateHUD();
    lastHUDPhase = sim.phase;
    uiTime = 0;
  }
  document.body.classList.toggle("idle", blocked || !moving);
  mobile?.syncActivity();
  // Let a final crash finish and release its debris, then retain the last image.
  return (
    !blocked &&
    (moving ||
      (["won", "wrecked", "busted"].includes(sim.phase) && view.fx.size > 0))
  );
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
        wake();
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
  loadingProgress(3, "BUILDING THE CITY");
  sceneAssets = prepareSceneAssets(
    matchMedia("(any-pointer: coarse)").matches || navigator.maxTouchPoints > 0,
  );
  const profileReady = career.init();
  profileReady.catch(() => {});
  await new Promise(requestAnimationFrame);
  if (disposed) throw new DOMException("Page closed", "AbortError");
  if (IS_RUSTAVI) {
    await profileReady;
    if (!mapUnlocked(career.profile, ACTIVE_MAP, career.serverNow())) {
      location.replace("/?mission=locked");
      await new Promise(() => {});
    }
  }
  sim = new ChaseSimulation();
  view = new SceneView($("world"), sceneAssets);
  await Promise.all([profileReady, view.loadTextures(loadingProgress)]);
  if (disposed) throw new DOMException("Page closed", "AbortError");
  if (!mapUnlocked(career.profile, ACTIVE_MAP, career.serverNow())) {
    location.replace("/?mission=locked");
    // Keep this compatibility fallback from starting a run on a restricted city.
    await new Promise(() => {});
  }
  view.setupGame(sim);
  if (
    IS_RUSTAVI &&
    career.profile.previewAccess &&
    ["localhost", "127.0.0.1"].includes(location.hostname)
  ) {
    const links = document.createElement("div");
    links.className = "private-preview-places";
    links.innerHTML =
      '<small>PRIVATE TEST · START LOCATION</small><a href="?map=rustavi&preview=heroes">HEROES SQUARE ↗</a><a href="?map=rustavi&preview=hall">CITY HALL ↗</a><a href="?map=rustavi">NEW MONUMENT ↗</a>';
    document.querySelector("#intro .intro-copy").after(links);
  }
  try {
    view.lighting.setMode(localStorage.getItem("techcrush-lighting"));
  } catch {}
  view.lighting.update(sim);
  loadingProgress(97, "WARMING UP THE LIGHTS");
  selectedCar = career.profile.selectedCar;
  setupGarage();
  workshop = new GarageUI(career, chooseCar, view);
  const questMap = new QuestMap(
    sim,
    () => career.profile,
    (value) => {
      $("route-selector").value = value;
      $("route-selector").dispatchEvent(new Event("change"));
    },
  );
  $("quest-map-open").onclick = () => {
    keys.clear();
    mobile?.clear();
    questMap.open();
    refreshActivity();
  };
  mapSettings = new MapSettings(drawMap);
  mobile = new MobileControls({
    invalidate: wake,
    pause,
    clearKeys: () => keys.clear(),
    phase: () => sim.phase,
    player: () => sim.player,
    recover: () => {
      if (sim.phase === "running") sim.recover();
    },
    quality: (mode) => {
      view.setQuality(mode);
      wake();
    },
  });
  community = new CommunityUI(career, {
    pause: () => {
      if (["running", "rewinding"].includes(sim.phase)) pause();
      keys.clear();
      mobile?.clear();
    },
  });
  const refreshCityMenu = cityMenu(career, () => leaveRun(false));
  eventUI = new EventUI(career, {
    pause: () => {
      if (["running", "rewinding"].includes(sim.phase)) pause();
      keys.clear();
      mobile?.clear();
    },
    leave: () => leaveRun(false),
    play: () => {
      const ticket = career.profile.activeRun;
      if (sim.phase === "paused" && (!ticket?.event || career.serverNow() < ticket.eventEndsAt))
        pause();
      else return start();
    },
    refresh: refreshActivity,
    cities: () => {
      refreshCityMenu();
      community.syncCities();
    },
    deadline: async () => {
      if (sim.phase === "rewinding") sim.timeline.release(sim);
      if (sim.phase === "running") pause();
      const finalRun = runId;
      try {
        await bankRun();
        await leaveRun(false);
        eventUI.render();
        eventUI.open();
        eventUI.message(
          eventProgress(career.profile)?.lastReceipt?.runId === finalRun
            ? "CITY WARS FINISHED · Your final event points are saved. Standings remain available in the archive."
            : "CITY WARS FINISHED · Career progress is saved. This run arrived after the event save window and was excluded from event standings.",
        );
      } catch (error) {
        eventUI.open();
        eventUI.message(error.message);
      }
    },
  });
  $("leaderboard-open").disabled = false;
  $("community-dialog").addEventListener("close", () => {
    if (sim.phase === "won" && results.record && !$("modal").hidden)
      results.saved(results.record);
  });
  $("result-community").onclick = async () => {
    if (await leaveRun(false)) community.open("board");
  };
  $("control-settings").disabled = false;
  $("mobile-setup").disabled = false;
  $("workshop-open").disabled = false;
  $("workshop-open").onclick = () => {
    workshop.car = selectedCar;
    workshop.open();
  };
  $("start").onclick = start;
  $("camera-toggle").onclick = () => switchCamera();
  $("lighting-toggle").disabled = false;
  $("lighting-toggle").onclick = switchLighting;
  updateLightingLabel();
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
    if (
      dialogOpen() ||
      e.target.closest?.("input,select,textarea,[contenteditable]")
    )
      return;
    if (
      e.target.closest?.("button,input,select,textarea") &&
      ["Enter", " "].includes(e.key) &&
      !(e.key === " " && sim.phase === "running")
    )
      return;
    const k = normalizeKey(e);
    if (!relevant.includes(k)) return;
    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k))
      e.preventDefault();
    keys.add(k);
    wake();
    if (!e.repeat) {
      if (k === "p" || k === "Escape") pause();
      if (k === "r") {
        mobile?.clear();
        sim.recover();
      }
      if (k === "m") toggleSound();
      if (k === "c") switchCamera();
      if (k === "Enter" && sim.phase === "ready") start();
    }
  });
  addEventListener("keyup", (e) => {
    keys.delete(normalizeKey(e));
    wake();
  });
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
    refreshActivity();
  });
  addEventListener("resize", wake);
  addEventListener("pageshow", refreshActivity);
  dialogs = new MutationObserver(refreshActivity);
  for (const id of [
    "workshop",
    "loot-dialog",
    "controls-dialog",
    "community-dialog",
    "quest-map",
    "car-reveal",
    "event-dialog",
  ])
    dialogs.observe($(id), { attributes: true, attributeFilter: ["open"] });
  registerTools();
  await compileScene(
    view.renderer,
    view.scene,
    view.camera,
    pageLifetime.signal,
  );
  if (disposed) throw new DOMException("Page closed", "AbortError");
  loadingProgress(100, "READY TO RACE");
  $("loading").hidden = true;
  document.body.classList.add("loaded");
  eventUI.announce();
  refreshActivity();
} catch (e) {
  const cancelled = disposed;
  disposePage();
  if (!cancelled) {
    $("loading").hidden = true;
    $("error").hidden = false;
    $("error").textContent =
      "The city could not load. Try reloading in a browser with WebGL enabled. " +
      e.message;
    console.error(e);
  }
}
