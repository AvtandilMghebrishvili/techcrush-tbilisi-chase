import {
  carUnlocked,
  totalBoxes,
  MILESTONE_BOXES,
  BOX_SHOP,
  artifactPrice,
} from "./progression.js";
import {
  ARTIFACT_BANNERS,
  HUNT_CITIES,
  eventPhase,
  eventProgress,
} from "./event-rules.js";
import { carRequirement, refreshRewards, coinIcon } from "./reward-ui.js";
import { ACTIVE_MAP, CITY_NAME, cityLevel } from "./map-selection.js";
import { GaragePreview } from "./garage-preview.js";
import { PAINTS, paintColor } from "./customization.js";
import {
  vehiclePartName,
  vehiclePartDetails,
  comparisonRows,
} from "./garage-presentation.js";
import {
  PARTS,
  TIERS,
  partKey,
  upgradeCost,
  salvageValue,
  upgradedSpec,
  pursuitTuning,
  partStars,
  partPower,
  FUSION_COSTS,
  FUSION_BONUSES,
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
    this.selectedPart = PARTS[0].id;
    this.tab = "build";
    this.artReady = false;
    this.store = store;
    this.onCar = onCar;
    this.car = store.profile.selectedCar;
    this.rolling = false;
    this.filter = "all";
    const tabs = [...document.querySelectorAll("[data-workshop-tab]")];
    for (const button of tabs)
      button.onclick = () => this.switchTab(button.dataset.workshopTab);
    document.querySelector(".workshop-nav").onkeydown = (event) => {
      const index = tabs.indexOf(event.target);
      if (
        index < 0 ||
        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
      )
        return;
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
              tabs.length;
      tabs[next].click();
      tabs[next].focus();
    };
    for (const button of document.querySelectorAll("[data-go-tab]"))
      button.onclick = () => this.switchTab(button.dataset.goTab);
    this.compactMedia = matchMedia("(max-width: 800px)");
    this.compactMedia.addEventListener("change", () =>
      this.updatePreviewActivity(),
    );
    $("workshop-car-select").onchange = (event) => {
      const car = event.target.value;
      if (!carUnlocked(this.store.profile, car)) return;
      this.car = car;
      this.inspection = null;
      $("upgrade-feedback").textContent = "";
      this.onCar(this.car);
      this.render();
    };
    $("part-filters").onclick = (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;
      this.filter = button.dataset.filter;
      if (
        this.filter !== "all" &&
        partCategory(this.selectedPart) !== this.filter
      ) {
        this.selectedPart = PARTS.find(
          (p) => partCategory(p.id) === this.filter,
        ).id;
        this.inspection = null;
      }
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
    for (const kind of Object.keys(MILESTONE_BOXES))
      $("open-" + kind + "-box").onclick = () => this.openBox(kind);
    $("open-box").onclick = () => this.openBox();
    $("open-platinum-box").onclick = () => this.openBox(true);
    $("open-creator-box").onclick = () => this.openBox("creator");
    for (const kind of Object.keys(BOX_SHOP))
      $("buy-" + kind + "-box").onclick = () => this.buyBox(kind);
    for (const button of document.querySelectorAll("[data-buy-artifact]"))
      button.onclick = () => this.buyArtifact(button.dataset.buyArtifact);
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
  open(tab = "build") {
    if (this.disposed) return;
    this.switchTab(tab);
    $("workshop").showModal();
    try {
      this.preview ||= new GaragePreview($("garage-preview"), this.view);
    } catch {
      $("preview-label").textContent = "3D PREVIEW UNAVAILABLE";
    }
    this.artReady = true;
    this.render();
    this.updatePreviewActivity();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.skip?.();
    cancelAnimationFrame(this.statFrame);
    this.preview?.dispose();
  }
  updatePreviewActivity() {
    if (
      $("workshop").open &&
      this.tab !== "boxes" &&
      (!this.compactMedia.matches || this.tab === "build")
    )
      this.preview?.start();
    else this.preview?.stop();
    this.preview?.resize();
  }
  switchTab(tab) {
    if (!["build", "parts", "boxes"].includes(tab)) return;
    this.tab = tab;
    if (tab !== "parts") this.inspection = null;
    const garageMode = tab !== "boxes";
    $("workshop").dataset.tab = garageMode ? "garage" : "boxes";
    $("workshop").dataset.shop = String(tab === "boxes");
    $("workshop-eyebrow").textContent =
      tab === "boxes" ? "TECHCRUSH / SHOP" : "TECHCRUSH / WORKSHOP";
    $("workshop-title").innerHTML =
      tab === "boxes" ? "BOX SHOP<span>.</span>" : "YOUR GARAGE<span>.</span>";
    for (const button of document.querySelectorAll("[data-workshop-tab]")) {
      const active = garageMode || button.dataset.workshopTab === tab;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = garageMode ? -1 : active ? 0 : -1;
      $(button.getAttribute("aria-controls")).hidden = !garageMode && !active;
    }
    $("build-panel").hidden = !garageMode;
    $("parts-panel").hidden = !garageMode;
    $("boxes-panel").hidden = garageMode;
    this.render();
    this.updatePreviewActivity();
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
  buyBox(kind) {
    const box = BOX_SHOP[kind];
    if (!box || this.store.busy || this.store.pending) return;
    void this.run(() => this.store.mutate({ type: "buy-box", kind }))
      .then(() => {
        $("upgrade-feedback").textContent =
          `${box.name} Box purchased for ${box.price.toLocaleString()} CR. Open it in Supply Drops.`;
      })
      .catch(() => {});
  }
  buyArtifact(map) {
    if (!HUNT_CITIES.includes(map) || this.store.busy || this.store.pending)
      return;
    void this.run(() => this.store.mutate({ type: "buy-artifact", map }))
      .then((profile) => {
        const price = profile.lastPurchase?.price || artifactPrice(0);
        $("upgrade-feedback").textContent =
          `${map.toUpperCase()} search area revealed for ${price.toLocaleString()} CR. Open the city map and search inside the yellow zone.`;
      })
      .catch(() => {});
  }
  inspect(part, tier) {
    this.selectedPart = part;
    this.inspection = { part, tier };
    this.render();
    this.preview?.angle(
      part === "spoiler"
        ? "rear"
        : ["rims", "tires", "brakes"].includes(part)
          ? "wheels"
          : "front",
    );
  }
  animateUpgrade(before, after) {
    const changed = PARTS.filter(
      (p) => partPower(after, p.id) > partPower(before, p.id),
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
      `${TIERS[tier].name}${"+".repeat(partStars(after, part.id))} ${vehiclePartName(part, this.car)} fitted to ${carSpec(this.car).name}. ${upgradeBenefits(carSpec(this.car), before, part, tier, partStars(after, part.id)).join(" · ")}`;
    const rows = comparisonRows(
      carSpec(this.car),
      before,
      part,
      tier,
      partStars(after, part.id),
    );
    if (this.tab !== "parts" || !$("workshop").open) return;
    this.selectedPart = part.id;
    this.renderInspector(part, tier, before, true, partStars(after, part.id));
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
    stars = equipment.stars?.[part.id] || 0,
  ) {
    const profile = this.store.profile,
      fitted = profile.cars[this.car],
      actual = fitted[part.id] || 0,
      maxTier = this.car === "creator" ? 8 : 5,
      next = Math.min(maxTier, actual + 1),
      busy = this.store.busy || this.store.pending,
      rows = comparisonRows(carSpec(this.car), equipment, part, tier, stars),
      spare = profile.inventory[partKey(part.id, tier)] || 0,
      actualStars = partStars(fitted, part.id),
      copies = profile.inventory[partKey(part.id, actual)] || 0,
      fusionCost = FUSION_COSTS[actualStars];
    const grades = TIERS.slice(1, maxTier + 1)
      .map((q, i) => {
        const grade = i + 1,
          count = profile.inventory[partKey(part.id, grade)] || 0;
        return `<button data-quality="${grade}" style="--quality:${q.color}" aria-pressed="${tier === grade}" title="${q.name}: ${count} spare parts${actual === grade ? ", fitted" : ""}"><span>${q.name}</span><small>${actual === grade ? "✓ " : ""}×${count}</small></button>`;
      })
      .join("");
    const buy =
      actual < 4
        ? `<button data-inspector-buy ${busy || profile.credits < upgradeCost(next) ? "disabled" : ""}>UPGRADE TO ${TIERS[next].name.toUpperCase()} <b>${upgradeCost(next).toLocaleString()} CR</b></button>`
        : "";
    const install =
      tier > actual && spare > 0
        ? `<button data-inspector-install ${busy ? "disabled" : ""}>EQUIP ${TIERS[tier].name.toUpperCase()} UPGRADE <b>FREE ↑</b></button>`
        : "";
    const sell =
      spare > 0
        ? `<button data-sell="${part.id}" data-tier="${tier}" ${busy ? "disabled" : ""}>SELL 1 SPARE <b>+${salvageValue(tier).toLocaleString()} CR</b></button>`
        : "";
    const fusion = actual
      ? `<div class="fusion-panel"><strong><span>EXTRA BOOST · ${TIERS[actual].name} ${"★".repeat(actualStars)}${"☆".repeat(5 - actualStars)}</span><span>+${Math.round(FUSION_BONUSES[actualStars] * 100)}%</span></strong>${fusionCost ? `<div class="fusion-next"><small>${copies}/${fusionCost} same parts · next boost +${Math.round(FUSION_BONUSES[actualStars + 1] * 100)}%</small><progress max="${fusionCost}" value="${Math.min(fusionCost, copies)}"></progress></div><button data-fuse="${part.id}" ${busy || copies < fusionCost ? "disabled" : ""}>BOOST WITH ${fusionCost} PARTS → ${"★".repeat(actualStars + 1)}</button>` : "<small>Maximum five-star boost reached</small>"}</div>`
      : "";
    const section = $("part-inspector");
    section.dataset.gradeCount = String(maxTier);
    section.style.setProperty("--tier", TIERS[tier].color);
    section.innerHTML = `<div class="inspector-heading"><div class="inspector-art">${partArtwork(part, "", tier)}</div><div class="inspector-copy"><small>${installed ? "FITTED ✓" : "UPGRADE PREVIEW"}</small><h3>${vehiclePartName(part, this.car)}</h3><span class="fitted-grade">Installed: ${TIERS[actual].name}${"+".repeat(actualStars)}</span><p>${part.effect}</p></div></div>
      <div class="quality-picker" role="group" aria-label="Preview quality and spare inventory">${grades}</div>
      <div class="upgrade-impact"><b>WHAT GETS STRONGER</b>${upgradeBenefits(
        carSpec(this.car),
        equipment,
        part,
        tier,
        stars,
      )
        .map((benefit) => `<span>↑ ${benefit}</span>`)
        .join("")}</div>
      <div class="comparison-meters">${rows.map((r) => `<div class="comparison-row"><span>${r.label} ${r.lower ? "↓" : "↑"}</span><div class="comparison-numbers"><b>${r.before.toFixed(r.unit === "s" ? 2 : 1)}</b><span>→</span><strong data-after="${r.key}">${r.after.toFixed(r.unit === "s" ? 2 : 1)}</strong><small>${r.unit}</small></div><div class="meter" style="--from:${Math.min(100, (r.before / r.max) * 100)}%;--to:${Math.min(100, (r.after / r.max) * 100)}%"><i></i><b></b></div></div>`).join("")}</div>
      <small class="preview-disclaimer">${installed ? "Installed and saved." : `Comparing ${TIERS[tier].name} · ${spare} spare${spare === 1 ? "" : "s"}. Preview changes are not installed.`}</small>
      <div class="inspector-actions">${buy}${install}${sell}</div>
      ${!buy && !install ? `<small class="grade-source">${actual >= maxTier ? "Top grade fitted. Collect duplicates to fuse." : this.car === "creator" ? "Higher grades drop from TECHCRUSH boxes." : "Find Platinum in city stunt boxes."}</small>` : ""}
      ${fusion}<details class="part-explanation"><summary>WHAT CHANGES?</summary><p>${vehiclePartDetails(part, this.car)}</p><p>Fusion bonuses belong to this car. Spare counts appear under each grade.</p></details>`;
    const mutate = (type, extra = {}) =>
      void this.run(() =>
        this.store.mutate({ type, car: this.car, part: part.id, ...extra }),
      ).catch(() => {});
    section
      .querySelector("[data-inspector-buy]")
      ?.addEventListener("click", () => mutate("upgrade"));
    section
      .querySelector("[data-inspector-install]")
      ?.addEventListener("click", () => mutate("equip", { tier }));
    section
      .querySelector("[data-sell]")
      ?.addEventListener("click", () => mutate("sell", { tier }));
    section
      .querySelector("[data-fuse]")
      ?.addEventListener("click", () => mutate("fuse"));
    for (const button of section.querySelectorAll("[data-quality]"))
      button.onclick = () =>
        this.inspect(part.id, Number(button.dataset.quality));
  }

  render() {
    if (this.disposed) return;
    const active = document.activeElement;
    const focusAttribute = [
      "data-inspect",
      "data-quality",
      "data-inspector-buy",
      "data-inspector-install",
      "data-sell",
      "data-fuse",
      "data-paint",
    ].find((key) => active?.hasAttribute(key));
    const focus = focusAttribute
      ? `[${focusAttribute}="${CSS.escape(active.getAttribute(focusAttribute))}"]`
      : null;
    const p = this.store.profile;
    if (!p) return;
    const spec = upgradedSpec(carSpec(this.car), p.cars[this.car]);
    $("garage-selected-car").textContent = carSpec(this.car).name;
    $("garage-car-class").textContent =
      this.car === "creator"
        ? "ELECTRIC AWD · 2× DRIVING COINS + SCORE"
        : carSpec(this.car).type;
    const stock = upgradedSpec(carSpec(this.car));
    $("garage-level").textContent =
      `LEVEL ${String(cityLevel(p)).padStart(2, "0")}`;
    $("garage-credits").textContent = p.credits.toLocaleString() + " CR";
    $("shop-box-count").textContent =
      `${totalBoxes(p)} BOX${totalBoxes(p) === 1 ? "" : "ES"} · 3 PARTS EACH`;
    $("garage-save-state").textContent = this.store.busy
      ? "Saving…"
      : this.store.pending
        ? "Save pending"
        : "ALL CHANGES SAVED ✓";
    $("save-retry").hidden = !this.store.pending;
    $("intro-career").textContent =
      `LEVEL ${cityLevel(p)} · ${p.credits.toLocaleString()} CR · ${totalBoxes(p)} BOX${totalBoxes(p) === 1 ? "" : "ES"}`;
    $("workshop-car-select").innerHTML = CARS.map(
      (c) =>
        `<option value="${c.id}" ${c.id === this.car ? "selected" : ""} ${!carUnlocked(p, c.id) ? "disabled" : ""}>${c.name}${carUnlocked(p, c.id) ? "" : ` · ${carRequirement(c.id)}`}</option>`,
    ).join("");
    $("workshop-car-select").disabled = this.store.busy || !!this.store.pending;
    $("stunt-record").textContent =
      `${p.quests?.completed.length || 0}/5 STUNT BOXES FOUND · Progress survives map updates`;
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
    if ($("workshop").open) this.preview?.setCar(this.car, equipment);
    $("preview-label").textContent = this.inspection
      ? `${TIERS[this.inspection.tier].name.toUpperCase()} ${vehiclePartName(
          PARTS.find((x) => x.id === this.inspection.part),
          this.car,
        ).toUpperCase()} · PREVIEW ONLY`
      : "YOUR INSTALLED BUILD";
    const inspected = PARTS.find((x) => x.id === this.selectedPart) || PARTS[0];
    this.renderInspector(
      inspected,
      this.inspection?.tier ||
        Math.min(
          this.car === "creator" ? 8 : 5,
          (p.cars[this.car][inspected.id] || 0) + 1,
        ),
    );
    const difficulty = pursuitTuning(cityLevel(p), spec.topSpeed, ACTIVE_MAP);
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
        const tier = p.cars[this.car][part.id] || 0,
          stars = partStars(p.cars[this.car], part.id);
        const owned = TIERS.slice(1, this.car === "creator" ? 9 : 6)
          .map((_, i) => i + 1)
          .filter((t) => (p.inventory[partKey(part.id, t)] || 0) > 0);
        const best = Math.max(0, ...owned),
          previewTier = Math.max(
            best,
            Math.min(this.car === "creator" ? 8 : 5, tier + 1),
          );
        return `<button class="part-tile" data-part="${part.id}" data-inspect="${part.id}" data-tier="${previewTier}" aria-pressed="${part.id === this.selectedPart}" style="--tier:${TIERS[tier || 1].color}"><span class="tile-photo">${partArtwork(part, "", tier || 1)}</span><span class="tile-copy"><b>${vehiclePartName(part, this.car)}</b><small>${TIERS[tier].name}${"+".repeat(stars)} · ${part.effect}</small>${best > tier ? "<em>FREE UPGRADE READY ↑</em>" : ""}</span></button>`;
      })
      .join("");
    for (const button of $("part-grid").querySelectorAll("[data-inspect]"))
      button.onclick = () =>
        this.inspect(button.dataset.inspect, Number(button.dataset.tier));
    refreshRewards(this.store);
    for (const [kind, box] of Object.entries(MILESTONE_BOXES)) {
      const button = $("open-" + kind + "-box");
      button.textContent = `OPEN ${box.name.toUpperCase()} · ${p[box.field] || 0} ↗`;
      button.disabled =
        !p[box.field] ||
        this.store.busy ||
        !!this.store.pending ||
        this.rolling;
    }
    $("open-creator-box").textContent =
      `TECHCRUSH · ${p.creatorBoxes || 0} BOXES ↗`;
    $("open-creator-box").disabled =
      !p.creatorBoxes ||
      this.store.busy ||
      !!this.store.pending ||
      this.rolling;
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
        (p.lastBox.credits
          ? `+${p.lastBox.credits.toLocaleString()} coins · `
          : "") +
        p.lastBox.items
          .map(
            (r) =>
              `${TIERS[r.tier].name} ${PARTS.find((x) => x.id === r.part).name}`,
          )
          .join(" · ")
      : "One welcome box is waiting. Earn another by completing a level.";
    $("open-box").textContent = `OPEN STREET BOX · ${p.boxes} ↗`;
    for (const [kind, box] of Object.entries(BOX_SHOP)) {
      const button = $("buy-" + kind + "-box");
      button.textContent = `BUY 1 · ${box.price.toLocaleString()} CR`;
      button.disabled =
        p.credits < box.price ||
        this.store.busy ||
        !!this.store.pending ||
        this.rolling;
    }
    const contest = eventProgress(p),
      artifactsLive = eventPhase(this.store.serverNow()) === "live";
    for (const map of HUNT_CITIES) {
      const collected = contest?.artifacts?.[map] || [],
        found = collected.length,
        activeHint = (contest?.artifactHints?.[map] || []).find(
          (id) => !collected.includes(id),
        ),
        purchases = contest?.artifactPurchases?.[map] || 0,
        price = artifactPrice(purchases),
        progress = document.querySelector(`[data-artifact-progress="${map}"]`),
        button = document.querySelector(`[data-buy-artifact="${map}"]`);
      progress.textContent = `${found} / ${ARTIFACT_BANNERS.length} FOUND${activeHint != null ? " · YELLOW AREA ACTIVE" : ""}`;
      button.textContent =
        found >= ARTIFACT_BANNERS.length
          ? "ALL 5 COLLECTED ✓"
          : activeHint != null
            ? "SEARCH AREA ACTIVE · OPEN MAP"
            : `REVEAL AREA · ${price.toLocaleString()} CR`;
      button.disabled =
        !contest ||
        !artifactsLive ||
        found >= ARTIFACT_BANNERS.length ||
        activeHint != null ||
        p.credits < price ||
        this.store.busy ||
        !!this.store.pending ||
        this.rolling;
      button.title =
        activeHint != null
          ? "Find the artifact inside the yellow area before revealing another"
          : !artifactsLive
            ? "CITY WARS artifact sales are closed"
            : !contest
              ? "Join CITY WARS first"
              : p.credits < price
                ? `Need ${price.toLocaleString()} CR`
                : "Reveal a yellow search area for the next missing artifact";
    }
    if (this.artReady && $("workshop").open && this.tab === "parts") {
      this.preview?.hydrate($("part-grid"));
      this.preview?.hydrate($("part-inspector"));
    }
    if (focus)
      $("workshop").querySelector(focus)?.focus({ preventScroll: true });
  }
  async openBox(platinum = false, existing = null) {
    if (this.disposed || this.rolling) return;
    this.rolling = true;
    this.render();
    try {
      const profile = existing
        ? this.store.profile
        : await this.run(() =>
            this.store.mutate({
              type:
                typeof platinum === "string" &&
                ["creator", "mystery", "special"].includes(platinum)
                  ? `open-${platinum}-box`
                  : platinum
                    ? "open-platinum-box"
                    : "open-box",
            }),
          );
      if (this.disposed) return;
      if (profile.lastBox.kind === "creator" && carUnlocked(profile, "creator"))
        this.car = "creator";
      this.lootBoxId = profile.lastBox.id;
      try {
        this.preview ||= new GaragePreview($("garage-preview"), this.view);
      } catch {}
      $("loot-title").textContent = existing
        ? "LEVEL CLEAR. YOUR REWARDS."
        : MILESTONE_BOXES[profile.lastBox.kind]
          ? `${MILESTONE_BOXES[profile.lastBox.kind].name.toUpperCase()} BONUS DROP.`
          : "PARTS INCOMING.";
      $("loot-done").textContent = existing
        ? "CONTINUE TO RESULTS ↗"
        : "KEEP REMAINING · BACK TO GARAGE ↗";
      $("loot-grex").hidden = !["special", "platinum"].includes(
        profile.lastBox.kind,
      );
      const results = profile.lastBox.items;
      $("loot-summary").textContent = "Opening your three rewards…";
      $("loot-coins").hidden = !profile.lastBox.credits;
      $("loot-coins").innerHTML = profile.lastBox.credits
        ? `${coinIcon}<b>+${profile.lastBox.credits.toLocaleString()}</b><span>COINS SAVED</span>`
        : "";
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
        slot.innerHTML = `${partArtwork(part, "", reward.tier)}<strong>${vehiclePartName(part, this.car)}</strong><span>${TIERS[reward.tier].name}</span>`;
        slot.classList.toggle("spinning", !done);
        if (done && !this.disposed) this.preview?.hydrate(slot);
      };
      await new Promise((resolve) => {
        const begin = performance.now();
        let timer;
        const finish = () => {
          clearInterval(timer);
          if (!this.disposed)
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
                    tier: MILESTONE_BOXES[platinum]
                      ? MILESTONE_BOXES[platinum].tiers[
                          Math.floor(
                            Math.random() *
                              MILESTONE_BOXES[platinum].tiers.length,
                          )
                        ][0]
                      : platinum === "creator"
                        ? 5 + Math.floor(Math.random() * 4)
                        : platinum
                          ? 5
                          : 1 + Math.floor(Math.random() * 4),
                  },
              done,
            );
          });
          if (age > 2550) finish();
        }, 85);
      });
      if (this.disposed) return;
      $("loot-done").disabled = false;
      $("loot-skip").hidden = true;
      $("loot-summary").textContent =
        "Equip a stronger part now, sell a spare, or keep it for fusion. All rewards are already saved.";
      this.renderLootChoices();
    } catch {
      /* The visible save error and pending action allow an idempotent retry. */
    } finally {
      this.rolling = false;
      this.render();
    }
  }
  renderLootChoices() {
    const box = this.store.profile.lastBox;
    if (!box || box.id !== this.lootBoxId) return;
    const equipment = this.store.profile.cars[this.car];
    [...$("loot-slots").children].forEach((slot, index) => {
      slot.querySelector(".loot-choices")?.remove();
      const reward = box.items[index];
      const stronger =
        carUnlocked(this.store.profile, this.car) &&
        reward.tier > (equipment[reward.part] || 0) &&
        (reward.tier <= 5 || this.car === "creator");
      const owned =
        this.store.profile.inventory[partKey(reward.part, reward.tier)] || 0;
      const disabled = this.store.busy || this.store.pending || !owned;
      const part = PARTS.find((p) => p.id === reward.part);
      slot.insertAdjacentHTML(
        "beforeend",
        `<div class="loot-choices">${reward.claimed ? `<b>${reward.claimed === "equip" ? "EQUIPPED ✓" : "SOLD ✓"}</b>` : `${stronger ? `<small>${upgradeBenefits(carSpec(this.car), equipment, part, reward.tier).join(" · ")}</small><button data-loot-choice="equip" ${disabled ? "disabled" : ""}>EQUIP · STRONGER ↑</button>` : "<small>Keep duplicates for fusion, or sell now.</small>"}<button data-loot-choice="sell" ${disabled ? "disabled" : ""}>SELL · +${salvageValue(reward.tier)} CR</button>`}</div>`,
      );
      for (const button of slot.querySelectorAll("[data-loot-choice]"))
        button.onclick = async () => {
          try {
            const pending = this.run(() =>
              this.store.mutate({
                type: "claim-loot",
                boxId: box.id,
                index,
                choice: button.dataset.lootChoice,
                car: this.car,
              }),
            );
            this.renderLootChoices();
            await pending;
          } catch (error) {
            $("loot-summary").textContent = error.message;
          } finally {
            this.renderLootChoices();
          }
        };
    });
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
