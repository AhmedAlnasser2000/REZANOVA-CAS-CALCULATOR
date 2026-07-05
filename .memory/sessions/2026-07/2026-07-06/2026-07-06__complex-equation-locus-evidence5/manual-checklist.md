# COMPLEX-EQUATION-LOCUS-EVIDENCE5 Manual Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## What Is Achieved Now

- Complex locus carriers produce bounded evidence cards when Complex Region is enabled.
- `abs`, `conj`, `Re`, and `Im` remain controlled non-holomorphic stops, not root-list answers.
- Simple direct forms show useful diagnostics: circle-like, finite point, vertical line, horizontal line, or real-axis locus evidence.

## Manual App Steps

1. Open Equation > Symbolic.
2. Set RAD and Complex On.
3. Enable Complex Region.
4. Use region `[-2, 2] x [-2, 2]`, grid `8`.
5. Run `|z-1|=2`, `abs(z)=0`, `Re(z)=1`, `Im(z)=1`, and `conj(z)=z`.

## Expected Results

- Each input returns a controlled error card rather than a root answer.
- Details include `Complex Locus Evidence`, `Complex Locus Region`, residual-band evidence, candidate finite points, and locus diagnostics where recognized.
- The result should not contain `Complex Region Roots` or `Complex Contour Verification`.
