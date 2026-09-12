import { formatRaceTime } from "./race-timing.js";
import { carSpec } from "./config.js";
import { PARTS } from "./progression.js";
import {
  ACHIEVEMENTS,
  AVATARS,
  levelRewards,
  driverTitle,
} from "./community-rules.js";
const $ = (id) => document.getElementById(id),
  esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const num = (n) => Math.floor(n || 0).toLocaleString(),
  avatar = (c) => (AVATARS.includes(c) ? c : "red");
export class CommunityUI {
  constructor(store, actions) {
    this.store = store;
    this.actions = actions;
    this.mode = "progress";
    this.page = 0;
    this.tab = "board";
    this.color = "red";
    this.guest = false;
    const dialog = $("community-dialog");
    $("leaderboard-open").onclick = () => this.open("board");
    $("leaderboard-menu").onclick = () => this.open("board");
    $("time-filters").onsubmit = (e) => {
      e.preventDefault();
      this.page = 0;
      this.load();
    };
    for (const id of ["time-car", "time-build", "time-course"])
      $(id).onchange = () => {
        this.page = 0;
        this.load();
      };
    $("driver-open").onclick = () => this.open("profile");
    $("community-close").onclick = () => dialog.close();
    dialog.addEventListener("close", () => {
      this.stop();
      this.race = null;
    });
    dialog.addEventListener("cancel", (e) => {
      if (this.store.busy) e.preventDefault();
    });
    document
      .querySelectorAll("[data-community-tab]")
      .forEach((b) => (b.onclick = () => this.showTab(b.dataset.communityTab)));
    document.querySelectorAll("[data-board-mode]").forEach(
      (b) =>
        (b.onclick = () => {
          this.mode = b.dataset.boardMode;
          this.page = 0;
          this.load();
        }),
    );
    $("board-refresh").onclick = () => this.load();
    $("board-prev").onclick = () => {
      this.page--;
      this.load();
    };
    $("board-next").onclick = () => {
      this.page++;
      this.load();
    };
    $("board-join").onclick = () => this.showTab("profile");
    $("board-share").onclick = async () => {
      try {
        await navigator.clipboard.writeText(location.origin + "/");
        $("board-status").textContent =
          "Game link copied. Share it with your friends!";
      } catch {
        $("board-status").textContent =
          "Share this game link: " + location.origin + "/";
      }
    };
    $("driver-colors").innerHTML = AVATARS.map(
      (c) =>
        `<button type="button" class="avatar-${c}" data-driver-color="${c}" aria-label="${c} driver color" aria-pressed="false"></button>`,
    ).join("");
    $("driver-colors").onclick = (e) => {
      const b = e.target.closest("[data-driver-color]");
      if (b) {
        this.color = b.dataset.driverColor;
        this.paintAvatar();
      }
    };
    $("driver-name").addEventListener("input", () => this.paintAvatar());
    $("driver-form").onsubmit = (e) => {
      e.preventDefault();
      void this.save();
    };
    $("driver-guest").onclick = () => {
      const resume = this.race;
      this.guest = true;
      dialog.close();
      resume?.();
    };
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.stop();
      else if (dialog.open && this.tab === "board") this.load();
    });
    addEventListener("pagehide", () => this.stop());
    const previous = store.onchange;
    store.onchange = () => {
      previous();
      this.changed();
    };
    this.changed();
  }
  ensureDriver(resume) {
    if (this.store.profile.driver.name || this.guest) return true;
    this.open("profile", resume);
    return false;
  }
  open(tab = "board", race = null) {
    this.actions.pause();
    this.race = race;
    if (!$("community-dialog").open) $("community-dialog").showModal();
    this.showTab(tab);
  }
  showTab(tab) {
    this.tab = tab;
    this.stop();
    $("community-board").hidden = tab !== "board";
    $("community-profile").hidden = tab !== "profile";
    document
      .querySelectorAll("[data-community-tab]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.communityTab === tab)),
      );
    if (tab === "board") this.load();
    else {
      const d = this.store.profile.driver;
      this.color = d.avatar || "red";
      $("driver-name").value = d.name || "";
      $("driver-public").checked = d.name ? d.listed : true;
      $("driver-guest").hidden = !this.race;
      $("driver-status").textContent = "";
      this.paintAvatar();
      this.changed();
      if (this.race) $("driver-name").focus({ preventScroll: true });
    }
  }
  stop() {
    clearTimeout(this.timer);
    this.controller?.abort();
    this.controller = null;
    this.generation = (this.generation || 0) + 1;
  }
  paintAvatar() {
    const name = $("driver-name").value.trim();
    $("driver-avatar-preview").textContent =
      Array.from(name)[0]?.toUpperCase() || "?";
    $("driver-avatar-preview").className =
      "driver-avatar avatar-" + avatar(this.color);
    document
      .querySelectorAll("[data-driver-color]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.driverColor === this.color),
        ),
      );
  }
  async save() {
    const resume = this.race;
    $("driver-status").textContent = "Saving your driver…";
    try {
      if (this.store.pending) await this.store.retry();
      await this.store.mutate({
        type: "driver",
        name: $("driver-name").value,
        avatar: this.color,
        listed: $("driver-public").checked,
      });
      $("driver-status").textContent = this.store.profile.driver.listed
        ? "Driver saved. Bank a chase to join the leaderboard."
        : "Driver saved. Your results are private.";
      if (resume) {
        $("community-dialog").close();
        resume();
      }
    } catch (e) {
      $("driver-status").textContent = e.message;
    }
  }
  changed() {
    const p = this.store.profile;
    if (!p) return;
    const c = p.community,
      d = p.driver,
      rates = levelRewards(p.level);
    $("driver-name-label").textContent = d.name || "CHOOSE YOUR DRIVER NAME";
    $("menu-multiplier").textContent =
      `LVL ${p.level}\n${rates.score.toFixed(2)}× SCORE · ${rates.cash.toFixed(2)}× CR`;
    $("community-close").disabled = this.store.busy;
    if (!$("community-dialog").open || this.tab !== "profile") return;
    $("driver-save").disabled = this.store.busy;
    $("community-close").disabled = this.store.busy;
    $("driver-guest").disabled = this.store.busy;
    $("driver-save").textContent = this.store.busy
      ? "SAVING…"
      : this.race
        ? "SAVE & RACE ↗"
        : "SAVE DRIVER ↗";
    $("driver-heading").textContent = d.name
      ? `${d.name} · ${driverTitle(c)}`
      : "Make a name in Tbilisi.";
    $("driver-career").innerHTML = [
      ["LEVEL", p.level],
      ["BEST SCORE", num(c.bestScore)],
      ["CLEARS", c.wins],
      [
        "YOUR TAG",
        this.store.publicId
          ? "#" + this.store.publicId.slice(0, 6).toUpperCase()
          : "After saving",
      ],
    ]
      .map(
        ([k, v]) => `<div><small>${k}</small><strong>${esc(v)}</strong></div>`,
      )
      .join("");
    const daily = c.lastDaily === new Date().toISOString().slice(0, 10);
    $("driver-challenges").innerHTML =
      `<article><span>DAILY GETAWAY</span><strong>${daily ? "BONUS COLLECTED" : "FIRST CLEAR · +500 CR"}</strong><p>Escape once today. Resets at midnight UTC.</p></article><article><span>ESCAPE STREAK</span><strong>${c.streak % 3} / 3 · +1 EXTRA BOX</strong><p>Clear three levels in a row. Best streak: ${c.bestStreak}.</p></article><article><span>LEVEL ${p.level} REWARDS</span><strong>${rates.score.toFixed(2)}× SCORE · ${rates.cash.toFixed(2)}× CR</strong><p>Each level adds +15% score and +10% credits to the base rate.</p></article>`;
    $("achievement-count").textContent =
      `${c.badges.length} / ${ACHIEVEMENTS.length} UNLOCKED`;
    $("driver-achievements").innerHTML = ACHIEVEMENTS.map((a, i) => {
      const done = c.badges.includes(a.id),
        value = Math.min(a.target, c[a.metric]);
      return `<article class="achievement ${done ? "unlocked" : ""}"><span class="achievement-mark">${done ? "★" : String(i + 1).padStart(2, "0")}</span><div><h4>${a.name}</h4><p>${a.detail}</p><progress value="${value}" max="${a.target}" aria-label="${a.name} progress"></progress><small>${done ? "UNLOCKED" : `${Math.floor(value)} / ${a.target}`} · +${a.reward} CR</small></div></article>`;
    }).join("");
  }
  async load() {
    this.stop();
    if (!$("community-dialog").open || this.tab !== "board" || document.hidden)
      return;
    const generation = this.generation;
    const timed = this.mode === "times";
    $("time-filters").hidden = !timed;
    $("time-rules").hidden = !timed;
    if (timed && !$("time-level").checkValidity()) {
      $("time-level").reportValidity();
      return;
    }
    if (
      this.data &&
      (this.data.mode !== this.mode ||
        (timed &&
          (this.data.course !== $("time-course").value ||
            this.data.level !== Number($("time-level").value) ||
            this.data.car !== $("time-car").value ||
            this.data.build !== $("time-build").value)))
    ) {
      $("board-rows").replaceChildren();
      $("board-self").replaceChildren();
      $("board-empty").hidden = true;
    }
    this.controller = new AbortController();
    $("board-status").textContent = "Loading shared standings…";
    $("board-refresh").disabled = true;
    document
      .querySelectorAll("[data-board-mode]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.boardMode === this.mode),
        ),
      );
    try {
      const response = await fetch(
        `/api/leaderboard?${new URLSearchParams({ mode: this.mode, page: this.page, ...(timed ? { course: $("time-course").value, level: $("time-level").value, car: $("time-car").value, build: $("time-build").value } : {}) })}`,
        {
          headers: { Authorization: "Bearer " + this.store.token },
          cache: "no-store",
          signal: AbortSignal.any([
            this.controller.signal,
            AbortSignal.timeout(15000),
          ]),
        },
      );
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Could not load standings.");
      if (generation !== this.generation) return;
      this.page = data.page;
      this.data = data;
      this.renderBoard(data);
      $("board-status").textContent =
        "Updated just now · refreshes while this window is open.";
    } catch (e) {
      if (e.name !== "AbortError" && generation === this.generation)
        $("board-status").textContent = e.message;
    } finally {
      if (generation === this.generation) {
        $("board-refresh").disabled = false;
        this.timer = setTimeout(() => this.load(), 30000);
      }
    }
  }
  renderBoard(data) {
    $("board-last-heading").textContent =
      this.mode === "times" ? "REWINDS" : "CLEARS";
    if (this.mode === "times") return this.renderTimes(data);
    const weekly = this.mode === "weekly";
    $("board-rule").textContent = weekly
      ? `Banked points this week. Resets ${new Date(data.resetsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} at 00:00 UTC.`
      : this.mode === "score"
        ? "Your single best banked chase. Level breaks score ties."
        : "Highest level → checkpoints → best run score.";
    $("board-score-heading").textContent = weekly
      ? "WEEK POINTS"
      : "BEST SCORE";
    $("board-count").textContent =
      `${num(data.total)} DRIVERS${weekly ? " THIS WEEK" : ""}`;
    $("board-rows").innerHTML = data.entries
      .map(
        (row) =>
          `<tr class="${row.id === this.store.publicId ? "is-me" : ""} ${row.rank <= 3 ? "podium podium-" + row.rank : ""}"><td class="board-position">${row.rank <= 3 ? '<span class="rank-medal">' + row.rank + "</span>" : num(row.rank)}</td><td><div class="board-driver"><span class="driver-avatar avatar-${avatar(row.avatar)}">${esc(Array.from(row.name)[0]?.toUpperCase() || "?")}</span><div><b>${esc(row.name)}${row.id === this.store.publicId ? " <em>YOU</em>" : ""}</b><small>#${esc(row.id.slice(0, 6).toUpperCase())} · ${row.title}</small>${row.badges.length ? `<span class="board-badges" title="${row.badges.map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.name).join(", ")}">★ ${row.badges.length} BADGES</span>` : ""}</div></div></td><td class="board-level"><strong>${row.level}</strong><small>${row.checkpoints}/6 CP</small></td><td class="board-points">${num(weekly ? row.weekScore : row.bestScore)}</td><td class="board-wins">${weekly ? row.weekWins : row.wins}</td></tr>`,
      )
      .join("");
    $("board-empty").hidden = data.total > 0;
    $("board-prev").disabled = data.page === 0;
    $("board-next").disabled = (data.page + 1) * 25 >= data.total;
    $("board-page").textContent = data.total
      ? `${data.page + 1} / ${Math.ceil(data.total / 25)}`
      : "NO RESULTS YET";
    const me = data.me;
    $("board-self").innerHTML = me
      ? `<span>YOUR POSITION</span><strong>#${num(me.rank)}</strong><div><b>${esc(me.name)}</b><small>LEVEL ${me.level} · ${num(weekly ? me.weekScore : me.bestScore)} ${weekly ? "WEEK POINTS" : "BEST SCORE"}</small></div>`
      : `<span>${this.store.profile.driver.listed ? "READY TO PLACE" : "YOUR DRIVER"}</span><div><b>${esc(this.store.profile.driver.name || "Choose a name to join")}</b><small>${this.store.profile.driver.listed ? "Bank a chase to appear here." : this.store.profile.driver.name ? "Public visibility is off. Change it in My Driver." : "Open My Driver. No account needed."}</small></div>`;
  }
  renderTimes(data) {
    $("board-rule").textContent =
      `${data.courseLabel} · Level ${data.level} · fastest completed escapes. Equal times share a rank.`;
    $("board-score-heading").textContent = "CLEAR TIME";
    $("board-count").textContent =
      `${num(data.total)} DRIVERS · LEVEL ${data.level}`;
    const build = (r) =>
      `${carSpec(r.car).name} · ${r.buildPoints ? "TUNED " + r.buildPoints + "/" + PARTS.length * 4 : "STOCK"}`;
    $("board-rows").innerHTML = data.entries
      .map(
        (row) =>
          `<tr class="${row.id === this.store.publicId ? "is-me" : ""} ${row.rank <= 3 ? "podium-" + row.rank : ""}"><td class="board-position">${row.rank <= 3 ? '<span class="rank-medal">' + row.rank + "</span>" : num(row.rank)}</td><td><div class="board-driver"><span class="driver-avatar avatar-${avatar(row.avatar)}">${esc(Array.from(row.name)[0]?.toUpperCase() || "?")}</span><div><b>${esc(row.name)}${row.id === this.store.publicId ? " <em>YOU</em>" : ""}</b><small>${esc(build(row))}</small><small>${row.rewinds} REWINDS · ${new Date(row.recordedAt).toLocaleDateString()}</small></div></div></td><td class="board-level"><strong>${row.level}</strong><small>6/6 + ESCAPE</small></td><td class="board-points time-value">${formatRaceTime(row.durationMs)}</td><td class="board-wins">${row.rewinds}</td></tr>`,
      )
      .join("");
    $("board-empty").hidden = data.total > 0;
    $("board-prev").disabled = data.page === 0;
    $("board-next").disabled = (data.page + 1) * 25 >= data.total;
    $("board-page").textContent = data.total
      ? `${data.page + 1} / ${Math.ceil(data.total / 25)}`
      : "NO CLEAR TIMES YET";
    $("board-self").innerHTML = data.me
      ? `<span>YOUR TIME</span><strong>#${num(data.me.rank)}</strong><div><b>${formatRaceTime(data.me.durationMs)} · LEVEL ${data.me.level}</b><small>${esc(build(data.me))}</small></div>`
      : `<span>LEVEL ${data.level}</span><div><b>No matching time yet</b><small>Clear this level with a public driver profile to record a time.</small></div>`;
  }
}
