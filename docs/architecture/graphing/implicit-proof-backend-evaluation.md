# Implicit proof backend feasibility — 2026-09-26

Status: exploratory backend gate only. No MPFR/GMP artifact is shipped, imported by
Graph, or approved for distribution. The live implicit sampler is not certified.

## Reproducible local experiment

- Toolchain: Emscripten SDK 4.0.14, installed under ignored
  `.task_tmp/graph-proof-emsdk/`; no system toolchain was changed.
- GMP 6.3.0 source SHA-256:
  `a3c2b80201b89e68616f4ad30bc66aee4927c3ce50e33929ca819d5c43538898`.
- MPFR 4.2.2 source SHA-256:
  `b67ba0383ef7e8a8563734e2e889ef5ec3c3b898a01d00fa0a6869ad81c6ce01`.
- Both cross-configured for `wasm32-unknown-emscripten`, static libraries only,
  with GMP assembly disabled. Both built and installed in the ignored local
  prefix `.task_tmp/graph-proof-prefix/`.
- A small `-Oz -flto` smoke module called MPFR directed-rounding `log(2)` and
  `sin(1)` at 128-bit precision. It returned success in Node 24 and headless
  system Chrome. Output size was 283,221 bytes WASM plus 9,570 bytes of ES
  module loader. One Chrome run reported 6.7 ms module load and 2.6 ms call;
  these are feasibility observations, not repeatable benchmark claims.

The ignored experiment source and assets are in `.task_tmp/graph-proof-sources/`.
No app startup, worker scheduling, settled viewport, or Tauri measurement has
been made. Browser execution of one scalar smoke test does not validate interval
topology or graph correctness.

## Unpassed gates

1. Cross-configuration could not run target tests and assumed behavior for
   subnormal doubles, signed zero, TLS, and GMP header/library consistency.
   Clang ignored MPFR's `-ffloat-store` flag. Run the upstream GMP and MPFR
   test suites against the actual WASM target or establish equivalent reviewed
   parity before relying on this build for proof.
2. The smoke module has no Graph-worker integration, cancellation, time or
   memory bounds, full expression compiler, interval-domain validation,
   topology certificates, or complete-cell accounting.
3. The static WASM linkage requires a distribution-compliance design before
   adoption. MPFR is LGPL-3.0-or-later; its own manual calls for source and a
   way to relink a modified library. GMP licensing must be reviewed for the
   chosen linked distribution. Preserve Calcwiz's MIT source and verify the
   actual browser and packaged desktop delivery, notices, complete
   corresponding library source, and relinking mechanism. This document is
   an engineering checklist, not a legal approval.
4. Validate source authenticity/signatures in addition to recorded SHA-256
   values before a reproducible pinned build is adopted.

MPFR references: [4.2.2 manual](https://www.mpfr.org/mpfr-4.2.2/mpfr.html),
[LGPLv3 terms](https://www.gnu.org/licenses/lgpl-3.0.en.html).

## Current safe boundary

`src/lib/graphing/sampling/implicit-proof-cell.ts` is an isolated exact
rational interval classifier for integer-leaf algebraic expressions. It can
prove empty or filled sign cells and exact zero cells; unsupported operators,
domain-straddling divisions, and inconclusive intervals remain unresolved.
It is currently used only to prevent the earlier five-point axis probe from
asserting a continuous component on sampled evidence. It does not make the
rest of marching-squares contour output formal. Transcendental coverage for
the reported mixed-power and nested-log examples remains an open gate.
