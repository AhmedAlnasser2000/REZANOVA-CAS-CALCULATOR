/** Private synchronous arithmetic budget, shared by computation and verification. */
export type AlgebraErrorCode = 'invalid-input' | 'domain-mismatch' | 'division-by-zero'
  | 'nonexact-division' | 'resource-limit' | 'verification-failed';

export class AlgebraError extends Error {
  readonly code: AlgebraErrorCode;
  readonly reason: string;
  constructor(code: AlgebraErrorCode, reason: string) {
    super(`${code}: ${reason}`);
    this.name = 'AlgebraError';
    this.code = code;
    this.reason = reason;
  }
}

export function demand(condition: boolean, code: AlgebraErrorCode, reason: string): asserts condition {
  if (!condition) throw new AlgebraError(code, reason);
}

export interface ExecutionLimits {
  readonly work: number;
  readonly integerBits: number;
  readonly degree: number;
  /** Cumulative units: array slots, records, string characters and bigint limbs. */
  readonly allocation: number;
}

export class ExecutionContext {
  readonly limits: Readonly<ExecutionLimits>;
  #work = 0;
  #allocation = 0;
  #stopped: AlgebraError | undefined;
  constructor(limits: ExecutionLimits) {
    for (const key of ['work', 'integerBits', 'degree', 'allocation'] as const) {
      demand(Number.isSafeInteger(limits[key]) && limits[key] >= (key === 'integerBits' ? 1 : 0),
        'invalid-input', `invalid ${key} limit`);
    }
    this.limits = Object.freeze({ ...limits });
    Object.freeze(this);
  }
  get usage() { return { work: this.#work, allocation: this.#allocation }; }
  #stop(reason: string): never {
    this.#stopped = new AlgebraError('resource-limit', reason);
    throw this.#stopped;
  }
  #alive() { if (this.#stopped) throw this.#stopped; }
  tick(units = 1): void {
    this.#alive();
    demand(Number.isSafeInteger(units) && units >= 0, 'invalid-input', 'invalid work charge');
    if (units > this.limits.work - this.#work) this.#stop('work');
    this.#work += units;
  }
  allocate(units: number): void {
    this.tick();
    demand(Number.isSafeInteger(units) && units >= 0, 'invalid-input', 'invalid allocation charge');
    if (units > this.limits.allocation - this.#allocation) this.#stop('allocation');
    this.#allocation += units;
  }
  degree(degree: number): void {
    this.tick();
    demand(Number.isSafeInteger(degree) && degree >= -1, 'invalid-input', 'invalid degree');
    if (degree > this.limits.degree) this.#stop('degree');
  }
  integer(value: bigint): number {
    this.tick();
    demand(typeof value === 'bigint', 'invalid-input', 'expected bigint');
    const magnitude = value < 0n ? -value : value;
    // Reject huge existing operands before constructing a binary string.
    if ((magnitude >> BigInt(this.limits.integerBits)) !== 0n) this.#stop('integer-bits');
    // Find a tight upper bound without converting the magnitude through Number.
    // Charge shift scratch space and reserve string capacity before conversion.
    let capacity = 1;
    while (capacity < this.limits.integerBits) {
      this.allocate(Math.ceil(this.limits.integerBits / 64));
      if ((magnitude >> BigInt(capacity)) === 0n) break;
      capacity = Math.min(this.limits.integerBits, capacity * 2);
    }
    this.allocate(capacity + Math.ceil(capacity / 64));
    return magnitude === 0n ? 0 : magnitude.toString(2).length;
  }
  integerText(text: string): void {
    this.tick();
    if (text.length > Math.ceil(this.limits.integerBits * Math.LOG10E * Math.LN2) + 1)
      this.#stop('integer-text-size');
    this.allocate(text.length);
  }
  add(a: bigint, b: bigint): bigint {
    this.integer(a); this.integer(b);
    const result = a + b; // At most one extra bit; checked immediately.
    this.integer(result);
    return result;
  }
  multiply(a: bigint, b: bigint): bigint {
    const ab = this.integer(a), bb = this.integer(b);
    if (a === 0n || b === 0n) return 0n;
    if (ab + bb - 1 > this.limits.integerBits) this.#stop('integer-product-bits');
    const result = a * b;
    this.integer(result);
    return result;
  }
  quotient(a: bigint, b: bigint): bigint {
    this.integer(a); this.integer(b);
    demand(b !== 0n, 'division-by-zero', 'integer quotient');
    const result = a / b;
    this.integer(result);
    return result;
  }
  remainder(a: bigint, b: bigint): bigint {
    this.integer(a); this.integer(b);
    demand(b !== 0n, 'division-by-zero', 'integer remainder');
    return a % b;
  }
}
