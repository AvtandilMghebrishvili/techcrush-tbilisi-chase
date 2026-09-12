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
    CITY_NAME + "<br><em>CHASE.</em>";
  document.querySelector("#intro .eyebrow").textContent =
    "TECHCRUSH / " + CITY_NAME + " STREETS";
  if (IS_KUTAISI) {
    document.title = "TECHCRUSH · Kutaisi Chase";
    document.querySelector("#intro .intro-copy").innerHTML =
      "Six checkpoints. One getaway.<br>Race the bridges and boulevards of Kutaisi.";
    document.querySelector(".mission-cover").hidden = true;
    const options = $("route-selector").options;
    for (const option of options) {
      if (option.value === "skybox")
        option.textContent = "PLATINUM SKYBOX · 200+ KM/H";
      if (option.value === "river")
        option.textContent = "RIONI GAP · 220+ KM/H";
    }
  }
  const maps = document.querySelector(".map-slots");
  document.querySelector("#garage").before(maps, $("map-access-note"));
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
        allowed = mapUnlocked(p, map);
      b.disabled = !allowed || store.busy;
      b.classList.toggle("active-map", map === ACTIVE_MAP);
      b.setAttribute("aria-pressed", String(map === ACTIVE_MAP));
      b.querySelector("small").textContent = allowed
        ? `LEVEL ${cityLevel(p, map)} · ENDLESS`
        : `LOCKED · TBILISI ${Math.min(3, p.level - 1)}/3 CLEARED`;
    }
    $("map-access-note").textContent = mapUnlocked(p, "kutaisi")
      ? "KUTAISI UNLOCKED · Select a city. Your cars, money and parts travel with you."
      : "Clear Tbilisi level 3 to unlock Kutaisi, its own levels and Platinum stunt boxes.";
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
