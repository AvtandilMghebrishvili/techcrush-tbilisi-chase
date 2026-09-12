import { formatRaceTime } from "./race-timing.js";
const $ = (id) => document.getElementById(id);
export class ResultScreen {
  constructor(store) {
    this.store = store;
    this.generation = 0;
    $("result-rank-retry").onclick = () => this.loadRanks();
    $("result-copy").onclick = async () => {
      if (!this.url) return;
      try {
        await navigator.clipboard.writeText(this.url);
        $("result-share-status").textContent = "Result link copied!";
      } catch {
        $("result-share-status").textContent = "Your result: " + this.url;
      }
    };
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.controller) {
        this.stop();
        $("result-rank-note").textContent =
          "Your result is saved. Retry ranking when you return.";
        $("result-rank-retry").hidden = false;
      }
    });
    addEventListener("pagehide", () => this.stop());
  }
  stop() {
    this.controller?.abort();
    this.controller = null;
    clearTimeout(this.timeout);
  }
  reset() {
    this.stop();
    this.generation++;
    this.record = null;
    this.url = null;
    $("result-rank-total").textContent = $("result-time-total").textContent =
      "";
    $("modal").classList.remove("level-result");
    $("result-ranks").hidden = $("result-sharing").hidden = true;
    $("result-rank-retry").hidden = true;
    $("restart").disabled = $("garage-back").disabled = false;
  }
  show(level, timing, won) {
    $("result-time").textContent = formatRaceTime(timing.elapsedMs);
    $("result-time-label").textContent = won
      ? `LEVEL ${level} · CLEAR TIME`
      : "ACTIVE RUN TIME · UNFINISHED";
    $("result-time-detail").textContent =
      `${timing.rewinds} rewinds · active time includes rewind`;
    if (!won) return;
    $("modal").classList.add("level-result");
    $("result-ranks").hidden = false;
    $("result-rank").textContent = $("result-time-rank").textContent = "…";
    $("result-rank-note").textContent =
      "Saving your finish, then checking the shared leaderboard…";
    $("restart").disabled = $("garage-back").disabled = true;
  }
  saved(record) {
    this.record = record;
    this.url = null;
    $("result-sharing").hidden = true;
    $("result-rank-total").textContent = $("result-time-total").textContent =
      "";
    $("result-rank-retry").hidden = true;
    this.stop();
    $("result-community").textContent = "LEADERBOARD ↗";
    $("restart").disabled = $("garage-back").disabled = false;
    if (
      !record ||
      !this.store.profile.driver.listed ||
      !this.store.profile.driver.name
    ) {
      $("result-rank").textContent = $("result-time-rank").textContent = "—";
      $("result-rank-note").textContent =
        "Private driver · add a public name in Leaderboard → Driver to appear in the rankings and share.";
      return;
    }
    this.url = location.origin + "/result/" + encodeURIComponent(record.runId);
    $("result-sharing").hidden = false;
    $("result-facebook").href =
      "https://www.facebook.com/sharer/sharer.php?u=" +
      encodeURIComponent(this.url);
    $("result-share-status").textContent =
      "Share this level, time and score. You confirm the post on Facebook.";
    void this.loadRanks();
  }
  async loadRanks() {
    if (!this.record || document.hidden) return;
    this.stop();
    const generation = this.generation,
      record = this.record;
    const controller = (this.controller = new AbortController());
    this.timeout = setTimeout(() => controller.abort(), 8000);
    $("result-rank-retry").hidden = true;
    $("result-rank-note").textContent = "Checking your position…";
    try {
      const get = async (query) => {
        const r = await fetch("/api/leaderboard?" + query, {
          headers: { Authorization: "Bearer " + this.store.token },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!r.ok) throw Error("Rank unavailable");
        return r.json();
      };
      const [overall, timed] = await Promise.all([
        get(`mode=progress&map=${record.map || "tbilisi"}`),
        get(
          `mode=times&map=${record.map || "tbilisi"}&course=${record.course}&level=${record.level}&car=all&build=all`,
        ),
      ]);
      if (generation !== this.generation || this.controller !== controller)
        return;
      $("result-rank").textContent = overall.me ? "#" + overall.me.rank : "—";
      $("result-rank-total").textContent =
        `OUT OF ${overall.total.toLocaleString()} PLAYERS`;
      $("result-time-rank").textContent = timed.me ? "#" + timed.me.rank : "—";
      $("result-time-total").textContent =
        `OUT OF ${timed.total.toLocaleString()} PLAYERS`;
      $("result-rank-note").textContent =
        `Overall: ${overall.total} drivers · Level ${record.level}: ${timed.total} timed drivers · all cars/builds. Positions can change.`;
    } catch {
      if (generation !== this.generation || this.controller !== controller)
        return;
      $("result-rank-note").textContent =
        "Your result is saved. Ranking is unavailable right now; you can continue or retry.";
      $("result-rank-retry").hidden = false;
    } finally {
      if (this.controller === controller) this.stop();
    }
  }
}
