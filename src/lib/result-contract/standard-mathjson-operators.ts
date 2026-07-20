// Snapshot of Compute Engine 0.54.1's standard-library definition names.
// Keeping this lookup data-only avoids loading the full engine in display validation.
const STANDARD_MATHJSON_OPERATORS = new Set(`
About Abs AbsArg Add AdjugateMatrix AiryAi AiryBi And Annotated Apart Apply Approx
ApproxEqual ApproxNotEqual Arccos Arccot Arccsc Arcosh Arcoth Arcsch Arcsec Arcsin
Arctan Arctan2 Argument Arsech Arsinh Artanh Assign Assume At AvogadroConstant
BaseForm BellNumber BesselI BesselJ BesselK BesselY Beta BinCounts Binomial Block
BoltzmannConstant Boole BuiltinFunction Cancel CanonicalForm CartesianProduct
CatalanConstant Ceil CholeskyDecomposition Choose Chop Chunk CoefficientList Color
ColorContrast ColorFromColorspace ColorMix ColorToColorspace ColorToString Colormap
Combinations Complement ComplexInfinity ComplexNumbers ComplexRoots Condition Congruent
Conjugate ConjugateTranspose Contains ContinuationPlaceholder ContrastingColor Cos Cosh
Cot Coth Count CountIf Csc Csch Cycle D DMS Declare Degree Degrees Delimiter Denominator
Derivative Determinant Diagonal DictionaryFrom Digamma DigitsFrom Dimension Discriminant
Distribute Divide Drop Eigen Eigenvalues Eigenvectors Element ElementaryCharge EmptySet
Equal Equivalent Erf ErfInv Erfc Error ErrorCode EulerGamma Eulerian Evaluate EvaluateAt
Exists ExistsUnique Exp Exp2 Expand ExpandAll ExponentialE ExtendedComplexNumbers
ExtendedIntegers ExtendedRationalNumbers ExtendedRealNumbers Factor Factorial Factorial2
False Fibonacci Fill Filter Find First FixedPoint Flatten Floor ForAll Fract FresnelC
FresnelS Function GCD Gamma GammaLn GasConstant GoldenRatio GraphemeClusters
GravitationalConstant Greater GreaterEqual GroupBy Half Haversine Head Heaviside Histogram
Hold Hom HorizontalSpacing Hypot Identity IdentityMatrix If Imaginary ImaginaryNumbers
ImaginaryUnit Implies IndexOf IndexWhere Infimum IntegerString Integers Integrate
InterquartileRange Intersection Interval Inverse InverseFunction InverseHaversine
InvisibleOperator IsAbundant IsCenteredSquare IsCompatibleUnit IsComposite IsEmpty IsEven
IsHappy IsOctahedral IsOdd IsPerfect IsPrime IsSame IsSatisfiable IsSquare IsTautology
IsTriangular Iterate Join Julia Kernel KeyValuePair KroneckerDelta Kurtosis LCM
LUDecomposition LambertW Last Latex LatexString Lb Less LessEqual Lg Limit Limits Linspace
List ListFrom Ln Log Log10 Log2 Loop MachineEpsilon Mandelbrot Map Matrix MatrixMultiply
Max Mean Median Min MinimalCNF MinimalDNF Mod Mode Most Mu0 Multinomial Multiply N ND
NIntegrate NLimit NPartition NaN Nand Negate NegativeInfinity NegativeIntegers
NegativeNumbers NonNegativeIntegers NonNegativeNumbers NonPositiveIntegers
NonPositiveNumbers Nor Norm Not NotApprox NotApproxEqual NotApproxNotEqual NotElement
NotEqual NotExists NotForAll NotGreater NotGreaterNotEqual NotLess NotLessNotEqual
NotPrecedes NotSubset NotSucceeds NotSuperset NotSupersetEqual NotTildeEqual
NotTildeFullEqual Nothing Numbers Numerator NumeratorDenominator OnesMatrix Or Ordering Pair
Parse PartialFraction Partition Permutations Pi PlanckConstant PlusMinus PolyGamma
Polynomial PolynomialDegree PolynomialGCD PolynomialQuotient PolynomialRemainder
PolynomialRoots PopulationStandardDeviation PopulationVariance Position PositiveInfinity
PositiveIntegers PositiveNumbers Power PowerSet PreDecrement PreIncrement Precedes
Predicate PrimeImplicants PrimeImplicates Product PseudoInverse QRDecomposition Quantity
QuantityMagnitude QuantityUnit Quartiles Random RandomExpression Range Rank Rational
RationalNumbers Real RealNumbers RecordFrom Reduce ReleaseHold Remainder Repeat Reshape Rest
Reverse Root RotateLeft RotateRight Round Rule SVD Sample Sec Sech Second Sequence Set
SetFrom SetMinus Shape Shuffle Sigma0 Sigma1 SigmaMinus1 Sign Signature Simplify Sin Sinc
Single Sinh Skewness Slice SlidingWindow Sort SpeedOfLight Sqrt Square StandardDeviation
StandardGravity StefanBoltzmannConstant Stirling String StringFrom Subfactorial Subscript
Subset SubsetEqual Subtract Succeeds Sum Superset SupersetEqual Supremum Symbol
SymmetricDifference Tabulate Tail Take Tally Tan Tanh Text TildeEqual TildeFullEqual Timing
ToCNF ToDNF Together Totient Trace Transpose Trigamma Triple True Truncate TruthTable Tuple
TupleFrom Type Unevaluated UnicodeScalars Union Unique UnitConvert UnitDimension UnitSimplify
Utf16 Utf8 VacuumPermittivity Variance Vector Which Wildcard WildcardOptionalSequence
WildcardSequence Xor ZeroMatrix Zeta Zip __unit__ e i
`.trim().split(/\s+/u));

export function findCustomMathJsonOperator(value: unknown): string | undefined {
  const pending = [value];
  while (pending.length > 0) {
    const current = pending.pop();
    if (Array.isArray(current)) {
      const [operator, ...operands] = current;
      if (typeof operator === 'string' && !STANDARD_MATHJSON_OPERATORS.has(operator)) {
        return operator;
      }
      pending.push(...operands);
      continue;
    }
    if (current && typeof current === 'object') {
      const record = current as Record<string, unknown>;
      if (Array.isArray(record.fn)) pending.push(record.fn);
      if (record.dict && typeof record.dict === 'object') {
        pending.push(...Object.values(record.dict));
      }
    }
  }
  return undefined;
}
