import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { newProfile, applyProgressAction } from "../dist/progression.js";
import { EVENT_ID, EVENT_START } from "../dist/event-rules.js";

test("a passed checkpoint is saved immediately without ending the active chase", () => {
  let p = applyProgressAction(
    newProfile(),
    { type: "begin-run", map: "tbilisi", car: "classic" },
    undefined,
    { now: EVENT_START, runId: "checkpoint-save-run", preview: true },
  );
  p = applyProgressAction(
    p,
    {
      type: "checkpoint-progress",
      runId: "checkpoint-save-run",
      checkpoint: 3,
    },
    undefined,
    { now: EVENT_START + 1000 },
  );
  assert.equal(p.activeRun.savedCheckpoint, 3);
  assert.equal(p.community.checkpoints, 3);
  assert.equal(p.activeRun.id, "checkpoint-save-run");
  assert.throws(
    () =>
      applyProgressAction(
        p,
        {
          type: "checkpoint-progress",
          runId: "checkpoint-save-run",
          checkpoint: 2,
        },
        undefined,
        { now: EVENT_START + 2000 },
      ),
    /could not be verified/,
  );
});

for (const city of ["tbilisi", "kutaisi", "batumi"])
  test(
    city + " event levels rotate a checkpoint beside all five artifacts",
    () => {
      const output = execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `globalThis.location={href:'http://local/?map=${city}'};
const assert=(await import('node:assert/strict')).default;
const {checkpointsForLevel}=await import('./dist/level-routes.js');
const {RELEASED_EVENT_SITES}=await import('./dist/released-event-sites.js');
for(let level=1;level<=5;level++){
 const artifact=RELEASED_EVENT_SITES['${city}'][level-1];
 const gates=checkpointsForLevel(level,true);
 const nearest=Math.min(...gates.map(p=>Math.hypot(p.x-artifact.x,p.z-artifact.z)));
 assert(nearest<50,'level '+level+' nearest gate '+nearest);
}
console.log('artifact gates ok');`,
        ],
        { cwd: process.cwd(), encoding: "utf8" },
      );
      assert.match(output, /artifact gates ok/);
    },
  );

test("focus loss clears input without opening the pause modal", async () => {
  const source = await readFile("dist/main.js", "utf8");
  const blur = source.slice(
    source.indexOf('addEventListener("blur"'),
    source.indexOf('addEventListener("resize"'),
  );
  assert.match(blur, /keys\.clear\(\)/);
  assert.doesNotMatch(blur, /pause\(\)/);
  assert.match(source, /openPrimaryLeaderboard/);
  assert.match(source, /PLAY CITY WARS/);
  assert.match(source, /JOIN CITY WARS/);
  assert.match(source, /onclick = primaryPlay/);
  assert.match(await readFile("dist/event-ui.js", "utf8"), /REGULAR RANKS/);
});
