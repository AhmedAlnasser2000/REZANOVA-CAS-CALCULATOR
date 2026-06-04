# Track SX1 Manual Verification Checklist

## Achieved Now
- Calcwiz has a canonical `Settings` surface owned by the app shell rather than hidden inside `Menu`.
- Settings render as a docked right inspector on wide layouts and as a right slide-over overlay on narrow layouts.
- Display settings apply live:
  - UI scale
  - Math size
  - Result size
  - High contrast
- `General` settings stay synchronized with the existing top-row quick toggles:
  - angle unit
  - output style
  - auto-switch to Equation
- `Symbolic Display` settings are visible, previewed, and persisted now; broader result-format behavior is deferred to `PRL1`.
- Settings and History are mutually exclusive side surfaces.

## Optional App Smoke

### 1. Open the settings inspector on a wide layout
- Steps:
  - Open the app on a wide window
  - Click the top-bar `Settings` button
- Expected:
  - A docked right inspector opens
  - The main calculator workspace remains visible
  - `History` closes if it was open

### 2. Verify live display controls
- Steps:
  - In `Settings > Display`, change:
    - `UI Scale`
    - `Math Size`
    - `Result Size`
    - `High Contrast`
- Expected:
  - Changes apply immediately
  - Math fields and result-card content visibly resize
  - High contrast visibly strengthens readability

### 3. Verify quick-toggle synchronization
- Steps:
  - Change `Angle Unit`, `Output Style`, and `Auto Switch to Equation` inside `Settings`
  - Then use the existing top-row controls
- Expected:
  - Both surfaces stay in sync
  - Changing one updates the other immediately

### 4. Verify Symbolic Display preview
- Steps:
  - In `Settings > Symbolic Display`, switch between:
    - `Prefer Roots`
    - `Prefer Powers`
    - `Auto`
  - Toggle `Flatten Nested Roots When Safe`
- Expected:
  - The preview block updates live
  - The settings persist while open

### 5. Verify narrow-layout overlay behavior
- Steps:
  - Narrow the window below the wide breakpoint
  - Open `Settings`
- Expected:
  - Settings open as a right overlay sheet with backdrop
  - Dismissing the backdrop closes the panel

### 6. Verify Settings / History mutual exclusion
- Steps:
  - Open `Settings`
  - Click `Show Hist`
  - Then reopen `Settings`
- Expected:
  - Settings closes when History opens
  - History closes when Settings opens
  - Both never remain open together

## Pass / Fail Notes
- Pending optional user smoke.

## Evidence Commands
- `npm run test:gate`
