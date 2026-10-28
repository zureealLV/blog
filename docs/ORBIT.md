# ORBIT cloud app

- Public frontend: `/orbit/`
- Same-origin Pages Functions API: `/api/orbit/*`
- Source and exact Git revision: `orbit.config.json`
- Build: normal `pnpm build`; `scripts/build-orbit.mjs` builds the pinned source with pnpm 9.14.4 and copies only the frontend output to `dist/orbit/`.
- The ignored `.orbit-source/` checkout is also the import source for the API bundle. It is not a submodule and is not uploaded as static content. The build refuses to overwrite tracked local edits in it.
- Updating ORBIT requires reviewing a new ORBIT commit and deliberately updating the full SHA in `orbit.config.json`; it never deploys a moving `main` branch.
- `_routes.json` invokes Functions only for `/api/orbit/*`. Other blog pages remain static.
- The existing Pages deployment workflow bundles `functions/` through Wrangler. No tunnel, local computer, new paid plan, R2 bucket, or new API key is required by this integration; existing account Functions limits still apply.
- Archive streaming, source validation, rate-limit boundaries, local-only file handling and mirror availability are documented in the pinned ORBIT source's `docs/CLOUDFLARE.md`.
- Private desktop beatmaps and `.osk` files are not copied. Import them locally in the browser or use the built-in skin.
- `/orbit/version.json` records the deployed source revision. Validate the live document, generated JS/CSS/Worker, cloud API, actual download/playback and blog navigation after deployment. A successful CI build is not playback acceptance.

Local integration preview after building: `pnpm dlx wrangler@4.154.0 pages dev dist`. This compiles the same Functions entry used in production. Astro preview alone does not provide Pages Functions.
