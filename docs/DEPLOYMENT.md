# Deployment and public access

This game is a static website. Upload the **contents of `dist/`** to a static HTTPS host. `index.html` must be at the published root, beside its JavaScript modules, `assets/` and `vendor/`. There is no build command, application server, database or secret required for gameplay.

## What access means

| Access                   | What people can do                                      | Where it is controlled                        |
| ------------------------ | ------------------------------------------------------- | --------------------------------------------- |
| Public game URL          | Open and play in a supported browser                    | The hosting provider's site audience/settings |
| Public GitHub repository | Read, clone, download and fork the source               | GitHub repository visibility                  |
| Repository collaborator  | Push or manage project changes, according to their role | GitHub repository collaborator settings       |

This repository is public. Public visitors do not automatically receive write access. The existing Sites game's access is separate and remains owner-private at the initial GitHub release. Publishing source here does not change that setting.

## Existing Sites deployment

The creator's existing address is [TECHCRUSH Tbilisi Chase on Sites](https://nightshift-chase-september.avtandilmghebrishvili.chatgpt.site/). Its configuration is in `.openai/hosting.json`. The owner account's project currently offers a **Public** access mode in addition to custom access. To let everyone play at that address, the owner must select Public in the site's access controls, then verify the link in a signed-out browser.

Source updates on GitHub do not automatically redeploy this Site. Forks should use their own hosting project rather than the creator's project ID. The ID is deployment metadata, not a credential or permission grant.

## GitHub Pages

GitHub Pages supports static sites and is available for public repositories on GitHub Free. See [GitHub's Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages).

The included [Pages workflow](../.github/workflows/pages.yml) is **manual only**. It does not run when source is pushed. To activate it as the repository owner:

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Open **Actions → Deploy game to GitHub Pages → Run workflow**, choose `main`, and run it.
4. Wait for the build and deployment jobs to succeed. Open the URL shown by the deployment job or Settings → Pages.
5. Verify the garage, car model, roads, credits and a short drive in a signed-out browser.

If enabled for this repository with no custom domain, its expected address is `https://avtandilmghebrishvili.github.io/techcrush-tbilisi-chase/`. **This is an expected address, not a claim that Pages is already live.** A fork's URL uses its own owner and repository names.

The workflow tests the checkout, uploads `dist/` with `actions/upload-pages-artifact`, and publishes using `actions/deploy-pages`. Deploy permission is scoped to the deployment job with `pages: write` and `id-token: write`, using the `github-pages` environment. Actions are pinned to reviewed commit SHAs. See the official [custom Pages workflows guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

The game uses relative module, asset and credits paths, which support a repository subpath. Upload the complete directory. A blank model or module 404 usually means assets were omitted or files were published one directory too deep.

To update an enabled Pages site, push the new source and manually run the workflow again. To publish automatically in your own setup, add a `push` trigger for `main` to `pages.yml`. That is a deliberate change to publishing behavior. Re-running tests alone does not publish.

## Cloudflare Pages

Cloudflare Pages is another static hosting option, with Git integration or direct upload. Hosting plans and limits are governed by the provider.

For Git integration, connect this repository in Cloudflare Pages and use:

| Setting                | Value                     |
| ---------------------- | ------------------------- |
| Production branch      | `main`                    |
| Framework preset       | None                      |
| Root directory         | Repository root           |
| Build command          | Leave blank               |
| Build output directory | `dist`                    |
| Environment variables  | None required by the game |

Deploy, then share the `pages.dev` address shown by Cloudflare. Git-integrated Pages projects can deploy automatically on subsequent pushes. See [Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/) and [build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/).

For [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/), upload the contents of `dist/` or the web ZIP from a release, with `index.html` at its root. A Direct Upload project and a Git-integrated project have different workflows; choose the mode appropriate for future updates.

## Other static hosts and archives

Any static host able to serve JavaScript modules, GLB, PNG/JPEG and HDR files can host the game. Serve JavaScript as a JavaScript MIME type and preserve folder names/case. No single-page-app catch-all rewrite is needed: the game uses one HTML entry point and a separate `credits.html`.

The included `server.mjs` is a loopback development server, not a public production server. A local `127.0.0.1` URL works only on the computer running it. Sending someone a source ZIP also requires them to start a static server; a hosted URL is simpler for players.

Keep [Credits](../dist/credits.html), the downloadable derived map data and attribution with hosted copies. See [ASSETS.md](../ASSETS.md) for asset terms. Custom domains can be configured at the chosen provider after the default hosted URL works.

## Publishing checklist

- Verify `npm test` passes for the commit to publish.
- Publish `dist/` intact, not the repository root or a folder containing another `dist/` layer.
- Check the link while signed out to confirm the intended audience.
- Start a run, steer both ways, trigger turbo, change the camera and open Credits.
- After an update, refresh without cache if a browser still shows older modules.

[Back to README](../README.md)
