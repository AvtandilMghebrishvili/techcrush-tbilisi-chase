import { CITY_CARS, carUnlocked, totalTakedowns } from "./progression.js";
import { cityLevel, CITY_IDS } from "./map-selection.js";
import { carSpec } from "./config.js";
export const coinIcon =
  '<svg class="coin-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="7"/><path d="M15 8h-5v8h5M8 11h6M8 14h6"/></svg>';
export function carSilhouette(id) {
  return `<img class="car-photo" src="./assets/car-previews/${id}.webp" alt="" width="512" height="288" decoding="async">`;
}
export function carRequirement(id) {
  const map = CITY_IDS.find((m) => CITY_CARS[m] === id);
  return map
    ? `${map.toUpperCase()} · LVL 5`
    : id === "creator"
      ? "10 PATROL TAKEDOWNS"
      : "READY TO DRIVE";
}
export function refreshRewards(store) {
  const p = store.profile;
  for (const el of document.querySelectorAll("[data-wallet]"))
    el.innerHTML = `${coinIcon}<span>${p.credits.toLocaleString()}</span><small>COINS</small>`;
  for (const b of document.querySelectorAll("#garage [data-car]")) {
    const unlocked = carUnlocked(p, b.dataset.car);
    b.disabled = !unlocked;
    b.classList.toggle("car-locked", !unlocked);
    b.querySelector("small").textContent = unlocked
      ? carSpec(b.dataset.car).type
      : carRequirement(b.dataset.car);
  }
  const holder = document.getElementById("milestone-rewards");
  if (!holder) return;
  holder.innerHTML =
    CITY_IDS.map((map) => {
      const complete = Math.min(5, cityLevel(p, map) - 1),
        id = CITY_CARS[map],
        claimed = carUnlocked(p, id);
      return `<article class="milestone-card ${claimed ? "claimed" : ""}">${carSilhouette(id)}<div><small>${map.toUpperCase()} MASTERY</small><b>${carSpec(id).name}</b><progress value="${complete}" max="5"></progress><span>${claimed ? "IN YOUR GARAGE" : `${complete}/5 LEVELS · MYSTERY CAR`}</span></div>${p.carBoxes?.includes(map) ? `<button data-claim-city="${map}">OPEN CAR BOX ↗</button>` : ""}</article>`;
    }).join("") +
    `<article class="creator-milestone">${carSilhouette("creator")}<div><b>TECHCRUSH YouTuber</b><span>${totalTakedowns(p) % 10}/10 patrols to your next box</span><progress value="${totalTakedowns(p) % 10}" max="10"></progress><small>First 10 unlock the car. Every 10 earn 3 exclusive parts.</small></div></article>`;
  for (const b of holder.querySelectorAll("[data-claim-city]"))
    b.onclick = async () => {
      b.disabled = true;
      try {
        await openCarReward(store, b.dataset.claimCity);
      } catch (e) {
        b.textContent = e.message;
        b.disabled = false;
      }
    };
}
export function rewardTiles(reward, level) {
  return `<div class="reward-tiles"><div>${coinIcon}<strong>+${reward.cash.toLocaleString()}</strong><small>COINS BANKED</small></div><div><span class="box-symbol">◈</span><strong>+${reward.boxes + (reward.platinumBoxes || 0)}</strong><small>REWARD BOXES</small></div><div><span class="box-symbol">⚑</span><strong>${level}</strong><small>NEXT LEVEL</small></div></div>`;
}

export async function openCarReward(store, map) {
  const next = await store.mutate({ type: "claim-car-box", map });
  const id = next.lastCarReward.car;
  const dialog = document.getElementById("car-reveal");
  dialog.querySelector(".car-reveal-body").innerHTML =
    `<small>MYSTERY BOX · CAR UNLOCKED</small>${carSilhouette(id)}<h2>${carSpec(id).name}</h2><p>${carSpec(id).description}</p>`;
  dialog.showModal();
  refreshRewards(store);
}
