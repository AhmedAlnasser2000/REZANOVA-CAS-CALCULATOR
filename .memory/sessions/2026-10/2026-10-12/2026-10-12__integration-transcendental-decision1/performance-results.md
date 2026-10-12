# Transcendental serial observations

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-6
- verified_by_agent_family: sol
- attribution_basis: live


## Method

- Node v24.19.0; CPU Intel(R) Core(TM) Ultra 7 265K. Two warm-ups and five measured samples per fixture; each external operation uses a fresh execution context and proof scope. Fixture/construction timing is separate from integration. JSON transfer and file I/O are outside timed operations.
- Operations ran serially without another mathematical test/build gate. Wall time and memory are observations, not acceptance assertions or peak-process guarantees. Work/allocation count the native profile units; allocation is cumulative, not a byte measure.
- The snapshots precede final bridge traversal/temporary allocation charges and the first-level guard-preserving call split. Shared residue selection now calls its internal Within constructor in the enclosing operation, while external first-level constructors retain their original guard. Final regression checks the fully charged implementation under the same limits; mathematical reductions and formats are unchanged. These numbers are representative observations of the pre-closeout build, not an exact performance baseline for the commit.

## Timings and counters

| Fixture / operation | Minimum ms | Median ms | Maximum ms | Work min–max | Allocation min–max |
|---|---:|---:|---:|---:|---:|
| rational / construction | 0.25 | 0.27 | 3.61 | 21,393–21,393 | 246,980–246,980 |
| rational / integration | 193.23 | 203.47 | 217.94 | 10,629,114–10,629,114 | 118,025,814–118,025,814 |
| rational / verification | 44.55 | 46.65 | 49.60 | 2,502,983–2,502,983 | 27,664,514–27,664,514 |
| rational / encoding | 65.83 | 66.58 | 70.65 | 3,489,013–3,489,013 | 38,663,869–38,663,869 |
| rational / decoding | 78.40 | 82.62 | 83.64 | 4,238,109–4,238,109 | 46,868,804–46,868,804 |
| logarithmic / construction | 16.40 | 19.88 | 22.88 | 913,505–913,505 | 8,395,831–8,395,831 |
| logarithmic / integration | 61.46 | 67.13 | 76.93 | 2,893,992–2,893,992 | 24,222,741–24,222,741 |
| logarithmic / verification | 12.35 | 14.90 | 18.69 | 663,691–663,691 | 4,999,453–4,999,453 |
| logarithmic / encoding | 17.62 | 22.09 | 22.77 | 801,108–801,108 | 6,790,313–6,790,313 |
| logarithmic / decoding | 29.76 | 31.31 | 33.35 | 1,207,887–1,207,887 | 9,251,546–9,251,546 |
| exponential / construction | 3.39 | 3.43 | 7.84 | 173,611–173,611 | 1,398,581–1,398,581 |
| exponential / integration | 12.89 | 13.08 | 17.30 | 698,008–698,008 | 5,411,514–5,411,514 |
| exponential / verification | 3.33 | 3.45 | 12.08 | 181,012–181,012 | 1,246,908–1,246,908 |
| exponential / encoding | 5.45 | 5.57 | 11.31 | 239,192–239,192 | 1,922,026–1,922,026 |
| exponential / decoding | 8.63 | 8.98 | 15.20 | 387,405–387,405 | 2,667,278–2,667,278 |
| mixedLogFirst / construction | 41.33 | 41.50 | 41.60 | 1,972,548–1,972,548 | 15,164,076–15,164,076 |
| mixedLogFirst / integration | 94.40 | 96.16 | 97.15 | 4,039,399–4,039,399 | 27,132,073–27,132,073 |
| mixedLogFirst / verification | 22.53 | 23.26 | 23.90 | 997,704–997,704 | 5,900,464–5,900,464 |
| mixedLogFirst / encoding | 32.79 | 32.98 | 33.42 | 1,235,725–1,235,725 | 9,200,624–9,200,624 |
| mixedLogFirst / decoding | 60.74 | 61.38 | 62.37 | 2,402,470–2,402,470 | 14,612,855–14,612,855 |
| mixedExpFirst / construction | 76.93 | 79.20 | 86.91 | 3,554,676–3,554,676 | 25,571,088–25,571,088 |
| mixedExpFirst / integration | 127.64 | 129.89 | 131.34 | 5,689,854–5,689,854 | 38,644,796–38,644,796 |
| mixedExpFirst / verification | 26.49 | 27.56 | 28.08 | 1,251,315–1,251,315 | 7,300,133–7,300,133 |
| mixedExpFirst / encoding | 40.40 | 43.17 | 44.90 | 1,558,453–1,558,453 | 11,630,935–11,630,935 |
| mixedExpFirst / decoding | 74.55 | 77.31 | 82.64 | 3,057,045–3,057,045 | 18,629,602–18,629,602 |
| nestedExponential / construction | 26.43 | 27.92 | 28.45 | 1,243,931–1,243,931 | 8,562,895–8,562,895 |
| nestedExponential / integration | 42.02 | 47.64 | 49.69 | 1,990,373–1,990,373 | 10,602,910–10,602,910 |
| nestedExponential / verification | 10.95 | 14.09 | 15.29 | 588,094–588,094 | 2,892,390–2,892,390 |
| nestedExponential / encoding | 18.15 | 21.52 | 22.26 | 767,859–767,859 | 5,381,516–5,381,516 |
| nestedExponential / decoding | 40.05 | 43.52 | 46.49 | 1,742,377–1,742,377 | 9,777,379–9,777,379 |
| nestedLogarithms / construction | 108.18 | 110.04 | 115.94 | 4,773,091–4,773,091 | 34,548,865–34,548,865 |
| nestedLogarithms / integration | 93.97 | 98.85 | 101.56 | 4,275,909–4,275,909 | 18,691,854–18,691,854 |
| nestedLogarithms / verification | 28.92 | 33.50 | 36.40 | 1,444,525–1,444,525 | 7,103,012–7,103,012 |
| nestedLogarithms / encoding | 48.60 | 50.63 | 51.36 | 1,914,476–1,914,476 | 11,772,686–11,772,686 |
| nestedLogarithms / decoding | 97.11 | 101.12 | 105.24 | 3,985,026–3,985,026 | 21,265,196–21,265,196 |
| heightEight / construction | 32201.08 | 32576.95 | 33821.50 | 1,504,026,638–1,504,026,638 | 7,876,886,654–7,876,886,654 |
| heightEight / integration | 4614.18 | 4675.23 | 5012.98 | 232,842,470–232,842,470 | 360,220,830–360,220,830 |
| heightEight / verification | 3195.86 | 3244.79 | 3436.71 | 158,958,438–158,958,438 | 269,363,867–269,363,867 |
| heightEight / encoding | 8024.16 | 8044.05 | 8146.49 | 275,762,560–275,762,560 | 2,235,691,521–2,235,691,521 |
| heightEight / decoding | 50899.76 | 51639.44 | 55464.56 | 2,026,643,909–2,026,643,909 | 5,987,737,108–5,987,737,108 |

## Artifacts and observed memory

| Fixture | JSON bytes | RSS observations MiB | Heap observations MiB |
|---|---:|---:|---:|
| rational | 11,522 | 132.3–186.2 | 25.2–67.4 |
| logarithmic | 19,148 | 171.7–243.5 | 21.6–81.3 |
| exponential | 9,818 | 244.9–248.3 | 32.0–91.2 |
| mixedLogFirst | 25,664 | 254.1–270.5 | 71.6–101.7 |
| mixedExpFirst | 31,552 | 248.6–259.8 | 26.9–92.7 |
| nestedExponential | 18,869 | 262.4–267.2 | 50.6–111.4 |
| nestedLogarithms | 29,403 | 276.0–297.6 | 75.5–145.9 |
| heightEight | 584,087 | 1207.0–1812.4 | 213.8–1560.2 |

## Interpretation

- All eight representative classes complete construction, integration, independent verification, encoding and replay under unchanged limits. Height includes the variable level; the height-eight artifact remains below 16 MiB and replays completely.
- Height-eight construction and full evidence replay dominate its cost. Full replay takes roughly fifty seconds, with substantial transient heap/RSS observations. This backend evidence does not claim interactive performance for future broader application adoption.
- No limits, test expectations or mathematical authority were relaxed to fit observations. Optimization/adoption remains separate reviewed work.

Raw five-sample observations are retained in [performance-samples.json](performance-samples.json).
