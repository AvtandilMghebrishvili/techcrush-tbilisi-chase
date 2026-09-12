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
    const unlocked = mapUnlocked(p, "kutaisi"),
      cleared = Math.max(0, Math.min(3, p.level - 1));
    for (const b of document.querySelectorAll("[data-map]")) {
      const map = b.dataset.map,
        allowed = mapUnlocked(p, map),
        selected = map === ACTIVE_MAP;
      b.disabled = !allowed || store.busy;
      b.classList.toggle("active-map", selected);
      b.classList.toggle("city-available", allowed && !selected);
      b.classList.toggle("city-locked", !allowed);
      b.setAttribute("aria-pressed", String(selected));
      b.querySelector(".city-state").textContent = selected
        ? "✓ SELECTED"
        : allowed
          ? "UNLOCKED ↗"
          : "LOCKED";
      b.querySelector("small").textContent = allowed
        ? `LEVEL ${cityLevel(p, map)} · ENDLESS`
        : `${cleared} / 3 TBILISI LEVELS CLEARED`;
    }
    $("menu-city-count").textContent = `${unlocked ? 2 : 1} / 2 AVAILABLE`;
    $("menu-race-label").textContent = `${CITY_NAME} · LEVEL ${cityLevel(p)}`;
    $("city-unlock").classList.toggle("is-unlocked", unlocked);
    $("unlock-title").textContent = unlocked
      ? "KUTAISI IS UNLOCKED"
      : `UNLOCK KUTAISI · ${cleared} / 3 COMPLETE`;
    $("map-access-note").textContent = unlocked
      ? "Choose either city above. Your cars, upgrades and credits travel with you."
      : `Finish ${3 - cleared} more Tbilisi ${3 - cleared === 1 ? "level" : "levels"}: pass all six checkpoints and escape the police. Kutaisi opens after level 3.`;
    $("unlock-progress").setAttribute("aria-valuenow", String(cleared));
    $("unlock-progress").setAttribute(
      "aria-valuetext",
      unlocked
        ? "3 of 3 levels complete. Kutaisi unlocked."
        : `${cleared} of 3 Tbilisi levels complete.`,
    );
    for (const step of document.querySelectorAll("[data-unlock-step]")) {
      const complete = Number(step.dataset.unlockStep) <= cleared;
      step.classList.toggle("complete", complete);
      step.textContent = complete ? "✓" : step.dataset.unlockStep;
      step.setAttribute("aria-hidden", "true");
    }
    $("result-kutaisi").hidden = IS_KUTAISI || !mapUnlocked(p, "kutaisi");
  };
  for (const b of document.querySelectorAll("[data-map]"))
    b.onclick = () => void change(b.dataset.map);
  $("result-kutaisi").onclick = () => void change("kutaisi");
  const previous = store.onchange;
  store.onchange = () => {
    previous();
    render();
  };
  render();
}
