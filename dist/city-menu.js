import { refreshRewards } from "./reward-ui.js";
import {
  ACTIVE_MAP,
  IS_KUTAISI,
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
  async function change(map) {
    if (map === ACTIVE_MAP || !mapUnlocked(store.profile, map) || store.busy)
      return;
    if (!(await leave())) return;
    const url = new URL(location.href);
    url.searchParams.set("map", map);
    url.searchParams.delete("unlock");
    location.assign(url);
  }
  const render = () => {
    const p = store.profile;
    for (const b of document.querySelectorAll("[data-map]")) {
      const map = b.dataset.map,
        selected = map === ACTIVE_MAP;
      b.disabled = store.busy;
      b.classList.toggle("active-map", selected);
      b.classList.toggle("city-available", !selected);
      b.classList.remove("city-locked");
      b.setAttribute("aria-pressed", String(selected));
      b.querySelector(".city-state").textContent = selected
        ? "✓ SELECTED"
        : "PLAY NOW ↗";
      b.querySelector("small").textContent =
        `LVL ${cityLevel(p, map)} · BOX AT ${5 * (Math.floor(cityLevel(p, map) / 5) + 1)}`;
    }
    $("menu-city-count").textContent = "3 / 3 OPEN";
    $("menu-race-label").textContent = `${CITY_NAME} · LEVEL ${cityLevel(p)}`;
    $("unlock-title").textContent = "LVL 10 · ALL CARS / LVL 15 · TECHCRUSH";
    $("map-access-note").textContent =
      "Reach either milestone in any city. Bonus boxes every 5 levels.";
    refreshRewards(store);
    $("result-kutaisi").hidden = false;
    $("result-kutaisi").textContent = "CHOOSE CITY · 3 MAPS ↗";
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
}
