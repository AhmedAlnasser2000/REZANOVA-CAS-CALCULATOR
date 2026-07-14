# Vector Gram-Schmidt Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## What Is Achieved Now

- Vector Gram-Schmidt handles one through six vectors and explicitly explains dependent inputs.
- Exact orthogonal and orthonormal bases remain canonical, copyable, replayable, and readable.

## Manual App Steps

1. In Vector, define `p=[1,0,0]`, `q=[1,1,0]`, and `r=[1,1,1]`.
2. Run `gram(p,q,r)` and expand the proof details.
3. Confirm the orthogonal and orthonormal bases are the three standard coordinate vectors and each residual has prior-basis zero-dot evidence.
4. Copy the result, collapse and reopen its details, then replay it from History.
5. Run `gram([1,0],[0,1],[1,1])` and confirm the final zero residual is shown and discarded as dependent.
6. Try seven vectors and confirm the controlled one-to-six input error is readable.

## Expected Results

- Exact basis math and copy remain unchanged after History replay.
- Dependent vectors never produce a zero vector inside the orthonormal basis.
- The answer, proof, error, and History cards remain readable without horizontal overflow.
