# Kutaisi and Batumi visibility update

- Kutaisi: 120 facade banners; Batumi: 114. The target combines existing building count and street-network length. At least 80% of requested slots are allocated to main-road facades before filling wider coverage. No new texture per banner.
- GRA repair gifts prefer the starting district and prominent landmark districts on main streets with clear approaches. Existing level gates remain 1 / 2 / 3.
- Kutaisi adds a historical museum and a compact interpretation of the former parliament along the existing western avenue network. Its location is intentionally compressed, not a geographic survey.
- Batumi adds the drama theatre, paired boulevard colonnades, Mother of God cathedral and Neptune fountain. Existing landmarks retain positions. Both cities receive paved forecourts, street sightlines and clearance from ordinary facades and tall trees.
- Shared cable-car geometry now follows a continuous two-lane circuit with station turns. Four Kutaisi cabins carry alternating small GRA / TECHCRUSH posters. Supports and open platforms match collision geometry. No independent animation loop or timer.
- Released CITY WARS artifact coordinates and IDs for all four maps are pinned to their released fixtures. No map/course IDs, bounds, streets, prizes, event access rules or save schema changed.

## Visual references

Original procedural game interpretations, without embedding third-party photography:
- [Kutaisi regional tourism: architecture and monuments](https://kutaisi.travel/en/category/where-to-go/what-to-see/historic-monument/)
- [Kutaisi regional tourism: museums](https://kutaisi.travel/en/category/where-to-go/what-to-see/museum/)
- [Lado Meskhishvili theatre](https://kutaisi.travel/en/5456/lado-meskhishvili-state-drama-theatre-ka/)
- [Parliament building image and structure](https://structurae.net/en/structures/georgian-parliament-building)
- [Official boulevard: historical colonnades](https://boulevard.ge/en/home/batumis-kolonadebi)
- [Georgia Travel: Old Batumi](https://georgia.travel/old-batumi)
- [Georgia Travel: Batumi landmarks](https://georgia.travel/cities-towns/batumi)

## Validation

287 automated tests passed, including all-city released artifact preservation, dry open street lanes, building/forecourt clearance, artifact approaches, main-road banner density, tiered gear access, and cabin continuity / separation. Real renderer preview covers both city scenes and shared branded cable cars. Static scenery is merged with the existing per-city batch; textures/materials share the existing disposal lifecycle.
