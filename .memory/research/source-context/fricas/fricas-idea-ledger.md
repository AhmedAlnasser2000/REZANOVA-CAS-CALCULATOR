# FriCAS Idea Extraction Ledger

milestone: FRICAS-CTX0  
date: 2026-05-01

| FriCAS pattern | Why interesting | Calcwiz fit | Smallest bounded translation | Prerequisites | Risks | Playground first | Horizon |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Algebraic capability categories | Algorithms know what operations are legal | strong | `CapabilityFacts` for cores | stable carriers | over-architecture | no | immediate |
| Domain-vector/runtime type caching | Makes large typed universe feasible | weak | none; only learn cost | none | identity drift | no | never |
| Explicit coercion/retraction checks | Avoids invalid representation jumps | medium | adapter result with refusal reason | AST/carrier boundaries | hidden conversions | maybe | mid-term |
| Function-space kernel towers | Enables calculus over symbolic functions | medium | known-function registry and carrier extraction | parser/readback stability | broad expression rewrite pressure | yes | mid-term |
| Risch normalization before integration | Stronger integration architecture | medium | bounded integration normalizer feeding current strategies | derivative verification | Risch pressure | yes | mid-term |
| Integration result object | Separates elementary/log/special/unknown pieces | strong | richer internal integration candidate metadata | result-surface discipline | exposing too much | no | immediate |
| Definite integration pole policy | Honest interval/pole handling | strong | stronger domain-range interval hazard details | domain-range core | false positives | no | immediate |
| Power-series limit package | Handles local expansion systematically | medium | bounded local-equivalent engine v2 | series primitives | general series creep | yes | mid-term |
| MRV limit algorithm | Powerful asymptotic comparison | weak now | dominance challenge corpus first | sign/series/order facts | opaque fallback | yes | long-term |
| PolynomialCategory contracts | Shared polynomial operations by coefficient ring | strong | polynomial-core capability map | existing polynomial-core review | category sprawl | no | immediate |
| Grobner normal form | Exact elimination/membership power | medium | tiny elimination prototype for polynomial systems | exact polynomial ring | black-box solver claims | yes | mid-term |
| Grobner factorization with nonzero restrictions | Decomposition-aware solving | medium | branch-aware decomposition experiment | branch-core maturity | UX complexity | yes | long-term |
| Regular triangular sets | Strong system decomposition vocabulary | weak now | terminology and challenge families | decomposition representation | too heavy | yes | long-term |
| Matrix operation capability gates | Operations depend on ring/field facts | strong | exact matrix-core gate table | matrix result envelope | scope growth | maybe | mid-term |
| Special-function limit examples | Reveals future boundary classes | medium | challenge corpus only | function registry | parity pressure | yes | long-term |
| Regression input culture | Many examples protect behavior | strong | source-context challenge corpora | corpus validator | treating challenges as promises | no | immediate |

## Default Extraction Rule

Every row above is an idea source, not an implementation license. Stable adoption requires:

1. Calcwiz-native design,
2. bounded scope,
3. tests or challenge corpus evidence,
4. explicit stop reasons,
5. no stable dependency on FriCAS mirror payloads.
