// Native media playback owns the loop; no extra RAF or oscillator graph in menus.
export class BackgroundMusic {
  constructor() {
    this.audio = new Audio("./assets/techcrush-drive.wav");
    this.audio.loop = true;
    this.audio.preload = "none";
    this.audio.volume = 0.28;
    this.allowed = false;
    this.enabled = true;
    this.active = false;
  }
  unlock() {
    this.allowed = true;
    this.sync();
  }
  sync(active = this.active, enabled = this.enabled) {
    this.active = active;
    this.enabled = enabled;
    if (this.allowed && active && enabled) {
      if (this.audio.paused) void this.audio.play().catch(() => {});
    } else this.audio.pause();
  }
  reset() {
    this.audio.currentTime = 0;
    this.enabled = true;
    this.sync();
  }
  dispose() {
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
  }
}
