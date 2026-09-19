import { refreshRewards } from "./reward-ui.js";
import {
  ACTIVE_MAP,
  IS_KUTAISI,
  IS_RUSTAVI,
  CITY_NAME,
  cityLevel,
  mapUnlocked,
} from "./map-selection.js";
export function cityMenu(store, leave) {
  const $ = (id) => document.getElementById(id);
  document.body.dataset.city = ACTIVE_MAP;
  document.querySelector("#intro h1").innerHTML =
    CITY_NAME + " <em>CHASE.</em>";
  document.querySelector("#intro .eyebrow").textContent =
    "TECHCRUSH / " + CITY_NAME + " STREETS";
  if (ACTIVE_MAP === "batumi") {
    document.title = "TECHCRUSH · Batumi Chase";
    document.querySelector("#intro .intro-copy").textContent =
      "Black Sea nights. Boulevard chases. Your next getaway.";
    $("route-selector").querySelector('[value="river"]')?.remove();
  }
  if (IS_KUTAISI) {
    document.title = "TECHCRUSH · Kutaisi Chase";
    document.querySelector("#intro .intro-copy").innerHTML =
      "Six checkpoints. Cross the Rioni. Find the Platinum secrets.";
    document.querySelector(".mission-cover").hidden = true;
    const options = $("route-selector").options;
    for (const option of options) {
      if (option.value === "skybox")
        option.textContent = "PLATINUM SKYBOX · 200+ KM/H";
      if (option.value === "river")
        option.textContent = "RIONI GAP · 220+ KM/H";
    }
  }
  if (IS_RUSTAVI) {
    document.title = "TECHCRUSH · Rustavi Chase";
    document.querySelector("#intro .intro-copy").textContent =
      "Steel city. Motorpark. A new getaway.";
    $("route-selector").querySelector('[value="river"]')?.remove();
    document.querySelector(".mission-cover").hidden = true;
    $("mission-card").querySelectorAll("p")[2].textContent =
      "Use ROUTE to find the Steelworks Skybox. Land on the roof to collect a Platinum part. Hold Q to rewind.";
  }
  const secret = document.createElement("button");
  secret.type = "button";
  secret.dataset.map = "rustavi";
  secret.innerHTML =
    '<span class="city-state"></span><b>SECRET MISSION</b><span class="city-caption">Find 15 artifacts</span><small></small>';
  document.querySelector(".map-slots").append(secret);
  let switching = false;
  async function change(map) {
    if (
      switching ||
      map === ACTIVE_MAP ||
      !mapUnlocked(store.profile, map, store.serverNow()) ||
      store.busy
    )
      return;
    switching = true;
    render();
    try {
      if (!(await leave())) {
        switching = false;
        render();
        return;
      }
      const url = new URL(location.href);
      url.searchParams.set("map", map);
      url.searchParams.delete("unlock");
      // City choices are one game, not a growing back/forward stack of WebGL worlds.
      location.replace(url);
    } catch (error) {
      switching = false;
      render();
      throw error;
    }
  }
  const render = () => {
    const p = store.profile;
    for (const b of document.querySelectorAll("[data-map]")) {
      const map = b.dataset.map,
        selected = map === ACTIVE_MAP;
      const available = mapUnlocked(p, map, store.serverNow());
      b.disabled = store.busy || switching || !available;
      if (map === "rustavi") {
        b.querySelector("b").textContent =
          available || store.challengeRevealed ? "RUSTAVI" : "SECRET MISSION";
        b.querySelector(".city-caption").textContent = available
          ? "Steel city · motorpark"
          : "5 artifacts × 3 cities";
      }
      b.classList.toggle("active-map", selected);
      b.classList.toggle("city-available", !selected);
      b.classList.toggle("city-locked", !available);
      b.setAttribute("aria-pressed", String(selected));
      b.querySelector(".city-state").textContent = !available
        ? "◇ LOCKED"
        : selected
          ? "✓ SELECTED"
          : "PLAY NOW ↗";
      b.querySelector("small").textContent = !available
        ? "EXTRA CHALLENGE"
        : `LVL ${cityLevel(p, map)} · BOX AT ${5 * (Math.floor(cityLevel(p, map) / 5) + 1)}`;
    }
    $("menu-city-count").textContent = mapUnlocked(
      p,
      "rustavi",
      store.serverNow(),
    )
      ? "4 / 4 OPEN"
      : store.challengeRevealed
        ? "3 OPEN · RUSTAVI LOCKED"
        : "3 OPEN + SECRET";
    $("menu-race-label").textContent = `${CITY_NAME} · LEVEL ${cityLevel(p)}`;
    $("unlock-title").textContent = "LVL 10 · ALL CARS / LVL 15 · TECHCRUSH";
    $("map-access-note").textContent =
      "Reach either milestone in any city. Bonus boxes every 5 levels.";
    refreshRewards(store);
    $("result-kutaisi").hidden = false;
    $("result-kutaisi").textContent = "CHOOSE CITY ↗";
  };
  for (const b of document.querySelectorAll("[data-map]"))
    b.onclick = () => void change(b.dataset.map);
  $("result-kutaisi").onclick = async () => {
    if (!(await leave())) return;
    document.querySelector(".map-slots").scrollIntoView({ block: "center" });
  };
  const previous = store.onchange;
  store.onchange = () => {
    previous();
    render();
  };
  render();
  return render;
}
