// Coordinates traced from the existing OSM snapshot; forms from the owner's photos.
// Half-scale neighbourhood, matching the rest of Rustavi's street network.
export const HEROES = {
  x: -308.065,
  z: 8.878,
  name: "HEROES SQUARE",
  angle: -Math.atan(0.5),
};
export const HEROES_PARKS = [
  { x: -246.25, z: 36.95, w: 75, d: 11.4, angle: HEROES.angle },
  { x: -265.7, z: -75.1, w: 123, d: 16, angle: -2.025 },
];
export const HEROES_BLOCKS = [
  { x: -252, z: 59, w: 64, d: 8, angle: HEROES.angle },
  { x: -233, z: 23.4, w: 62, d: 8, angle: HEROES.angle },
  { x: -292, z: 56, w: 23, d: 7, angle: 0.32 },
  { x: -259.6, z: -6.5, w: 24, d: 7, angle: -1.25 },
  { x: -314.4, z: 70, w: 27, d: 7, angle: -2.03 },
  { x: -264.3, z: -32, w: 32, d: 8, angle: -2.03 },
  { x: -247.1, z: -67, w: 28, d: 8, angle: -2.03 },
  { x: -234.3, z: 91, w: 25, d: 7, angle: -2.03 },
].map((b, i) => ({
  ...b,
  h: i < 4 ? 19 : 15.5,
  name: "MEGOBROBA RESIDENTIAL WING " + (i + 1),
  style: "heroes-apartment",
  landmark: true,
}));
export function civicPoint(park, x, z) {
  return {
    x: park.x + Math.cos(park.angle) * x + Math.sin(park.angle) * z,
    z: park.z - Math.sin(park.angle) * x + Math.cos(park.angle) * z,
  };
}

export const HEROES_PLAZA = [
  [-286.582, 33.14],
  [-304.437, 39.563],
  [-334.618, 25.208],
  [-330.545, 16.715],
  [-334.56, 3.646],
  [-329.988, -9.262],
  [-316.655, -12.112],
  [-310.627, -15.852],
  [-308.843, -18.535],
  [-281.728, -6.913],
  [-274.086, 6.607],
  [-286.582, 33.14],
];
