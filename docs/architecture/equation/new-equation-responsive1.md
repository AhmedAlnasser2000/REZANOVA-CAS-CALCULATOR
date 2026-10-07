# NEW-EQUATION-RESPONSIVE1: Typing, Showing the Answer First, Fast System Verification

Date: 2026-10-07
Status: implemented and verified on 2026-10-07.

Gate: fixes to the New Equation workspace ([`EQUATION-ADOPTION1`](equation-adoption1-spec.md)) found by the user before the roadmap resumes. It ships in one PR with [`TESTS-LEGACY-EQUATION-INERT1`](tests-legacy-equation-inert1.md), one commit per fix.

Nothing from the old Equation engine (`src/lib/equation/`) is used, the old Equation workspace is unchanged, and no file under `src/lib/calculus/new-integration/` or `src/app/new-integration/` is edited.

## Problems the user found

1. **Typing froze the page.**
   - Compute Engine's error recovery is exponential on an unfinished nested row. Measured:

     | Unfinished row | Time to read |
     |---|---|
     | 3 levels | 1.2 s |
     | 4 levels of `\left(` | 14–16 s |
     | 4 levels of plain parentheses | 5.6 s |
     | 5 levels | 248 s |

   - The page parsed every row about four times per render, on the main thread.
2. **The answer waited for verification.** The user asked to see the answer at once, marked as not checked yet, then verified, or withdrawn if verification fails.
3. **A complex system took over a minute.** For x³y² + x = 4y, x + y = 7 − x²:

   | Domain | Decide | Verify before | Layout before |
   |---|---|---|---|
   | ℝ | 0.09 s | 11.4 s | — |
   | ℂ | 0.2 s | 65.7 s | over 60 s (found once verification was fast) |

## User decisions (2026-10-07)

- **The unchecked answer is a page-only preview.**
  - The worker sends the decided answer's presentation rows before verification.
  - The schema-7 `equation-outcome` document is still built only after verification, replay and authority pass, so `verification: 'independent'` stays true by construction and the contract is unchanged.
- **Copying an unchecked answer is allowed, with a warning.**
  - The answer carries a "Not checked yet" badge.
  - Copying shows "Copied — this answer is not checked yet.".
  - The copied math itself stays clean.
- **No limits for users.** The 60-second rule is for development and testing only. The app keeps its typed work, memory and Stop limits and has no time caps.
- **Delivery**: one PR with the legacy-test work, one commit per fix.

## 1. Rows are read off the main thread

- **`src/lib/new-equation/row-reader.ts`** and **`row-reader.worker.ts`**: one worker shared by every New Equation tab.
  - Each row text is read once and cached by its LaTeX (512 entries; a dropped entry is simply read again).
  - Blank rows are known without the worker.
- **Restart on edit**:
  - Pages say which rows they want now.
  - A read that no tab wants any more (the row was edited) is abandoned by terminating the worker.
  - A wanted row is never timed out: it reads until it finishes or is edited.
- **`useRowReadings`** (`src/app/new-equation/useRowReadings.ts`):
  - changed rows are read after 250 ms without typing;
  - nothing is parsed during render;
  - while a row is being read, the chips and names keep the row's previous reading;
  - a faint "Reading…" appears under that row after 0.6 s.
- **Solve**:
  - Solve and Enter work while rows are being read: the run waits for the reads.
  - An edit or Stop abandons the wait.
  - The solve worker keeps its own parse, so Stop still ends a slow one.
- **Without Worker support** (tests, non-browser hosts) rows are read synchronously.
- `resolvedTargets` and `answerOutdated` take the read rows and resolved unknowns instead of parsing; the outdated check compares non-blank rows with `isBlankRow`.

## 2. The answer first, then verification

- **Service** (`executeEquation(request, onPreview)`):
  - After deciding (and applying assumptions), an answer (`solved` or `empty`) is laid out from `previewEquationDocument`: the outcome in the document shape, unverified, never posted.
  - Its three presentations go to `onPreview`.
  - Verification, projection, replay and authority follow as before.
  - Non-answers have no preview. A typed stop or an oversized answer while laying out the preview skips it.
- **Worker messages**: `{ phase: 'preview', preview }` at most once, then `{ phase: 'final', response }`.
- **Runtime** (`runEquationJob`): a preview is checked for shape and handed over only while the run is current (same revision, tab open).
- **States** (`useNewEquationRuntime`), as the page shows them:

  | State | What the page shows |
  |---|---|
  | Unchecked | the answer with "Not checked yet" and "Checking the answer exactly…"; Copy works and its notice warns |
  | Verified | the answer as before: "✓ Verified exactly", Conditions used, copy |
  | Withdrawn | the final run has no verified answer: "Verification failed — this answer was withdrawn." with the technical reason |
  | Stopped while checking | Stop or an edit: "Not checked: verification was stopped." A limit reached while verifying (a typed `stopped` outcome): the matching sentence. The answer stays, marked "Not checked". |

- The page's status reads "Solving…" until the preview arrives.

## 3. Finite systems verified in one number field

**Cause.** Each coordinate of a solution point is its own algebraic number (here degree 7 each). Substituting a point into x³y² + x − 4y multiplies numbers of different fields: composed resultants of degree 49, whose roots then had to be isolated. That was 92% of the time.

**`core/systems/verify-zero-dim.ts`** (`verifyPointsInNumberField`), from the certified Gröbner basis and Hermite count N already in `verifyPolynomialCertificate`:

1. **Representation.** A separating t = Σ cᵥ·xᵥ gives a square-free f of degree N and coordinates xᵥ = rᵥ(t) in ℚ[t]/(f): the rational univariate representation, with g₁ inverted modulo f. `univariate` is now shared with `zero-dim.ts`; the checks below are what make it evidence.
2. **Exact checks in ℚ[t]/(f)**, by polynomial remainders:
   - Σ cᵥ·rᵥ ≡ t, so distinct roots of f give distinct points;
   - every equation of the extended system ≡ 0. This covers the rows, and each ≠ row and natural-domain condition through its Rabinowitsch variable.

   So the N points (rᵥ(τ)) for f(τ) = 0 are N distinct solutions: all of them.
3. **Matching.** Each claimed point equals the point of one root τ. Per coordinate:
   - its defining polynomial m vanishes at rᵥ(τ) exactly (τ's irreducible factor divides m(rᵥ) mod f);
   - certified disks single out the same root of m for both.

   Distinct claimed points must meet distinct roots.
4. **Fallback**: coordinates that are not exact algebraic numbers, or a g₁ that is not invertible, fall back to exact substitution as before. A failed exact check is a refutation, never a fallback.

**Complex answers in the presentation** (`presentation/values.ts`, display only):
- Decimals of non-real values are read from the root's own certified disk, refined until Re and Im each round alike and their signs are known.
- Order uses the same disks. Equal values and conjugate pairs are recognised exactly by root identity.
- Only an undecided case (a rounding tie, a real part that may be zero, equal real parts of different numbers) takes the exact real and imaginary parts as before. Computing those parts as algebraic numbers was the minute in the layout.

### Timings (this container)

| Case | Before | After |
|---|---|---|
| ℝ: x³y² + x = 4y, x + y = 7 − x² | 11.4 s to verify | answer shown at 0.27 s, verified at 0.33 s |
| ℂ: the same system (7 points) | 65.7 s to verify, then over 60 s to lay out | answer shown at 0.68 s, verified at 1.1 s |

Work units for verification: ℝ 0.18M, ℂ 0.45M. The regression test bounds deciding plus verifying at 2M (ℝ) and 8M (ℂ).

## 4. The 60-second rule (development only)

- **`tools/equation-slow-case-probe.mjs`** runs each case in its own process through `tools/equation-slow-case-probe-runner.ts`.
- It prints the time of every phase:
  - read rows;
  - lower;
  - decide;
  - preview layout and present;
  - verify;
  - project and replay;
  - present in each style.
- A case still running at 60 s is killed with SIGKILL (a busy synchronous loop ignores SIGTERM) and reported as abnormal, naming the phase it was in. The exit code is 1 when any case was abnormal.
- With no arguments it runs six built-in cases; JSON arguments give other cases.
- It is not in CI and not in the app.

## Evidence

- **Unit tests**:
  - the row reader (5): restart on edit, waiting, abort, a crashed read, the synchronous fallback;
  - the runtime shell (6, one new): the preview while current, a stale preview dropped, an invalid preview rejected;
  - the service (16, one new): the preview comes before the final response and matches the verified layout; no preview for non-answers;
  - the number-field verifier (2): the degree-7 system over ℝ and ℂ within a work budget; a coordinate from another solution, a conjugate swapped in and a missing point are all rejected;
  - the existing systems tamper test (unchanged), all Equation core, presentation and corpus tests (797).
- **UI tests**:
  - typing (1): a 5-level unfinished row typed in steps is never parsed on the main thread, and an edit abandons the old read;
  - the answer panel (6, two new): the unchecked badge, the copy warning, stopped and withdrawn;
  - the runtime hook (5, one new): preview → verified, failed → withdrawn, Stop → unchecked.
- **Playwright** (`e2e/new-equation.spec.ts`): the run helper waits for the current answer and for Stop to switch off, since the answer now shows before it is checked.
- **Probe**:
  - the six built-in cases each finish under 0.6 s of work (about 3.4 s with process startup);
  - a 5-level unfinished row reads in 16 s here and is then refused as a row error;
  - a 6-level one is killed at 60 s in "read rows", which is why the page reads rows in a worker it can abandon.
