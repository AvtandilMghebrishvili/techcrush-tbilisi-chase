// Change this ID when the timed route/physics rules change; old records stay saved.
import { ACTIVE_MAP, MAP_COURSES, CITY_NAME } from "./map-selection.js";
export const TIME_COURSE = MAP_COURSES[ACTIVE_MAP];
export const TIME_COURSE_LABEL =
  CITY_NAME + " · COURSE " + TIME_COURSE.split("-")[1];
export function formatRaceTime(ms) {
  if (!Number.isFinite(ms)) return "—";
  const centiseconds = Math.max(0, Math.floor(ms / 10));
  return `${Math.floor(centiseconds / 6000)}:${String(Math.floor(centiseconds / 100) % 60).padStart(2, "0")}.${String(centiseconds % 100).padStart(2, "0")}`;
}
// Wall time while controls are active, independent of FPS and simulation rewind.
// No timer/RAF is owned here: the existing render/activity lifecycle samples it.
export class RaceClock {
  reset(now = performance.now()) {
    this.elapsedMs = 0;
    this.rewinds = 0;
    this.rewindHeld = false;
    this.last = now;
    this.active = false;
  }
  constructor() {
    this.reset();
  }
  sample(now = performance.now()) {
    if (this.active) this.elapsedMs += Math.max(0, now - this.last);
    this.last = now;
    return this.elapsedMs;
  }
  setActive(active, now = performance.now()) {
    this.sample(now);
    this.active = active;
    if (!active) this.rewindHeld = false;
  }
  rewind(held) {
    if (held && !this.rewindHeld) this.rewinds++;
    this.rewindHeld = held;
  }
  result() {
    return {
      course: TIME_COURSE,
      elapsedMs: Math.ceil(this.elapsedMs / 10) * 10,
      rewinds: this.rewinds,
    };
  }
}

export const TIME_COURSES = [
  "tbilisi-1.13",
  "tbilisi-1.14",
  "kutaisi-1.0",
  "tbilisi-1.16",
  "kutaisi-1.1",
  "tbilisi-1.17",
  "kutaisi-1.2",
  MAP_COURSES.batumi,
  MAP_COURSES.tbilisi,
  MAP_COURSES.kutaisi,
];
