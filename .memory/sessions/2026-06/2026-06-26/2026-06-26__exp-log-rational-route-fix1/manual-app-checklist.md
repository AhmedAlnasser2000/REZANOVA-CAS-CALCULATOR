# EXP-LOG-RATIONAL-ROUTE-FIX1 Manual App Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## What To Check

- Real Exact: enter `\ln((z^3+z+1)/(z-m))=b`, solve for `z`.
- Real Exact: enter `\ln((z^4+z+1)/(z-m))=b`, solve for `z`.
- Real Exact: enter `e^{(z^3+z+1)/(z-m)}=b`, solve for `z`.
- Boundary: switch to Complex Exact and try the same rational log carrier.
- Boundary: try target-in-base shape such as `((z^3+z+1)/(z-m))^a=b`.

## Expected Results

- Real rational log/exponential generated equations route through the exp/log handoff instead of stopping at direct Ferrari/Cardano eligibility.
- Degree-3 generated equations show Real Cardano case rows.
- Degree-4 generated equations show Real Ferrari case rows.
- Denominator exclusions such as `z-m\ne0` remain in `Valid When`.
- Complex and target-in-base examples remain unsupported.
