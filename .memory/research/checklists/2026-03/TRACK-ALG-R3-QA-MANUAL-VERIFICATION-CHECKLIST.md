# Track ALG R3 + QA1 Optional Manual Verification Checklist

Automation is the primary gate for this track. Run this checklist only as an optional final smoke after `npm run test:gate` passes.

## Automated Evidence
- `npm run test:unit`
- `npm run test:ui`
- `npm run test:e2e`
- `npm run test:gate`

## Achieved Now
- Repo-owned verification is now browser-first and versioned in the repo.
- Shared result cards can be asserted through UI integration tests.
- Critical smoke flows exist for Calculate, Equation, Trigonometry, Geometry, and Statistics.
- Manual verification is now a confirmation layer, not the primary correctness gate.

## Optional App Smoke

### 1. Calculate exact result rendering
- Steps:
  - Open `Calculate`
  - Enter `1/3+1/(6x)`
  - Run `Simplify`
- Expected:
  - Exact result is shown
  - A second exact line shows exclusions
  - No raw test ids or broken layout appears
- Pass/Fail Notes:
  - 

### 2. Equation conditions / exclusions
- Steps:
  - Open `Equation > Symbolic`
  - Enter `x/(x-1)=0`
  - Solve
- Expected:
  - Solution is shown
  - A second exact line shows the exclusion for the denominator
  - No invalid root is shown
- Pass/Fail Notes:
  - 

### 3. Trigonometry handoff behavior
- Steps:
  - Open `Trigonometry > Equation Solve`
  - Enter `cos(x)=x`
  - Solve
- Expected:
  - No fake symbolic solution
  - `Send to Equation` appears because the case is unresolved-but-eligible
- Pass/Fail Notes:
  - 

### 4. Geometry handoff behavior
- Steps:
  - Open `Geometry > Slope`
  - Enter `slope(p1=(1,2),p2=(?,8),slope=2)`
  - Execute
- Expected:
  - Geometry returns the unresolved-but-eligible action state
  - `Send to Equation` appears
- Pass/Fail Notes:
  - 

### 5. Statistics quality summary
- Steps:
  - Open `Statistics > Regression`
  - Enter `(1,2),(2,5),(3,5),(4,9)`
  - Execute
- Expected:
  - Result renders successfully
  - `Quality Summary` appears
  - Diagnostics such as `SSE` are visible
- Pass/Fail Notes:
  - 
