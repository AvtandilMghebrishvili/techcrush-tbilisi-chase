// Small inline icons and native interactions: no icon font or animation loop.
const icons = {
  settings:
    '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  camera: '<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  sound:
    '<path d="M4 9h4l5-4v14l-5-4H4zM17 8q5 4 0 8"/><path class="mute-slash" d="M3 3l18 18"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
};
export function actionLabel(button, label) {
  const node = button.querySelector(".action-label");
  if (node && node.textContent !== label) node.textContent = label;
}
export function setupInterface() {
  for (const [id, icon, label, key] of [
    ["control-settings", "settings", "SETUP", ""],
    ["camera-toggle", "camera", "CHASE", "C"],
    ["lighting-toggle", "sun", "AUTO · DUSK", ""],
    ["sound", "sound", "MUTED", "M"],
    ["pause", "pause", "PAUSE", "P"],
  ]) {
    const button = document.getElementById(id);
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[icon]}</svg><span class="action-label"></span>${key ? `<kbd aria-hidden="true">${key}</kbd>` : ""}`;
    actionLabel(button, label);
  }
  document.getElementById("sound").setAttribute("aria-pressed", "false");
  for (const button of document.querySelectorAll("[data-section]"))
    button.addEventListener("click", () =>
      document.getElementById(button.dataset.section).scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      }),
    );
  // Native dialogs already trap focus. The pause/result overlay needs the same
  // keyboard boundary so Tab cannot activate controls behind it.
  document.getElementById("modal").addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const buttons = [
      ...event.currentTarget.querySelectorAll("button:not(:disabled)"),
    ].filter((b) => !b.hidden);
    const first = buttons[0],
      last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
}
