# Gate 1 stage observations

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

Serial two-warm-up/five-sample observations under Node v24.19.0. Fresh cumulative contexts per request, shared across candidate/check/export. This is stage accounting, not performance acceptance or a speedup claim. Input strings are prepared before the timers; field construction is inside construction. Encoding/replay costs are not moved into setup. Candidate availability includes construction, solving and bounded presentation. Verification and projection finish before export starts.

| Input | Construction | Candidate available | Check | Projection | Export |
|---|---:|---:|---:|---:|---:|
| int x,dx | 8.3/8.6/11.5 | 61.1/63.3/66.9 | 0.4/0.4/1.0 | 52.4/54.0/64.8 | 5.2/6.3/7.3 |
| int frac{1}{x^2+1},dx | 25.9/26.5/31.5 | 212.1/216.1/219.2 | 35.6/35.9/42.8 | 186.8/189.4/224.4 | 30.6/31.2/35.7 |
| int e^x,dx | 10.1/10.2/12.3 | 132.0/132.9/138.0 | 5.6/5.7/8.7 | 115.6/124.8/132.7 | 70.0/70.9/72.4 |
| int frac{e^x}{x},dx | 13.6/13.8/16.5 | 159.5/161.7/162.5 | 2.8/2.9/2.9 | 140.1/142.0/148.1 | 68.2/70.6/73.7 |

Milliseconds shown as minimum/median/maximum. Exact work/allocation snapshots and heap/RSS observations, complete samples and artifact sizes are retained in `stage-timings.json`. Candidate and checked usage snapshots remain stable while export increases cumulative use. The forthcoming performance gate has its own fixed corpus, same-machine controls and hard targets; these simple observations do not satisfy it.
