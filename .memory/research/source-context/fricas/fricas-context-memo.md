# FriCAS Context Memo

milestone: FRICAS-CTX0  
date: 2026-05-01  
primary_agent: codex  
primary_agent_model: gpt-5.5  
source_mirror: `playground/sources/mirrors/fricas/`  
captured_commit: `b10e5fd9cae9fb0e76994452b00ad794a459dfa6`

## Context

FriCAS is a general-purpose CAS descended from Axiom. The local mirror is used only as research context. It is not a Calcwiz dependency, submodule, runtime tool, parent architecture, or implementation source.

The useful question is not "how do we become FriCAS?" The useful question is:

What makes a mature symbolic system powerful, and which lessons can be translated into Calcwiz-native bounded architecture?

## What Gives FriCAS Its Power

- Rich mathematical typing: categories, domains, and packages make algorithm preconditions explicit. Files such as `src/algebra/catdef.spad`, `src/algebra/polycat.spad`, `src/algebra/matcat.spad`, and `doc/runtime.txt` show that algorithms are attached to algebraic capabilities, not just syntax.
- Typed function spaces: `src/algebra/expr.spad`, `src/algebra/elemntry.spad`, and integration/limit packages operate over function-space abstractions with kernels, towers, and coefficient domains.
- Deep algebraic substrates: polynomial categories, factorization, Grobner packages, triangular sets, exact linear algebra, and regular-chain work provide the base that higher symbolic operations rely on.
- Layered algorithms: integration flows through normalization, elementary integration, algebraic integration, and result objects rather than one large rule list. Limits have power-series and MRV-style paths.
- Interpreter and database machinery: `src/interp/*`, `doc/algebra_build.txt`, and `src/interp/daase.lisp` show a large system for type resolution, coercion, operation lookup, autoloading, and build databases.
- Regression culture: `src/input/*.input` contains many bug, tutorial, and capability examples that are useful as future challenge families.

## What Matters Most For Calcwiz

Calcwiz should borrow the discipline, not the shape.

- Use capability facts before algorithms: a calculus or solve feature should know whether polynomial factorization, gcd, domain safety, series, assumptions, or exact linear algebra is actually available.
- Keep bounded translations small: typed carriers and readiness checks are more compatible than a full category/type system.
- Preserve exact-first honesty: FriCAS breadth is useful context, but Calcwiz should continue to expose controlled stop reasons when prerequisites are missing.
- Use FriCAS examples as challenge corpora, not parity obligations.
- Keep Playground as the path for any translated idea before stable adoption.

## What Would Be Harmful To Inherit

- Full feature-parity pressure.
- FriCAS's interpreter/type-system architecture as a product identity.
- Global coercion or simplification behavior that hides assumptions.
- Direct integration of FriCAS as a hidden backend.
- Copying implementation code instead of designing Calcwiz-native bounded versions.
- Moving broad experimental CAS behavior into stable code before corpus evidence and stop policies exist.

## Immediate Research Outcome

`FRICAS-CTX0` creates:

- a capability atlas,
- a Calcwiz fit matrix,
- an idea ledger,
- top translated prototype candidates,
- first incubation proposals,
- a typed context corpus under `playground/level-0-research/source-context/`.

None of these artifacts changes product behavior.
