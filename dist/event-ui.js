import {
  EVENT_ID,
  EVENT_NAME,
  EVENT_START,
  EVENT_END,
  HUNT_CITIES,
  ARTIFACT_BANNERS,
  eventPhase,
  eventProgress,
  enrolledEvent,
  secretOpen,
} from "./event-rules.js";
import { PRIVATE_DRIVER_NAME, isPrivateDriverName } from "./private-driver.js";
import { ACTIVE_MAP } from "./map-selection.js";
import { EVENT_RULES_COPY } from "./event-copy.js";
const $ = (id) => document.getElementById(id);
const names = {
  tbilisi: "TBILISI",
  kutaisi: "KUTAISI",
  batumi: "BATUMI",
  rustavi: "RUSTAVI",
};
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const number = (n) => Math.floor(n || 0).toLocaleString();
export class EventUI {
  constructor(store, actions) {
    this.store = store;
    this.actions = actions;
    this.map = ACTIVE_MAP;
    this.life = new AbortController();
    this.timer = null;
    this.requestGeneration = 0;
    this.challengeRevealed = false;
    this.selected = false;
    const strip = document.createElement("button");
    strip.id = "event-open";
    strip.className = "event-strip";
    strip.type = "button";
    strip.innerHTML =
      '<span class="event-stripe">LIMITED EVENT</span><b>CITY WARS <span>↗</span></b><span id="event-menu-countdown"></span>';
    document.querySelector("#intro .intro-copy").after(strip);
    const dialog = document.createElement("dialog");
    dialog.id = "event-dialog";
    dialog.setAttribute("aria-labelledby", "event-title");
    dialog.innerHTML = `<div class="event-topline"><span id="event-environment">TECHCRUSH / COMMUNITY CHALLENGE</span><button type="button" id="event-close" aria-label="Close event">✕</button></div>
      <header class="event-hero"><div><small>THREE CITIES. ONE SECRET.</small><h2 id="event-title">CITY <em>WARS.</em></h2><p>Drive. Collect. Outscore everyone.</p></div><div class="event-count"><small id="event-clock-label"></small><b id="event-countdown"></b><span>20 SEP, 15:00 → 24 SEP, 21:00<br>2026 · TBILISI TIME / UTC+4</span></div></header>
      <div class="event-prizes" aria-label="Event prizes">${[
        [
          "tbilisi",
          "01 / TBILISI",
          "Ford Mustang GT · Red",
          "1:42 die-cast car",
        ],
        [
          "kutaisi",
          "02 / KUTAISI",
          "Land Rover Defender 110",
          "1:43 die-cast car",
        ],
        [
          "batumi",
          "03 / BATUMI",
          "Ford Mustang GT · Blue",
          "1:42 die-cast car",
        ],
        [
          "mission",
          "? / EXTRA CHALLENGE",
          "Suzuki GSX-R1000",
          "1:12 die-cast motorcycle",
        ],
      ]
        .map(
          ([id, title, name, scale]) =>
            `<article><small${id === "mission" ? ' id="event-secret-prize-label"' : ""}>${title}</small><img src="./assets/event/prize-${id}.webp" alt="${name} prize in its retail packaging" loading="lazy"><b>${name}</b><span>${scale}</span></article>`,
        )
        .join("")}</div>
      <section class="event-mission"><div><small>THE SECRET MISSION</small><h3 id="event-mission-title">Find 5 artifacts in each city.</h3><p>Smash 5 different cyan TECHCRUSH banners per city. Bank your run to save each find across attempts.</p></div><div id="event-artifacts"></div></section>
      <div class="event-bottom"><section><form id="event-register"><label for="event-handle">YOUR UNIQUE EVENT USERNAME</label><div class="event-inline"><input id="event-handle" name="handle" minlength="3" maxlength="20" required autocomplete="nickname" placeholder="Choose your racer name"><button>JOIN EVENT ↗</button></div><p class="event-join-note">Joining keeps your profile in CITY WARS until 24 SEP, 21:00. Every new chase counts automatically.</p><label class="event-check"><input type="checkbox" id="event-subscribe" required> I subscribe to TECHCRUSH on YouTube.</label><label class="event-check"><input type="checkbox" id="event-rules" required> I accept the rules and public display of my event name and scores.</label><a id="event-channel" hidden target="_blank" rel="noopener">OPEN TECHCRUSH ON YOUTUBE ↗</a></form>
      <div id="event-member" hidden><small>REGISTERED RACER</small><b id="event-member-name"></b><p id="event-member-status" role="status"></p><p id="event-member-help"></p><div class="event-member-actions"><button type="button" id="event-enter"><span class="event-play-icon" aria-hidden="true">▶</span><span class="event-play-copy"><strong id="event-play-label">PLAY</strong><span id="event-play-context"></span></span><span class="event-play-arrow" aria-hidden="true">↗</span></button><button type="button" id="event-secret" hidden>ENTER CHALLENGE ↗</button></div></div>
      <p id="event-entry-status" role="status"></p><p id="event-message" role="status"></p></section>
      <section class="event-board"><div class="event-board-head"><h3>EVENT STANDINGS</h3><div><button type="button" id="event-regular-board">REGULAR RANKS</button><button type="button" id="event-refresh" aria-label="Refresh standings">↻</button></div></div><p id="event-board-callout"></p><nav id="event-board-tabs" aria-label="City ranking"></nav><div id="event-board-stats" class="event-board-stats" aria-label="CITY WARS statistics"><article><small>REGISTERED</small><strong id="event-stat-registered">—</strong><span>event racers</span></article><article><small>PLAYED</small><strong id="event-stat-players">—</strong><span>unique racers</span></article><article><small>TOTAL ROUNDS</small><strong id="event-stat-runs">—</strong><span>banked chases</span></article><article><small>LEVEL CLEARS</small><strong id="event-stat-clears">—</strong><span>all cities</span></article></div><p id="event-board-summary"></p><div id="event-board-table" role="status"></div></section></div>${EVENT_RULES_COPY}`;
    document.body.append(dialog);
    const notice = document.createElement("aside");
    notice.id = "event-notice";
    notice.hidden = true;
    notice.setAttribute("aria-label", "CITY WARS notification");
    notice.innerHTML =
      '<button type="button" id="event-notice-open"><small>TECHCRUSH / LIMITED EVENT</small><b>CITY WARS ↗</b><span id="event-notice-clock"></span><em>View prizes & join the challenge</em></button><button type="button" id="event-notice-close" aria-label="Dismiss event notification">×</button>';
    document.body.append(notice);
    $("event-notice-open").onclick = () => this.open();
    $("event-notice-close").onclick = () => this.hideNotice();
    const hud = document.createElement("button");
    hud.id = "event-hud";
    hud.type = "button";
    hud.hidden = true;
    hud.setAttribute("aria-label", "Open event progress");
    document.querySelector(".pursuit-panel").append(hud);
    strip.onclick = hud.onclick = () => this.open();
    $("event-close").onclick = () => dialog.close();
    dialog.addEventListener("close", () => {
      this.syncTimer();
      this.actions.refresh();
    });
    $("event-register").onsubmit = async (e) => {
      e.preventDefault();
      if (eventPhase(store.serverNow()) !== "live" || store.busy) {
        this.render();
        return;
      }
      try {
        // Finish a pre-enrollment regular chase before locking this profile to the event.
        if (!(await this.actions.leave())) return;
        await store.mutate({
          type: "join-event",
          handle: $("event-handle").value,
          acceptRules: $("event-rules").checked,
          subscribeAcknowledged: $("event-subscribe").checked,
        });
        this.message(
          "You're in! All your chases count toward CITY WARS until the event ends.",
        );
        await this.board();
      } catch (e) {
        this.message(e.message);
      }
    };
    $("event-enter").onclick = () => this.play();
    $("event-secret").onclick = async () => {
      if (await this.actions.leave()) {
        const url = new URL(location.href);
        url.searchParams.set("map", "rustavi");
        if (
          eventProgress(store.profile) &&
          eventPhase(store.serverNow()) === "live"
        )
          url.searchParams.set("event", EVENT_ID);
        else url.searchParams.delete("event");
        location.replace(url);
      }
    };
    $("event-refresh").onclick = () => this.board();
    $("event-regular-board").onclick = () => {
      dialog.close();
      this.actions.regularBoard?.();
    };
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) this.hideNotice();
        else if (this.announcementPending) this.announce();
        this.syncTimer();
      },
      {
        signal: this.life.signal,
      },
    );
    const previous = store.onchange;
    store.onchange = () => {
      previous();
      this.render();
    };
    this.render();
    this.syncTimer();
    // One initial discovery read; further refreshes happen only in the visible panel.
    void this.board();
  }
  message(text) {
    $("event-message").textContent = text;
  }
  async play() {
    if (
      this.starting ||
      !eventProgress(this.store.profile) ||
      eventPhase(this.store.serverNow()) === "upcoming" ||
      this.store.busy
    )
      return;
    this.starting = true;
    try {
      // Close first: gameplay intentionally refuses to start underneath a dialog.
      $("event-dialog").close();
      await this.actions.play();
    } finally {
      this.starting = false;
    }
  }
  noticeKey() {
    return `techcrush-event-notice:${EVENT_ID}:${this.store.publicId || "local"}`;
  }
  markSeen() {
    try {
      localStorage.setItem(this.noticeKey(), "1");
    } catch {}
    if (
      !this.store.profile?.eventNotices?.[EVENT_ID] &&
      !this.store.busy &&
      !this.store.pending
    )
      void this.store
        .mutate({ type: "event-notice-seen", event: EVENT_ID })
        .catch(() => {});
  }
  announce() {
    if (document.hidden) {
      this.announcementPending = true;
      return;
    }
    this.announcementPending = false;
    if (
      eventPhase(this.store.serverNow()) === "ended" ||
      document.querySelector("dialog[open]")
    )
      return;
    let seen = !!this.store.profile?.eventNotices?.[EVENT_ID];
    try {
      seen ||= localStorage.getItem(this.noticeKey()) === "1";
    } catch {}
    if (!seen) {
      this.open();
      return;
    }
    $("event-notice").hidden = false;
    this.tick();
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => this.hideNotice(), 10000);
  }
  hideNotice() {
    clearTimeout(this.noticeTimer);
    this.noticeTimer = null;
    $("event-notice").hidden = true;
  }
  syncMode() {
    this.selected = !!enrolledEvent(this.store.profile, this.store.serverNow());
    const url = new URL(location.href);
    if (this.selected) url.searchParams.set("event", EVENT_ID);
    else url.searchParams.delete("event");
    if (url.href !== location.href) history.replaceState(null, "", url);
  }
  runEvent() {
    return enrolledEvent(this.store.profile, this.store.serverNow());
  }
  update(sim) {
    this.sim = sim;
    if (performance.now() - (this.sampledAt || 0) > 900) {
      this.sampledAt = performance.now();
      this.tick();
      this.syncTimer();
    }
  }
  checkDeadline() {
    const ticket = this.store.profile?.activeRun;
    if (
      ticket?.event === EVENT_ID &&
      this.store.serverNow() >= EVENT_END &&
      this.endedRun !== ticket.id
    ) {
      this.endedRun = ticket.id;
      this.selected = false;
      void this.actions.deadline();
    }
  }
  open() {
    this.hideNotice();
    this.markSeen();
    this.actions.pause();
    $("event-dialog").showModal();
    this.render();
    this.board();
    this.syncTimer();
    this.actions.refresh();
  }
  render() {
    this.syncMode();
    this.actions.primary?.();
    const p = this.store.profile,
      progress = eventProgress(p),
      phase = eventPhase(this.store.serverNow()),
      open = secretOpen(p, this.store.serverNow());
    $("event-register").hidden = !!progress || phase === "ended";
    $("event-member").hidden = !progress;
    $("event-member-name").textContent = progress?.handle
      ? isPrivateDriverName(progress.handle)
        ? PRIVATE_DRIVER_NAME
        : progress.handle
      : "";
    $("event-enter").disabled =
      !progress || phase === "upcoming" || this.store.busy;
    $("event-play-label").textContent = "PLAY";
    $("event-play-context").textContent =
      phase === "upcoming"
        ? "AVAILABLE WHEN THE EVENT STARTS"
        : `${names[ACTIVE_MAP]} · ${this.sim?.phase === "paused" ? "RESUME CHASE" : phase === "ended" ? "START CHASE" : "CITY WARS"}`;
    $("event-member-status").textContent =
      phase === "ended"
        ? "EVENT FINISHED · RESULTS SAVED"
        : "CITY WARS · REGISTERED";
    $("event-member-help").textContent =
      phase === "ended"
        ? "Regular play is available again. Your event results stay in the archive."
        : "Every new chase is an event run. Regular play returns on 24 September at 21:00.";
    $("event-entry-status").hidden = phase !== "upcoming";
    $("event-entry-status").textContent =
      phase === "upcoming"
        ? "Joining opens on 20 September at 15:00 (Tbilisi time). This button will activate automatically."
        : "";
    $("event-board-callout").textContent = progress
      ? "Your CITY WARS points from every banked chase are added to these standings."
      : phase === "live"
        ? "Join CITY WARS, start a chase and bank your score to enter the event ranking."
        : phase === "upcoming"
          ? "The event leaderboard activates when CITY WARS starts."
          : "Final CITY WARS standings are archived here.";
    $("event-secret").hidden = !open || ACTIVE_MAP === "rustavi";
    $("event-secret").textContent = this.challengeRevealed
      ? "ENTER RUSTAVI ↗"
      : "ENTER CHALLENGE ↗";
    $("event-secret-prize-label").textContent = this.challengeRevealed
      ? "04 / RUSTAVI"
      : "? / EXTRA CHALLENGE";
    $("event-mission-title").textContent = open
      ? this.challengeRevealed
        ? "RUSTAVI UNLOCKED."
        : "Extra challenge unlocked."
      : this.challengeRevealed
        ? "RUSTAVI · FIND YOUR 15 ARTIFACTS"
        : "Find 5 artifacts in each city.";
    $("event-environment").textContent = this.store.preview
      ? "PRIVATE OWNER TEST · TBILISI TIME"
      : "TECHCRUSH / COMMUNITY CHALLENGE";
    $("event-artifacts").innerHTML = HUNT_CITIES.map((map) => {
      const ids = progress?.artifacts?.[map] || [];
      return `<div><b>${names[map]}</b><span>${ARTIFACT_BANNERS.map((id) => `<i class="${ids.includes(id) ? "found" : ""}">${ids.includes(id) ? "✓" : "◇"}</i>`).join("")}</span><small>${ids.length} / 5</small></div>`;
    }).join("");
    const maps = [...HUNT_CITIES, "rustavi"];
    if (!maps.includes(this.map)) this.map = "tbilisi";
    $("event-board-tabs").innerHTML = maps
      .map(
        (map) =>
          `<button type="button" data-event-map="${map}" aria-pressed="${map === this.map}">${map === "rustavi" && !this.challengeRevealed ? "CHALLENGE" : names[map]}</button>`,
      )
      .join("");
    for (const b of $("event-board-tabs").children)
      b.onclick = () => {
        this.map = b.dataset.eventMap;
        this.render();
        this.board();
      };
    const join = $("event-register").querySelector("button");
    join.disabled = phase !== "live" || this.store.busy;
    join.textContent =
      phase === "upcoming"
        ? "EVENT NOT STARTED YET"
        : phase === "ended"
          ? "EVENT FINISHED"
          : this.store.busy
            ? "PLEASE WAIT…"
            : "JOIN EVENT ↗";
    join.setAttribute("aria-describedby", "event-entry-status");
    if (
      progress?.lastReceipt?.unlocked &&
      this.receipt !== progress.lastReceipt.runId
    ) {
      this.receipt = progress.lastReceipt.runId;
      this.message(
        "EXTRA CHALLENGE UNLOCKED! Enter the additional mission and climb its own prize ranking.",
      );
    }
    this.tick();
  }
  tick() {
    if (document.hidden) return;
    this.checkDeadline();
    const now = this.store.serverNow(),
      phase = eventPhase(now),
      diff = Math.max(
        0,
        (phase === "upcoming" ? EVENT_START : EVENT_END) - now,
      );
    const sec = Math.ceil(diff / 1000),
      hours = Math.floor(sec / 3600),
      mins = Math.floor((sec % 3600) / 60),
      seconds = sec % 60;
    const value =
      phase === "ended"
        ? "FINISHED"
        : `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    const label =
      phase === "upcoming"
        ? "STARTS IN"
        : phase === "live"
          ? "ENDS IN"
          : "RANKINGS ARCHIVED";
    $("event-menu-countdown").textContent =
      `${this.selected ? "JOINED · " : ""}${label} ${value}`;
    $("event-notice-clock").textContent = `${label} ${value}`;
    for (const id of ["event-open", "event-dialog", "event-notice"])
      $(id).dataset.phase = phase;
    if ($("event-dialog").open) {
      $("event-clock-label").textContent = label;
      $("event-countdown").textContent = value;
      if (
        this.boardAt &&
        performance.now() - this.boardAt > 30000 &&
        !this.boardPending
      )
        void this.board();
    }
    const ticket = this.store.profile?.activeRun,
      active = ticket?.event === EVENT_ID && this.sim?.phase !== "ready";
    $("event-hud").hidden = !active;
    if (active) {
      const saved =
        eventProgress(this.store.profile)?.artifacts?.[ACTIVE_MAP] || [];
      const count = new Set([...saved, ...(this.sim?.runArtifacts || [])]).size;
      $("event-hud").textContent =
        `CITY WARS · ${value}${HUNT_CITIES.includes(ACTIVE_MAP) ? " · ◇ " + count + "/5" : ""}`;
    }
    if (phase !== this.lastPhase) {
      this.lastPhase = phase;
      if (phase === "ended") {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.actions.cities?.();
      this.render();
    }
  }
  syncTimer() {
    clearInterval(this.timer);
    this.timer = null;
    if (
      !document.hidden &&
      ($("event-dialog").open || !$("intro").hidden || this.selected)
    ) {
      this.tick();
      if (eventPhase(this.store.serverNow()) !== "ended")
        this.timer = setInterval(() => this.tick(), 1000);
    }
  }
  async board() {
    const generation = ++this.requestGeneration;
    this.boardAt = performance.now();
    this.boardPending = true;
    $("event-board-table").textContent = "Loading standings…";
    try {
      const data = await this.store.request(
        "/api/event/leaderboard?map=" +
          (this.map === "rustavi" ? "challenge" : this.map),
      );
      if (generation !== this.requestGeneration || this.life.signal.aborted)
        return;
      if (data.challengeRevealed && !this.challengeRevealed) {
        this.challengeRevealed = true;
        this.store.challengeRevealed = true;
        this.actions.cities?.();
        this.render();
      }
      $("event-stat-registered").textContent = number(
        data.stats?.registered ?? data.participants,
      );
      $("event-stat-players").textContent = number(data.stats?.uniquePlayers);
      $("event-stat-runs").textContent = number(data.stats?.totalRuns);
      $("event-stat-clears").textContent = number(data.stats?.levelsCleared);
      $("event-board-summary").textContent =
        `${names[data.map] || "CHALLENGE"} · ${number(data.total)} RACERS · ${number(data.stats?.cityRuns)} ROUNDS · ${number(data.stats?.cityLevelsCleared)} LEVEL CLEARS${data.mine ? (data.mine.private ? " · YOUR SCORE IS PRIVATE" : " · YOU #" + data.mine.rank + " / " + data.total) : ""}`;
      const privateScore = data.mine?.private
        ? `<div class="event-private-score"><b>PRIVATE · ${escape(data.mine.name)}</b><span>${number(data.mine.score)} POINTS · LEVEL ${data.mine.level} · ${number(data.mine.runs)} ROUNDS</span><small>Only you can see this result. It is excluded from official standings and totals.</small></div>`
        : "";
      $("event-board-table").innerHTML =
        privateScore +
        (data.entries.length
          ? `<table><thead><tr><th>#</th><th>RACER</th><th>POINTS</th><th>LEVEL</th><th>ROUNDS</th></tr></thead><tbody>${data.entries.map((r) => `<tr class="${r.you ? "you " : ""}${r.rank <= 3 ? "podium podium-" + r.rank : ""}"><td class="event-rank">${r.rank <= 3 ? '<span class="event-rank-medal">' + r.rank + "</span>" : r.rank}</td><td class="event-racer"><b>${escape(r.name)}</b>${r.you ? "<small>YOU</small>" : ""}</td><td class="event-score">${number(r.score)}</td><td class="event-level"><strong>${r.level}</strong><small>REACHED</small></td><td class="event-runs">${number(r.runs)}</td></tr>`).join("")}</tbody></table>`
          : "No banked runs yet. Take the first spot.");
    } catch (e) {
      if (generation === this.requestGeneration)
        $("event-board-table").textContent = e.message;
    } finally {
      if (generation === this.requestGeneration) this.boardPending = false;
    }
  }
  dispose() {
    this.life.abort();
    clearInterval(this.timer);
    this.timer = null;
    this.hideNotice();
    this.requestGeneration++;
  }
}
