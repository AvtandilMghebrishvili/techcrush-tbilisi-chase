export const BONUS_LIMIT = 3;
export const BONUS_LIFETIME = 2.6;
const labels = {
  patrol: ["PATROL TAKEDOWN", "#ff91a7"],
  near: ["NEAR MISS", "#8df0eb"],
  drift: ["DRIFT", "#d4b2ff"],
  jump: ["JUMP LANDED", "#f7d980"],
  checkpoint: ["CHECKPOINT", "#a5edbd"],
  escape: ["CLEAN ESCAPE", "#a5edbd"],
  traffic: ["TRAFFIC WRECK", "#f7d980"],
};

// At most three live notifications; no independent timers or RAF callbacks.
export class BonusFeed {
  constructor() {
    this.items = [];
    this.lastTime = 0;
    this.serial = 0;
  }
  clear() {
    this.items.length = 0;
  }
  update(time, events = [], rewind = false) {
    if (rewind || time < this.lastTime) this.clear();
    this.lastTime = time;
    this.items = this.items.filter((item) => time - item.born < BONUS_LIFETIME);
    if (!rewind)
      for (const event of events) {
        if (!labels[event.kind] || !(event.points > 0 || event.credits > 0))
          continue;
        this.items.unshift({ ...event, id: ++this.serial, born: time });
        this.items.length = Math.min(this.items.length, BONUS_LIMIT);
      }
    return this.items;
  }
}

export class ScoreFeedback {
  constructor(host, score) {
    this.host = host;
    this.score = score;
    this.feed = new BonusFeed();
    this.rows = new Map();
  }
  update(sim) {
    if (this.timeline !== sim.timeline || sim.phase === "ready") {
      this.feed.clear();
      this.timeline = sim.timeline;
    }
    const items = this.feed.update(
      sim.time,
      sim.scoreEvents.splice(0),
      sim.phase === "rewinding",
    );
    for (const [id, row] of this.rows)
      if (!items.some((item) => item.id === id)) {
        row.remove();
        this.rows.delete(id);
      }
    // Oldest first because prepend places the newest event at the top.
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (this.rows.has(item.id)) continue;
      const [label, color] = labels[item.kind],
        row = document.createElement("div");
      row.className = "score-bonus";
      row.style.setProperty("--bonus-color", color);
      row.style.setProperty("--bonus-life", BONUS_LIFETIME + "s");
      const name = document.createElement("span"),
        amount = document.createElement("b"),
        cash = document.createElement("small");
      name.textContent = label;
      amount.textContent =
        item.points > 0
          ? "+" + item.points.toLocaleString() + " PTS"
          : "+" + item.credits.toLocaleString() + " CR";
      cash.textContent =
        item.points > 0 && item.credits > 0
          ? "+" + item.credits.toLocaleString() + " CR"
          : "";
      row.append(name, amount, cash);
      this.host.prepend(row);
      this.rows.set(item.id, row);
    }
    this.score.classList.toggle("bonus-active", items.length > 0);
  }
}
