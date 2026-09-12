import { GLYPHS } from "./share-glyphs.mjs";
import { formatRaceTime } from "../dist/race-timing.js";
import { carSpec } from "../dist/config.js";
const glyphCache = new Map();
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function chunk(type, data) {
  const out = new Uint8Array(data.length + 12),
    v = new DataView(out.buffer);
  v.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  let crc = 0xffffffff;
  for (let i = 4; i < out.length - 4; i++)
    crc = crcTable[(crc ^ out[i]) & 255] ^ (crc >>> 8);
  v.setUint32(out.length - 4, (crc ^ 0xffffffff) >>> 0);
  return out;
}
// Lightweight, deterministic PNG renderer. No browser, native canvas or WASM.
// Only called for a public saved result; never accepts client-supplied scores.
export async function resultImage(r, map) {
  const w = 1200,
    h = 630,
    stride = w * 3 + 1,
    pixels = new Uint8Array(stride * h);
  const color = (hex) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const pixel = (x, y, c, alpha = 1) => {
    x |= 0;
    y |= 0;
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const i = y * stride + 1 + x * 3;
    for (let k = 0; k < 3; k++)
      pixels[i + k] = pixels[i + k] * (1 - alpha) + c[k] * alpha;
  };
  const rect = (x, y, rw, rh, c) => {
    for (let yy = Math.max(0, y | 0); yy < Math.min(h, y + rh); yy++)
      for (let xx = Math.max(0, x | 0); xx < Math.min(w, x + rw); xx++)
        pixel(xx, yy, c);
  };
  const circle = (x, y, rad, c) => {
    for (let yy = -rad; yy <= rad; yy++) {
      const half = Math.sqrt(rad * rad - yy * yy) | 0;
      rect(x - half, y + yy, half * 2 + 1, 1, c);
    }
  };
  const poly = (pts, c) => {
    for (
      let y = Math.max(0, Math.floor(Math.min(...pts.map((p) => p[1]))));
      y < Math.min(h, Math.ceil(Math.max(...pts.map((p) => p[1]))));
      y++
    ) {
      const crosses = [];
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[i],
          b = pts[j];
        if (a[1] > y !== b[1] > y)
          crosses.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
      crosses.sort((a, b) => a - b);
      for (let i = 0; i < crosses.length; i += 2)
        rect(crosses[i], y, crosses[i + 1] - crosses[i], 1, c);
    }
  };
  const text = (value, x, y, size, c, max = 1100) => {
    const chars = [...String(value)];
    let scale = size / 34;
    const width = chars.reduce((n, ch) => n + (GLYPHS[ch]?.[0] || 20), 0);
    scale = Math.min(scale, max / width);
    for (const ch of chars) {
      const g = GLYPHS[ch] || GLYPHS["?"];
      let alpha = glyphCache.get(ch);
      if (!alpha) {
        alpha = Uint8Array.from(atob(g[1]), (c) => c.charCodeAt(0));
        glyphCache.set(ch, alpha);
      }
      for (let yy = 0; yy < Math.ceil(48 * scale); yy++)
        for (let xx = 0; xx < Math.ceil(g[0] * scale); xx++) {
          const i =
              Math.min(47, Math.floor(yy / scale)) * g[0] +
              Math.min(g[0] - 1, Math.floor(xx / scale)),
            a = ((alpha[i >> 1] >> (i % 2 ? 0 : 4)) & 15) / 15;
          if (a) pixel(x + xx, y + yy, c, a);
        }
      x += g[0] * scale;
    }
  };
  const white = color("#edf5ff"),
    muted = color("#abc1d6"),
    red = color("#ef315b"),
    gold = color("#ffd480");
  for (let y = 0; y < h; y++)
    rect(0, y, w, 1, [12 + y * 0.013, 21 + y * 0.018, 37 + y * 0.027]);
  rect(0, 0, 12, h, red);
  rect(56, 50, 257, 47, red);
  text("TECHCRUSH", 72, 49, 29, white);
  text("CHASE / CITY MASTERY", 336, 54, 24, muted);
  // City skyline and getaway silhouette are part of the card, not only numbers.
  for (let i = 0; i < 14; i++) {
    const x = 700 + i * 37,
      bh = 55 + ((i * 53) % 126);
    rect(x, 340 - bh, 27, bh, color("#213b51"));
    for (let y = 346 - bh; y < 328; y += 16) rect(x + 7, y, 4, 4, gold);
  }
  if (map === "batumi") {
    circle(1035, 156, 22, color("#3c657a"));
    rect(1030, 175, 10, 165, color("#718b9e"));
    circle(1143, 243, 51, color("#718b9e"));
    circle(1143, 243, 46, color("#183346"));
    rect(1140, 243, 6, 97, color("#718b9e"));
  } else if (map === "tbilisi")
    poly(
      [
        [980, 341],
        [1000, 109],
        [1020, 341],
      ],
      color("#718b9e"),
    );
  else {
    rect(984, 225, 90, 112, color("#718b9e"));
    poly(
      [
        [984, 225],
        [1029, 183],
        [1074, 225],
      ],
      color("#59b6ad"),
    );
    rect(1025, 159, 7, 37, gold);
    rect(1016, 171, 25, 6, gold);
  }
  poly(
    [
      [650, 383],
      [1180, 345],
      [1180, 532],
      [650, 532],
    ],
    color("#344255"),
  );
  rect(700, 483, 440, 4, muted);
  const paint = color(carSpec(r.car).color);
  poly(
    [
      [704, 438],
      [730, 405],
      [801, 392],
      [841, 348],
      [962, 348],
      [1020, 393],
      [1123, 417],
      [1141, 458],
      [700, 458],
    ],
    paint,
  );
  poly(
    [
      [817, 391],
      [852, 359],
      [952, 359],
      [994, 391],
    ],
    color("#142433"),
  );
  for (const x of [778, 1050]) {
    circle(x, 452, 33, color("#0b111a"));
    circle(x, 452, 19, color("#aebfce"));
    circle(x, 452, 7, color("#21344c"));
  }
  rect(1104, 422, 27, 6, white);
  rect(708, 429, 18, 6, red);
  text(
    map.toUpperCase() + " / LEVEL " + r.level + " CLEAR",
    56,
    121,
    25,
    red,
    620,
  );
  text(r.display_name, 56, 170, 42, white, 620);
  text(formatRaceTime(r.duration_ms), 50, 226, 99, gold, 625);
  text(r.score.toLocaleString("en-US") + " POINTS", 57, 358, 33, white, 600);
  text(carSpec(r.car).name, 57, 411, 26, muted, 600);
  text(
    r.rewinds + " rewinds  /  " + r.build_points + " build points",
    57,
    451,
    21,
    muted,
    600,
  );
  rect(55, 540, 1090, 2, color("#435971"));
  text(
    "SIX CHECKPOINTS. ONE ESCAPE. CAN YOU BEAT MY TIME?",
    57,
    560,
    24,
    white,
    1090,
  );
  const compressed = new Uint8Array(
    await new Response(
      new Blob([pixels]).stream().pipeThrough(new CompressionStream("deflate")),
    ).arrayBuffer(),
  );
  const header = new Uint8Array(13),
    v = new DataView(header.buffer);
  v.setUint32(0, w);
  v.setUint32(4, h);
  header.set([8, 2, 0, 0, 0], 8);
  return new Blob(
    [
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", header),
      chunk("IDAT", compressed),
      chunk("IEND", new Uint8Array()),
    ],
    { type: "image/png" },
  );
}
