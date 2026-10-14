# Special Functions Priority (Phase 3)

Date: 2026-10-14
Status: recorded for Phase 3 by user decision. Nothing here is implemented yet; see the Phase 2 and Phase 3 items (S1–S9) in the [roadmap](equation-reconstruction-roadmap.md).

## How many functions

Three hundred named functions are more than enough. Mathematica and Maple each have roughly 250–300 named special functions, SymPy about 150, and NIST's DLMF covers almost everything in tiers 1–4 below. Depth matters more than count: a function is covered only when it meets S5 (certified evaluation, derivatives and series, identities, inverses and zeros, use in the solver and as an answer, verification).

Scope by tier (S6):
- tiers 1–2 at full depth;
- tiers 3–4 with a name, numerics and a conversion rule;
- tier 5 belongs to other workspaces (number theory, combinatorics);
- tier 6 only on request.

## Layers

- **Containment:** pFq ⊂ Meijer G ⊂ holonomic (for fixed parameters).
- **Holonomic (S1):** a function held as a linear ODE with polynomial coefficients plus initial conditions.
  - Strong at: closure, exact zero tests, series via recurrences, certified numerics, creative telescoping.
  - Weak at: answers have no names, and parameters are handled one value at a time.
  - Its operator algebra is built in Phase 2 for ODEs.
- **pFq (S2):** names and recognition, transformations, symbolic parameters.
- **Meijer G (S3):** definite integrals and transforms, products of special functions.
- **Outside the holonomic class (S4), each with its own module:**
  - the Γ family (Γ, ψ, B; Hölder's theorem: Γ satisfies no algebraic ODE);
  - inverse functions (Lambert W first, the most valuable for Equation);
  - tan and the elliptic functions sn, cn, dn, ℘ (infinitely many poles);
  - ζ and the polylogarithm in s;
  - Painlevé transcendents (nonlinear ODEs).

**Order for Equation specifically:**
1. Solvers for refused equations: Lambert W on all branches, Wright ω, generalized W.
2. ODE answers: Airy, Bessel, ₁F₁/U, Whittaker, ₂F₁, Legendre, Hermite, Laguerre, parabolic cylinder.
3. Inverses and zeros: Bessel and Airy zeros, Γ⁻¹, inverse erf, inverse incomplete gamma and beta.

## The list, most to least valuable

**Tier 1, the essentials:**

1 Gamma Γ · 2 log-Gamma lnΓ · 3 factorial and generalized binomial · 4 erf · 5 erfc · 6 Lambert W₀ · 7 Lambert W₋₁ / W_k · 8 Beta B(a,b) · 9 digamma ψ · 10 polygamma ψ⁽ⁿ⁾ · 11 lower incomplete gamma γ(a,x) / P · 12 upper incomplete gamma Γ(a,x) / Q · 13 regularized incomplete beta I_x(a,b) · 14 normal CDF Φ · 15 probit Φ⁻¹ · 16 erf⁻¹, erfc⁻¹ · 17 Bessel J_ν · 18 Bessel Y_ν · 19 modified Bessel I_ν · 20 modified Bessel K_ν · 21 Hankel H⁽¹⁾, H⁽²⁾ · 22 spherical Bessel j_n · 23 spherical Bessel y_n · 24 Airy Ai · 25 Airy Bi · 26 Riemann ζ · 27 Ei · 28 E₁ / E_n · 29 Si · 30 Ci · 31 li · 32 dilogarithm Li₂ · 33 polylogarithm Li_s · 34 ₂F₁ · 35 ₁F₁ (Kummer M) · 36 Tricomi U · 37 complete elliptic K · 38 complete elliptic E · 39 incomplete F(φ|m) · 40 incomplete E(φ|m) · 41 Legendre P_n · 42 associated Legendre P_l^m · 43 spherical harmonics Y_l^m · 44 Chebyshev T_n · 45 Chebyshev U_n · 46 Hermite H_n · 47 generalized Laguerre L_n^(α) · 48 Fresnel C · 49 Fresnel S · 50 erfi

**Tier 2, very common:**

51 Heaviside θ and Dirac δ · 52 sinc · 53 Bernoulli numbers and polynomials · 54 Euler numbers and polynomials · 55 harmonic numbers H_n^(r) · 56 Pochhammer (a)_n · 57 Hurwitz ζ(s,a) · 58 Dirichlet η · 59 Gegenbauer C_n^(λ) · 60 Jacobi P_n^(α,β) · 61 probabilists' Hermite He_n · 62 sn · 63 cn · 64 dn · 65 Jacobi amplitude am · 66 complete Π(n|m) · 67 incomplete Π(n;φ|m) · 68 Carlson R_F · 69 R_D · 70 R_J · 71 R_C · 72 Dawson F · 73 Faddeeva w(z) · 74 Voigt profile · 75 scaled erfcx · 76 inverse incomplete gamma · 77 inverse incomplete beta · 78 Stirling numbers, 1st kind · 79 Stirling numbers, 2nd kind · 80 Bell numbers and polynomials · 81 Struve H_ν · 82 modified Struve L_ν · 83 Kelvin ber, bei · 84 Kelvin ker, kei · 85 Whittaker M · 86 Whittaker W · 87 Legendre Q_ν^μ · 88 Legendre P_ν^μ (non-integer degree) · 89 parabolic cylinder D_ν / U(a,x) · 90 parabolic cylinder V(a,x) · 91 Mathieu ce, se · 92 Mathieu characteristic values a_n, b_n · 93 Coulomb wave F_L, G_L · 94 generalized hypergeometric pFq · 95 Meijer G · 96 Bessel zeros · 97 Airy zeros · 98 Jacobi θ₁–θ₄ · 99 Weierstrass ℘ · 100 Weierstrass ζ and σ

**Tier 3, standard in physics, engineering and statistics:**

101 spherical Hankel h_n · 102 modified spherical i_n, k_n · 103 Riccati–Bessel (Mie scattering) · 104 jinc · 105 Shi · 106 Chi · 107 E_p for non-integer p · 108 complete Fermi–Dirac F_j · 109 incomplete Fermi–Dirac · 110 Bose–Einstein integrals · 111 Debye D_n · 112 Langevin L(x) · 113 inverse Langevin · 114 Brillouin B_J · 115 Clausen Cl_n · 116 Lerch Φ · 117 Dirichlet β · 118 Legendre χ_s · 119 inverse tangent integral Ti₂ · 120 Nielsen S_{n,p} · 121 harmonic polylogarithms · 122 Goncharov multiple polylogarithms · 123 Riemann–Siegel Z, θ · 124 Riemann ξ · 125 Dirichlet L-functions · 126 Barnes G · 127 hyperfactorial and superfactorial · 128 Wright ω · 129 Mittag-Leffler E_{α,β} · 130 Wright function · 131 Fox H · 132 Owen's T · 133 Marcum Q · 134 bivariate normal CDF · 135 multivariate normal CDF · 136 noncentral t CDF · 137 noncentral beta / F CDF · 138 Kolmogorov distribution · 139 Tracy–Widom · 140 Painlevé II · 141 Painlevé I · 142 Painlevé III–VI · 143 Zernike polynomials · 144 Bernstein polynomials · 145 B-splines · 146 Clebsch–Gordan / Wigner 3j · 147 Wigner 6j / Racah W · 148 Wigner 9j · 149 Wigner D and small d · 150 Gaunt coefficients

**Tier 4, specialized but standard:**

151 vector spherical harmonics · 152 spin-weighted spherical harmonics · 153 Anger J_ν · 154 Weber E_ν · 155 Lommel s and S · 156 Lommel and Neumann polynomials · 157 Bickley Ki_n · 158 Scorer Gi, Hi · 159 Pearcey integral · 160 cuspoid / swallowtail integrals · 161 Fresnel auxiliary f, g · 162 Goodwin–Staton · 163 Abramowitz functions · 164 synchrotron F, G · 165 Planck / Einstein functions · 166 elliptic nome q(m) and its inverse · 167 Dedekind η · 168 Jacobi zeta Z · 169 Heuman Λ₀ · 170 Bulirsch cel / D(m) · 171 the other nine Jacobi elliptic functions · 172 inverse Jacobi elliptic functions · 173 lemniscate sl, cl · 174 Klein j / modular λ · 175 Eisenstein E₂, E₄, E₆ · 176 Appell F₁ · 177 Appell F₂–F₄ · 178 Lauricella F_D · 179 Horn functions · 180 ₀F₁ · 181 ₃F₂ · 182 general Heun · 183 confluent Heun · 184 double-, bi- and tri-confluent Heun · 185 prolate spheroidal · 186 oblate spheroidal · 187 Lamé · 188 conical (Mehler) functions · 189 toroidal functions · 190 Bessel polynomials · 191 Krawtchouk · 192 Charlier · 193 Meixner · 194 Hahn · 195 Racah polynomials · 196 Wilson · 197 Askey–Wilson · 198 Meixner–Pollaczek · 199 continuous and dual Hahn · 200 rational Legendre and Chebyshev functions

**Tier 5, number theory, combinatorics and q-analogs:**

201 prime-counting π(x) · 202 Riemann R(x) · 203 offset Li · 204 Chebyshev θ(x), ψ(x) · 205 Möbius μ · 206 Euler totient φ · 207 divisor σ_k · 208 von Mangoldt Λ · 209 Liouville λ · 210 prime zeta P(s) · 211 partitions p(n) · 212 Ramanujan τ · 213 Catalan numbers · 214 Lah numbers · 215 Eulerian numbers · 216 Genocchi · 217 tangent / zigzag numbers · 218 Fubini numbers · 219 Narayana · 220 Motzkin · 221 Schröder · 222 Delannoy · 223 Gregory coefficients · 224 Nörlund polynomials · 225 Stieltjes γ_n · 226 Fibonacci and Lucas polynomials · 227 q-Pochhammer · 228 q-Gamma · 229 q-binomial · 230 basic hypergeometric rφs · 231 Ramanujan θ f(a,b) · 232 Rogers–Ramanujan G, H · 233 Rogers dilogarithm L · 234 Bloch–Wigner D · 235 Lobachevsky Л · 236 Glaisher–Clausen Sl · 237 multiple zeta values · 238 elliptic polylogarithms · 239 double / multiple Gamma · 240 K-function · 241 Gamma ratio Γ(x+a)/Γ(x+b) · 242 inverse Gamma Γ⁻¹ · 243 inverse digamma · 244 Gudermannian and its inverse · 245 versine / haversine family · 246 Dirichlet kernel · 247 Dickman ρ · 248 Buchstab ω · 249 hypergeometric functions of matrix argument · 250 Bessel functions of matrix argument

**Tier 6, niche but real:**

251 Riemann θ (multi-dimensional) · 252 Siegel modular forms · 253 ellipsoidal harmonics · 254 Hill functions · 255 Bessel–Clifford · 256 generalized Airy · 257 Airy–Hardy integrals · 258 Humbert Φ₁, Φ₂, Ψ, Ξ · 259 Kampé de Fériet · 260 Lauricella F_A, F_B, F_C · 261 Srivastava triple series · 262 Bessel–Maitland · 263 Prabhakar Mittag-Leffler · 264 Miller–Ross E_t · 265 Le Roy function · 266 Touchard polynomials · 267 Coulomb spheroidal functions · 268 Laguerre functions (non-integer degree) · 269 Hermite functions (non-integer ν) · 270 Chebyshev V_n, W_n · 271 Walsh functions · 272 Haar / Rademacher functions · 273 Hubbell rectangular-source function · 274 Sievert integral · 275 Hantush well function · 276 generalized Lambert W (Mező) · 277 tetration / super-logarithm · 278 Toronto function · 279 Nuttall Q · 280 incomplete Bose–Einstein · 281 Chandrasekhar H-function · 282 Lommel–Weber Ω · 283 plasma dispersion Z · 284 incomplete Airy · 285 Carlson R_G · 286 generalized Marcum Q_M · 287 Rayleigh function σ_n(ν) · 288 K_iν (imaginary order) · 289 radial Mathieu Mc, Ms · 290 spheroidal eigenvalues λ_mn · 291 Kloosterman sums · 292 generalized incomplete gamma Γ(a,x,y) · 293 mock theta functions · 294 Rogers–Szegő polynomials · 295 Al-Salam–Chihara · 296 little and big q-Jacobi · 297 Pollaczek polynomials · 298 Lommel two-variable U_ν, V_ν · 299 entire exponential integral Ein · 300 Fox–Wright pΨq

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- attribution_basis: live
