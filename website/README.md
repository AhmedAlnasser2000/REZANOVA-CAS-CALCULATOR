# REZANOVA website

The showcase website for REZANOVA, in English and Arabic. It is a static Astro site that lives in the calculator repository but is not part of the app: it has its own dependencies, its own CI job, and no math code.

The design is nostalgic on purpose: a painted seaside ("mathematics is vast, and worth venturing into"), Windows 7 / XP glass, and a page that reads as a voyage — Equation, Graphing, Integration, then Notebook — from morning to golden hour.

## Run

Requires Node.js 22.12 or newer (CI uses Node 24, from the repository's `package.json`).

```sh
cd website
npm ci
npx astro dev        # http://localhost:4173
npx astro check      # types and templates
npx astro build      # static output in dist/
npm test             # checks the built output (run after a build)
npx astro preview
```

`/` redirects to `/en/`. Home, Capabilities and Our story exist at `/en/` and `/ar/`.

## What is on the page

- **Hero.** The coast art, a glass orb that opens the browser app (`https://rezanova-cas.com/`), and a faint sine curve on the horizon that follows the pointer. It redraws only while the pointer moves.
- **Example windows.** Every Equation and Integration example is an Aero window. The problem is "written" first, then the answer appears with its verification. Minimize folds a window, Maximize opens the full answer, its checks and an app screenshot, and Close leaves a Reopen chip.
- **Why it was rebuilt.** A switch between the old way (one island per family of problems) and the new way (one chart for the whole sea).
- **Where it stands.** The workspaces that open today and the ones being rebuilt.
- **Footer.** A Windows 7 taskbar.

Motion is one-time and interaction-driven; there is no continuous animation. With `prefers-reduced-motion` everything appears at once and the wave stays still. Without JavaScript, every window is open and both story pictures are shown.

## Examples come from the real engines

`src/data/examples.json` is generated, never hand-written. From the repository root:

```sh
node node_modules/vite-node/dist/cli.mjs --root . tools/website-examples.ts
```

It runs the Equation and Integration engines on a fixed list, and fails unless every example comes out verified. The JSON records the commit it came from. It is deliberately not a CI step, so engine changes never break the website build; rerun it by hand after the engines change.

Math is rendered at build time with KaTeX. A formula KaTeX cannot render fails the build.

## App screenshots

`public/images/app-*.webp` (and the README's Equation and Integration screenshots in `docs/assets/screenshots/`) are captured from the real app:

```sh
# repository root
npm run build
npm run preview:test &
node website/scripts/capture-app.mjs   # CHROMIUM_PATH=… to choose the browser
```

Only workspaces that open today are shown. Screenshots of workspaces being rebuilt were removed.

## Structure

- `src/data/site.ts`, `editorial.ts`, `home.ts`: English and Arabic copy. Edit both languages together.
- `src/data/capabilities.json`, `history.json`: the Capabilities and Our story pages, with source links.
- `src/data/examples.json`: generated examples (see above).
- `src/components/`: `AeroWindow`, `Examples`, `Math` (KaTeX), `Wave`, `RebuiltStory`, `Header`, `Footer` (the taskbar).
- `src/styles/`: `base.css`, `home.css`, `pages.css`, `aero.css` and `responsive.css`, imported in that order by `index.css`. No file passes 1000 lines.
- `scripts/site.test.mjs`: output checks (language metadata, links and fragments, every example window and dialog, KaTeX output, no retired screenshots or stale download, JS and image budgets).
- `CONTENT-SOURCES.md`, `ASSETS.md`, `THIRD-PARTY-LICENSE.txt`: sources and attribution.

Arabic is right-to-left; mathematics and app screenshots stay left-to-right. Text the app shows in English (verification notes, checks) is marked `lang="en"`.

## Publishing

- The site is published separately from the app. Deploy it as its own static project (for example Cloudflare Pages) with root directory `website`, build command `npm ci && npx astro build`, and output directory `dist`.
- `rezanova-cas.com` keeps serving the app; the app's `wrangler.jsonc` is unrelated to this site.
- No website domain is chosen yet. Until `PUBLIC_WEBSITE_URL` is set in the host, pages carry `noindex` and have no canonical URL or sitemap. `npm run check:launch` fails until it is set.
- The site offers the browser app only. The last Linux packages (v0.3.0) predate the rebuilt engines; add a download link back after the next release.
- `PUBLIC_CALCULATOR_URL` overrides the app address; `PUBLIC_CALCULATOR_READY=false` hides the launch link.

## Content accuracy

The site describes the current source tree, which the browser app runs. It promises no release date. See `CONTENT-SOURCES.md` for sources and editorial decisions.
