# Track SX1.1 Manual Verification Checklist

## Goal
Confirm that `Settings` and `History` use an outboard side rail when the window has real spare gutter space, and fall back to overlay without shrinking the calculator shell when it does not.

## Wide Window Check
- Open the app in a wide window or fullscreen where empty side gutter space is visible.
- Click `Settings`.
- Expected:
  - the settings panel appears to the right of the calculator shell, not inside it
  - the calculator width does not shrink
  - math input, result cards, and keypad keep their normal width
- Close `Settings`.
- Click `Show Hist`.
- Expected:
  - history uses the same right-side outboard slot
  - the calculator width still does not shrink

## Mutual Exclusion Check
- With `Settings` open, click `Show Hist`.
- Expected:
  - `Settings` closes
  - `History` opens in the same side slot
- With `History` open, click `Settings`.
- Expected:
  - `History` closes
  - `Settings` opens in the same side slot

## Tight Window Check
- Resize the window narrower until the side gutter is no longer realistically available.
- Click `Settings`.
- Expected:
  - settings opens as a right overlay sheet
  - the calculator shell width remains unchanged behind it
- Close `Settings`.
- Click `Show Hist`.
- Expected:
  - history also opens as a right overlay sheet

## Keyboard Check
- Press `Ctrl+,`.
- Expected:
  - settings toggles open/closed
  - on wide windows it uses the outboard rail
  - on tighter windows it uses the overlay fallback
