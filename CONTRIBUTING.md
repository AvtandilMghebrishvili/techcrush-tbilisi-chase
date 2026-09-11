# Contributing

Thanks for helping improve TECHCRUSH — Tbilisi Chase. The source repository is public; anyone can fork it and propose a pull request. Direct write access is granted separately by the owner.

## Report a problem

Open an [issue](https://github.com/AvtandilMghebrishvili/techcrush-tbilisi-chase/issues) with the game version or commit, browser, operating system, car/camera used, steps to reproduce, expected behavior and actual behavior. Include a short recording or screenshot if it clarifies the issue. For driving or rewind problems, note speed, HP, checkpoint and whether police or ramps were involved.

For a feature request, explain the player problem and the expected behavior. Distinguish geographic references from a request for measured reconstruction; the current map is a playable approximation.

## Make a change

1. Fork and clone the repository, then create a branch for the change.
2. Run `npm ci` and read the [development guide](docs/DEVELOPMENT.md).
3. Keep related changes together. Edit runtime source directly in `dist/`; do not delete it as generated build output.
4. Run `npm test`, plus [relevant driving/browser checks](docs/TESTING.md). Add meaningful regression coverage for a mechanics fix.
5. Update English documentation and asset credits when behavior, setup, map provenance or assets change.
6. Open a pull request explaining the problem, resulting behavior and validation performed. Include visual evidence for scenery changes when possible.

Use the existing ES-module and Prettier style. Avoid formatting unrelated files. Commit generated road/model outputs alongside changed inputs so the repository remains immediately playable. Keep caches, `node_modules/` and personal reference photographs out of commits.

Project-authored code contributions are made under [LICENSE](LICENSE). New assets must have documented provenance and compatible distribution terms; the code's MIT license does not apply automatically to third-party assets or TECHCRUSH branding. Preserve existing credits.

[Back to README](README.md)
