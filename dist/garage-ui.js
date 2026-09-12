import { CITY_NAME, cityLevel } from "./map-selection.js";
import { GaragePreview } from "./garage-preview.js";
import { PAINTS, paintColor } from "./customization.js";
import { PART_DETAILS, comparisonRows } from "./garage-presentation.js";
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
import {
  partArtwork,
  partCategory,
  upgradeBenefits,
} from "./garage-presentation.js";
const $ = (id) => document.getElementById(id);
export class GarageUI {
  constructor(store, onCar, view) {
    this.view = view;
    this.inspection = null;
    this.artReady = false;
    this.store = store;
    this.onCar = onCar;
    this.car = store.profile.selectedCar;
    this.rolling = false;
    this.filter = "all";
    $("part-filters").onclick = (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;
      this.filter = button.dataset.filter;
      this.render();
    };
    $("workshop").addEventListener("close", () => {
      this.preview?.stop();
      cancelAnimationFrame(this.statFrame);
    });
    const suspend = () => {
      cancelAnimationFrame(this.statFrame);
      this.skip?.();
    };
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) suspend();
    });
    addEventListener("pagehide", suspend);
    $("loot-dialog").addEventListener("close", () => this.skip?.());
    $("preview-angles").onclick = (e) => {
      const b = e.target.closest("[data-angle]");
      if (b) this.preview?.angle(b.dataset.angle);
    };
    $("preview-fitted").onclick = () => {
      this.inspection = null;
      this.render();
    };
    $("paint-custom").onchange = (e) => this.setPaint(e.target.value);
    $("workshop-close").onclick = () => this.close();
    $("workshop").addEventListener("cancel", (e) => {
      if (this.rolling) e.preventDefault();
    });
    $("open-box").onclick = () => this.openBox();
    $("open-platinum-box").onclick = () => this.openBox(true);
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
    $("workshop").showModal();
    try {
      this.preview ||= new GaragePreview($("garage-preview"), this.view);
    } catch {
      $("preview-label").textContent = "3D PREVIEW UNAVAILABLE";
    }
    this.artReady = true;
    this.render();
    this.preview?.start();
  }
  close() {
    if (this.rolling) return;
    $("workshop").close();
  }
  async run(fn) {
    $("save-error").textContent = "";
    const before = structuredClone(this.store.profile.cars[this.car]);
    let completed = false;
    try {
      const value = await fn();
      this.inspection = null;
      this.onCar(this.car);
      completed = true;
      return value;
    } catch (error) {
      $("save-error").textContent = error.message;
      throw error;
    } finally {
      this.render();
      if (completed)
        this.animateUpgrade(before, this.store.profile.cars[this.car]);
    }
  }
  setPaint(color) {
    if (this.store.busy || this.store.pending) return;
    void this.run(() =>
      this.store.mutate({ type: "paint", car: this.car, color }),
    ).catch(() => {});
  }
  inspect(part, tier) {
    this.inspection = { part, tier };
    this.render();
    this.preview?.angle(
      part === "spoiler"
        ? "rear"
        : ["rims", "tires", "brakes"].includes(part)
          ? "wheels"
          : "front",
    );
    document.querySelector(".garage-showcase").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }
  animateUpgrade(before, after) {
    const changed = PARTS.filter(
      (p) => (after[p.id] || 0) > (before[p.id] || 0),
    );
    if (!changed.length) {
      if (before.paint !== after.paint)
        $("upgrade-feedback").textContent =
          "Paint saved. Your car is ready to drive.";
      return;
    }
    const part = changed[0],
      tier = after[part.id];
    $("upgrade-feedback").textContent =
      `${TIERS[tier].name} ${part.name} fitted to ${carSpec(this.car).name}. ${upgradeBenefits(carSpec(this.car), before, part, tier).join(" · ")}`;
    const rows = comparisonRows(carSpec(this.car), before, part, tier);
    this.renderInspector(part, tier, before, true);
    this.preview?.hydrate($("part-inspector"));
    const section = $("part-inspector");
    section.classList.remove("just-fitted");
    void section.offsetWidth;
    section.classList.add("just-fitted");
    const duration = matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 900,
      start = performance.now();
    cancelAnimationFrame(this.statFrame);
    const tick = (now) => {
      const t = duration ? Math.min(1, (now - start) / duration) : 1,
        ease = 1 - (1 - t) ** 3;
      for (const row of rows) {
        const node = section.querySelector(`[data-after="${row.key}"]`);
        if (node)
          node.textContent = (
            row.before +
            (row.after - row.before) * ease
          ).toFixed(row.unit === "s" ? 2 : 1);
      }
      if (t < 1 && $("workshop").open && !document.hidden)
        this.statFrame = requestAnimationFrame(tick);
    };
    tick(start);
  }
  renderInspector(
    part,
    tier,
    equipment = this.store.profile.cars[this.car],
    installed = false,
  ) {
    const current = equipment[part.id] || 0,
      rows = comparisonRows(carSpec(this.car), equipment, part, tier);
    const actual = this.store.profile.cars[this.car][part.id] || 0,
      next = Math.min(5, actual + 1),
      busy = this.store.busy || this.store.pending;
    const canInstall =
      tier > actual &&
      (this.store.profile.inventory[partKey(part.id, tier)] || 0) > 0;
    $("part-inspector").style.setProperty("--tier", TIERS[tier].color);
    $("part-inspector").innerHTML =
      `<div class="inspector-art">${partArtwork(part, "", tier)}<span>${TIERS[tier].name} · ${installed ? "FITTED" : "PREVIEW"}</span></div><div class="inspector-copy"><small>${installed ? "UPGRADE COMPLETE" : "INSPECT YOUR NEXT UPGRADE"}</small><h3>${part.name}</h3><p>${PART_DETAILS[part.id]}</p><div class="quality-picker">${TIERS.slice(
        1,
      )
        .map(
          (q, i) =>
            `<button data-quality="${i + 1}" style="--quality:${q.color}" aria-pressed="${tier === i + 1}">${q.name}</button>`,
        )
        .join(
          "",
        )}</div><small class="preview-disclaimer">${installed ? "Saved to this car. Ready for the next chase." : tier > current ? "Preview only. Buy the next tier or install an owned part for free." : "This is a visual comparison. Your fitted part is unchanged."}</small><div class="inspector-actions"><button data-inspector-buy ${busy || actual >= 4 || this.store.profile.credits < upgradeCost(next) ? "disabled" : ""}>${actual >= 4 ? (actual === 5 ? "FULLY UPGRADED" : "FIND PLATINUM IN KUTAISI") : `UPGRADE TO ${TIERS[next].name.toUpperCase()} · ${upgradeCost(next).toLocaleString()} CR`}</button>${canInstall ? `<button data-inspector-install ${busy ? "disabled" : ""}>INSTALL ${TIERS[tier].name.toUpperCase()} · FREE</button>` : ""}</div></div><div class="comparison-meters">${rows.map((r) => `<div class="comparison-row"><span>${r.label} ${r.lower ? "↓ better" : "↑ better"}</span><div class="comparison-numbers"><b>${r.before.toFixed(r.unit === "s" ? 2 : 1)}</b><span>→</span><strong data-after="${r.key}">${r.after.toFixed(r.unit === "s" ? 2 : 1)}</strong><small>${r.unit}</small></div><div class="meter" style="--from:${Math.min(100, (r.before / r.max) * 100)}%;--to:${Math.min(100, (r.after / r.max) * 100)}%"><i></i><b></b></div></div>`).join("")}</div>`;
    $("part-inspector").querySelector("[data-inspector-buy]").onclick = () =>
      void this.run(() =>
        this.store.mutate({ type: "upgrade", car: this.car, part: part.id }),
      ).catch(() => {});
    const install = $("part-inspector").querySelector(
      "[data-inspector-install]",
    );
    if (install)
      install.onclick = () =>
        void this.run(() =>
          this.store.mutate({
            type: "equip",
            car: this.car,
            part: part.id,
            tier,
          }),
        ).catch(() => {});
    for (const b of $("part-inspector").querySelectorAll("[data-quality]"))
      b.onclick = () => this.inspect(part.id, Number(b.dataset.quality));
  }
  render() {
    const focus = document.activeElement?.closest("[data-part]")?.dataset.part;
    const p = this.store.profile;
    if (!p) return;
    const spec = upgradedSpec(carSpec(this.car), p.cars[this.car]);
    $("garage-selected-car").textContent = carSpec(this.car).name;
    const stock = upgradedSpec(carSpec(this.car));
    $("garage-level").textContent =
      `LEVEL ${String(cityLevel(p)).padStart(2, "0")}`;
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
      `LEVEL ${cityLevel(p)} · ${p.credits.toLocaleString()} CR · ${p.boxes} BOX${p.boxes === 1 ? "" : "ES"}`;
    $("workshop-cars").innerHTML = CARS.map(
      (c) =>
        `<button data-choice="${c.id}" ${this.store.busy || this.store.pending ? "disabled" : ""} aria-pressed="${c.id === this.car}">${c.name}</button>`,
    ).join("");
    $("workshop-cars").insertAdjacentHTML(
      "beforeend",
      `<button disabled class="coming-car">? YOUTUBER CAR <small>COMING SOON</small></button>`,
    );
    $("stunt-record").textContent =
      `${p.quests?.completed.length || 0}/4 STUNT BOXES FOUND · Progress survives map updates`;
    for (const b of $("workshop-cars").querySelectorAll("button[data-choice]"))
      b.onclick = () => {
        this.car = b.dataset.choice;
        this.inspection = null;
        this.onCar(this.car);
        this.render();
      };
    $("garage-stats").innerHTML = [
      [
        "TOP SPEED",
        Math.round(spec.topSpeed * 3.6) + " km/h",
        Math.round((spec.topSpeed - stock.topSpeed) * 3.6) + " km/h",
      ],
      [
        "WITH TURBO",
        Math.round((spec.topSpeed + spec.boostSpeed) * 3.6) + " km/h",
        Math.round(
          (spec.topSpeed +
            spec.boostSpeed -
            stock.topSpeed -
            stock.boostSpeed) *
            3.6,
        ) + " km/h",
      ],
      [
        "TURBO TIME",
        (100 / spec.nitroDrain).toFixed(1) + " s",
        (100 / spec.nitroDrain - 100 / stock.nitroDrain).toFixed(1) + " s",
      ],
      [
        "HANDLING",
        Math.round(spec.handling * 100) + "%",
        Math.round((spec.handling - stock.handling) * 100) + "%",
      ],
    ]
      .map(
        ([k, v, delta]) =>
          `<div><small>${k}</small><strong>${v}</strong><em>${parseFloat(delta) > 0 ? "+" + delta + " vs stock" : "STOCK SPEC"}</em></div>`,
      )
      .join("");
    const color = paintColor(p.cars[this.car], carSpec(this.car).color);
    $("paint-custom").value = color;
    $("paint-custom").disabled = this.store.busy || !!this.store.pending;
    $("paint-swatches").innerHTML = PAINTS.map(
      ([name, c]) =>
        `<button title="${name}" aria-label="${name} paint" aria-pressed="${c === color}" data-paint="${c}" style="--paint:${c}" ${this.store.busy || this.store.pending ? "disabled" : ""}></button>`,
    ).join("");
    for (const b of $("paint-swatches").children)
      b.onclick = () => this.setPaint(b.dataset.paint);
    const equipment = { ...p.cars[this.car] };
    if (this.inspection) equipment[this.inspection.part] = this.inspection.tier;
    this.preview?.setCar(this.car, equipment);
    $("preview-label").textContent = this.inspection
      ? `${TIERS[this.inspection.tier].name.toUpperCase()} ${PARTS.find((x) => x.id === this.inspection.part).name.toUpperCase()} · PREVIEW ONLY`
      : "YOUR INSTALLED BUILD";
    const inspected =
      PARTS.find((x) => x.id === this.inspection?.part) || PARTS[0];
    this.renderInspector(
      inspected,
      this.inspection?.tier ||
        Math.min(5, (p.cars[this.car][inspected.id] || 0) + 1),
    );
    const difficulty = pursuitTuning(cityLevel(p));
    $("level-threat").textContent =
      `LEVEL ${cityLevel(p)} · ${difficulty.initialUnits} patrols · ${cityLevel(p) >= 3 ? "SUVs + tanks + helicopter" : cityLevel(p) >= 2 ? "SUVs + helicopter" : "sedan pursuit"} · new routes each level`;
    for (const b of $("part-filters").querySelectorAll("button"))
      b.setAttribute("aria-pressed", String(b.dataset.filter === this.filter));
    const visibleParts = PARTS.filter(
      (part) => this.filter === "all" || partCategory(part.id) === this.filter,
    );
    $("parts-count").textContent = `${visibleParts.length} PARTS`;
    $("part-grid").innerHTML = visibleParts
      .map((part) => {
        const tier = p.cars[this.car][part.id] || 0;
        const owned = [1, 2, 3, 4, 5].filter(
          (t) => (p.inventory[partKey(part.id, t)] || 0) > 0,
        );
        const best = Math.max(0, ...owned),
          canEquip = best > tier;
        const previewTier = Math.min(5, tier + 1);
        const benefits =
          tier === 5
            ? []
            : upgradeBenefits(
                carSpec(this.car),
                p.cars[this.car],
                part,
                previewTier,
              );
        const spareBenefits =
          canEquip && best !== previewTier
            ? upgradeBenefits(carSpec(this.car), p.cars[this.car], part, best)
            : [];
        return `<article class="part-card" tabindex="-1" data-part="${part.id}" style="--tier:${TIERS[tier || 1].color}">
        <div class="part-photo">${partArtwork(part, "", tier || 1)}<span class="part-quality">${tier ? TIERS[tier].name + " FITTED" : "BRONZE UPGRADE"}</span></div>
        <div class="part-body"><div class="part-title"><div><h3>${part.name}</h3><span>${TIERS[tier].name} installed</span></div><b class="part-level">${tier}/5</b></div><p>${part.effect}</p>
        <div class="upgrade-preview"><small>${tier === 5 ? "FULLY UPGRADED" : TIERS[previewTier].name.toUpperCase() + " UPGRADE BENEFITS"}</small>${benefits.map((x) => `<span>${x}</span>`).join("")}${spareBenefits.length ? `<small class="spare-preview">FREE ${TIERS[best].name.toUpperCase()} INSTALL</small>${spareBenefits.map((x) => `<span>${x}</span>`).join("")}` : ""}</div>
        <div class="tier-track">${TIERS.slice(1)
          .map(
            (t, i) =>
              `<span class="${i + 1 === tier ? "lit" : ""}" style="--rarity:${t.color}" title="${t.name}: ${p.inventory[partKey(part.id, i + 1)] || 0} spare parts">${t.name}<small>×${p.inventory[partKey(part.id, i + 1)] || 0}</small></span>`,
          )
          .join("")}</div>
        <div class="part-actions"><button class="inspect-part" data-inspect="${part.id}" data-tier="${previewTier}">INSPECT & COMPARE ↗</button><button data-upgrade="${part.id}" ${tier >= 4 || p.credits < upgradeCost(tier + 1) ? "disabled" : ""}>${tier >= 4 ? (tier === 5 ? "MAXED" : "FIND PLATINUM") : `UPGRADE · ${upgradeCost(tier + 1).toLocaleString()} CR`}</button>
        ${canEquip ? `<button class="install" data-equip="${part.id}" data-tier="${best}">INSTALL ${TIERS[best].name.toUpperCase()} · FREE</button>` : ""}
        ${best ? `<button class="sell" data-sell="${part.id}" data-tier="${best}">SELL SPARE · +${salvageValue(best)} CR</button>` : ""}</div></div></article>`;
      })
      .join("");
    for (const button of $("part-grid").querySelectorAll("button")) {
      if (button.dataset.inspect) {
        button.onclick = () =>
          this.inspect(button.dataset.inspect, Number(button.dataset.tier));
        continue;
      }
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
    $("open-platinum-box").disabled =
      p.platinumBoxes < 1 ||
      this.store.busy ||
      !!this.store.pending ||
      this.rolling;
    $("open-platinum-box").textContent =
      "PLATINUM · " +
      p.platinumBoxes +
      " BOX" +
      (p.platinumBoxes === 1 ? "" : "ES") +
      " ↗";
    $("last-drop").textContent = p.lastBox
      ? "Last drop: " +
        p.lastBox.items
          .map(
            (r) =>
              `${TIERS[r.tier].name} ${PARTS.find((x) => x.id === r.part).name}`,
          )
          .join(" · ")
      : "One welcome box is waiting. Earn another by completing a level.";
    if (this.artReady) {
      this.preview?.hydrate($("part-grid"));
      this.preview?.hydrate($("part-inspector"));
    }
    if (focus)
      $("part-grid")
        .querySelector(`[data-part="${focus}"]`)
        ?.focus({ preventScroll: true });
  }
  async openBox(platinum = false) {
    if (this.rolling) return;
    this.rolling = true;
    this.render();
    try {
      const profile = await this.run(() =>
        this.store.mutate({
          type: platinum ? "open-platinum-box" : "open-box",
        }),
      );
      const results = profile.lastBox.items;
      $("loot-summary").textContent = "Opening your three rewards…";
      $("loot-slots").innerHTML = results
        .map(
          () =>
            `<div class="loot-slot spinning">${partArtwork(PARTS[2])}<strong>ROLLING</strong><span>PARTS DROP</span></div>`,
        )
        .join("");
      $("loot-done").disabled = true;
      $("loot-skip").hidden = false;
      $("loot-dialog").showModal();
      const slots = [...$("loot-slots").children];
      const show = (slot, reward, done) => {
        const part = PARTS.find((x) => x.id === reward.part);
        slot.style.setProperty("--tier", TIERS[reward.tier].color);
        slot.innerHTML = `${partArtwork(part, "", reward.tier)}<strong>${part.name}</strong><span>${TIERS[reward.tier].name}</span>`;
        slot.classList.toggle("spinning", !done);
        if (done) this.preview?.hydrate(slot);
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
                    tier: platinum ? 5 : 1 + Math.floor(Math.random() * 4),
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
