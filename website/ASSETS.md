# Asset provenance

- Desktop and tablet coast backgrounds: generated from the owner's approved website mockups for this project. Original PNGs in `source-assets/`; delivery WebP files in `public/images/`. Static only.
- REZANOVA R logo: `docs/assets/branding/logo.png` from AhmedAlnasser2000/REZANOVA-CAS-CALCULATOR. Original preserved as `source-assets/logo-original.png`. Transparent derivative produced through image editing and optimized for the header/favicon.
- App screenshots: `app-*.webp` are captured from the real app by `scripts/capture-app.mjs` (Equation, Integration and Graphing, October 2026). `notebook.webp` is from `docs/assets/screenshots/notebook-home-toolbar.png`. All are 1800px-wide WebP; no generated UI is substituted. Screenshots of workspaces being rebuilt were removed. Source repository MIT license retained in THIRD-PARTY-LICENSE.txt.
- Examples: `src/data/examples.json` is produced by `tools/website-examples.ts` in the repository root, which runs the real engines. Math is rendered at build time with KaTeX (MIT).
- Icons: Tabler Icons outline set, MIT. Source: https://github.com/tabler/tabler-icons. Copies served from public/icons; third-party license copied alongside them.
- Fonts: Inter Variable and Noto Sans Arabic Variable via Fontsource, SIL Open Font License. Packages include their licenses; copied to public/fonts-licenses. Font subsets are bundled locally by Astro/Vite.
