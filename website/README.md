# REZANOVA website

A standalone Astro website for REZANOVA CAS Calculator. English and Arabic; static seaside artwork, lightweight Aero-inspired styling, and one-time entrance motion. The calculator remains in its existing React + Vite repository.

## Run

Requires Node.js 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev
npm run check
npm run build
npm test
npm run preview
```

Astro generates a static site in `dist/`. `/` redirects to `/en/`. Home, capabilities and history pages exist at `/en/` and `/ar/`. Fonts, images, and icons are served locally; no analytics, third-party scripts, video, WebGL, live blur, or continuous animation is used. UI JavaScript handles accessible tabs, the launch dialog, and one-time visibility-triggered fades/translations. Content remains visible when JavaScript is disabled; only Graphing is selected without JavaScript, and the screenshot can be opened directly.

## Calculator and website addresses

The calculator stays at `https://rezanova-cas.com/`, confirmed by the owner. The launch dialog now links to that address. The marketing website will use a separate domain chosen later.

The confirmed calculator link works by default. Copy `.env.example` to `.env` to override it or configure the website origin. Set `PUBLIC_WEBSITE_URL` when the marketing website's address is selected; until then, previews have no canonical origin or sitemap and are marked noindex. `PUBLIC_CALCULATOR_READY=false` can disable the launch link if needed.

`npm run check:launch` validates publication configuration, including distinct HTTPS origins. It intentionally fails until the marketing website address is set. Preview builds work without it.

## Structure

- `src/data/site.ts` and `src/data/editorial.ts`: English/Arabic UI copy and external links.
- `src/data/capabilities.json`: ten sourced capability sections with summaries, bullets and limits in both languages.
- `src/data/history.json`: two documented versions and eight chronological milestone chapters; each has a summary paragraph, bullet list and sources.
- `CONTENT-SOURCES.md`: research scope, source fingerprints and resolved version/history inconsistencies.
- `src/styles/global.css`: visual tokens, glass treatments and responsive layouts.
- `src/components/Showcase.astro`: keyboard-accessible screenshot tabs.
- `src/pages/[lang]/`: bilingual static routes.
- `source-assets/`: full-size scenery and original/transparent logo sources.
- `public/images/`: optimized production assets and authentic calculator screenshots.
- `scripts/prepare-assets.mjs`: regenerate optimized scenery/logo and vendored Tabler icons.
- `design-qa.md`: visual and interaction verification notes.

Edit both locales together. Arabic is RTL; mathematical screenshots stay LTR. The launch target and download links are separate. Documentation currently links to the existing GitHub README, which is in English. Website localization does not imply app localization.

## Device scope

Desktop/laptop and tablet are the first-release targets. At 950px the header becomes two rows and capabilities stack. A portrait-specific background preserves the birds and ship. Below 650px a basic single-column fallback avoids overflow; this is not a claim of supported mobile calculator UX. Validate browser zoom, tablet landscape/portrait and real touch hardware before public launch.

## Deployment

Use a **separate GitHub repository**, for example `rezanova-website`. This project is initialized locally; no GitHub repository, DNS changes, remote push, or deployment is performed automatically.

For a static host such as Cloudflare Pages: build `npm ci && npm run check && npm run check:launch && npm run build`, output `dist`. Configure the public environment variables in the host. Root redirect is emitted as an HTML redirect; use a host redirect if desired. Assign the new marketing website domain to this project. Keep `rezanova-cas.com` serving the existing calculator. `_headers` adds basic response headers on compatible hosts.

## Content accuracy

The website describes an evolving preview and known desktop/touch/storage limitations. It does not promise a release date, universal CAS coverage or browser/desktop parity. Screenshots originate from the supplied calculator repository and may be newer than packaged releases. Development-pause wording follows the owner's instructions and should be revised when work resumes.

See `ASSETS.md` and `THIRD-PARTY-LICENSE.txt` for attribution. This website's final license should be confirmed by the owner; the displayed MIT reference describes the calculator project.
