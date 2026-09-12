export const drivingFeel = { steeringSensitivity: 1, driftStrength: 1 };
try {
  const s = JSON.parse(localStorage.getItem("techcrush-driving-feel") || "{}");
  for (const [key, min, max] of [
    ["steeringSensitivity", 0.7, 1.3],
    ["driftStrength", 0.65, 1.4],
  ])
    if (Number.isFinite(s[key]))
      drivingFeel[key] = Math.max(min, Math.min(max, s[key]));
} catch {}
export function setupDrivingFeel() {
  const host = document.querySelector("#controls-dialog");
  const section = document.createElement("section");
  section.className = "driving-feel";
  section.innerHTML = `<h3>DRIVING FEEL</h3><p>Classic arcade handling. Tune your turn and drift response.</p><label>Steering response <output id="steering-feel-value"></output><input id="steering-feel" type="range" min="70" max="130" step="5"></label><label>Drift strength <output id="drift-feel-value"></output><input id="drift-feel" type="range" min="65" max="140" step="5"></label><button type="button" id="feel-reset">RESET TO CLASSIC</button><p>AUTO LIGHTING: a full night → dawn → day → night cycle every 3 minutes. Use the sun button to choose a fixed time.</p><label>Music volume <input id="music-volume" type="range" min="0" max="100" value="28"></label><button type="button" id="music-reset">RESET MUSIC &amp; SOUND</button>`;
  host.append(section);
  const render = () => {
    for (const [key, id] of [
      ["steeringSensitivity", "steering-feel"],
      ["driftStrength", "drift-feel"],
    ]) {
      document.getElementById(id).value = Math.round(drivingFeel[key] * 100);
      document.getElementById(id + "-value").textContent =
        Math.round(drivingFeel[key] * 100) + "%";
    }
  };
  const save = () => {
    try {
      localStorage.setItem(
        "techcrush-driving-feel",
        JSON.stringify(drivingFeel),
      );
    } catch {}
    render();
  };
  for (const [key, id] of [
    ["steeringSensitivity", "steering-feel"],
    ["driftStrength", "drift-feel"],
  ])
    document.getElementById(id).oninput = (e) => {
      drivingFeel[key] = Number(e.target.value) / 100;
      save();
    };
  document.getElementById("feel-reset").onclick = () => {
    drivingFeel.steeringSensitivity = drivingFeel.driftStrength = 1;
    save();
  };
  render();
}
