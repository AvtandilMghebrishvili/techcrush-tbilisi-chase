// Physical key codes keep WASD working when the active keyboard layout is Georgian.
const codes = {
  KeyW: "w",
  KeyA: "a",
  KeyS: "s",
  KeyD: "d",
  KeyC: "c",
  KeyP: "p",
  KeyR: "r",
  KeyM: "m",
  KeyQ: "q",
  Space: " ",
  ShiftLeft: "Shift",
  ShiftRight: "Shift",
};
export function normalizeKey(event) {
  return (
    codes[event.code] ||
    (event.key.length === 1 ? event.key.toLowerCase() : event.key)
  );
}
export function drivingInput(keys) {
  return {
    throttle:
      Number(keys.has("w") || keys.has("ArrowUp")) -
      Number(keys.has("s") || keys.has("ArrowDown")),
    steer:
      Number(keys.has("d") || keys.has("ArrowRight")) -
      Number(keys.has("a") || keys.has("ArrowLeft")),
    brake: keys.has(" "),
    boost: keys.has("Shift"),
    rewind: keys.has("q"),
  };
}
