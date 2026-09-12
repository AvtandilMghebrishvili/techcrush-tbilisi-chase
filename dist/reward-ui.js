import {
  CITY_CARS,
  carUnlocked,
  totalTakedowns,
  highestCityLevel,
} from "./progression.js";
import { cityLevel, CITY_IDS } from "./map-selection.js";
import { carSpec } from "./config.js";
export const coinIcon =
  '<svg class="coin-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="7"/><path d="M15 8h-5v8h5M8 11h6M8 14h6"/></svg>';
export function carSilhouette(id) {
  return `<img class="car-photo" src="./assets/car-previews/${id}.webp" alt="" width="512" height="288" decoding="async">`;
}
export function carRequirement(id) {
  return id === "creator"
    ? "ANY CITY · LVL 15"
    : Object.values(CITY_CARS).includes(id)
      ? "ANY CITY · LVL 10"
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
      const complete = Math.min(10, highestCityLevel(p)),
        id = CITY_CARS[map],
        claimed = carUnlocked(p, id);
      return `<article class="milestone-card ${claimed ? "claimed" : ""}">${carSilhouette(id)}<div><small>ANY CITY · LEVEL 10</small><b>${carSpec(id).name}</b><progress value="${complete}" max="10"></progress><span>${claimed ? "IN YOUR GARAGE" : `LVL ${complete}/10 · AUTO UNLOCK`}</span></div>${p.carBoxes?.includes(map) ? `<button data-claim-city="${map}">CLAIM LEGACY CAR ↗</button>` : ""}</article>`;
    }).join("") +
    `<article class="creator-milestone">${carSilhouette("creator")}<div><b>TECHCRUSH Cyber</b><span>${carUnlocked(p, "creator") ? "IN YOUR GARAGE" : `LVL ${Math.min(15, highestCityLevel(p))}/15 · ANY CITY`}</span><progress value="${Math.min(15, highestCityLevel(p))}" max="15"></progress><small>YouTuber EV · 2× driving coins + score. Unlock at LVL 15. Every 10 patrols: parts box.</small></div></article>`;
  holder.insertAdjacentHTML(
    "beforeend",
    `<div class="milestone-bonus"><b>EVERY 5 LEVELS · 2 BONUS BOXES</b><span>Mystery + Special · coins and high-grade parts</span>${CITY_IDS.map((map) => `<small>${map.toUpperCase()} · LVL ${cityLevel(p, map)} → NEXT ${5 * (Math.floor(cityLevel(p, map) / 5) + 1)}</small>`).join("")}<small>PATROL BONUS · ${totalTakedowns(p) % 10}/10 to next TECHCRUSH box</small></div>`,
  );
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
  return `<div class="reward-tiles"><div>${coinIcon}<strong>+${reward.cash.toLocaleString()}</strong><small>${reward.multiplier === 2 ? "2× CYBER COINS BANKED" : "COINS BANKED"}</small></div><div><span class="box-symbol">◈</span><strong>+${reward.boxes + (reward.platinumBoxes || 0) + (reward.mysteryBoxes || 0) + (reward.specialBoxes || 0) + (reward.creatorBoxes || 0)}</strong><small>REWARD BOXES</small></div><div><span class="box-symbol">⚑</span><strong>${level}</strong><small>NEXT LEVEL</small></div></div>${reward.mysteryBoxes ? `<p class="milestone-payout">✦ LEVEL ${level} MILESTONE · +${reward.mysteryBoxes} MYSTERY + ${reward.specialBoxes} SPECIAL<br><small>Bonus coins + 6 high-grade parts · Open in Garage → Boxes</small></p>` : ""}${reward.unlockedCars?.length ? `<div class="unlocked-rewards"><b>AUTO UNLOCKED · READY IN EVERY CITY</b>${reward.unlockedCars.map((id) => `<span>${carSilhouette(id)}<small>${carSpec(id).name}</small></span>`).join("")}</div>` : ""}`;
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
