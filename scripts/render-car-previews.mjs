// Optional authoring tool. Set PLAYWRIGHT_MODULE to an installed Playwright entrypoint.
// Captures original game models, never an AI approximation. No game/runtime changes.
import http from "node:http";
import path from "node:path";
import { readFile, mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const root = path.resolve("dist"),
  out = path.join(root, "assets/car-previews");
await mkdir(out, { recursive: true });
const html = `<!doctype html><style>body{margin:0;background:transparent}#studio{width:512px;height:288px}</style><div id="studio"></div><script type="importmap">{"imports":{"three":"/vendor/three.module.js","three/addons/":"/vendor/addons/"}}</script><script type="module">
import * as T from '/vendor/three.module.js';import {GaragePreview} from '/garage-preview.js';import {loadSportsAssets} from '/sports-car.js';import {AssetScope} from '/resource-lifetime.js';
const source={assetLoad:new AssetScope(),renderer:new T.WebGLRenderer(),scene:new T.Scene(),budget:{low:true},box(w,h,d,mat,x,y,z,parent){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;}};
await loadSportsAssets(source);const studio=new GaragePreview(document.querySelector('#studio'),source);studio.renderer.setPixelRatio(1);studio.renderer.setSize(512,288);studio.camera.aspect=512/288;studio.yaw=.68;studio.pitch=.25;studio.zoom=8.3;studio.active=true;
window.capture=(id)=>{studio.setCar(id,{});studio.tick();return studio.renderer.domElement.toDataURL('image/webp',.9);};
</script>`;
const types = {
  ".js": "text/javascript",
  ".hdr": "application/octet-stream",
  ".glb": "model/gltf-binary",
  ".png": "image/png",
};
const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/__previews") {
      res.setHeader("content-type", "text/html");
      res.end(html);
      return;
    }
    const f = path.resolve(
      root,
      "." + new URL(req.url, "http://local").pathname,
    );
    if (!f.startsWith(root + path.sep)) throw Error("path");
    res.setHeader(
      "content-type",
      types[path.extname(f)] || "application/octet-stream",
    );
    res.end(await readFile(f));
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "chrome",
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 512, height: 288 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (e) => console.error(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/__previews`);
  await page.waitForFunction(() => !!window.capture, { timeout: 90000 });
  for (const id of process.env.CAR_PREVIEW_ID
    ? [process.env.CAR_PREVIEW_ID]
    : [
        "classic",
        "gt",
        "rally",
        "suv",
        "falcon",
        "rioni",
        "coast",
        "creator",
        "batmobile",
      ]) {
    const data = await page.evaluate((id) => capture(id), id);
    const bytes = Buffer.from(data.split(",")[1], "base64");
    await writeFile(path.join(out, id + ".webp"), bytes);
    console.log(id, bytes.length);
  }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
