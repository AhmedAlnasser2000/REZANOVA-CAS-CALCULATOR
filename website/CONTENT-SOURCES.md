# Content research and editorial decisions

## Update, 16 October 2026

- The site moved into the project repository (`website/`).
- Capabilities describe the workspaces that open today: Equation, Graphing, Integration and Notebook, plus Tabs, History and Settings. Calculate, Table, Matrix, Vector, Calculus, Trigonometry, Geometry, Statistics and Labs are listed as being rebuilt, without screenshots.
- Four history chapters were added from the repository's git history and roadmaps: Graphing on the GPU, the Integration reconstruction (from 26 September), the Equation reconstruction (stages 1–17, 3–16 October; 1,540-problem corpus per `equation-capability-ledger.md`) and the pause.
- The story and status wording (why the engines were rebuilt, development paused for studies and resuming next year with no date) is the owner's, approved 16 October 2026.
- Examples are not hand-written: `tools/website-examples.ts` runs the engines and fails unless every example is verified.

The notes below are the original research of 17 September 2026 and are kept for the older chapters.

Reviewed 17 September 2026. The published copy describes repository records through 7 September 2026, not a newly tested calculator release.

## Evidence and scope

- Read the uploaded repository’s durable-memory index, protocol, current state and world canon; examined dated journal entries and relevant milestone sections from March through September.
- Cross-checked the live GitHub memory index, current-state file and CHANGELOG through the GitHub connector. The live changelog confirms v0.2.0 (22 June) and v0.3.0 (7 September). No v0.1.0 or v0.4.0 release entry was invented.
- The timeline uses ten editorial chapters: two documented versions and eight date-grouped development milestones. Every entry contains a summary paragraph, change bullets and expandable source links.
- Ten capability sections distinguish the source-tree functionality from the installed release or browser deployment. Claims were checked against the changelog, current-state file and README; no calculator test suite was run.

## Conflicts resolved

- The July app_summary_latest.md still says Graphing and Notebook do not exist; newer July journals, September state and changelog supersede that description.
- The current-state file includes an older line calling Graphing hidden; its newer Graphing posture, July 20–21 records, README and changelog establish a public New Graph workspace. Prefer those specific records.
- v0.3.0 preparation started on 21 July, but the current changelog date is 7 September. Show both events without conflating preparation and publication.
- June 22 journal explicitly defers v0.2.0 tagging/publication. Describe a documented version rather than asserting a verified release-publication timestamp.
- Graphing and Notebook are new relative to v0.2.0. Equation, Calculus, Matrix, Vector and Statistics are expanded existing areas.
- Canonical Result V1–V4 and Notebook schema numbers are internal formats, not calculator release numbers.
- Notebook video was removed. Live solving, graph embedding, cloud sync, public plugins/SDK and external Surface Protocol hosting remain outside current functionality.
- The calculator remains English-only. Website Arabic does not imply calculator localization.
- Retained the development-pause statement from the owner’s instructions. No future release date or new deployment was promised.

## Source inventory

Links in the site target public main-branch records and can evolve. SHA-256 fingerprints below identify the uploaded snapshot files used for the content audit.

| Source                                  | Snapshot SHA-256                                                   |
| --------------------------------------- | ------------------------------------------------------------------ |
| `.memory/current-state.md`              | `c83c2b1d0e3f78e0657b099a6c7b379913f905775f21970376abc7699fb33a26` |
| `.memory/journal/2026-03/2026-03-02.md` | `7ecd87df87d398a23e8e4d852948ae6aeeef4f1001cb6c4ef28ec4cad4734a4f` |
| `.memory/journal/2026-03/2026-03-03.md` | `fb4d91c321b1b4c0077191423cf11950fff3503441d768a066cd59d62f1a8dc5` |
| `.memory/journal/2026-03/2026-03-10.md` | `3504ff86accf6e8bc07c59c88ad94c3124cb8891399264ceacf7bc1441dc49fe` |
| `.memory/journal/2026-04/2026-04-03.md` | `2d904f86cbb8625d9deab264b9429f191c32b9938716ac065bcf45ec063cdb92` |
| `.memory/journal/2026-04/2026-04-25.md` | `b47b0ef1603a87b0d0353ac8056ff907509da42d5c26c98bf78cfc261077bd03` |
| `.memory/journal/2026-05/2026-05-23.md` | `ce1d8a8cb80d14a03aa8838abe533d1aacdb7354641fe0af133555fdc86c253c` |
| `.memory/journal/2026-05/2026-05-25.md` | `de625b6c66141cb24f27e9d508073e90802229cb4d2c236267499a21d8db1714` |
| `.memory/journal/2026-05/2026-05-27.md` | `822241758ab973da99c5093120da680db6d294bae6516081a5358dec73018fa8` |
| `.memory/journal/2026-05/2026-05-29.md` | `b945ab5bf8067452964a928c9fb7982ecef4e89ad4845c1a6d3728a56157e553` |
| `.memory/journal/2026-06/2026-06-16.md` | `df83655ef0b06522236436eeb14745ba29c19e25144f31964c93e44c6166f11e` |
| `.memory/journal/2026-06/2026-06-17.md` | `d33baa42c0ec2bcac9f2af56b574392c2d06293dfc1a31079807237a4dce274d` |
| `.memory/journal/2026-06/2026-06-18.md` | `35af846814b5fd3a9f5dc3b2d5b353580b118480f1f60902ab2e12cfc5898213` |
| `.memory/journal/2026-06/2026-06-22.md` | `e7b94d637df49da2f0dbb98cec0408d4d26d29a80cb44cf3ba0a88313666b796` |
| `.memory/journal/2026-06/2026-06-26.md` | `70b853b203841f39df1bb9350190702251fa277aff81e9dc8d030e68fc31921e` |
| `.memory/journal/2026-06/2026-06-29.md` | `8850e0c178dbdc96caa8e6c15d2f9b081c1c9410f2afd3f289ae0ae29705ff89` |
| `.memory/journal/2026-07/2026-07-06.md` | `44b9c5affcb4635864347473550164741d54d39b082cead1ae3a98b033bf12d2` |
| `.memory/journal/2026-07/2026-07-14.md` | `ca2af23e74ca37c0001aa89e79866663f256ac4adf47e6a28d2adf4807a10ca6` |
| `.memory/journal/2026-07/2026-07-20.md` | `7c78c780ed3a4fb8da57baf394f1c084c7329ab75e6f0597497ef31cb4fc4fc9` |
| `.memory/journal/2026-07/2026-07-21.md` | `1953f885f7317d4b1e1ad8cf5567ac23763fcc2c4f735646ad28190fd10ba3b1` |
| `.memory/journal/2026-08/2026-08-21.md` | `abfa71b2e6c2024be6fd24ad9d14d6c83fa29133182ea8bee7c392eec92db0b6` |
| `.memory/journal/2026-08/2026-08-24.md` | `1295fdb43f9f97a527671ff160d8e0b2602832bde48f40a52919be3ba5fed045` |
| `.memory/journal/2026-09/2026-09-04.md` | `cac5900ae4ef4e0c8dd01c7795f429ce7622d324a8612024d8b0ef0ab5890752` |
| `.memory/journal/2026-09/2026-09-07.md` | `81e56e3d74100e631e95313054fe83dc8e78451fcb57751cb3aeef56ebc1eb1a` |
| `CHANGELOG.md`                          | `3ff716bce7bcbe06e416d13e72b39391fd0f27fd5a3b656554d4b7eff5454d96` |
| `README.md`                             | `12c4d4093a1276093702d8f5c6a330d91d61d724ab4fffbd88c5723f0f947b32` |
