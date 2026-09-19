// Stable side quests. These IDs are saved independently of CITY WARS artifacts.
// All yards fit inside the existing city and keep the old rooftop untouched.
export const EXTRA_ROOFTOP_LAYOUTS = {
  tbilisi: [
    [73.1, -451.4, -4.398421, "RUSTAVELI"],
    [1016.6, 996.4, 1.931848, "NORTH DISTRICT"],
  ],
  kutaisi: [
    [-1354.3, -332.6, -1.421237, "SAMEBA"],
    [1112.3, -1800.2, -3.285837, "NINOSHVILI"],
  ],
  batumi: [
    [99.5, -580.6, 0.339486, "BAGRATIONI"],
    [1726.1, -1257.5, 2.256249, "BOULEVARD"],
  ],
  rustavi: [
    [-308.9, -190.4, -3.592471, "GAMSAKHURDIA"],
    [1692.6, 1064.5, -3.9681, "MOTORPARK"],
  ],
};
export function rooftopLocal(roof, side, along) {
  return {
    x: roof.x + Math.cos(roof.angle) * side + Math.sin(roof.angle) * along,
    z: roof.z - Math.sin(roof.angle) * side + Math.cos(roof.angle) * along,
  };
}
export function extraRooftops(city) {
  return EXTRA_ROOFTOP_LAYOUTS[city].map(([x, z, angle, name], i) => {
    const roof = {
      id: `${city}-skybox-${i + 2}-v1`,
      x,
      z,
      angle,
      name: name + " SKYBOX",
      w: 42,
      d: 74,
      h: 14,
      landmark: true,
      roof: true,
    };
    const ramp = {
      ...rooftopLocal(roof, 0, -112),
      id: 6 + i,
      name: roof.name + " · 200+ KM/H",
      angle,
      width: 8,
      length: 28,
      height: 5.4,
      lift: 0.32,
      quest: roof.id,
    };
    const apron = { ...rooftopLocal(roof, 0, -154), w: 20, d: 122, angle };
    return {
      roof,
      ramp,
      box: { ...rooftopLocal(roof, 0, 22), y: roof.h },
      apron,
      zones: [
        roof,
        apron,
        { ...rooftopLocal(roof, 0, -58), w: 50, d: 68, angle },
      ],
    };
  });
}
export function findRoof(roofs, p, margin = 0) {
  return (
    roofs.find((r) => {
      const dx = p.x - r.x,
        dz = p.z - r.z,
        c = Math.cos(r.angle),
        s = Math.sin(r.angle);
      return (
        Math.abs(dx * c - dz * s) < r.w / 2 - margin &&
        Math.abs(dx * s + dz * c) < r.d / 2 - margin
      );
    }) || null
  );
}
