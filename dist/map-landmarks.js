import { IS_KUTAISI, IS_BATUMI, IS_RUSTAVI } from "./map-selection.js";
import { LANDMARKS as L } from "./district-data.js";
const place = (point, symbol, name, description) => ({
  ...point,
  symbol,
  name,
  description,
});
export const MAP_PLACES = IS_RUSTAVI
  ? [
      place(
        L.heroes,
        "H",
        "HEROES SQUARE",
        "Illuminated memorial and the central avenues",
      ),
      place(
        L.hall,
        "C",
        "CITY HALL",
        "Arched city hall and its open civic plaza",
      ),
      place(
        L.monument,
        "D",
        "NEW MONUMENT",
        "The landmark monument beside the starting district",
      ),
      place(L.track, "T", "MOTORPARK", "Rustavi racing circuit"),
      place(L.agency, "A", "DRIVING ACADEMY", "Driving-test practice courses"),
    ]
  : IS_BATUMI
    ? await (async () => {
        const { BATUMI_SITES } = await import("./batumi-district-data.js");
        const symbols = [
          "A",
          "N",
          "W",
          "L",
          "M",
          "P",
          "S",
          "R",
          "T",
          "2",
          "H",
          "F",
          "C",
          "D",
          "G",
          "✝",
          "N",
        ];
        const descriptions = [
          "Georgian alphabet helix tower",
          "Moving Ali & Nino sculptures",
          "Seaside panoramic wheel",
          "Historic lighthouse",
          "Medea monument in Europe Square",
          "Piazza clock tower",
          "Pyramid-topped hotel",
          "Blue-glass hotel",
          "Skyline tower",
          "Twin coastal towers",
          "Waterfront hotel",
          "Dancing fountain basin",
          "Historic clock tower",
          "Classical theatre with an open public square",
          "White paired colonnades on the boulevard",
          "Twin-spired Gothic cathedral",
          "Golden Neptune and sculpted fountain basin",
        ];
        return [
          ...BATUMI_SITES.map((p, i) =>
            place(p, symbols[i], p.name, descriptions[i]),
          ),
          place(L.boulevard, "B", "BOULEVARD", "Palm-lined coastal promenade"),
          place(L.airport, "✈", "AIRPORT", "Runway and airport district"),
        ];
      })()
    : IS_KUTAISI
      ? await (async () => {
          const { KUTAISI_SITES } = await import("./kutaisi-district-data.js");
          return [
            ...KUTAISI_SITES.map((p, i) =>
              place(
                p,
                ["F", "T", "B", "O", "P", "G", "S", "R", "H", "D"][i],
                p.name,
                [
                  "Golden Colchis fountain",
                  "Historic theatre on the main square",
                  "Hilltop cathedral",
                  "Opera and ballet theatre",
                  "Riverside royal residence",
                  "Historic market district",
                  "Kutaisi synagogue",
                  "Old royal neighbourhood",
                  "Historic museum with arched stone facade",
                  "Glass-domed former parliament in the compact western district",
                ][i],
              ),
            ),
            place(
              L.peace,
              "W",
              "WHITE BRIDGE",
              "Rioni crossing and the boy with a hat",
            ),
            place(
              L.park,
              "C",
              "CABLE CAR PARK",
              "Hilltop park, wheel and cable-car station",
            ),
          ];
        })()
      : await (async () => {
          const { HEROES, FREEDOM, KING_DAVID, AXIS } = await import(
            "./tbilisi-civic-layout.js"
          );
          const { BANK_SITE } = await import("./tbilisi-world-sites.js");
          return [
            place(
              FREEDOM,
              "F",
              "FREEDOM SQUARE",
              "Golden Saint George monument and circular square",
            ),
            place(
              HEROES,
              "H",
              "HEROES FLYOVER",
              "Elevated loop with breakable safety rails",
            ),
            place(
              KING_DAVID,
              "K",
              "KING DAVID",
              "Twin glass skyscrapers by the riverside streets",
            ),
            place(
              AXIS,
              "A",
              "AXIS TOWERS",
              "Twisting twin towers with open road frontage",
            ),
            place(
              BANK_SITE,
              "B",
              "BANK OF GEORGIA",
              "Interlocking concrete volumes and a wide scenic loop",
            ),
            place(L.narikala, "N", "NARIKALA", "Hilltop fortress"),
            place(
              L.mother,
              "M",
              "MOTHER OF GEORGIA",
              "Monument overlooking the old city",
            ),
            place(
              L.peace,
              "P",
              "PEACE BRIDGE",
              "Glass pedestrian bridge over the Mtkvari",
            ),
            place(
              L.tubes,
              "T",
              "RIKE CONCERT HALL",
              "Silver tubular concert halls",
            ),
            place(
              L.cable,
              "C",
              "CABLE CAR",
              "Rike-to-fortress cable-car station",
            ),
            place(
              L.baths,
              "S",
              "SULFUR BATHS",
              "Brick domes of the old bath district",
            ),
            place(
              L.metekhi,
              "E",
              "METEKHI",
              "Historic church beside the river",
            ),
          ];
        })();
