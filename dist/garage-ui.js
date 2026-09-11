import {
  PARTS,
  TIERS,
  partKey,
  upgradeCost,
  salvageValue,
  upgradedSpec,
  pursuitTuning,
} from "./progression.js";
import { CARS, carSpec } from "./config.js";
const $ = (id) => document.getElementById(id);
export class GarageUI {
  constructor(store, onCar) {
    this.store = store;
    this.onCar = onCar;
    this.car = store.profile.selectedCar;
    this.rolling = false;
    $("workshop-close").onclick = () => this.close();
    $("workshop").addEventListener("cancel", (e) => {
      if (this.rolling) e.preventDefault();
    });
    $("open-box").onclick = () => this.openBox();
    $("loot-done").onclick = () => {
      $("loot-dialog").close();
    };
    $("loot-skip").onclick = () => this.skip?.();
    $("save-retry").onclick = () => {
      void this.run(() => store.retry()).catch(() => {});
    };
    $("garage-save-key").onclick = () => this.exportKey();
    $("garage-restore-key").onclick = () => $("garage-key-file").click();
    $("garage-key-file").onchange = (event) => {
      void this.importKey(event.target.files[0]).catch(() => {});
      event.target.value = "";
    };
    store.onchange = () => this.render();
    this.render();
    if (store.lastError) $("save-error").textContent = store.lastError;
  }
  open() {
    this.render();
    $("workshop").showModal();
  }
  close() {
    if (this.rolling) return;
    $("workshop").close();
  }
  async run(fn) {
    $("save-error").textContent = "";
    try {
      const value = await fn();
      this.onCar(this.car);
      return value;
    } catch (error) {
      $("save-error").textContent = error.message;
      throw error;
    } finally {
      this.render();
    }
  }
  render() {
    const p = this.store.profile;
    if (!p) return;
    const spec = upgradedSpec(carSpec(this.car), p.cars[this.car]);
    $("garage-level").textContent = `LEVEL ${String(p.level).padStart(2, "0")}`;
    $("garage-credits").textContent = p.credits.toLocaleString() + " CR";
    $("garage-boxes").textContent =
      p.boxes + " BOX" + (p.boxes === 1 ? "" : "ES");
    $("garage-save-state").textContent = this.store.busy
      ? "Saving…"
      : this.store.pending
        ? "Save pending"
        : `SAVED · DRIVER ${this.store.driver}`;
    $("save-retry").hidden = !this.store.pending;
    $("intro-career").textContent =
      `LEVEL ${p.level} · ${p.credits.toLocaleString()} CR · ${p.boxes} BOX${p.boxes === 1 ? "" : "ES"}`;
    $("workshop-cars").innerHTML = CARS.map(
      (c) =>
        `<button data-choice="${c.id}" aria-pressed="${c.id === this.car}">${c.name}</button>`,
    ).join("");
    for (const b of $("workshop-cars").querySelectorAll("button"))
      b.onclick = () => {
        this.car = b.dataset.choice;
        this.onCar(this.car);
        this.render();
      };
    $("garage-stats").innerHTML = [
      ["TOP SPEED", Math.round(spec.topSpeed * 3.6) + " km/h"],
      [
        "WITH TURBO",
        Math.round((spec.topSpeed + spec.boostSpeed) * 3.6) + " km/h",
      ],
      ["TURBO TIME", (100 / spec.nitroDrain).toFixed(1) + " s"],
      ["HANDLING", Math.round(spec.handling * 100) + "%"],
    ]
      .map(([k, v]) => `<div><small>${k}</small><strong>${v}</strong></div>`)
      .join("");
    const difficulty = pursuitTuning(p.level);
    $("level-threat").textContent =
      `Next chase: ${difficulty.initialUnits} starting patrols · reinforcements every ${Math.round(difficulty.waveInterval)}s${difficulty.flank ? " · coordinated flanking" : ""}`;
    $("part-grid").innerHTML = PARTS.map((part) => {
      const tier = p.cars[this.car][part.id] || 0;
      const owned = [1, 2, 3, 4].filter(
        (t) => (p.inventory[partKey(part.id, t)] || 0) > 0,
      );
      const best = Math.max(0, ...owned),
        canEquip = best > tier;
      return `<article class="part-card" style="--tier:${TIERS[tier].color}"><div class="part-title"><i>${part.icon}</i><div><h3>${part.name}</h3><span>${TIERS[tier].name} installed</span></div></div><p>${part.effect}</p>
        <div class="tier-track">${TIERS.slice(1)
          .map(
            (t, i) =>
              `<span class="${i + 1 <= tier ? "lit" : ""}" style="--rarity:${t.color}" title="${t.name}">${t.name.slice(0, 1)}<small>×${p.inventory[partKey(part.id, i + 1)] || 0}</small></span>`,
          )
          .join("")}</div>
        <div class="part-actions"><button data-upgrade="${part.id}" ${tier === 4 || p.credits < upgradeCost(tier + 1) ? "disabled" : ""}>${tier === 4 ? "MAXED" : `UPGRADE · ${upgradeCost(tier + 1).toLocaleString()} CR`}</button>
        ${canEquip ? `<button class="install" data-equip="${part.id}" data-tier="${best}">INSTALL ${TIERS[best].name.toUpperCase()} · FREE</button>` : ""}
        ${best ? `<button class="sell" data-sell="${part.id}" data-tier="${best}">SELL SPARE · +${salvageValue(best)} CR</button>` : ""}</div></article>`;
    }).join("");
    for (const button of $("part-grid").querySelectorAll("button")) {
      if (this.store.busy || this.store.pending) button.disabled = true;
      button.onclick = () => {
        const type = button.dataset.upgrade
          ? "upgrade"
          : button.dataset.equip
            ? "equip"
            : "sell";
        void this.run(() =>
          this.store.mutate({
            type,
            car: this.car,
            part:
              button.dataset.upgrade ||
              button.dataset.equip ||
              button.dataset.sell,
            tier: Number(button.dataset.tier),
          }),
        ).catch(() => {});
      };
    }
    $("open-box").disabled =
      p.boxes < 1 || this.store.busy || !!this.store.pending || this.rolling;
    $("last-drop").textContent = p.lastBox
      ? "Last drop: " +
        p.lastBox.items
          .map(
            (r) =>
              `${TIERS[r.tier].name} ${PARTS.find((x) => x.id === r.part).name}`,
          )
          .join(" · ")
      : "One welcome box is waiting. Earn another by completing a level.";
  }
  async openBox() {
    if (this.rolling) return;
    this.rolling = true;
    this.render();
    try {
      const profile = await this.run(() =>
        this.store.mutate({ type: "open-box" }),
      );
      const results = profile.lastBox.items;
      $("loot-slots").innerHTML = results
        .map(
          () =>
            '<div class="loot-slot spinning"><i>◈</i><strong>ROLLING</strong><span>PARTS DROP</span></div>',
        )
        .join("");
      $("loot-done").disabled = true;
      $("loot-skip").hidden = false;
      $("loot-dialog").showModal();
      const slots = [...$("loot-slots").children];
      const show = (slot, reward, done) => {
        const part = PARTS.find((x) => x.id === reward.part);
        slot.style.setProperty("--tier", TIERS[reward.tier].color);
        slot.innerHTML = `<i>${part.icon}</i><strong>${part.name}</strong><span>${TIERS[reward.tier].name}</span>`;
        slot.classList.toggle("spinning", !done);
      };
      await new Promise((resolve) => {
        const begin = performance.now();
        let timer;
        const finish = () => {
          clearInterval(timer);
          results.forEach((r, i) => show(slots[i], r, true));
          this.skip = null;
          resolve();
        };
        this.skip = finish;
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
          finish();
          return;
        }
        timer = setInterval(() => {
          const age = performance.now() - begin;
          slots.forEach((slot, i) => {
            const done = age >= 1200 + i * 650;
            show(
              slot,
              done
                ? results[i]
                : {
                    part: PARTS[Math.floor(Math.random() * PARTS.length)].id,
                    tier: 1 + Math.floor(Math.random() * 4),
                  },
              done,
            );
          });
          if (age > 2550) finish();
        }, 85);
      });
      $("loot-done").disabled = false;
      $("loot-skip").hidden = true;
      $("loot-summary").textContent =
        "All three parts are saved in your inventory. Repeated parts count separately.";
    } catch {
      /* The visible save error and pending action allow an idempotent retry. */
    } finally {
      this.rolling = false;
      this.render();
    }
  }
  exportKey() {
    const blob = new Blob(
      [
        JSON.stringify(
          { game: "TECHCRUSH Tbilisi Chase", garageKey: this.store.token },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = "techcrush-private-garage-key.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $("save-error").textContent =
      "Your private garage key was downloaded. Keep it private; share only the game link.";
  }
  async importKey(file) {
    if (!file) return;
    await this.run(async () => {
      if (file.size > 4096)
        throw Error("This file is not a garage key backup.");
      let data;
      try {
        data = JSON.parse(await file.text());
      } catch {
        throw Error("This file is not a garage key backup.");
      }
      await this.store.restore(data.garageKey);
      this.car = this.store.profile.selectedCar;
    });
    $("save-error").textContent =
      "Your saved garage has been restored on this device.";
  }
}
