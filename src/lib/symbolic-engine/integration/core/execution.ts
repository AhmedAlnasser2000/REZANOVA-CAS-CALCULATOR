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
  #operation: { readonly token: object; readonly integers: Map<bigint, number>; readonly cleanups: (() => void)[] } | undefined;
  constructor(limits: ExecutionLimits) {
    for (const key of ['work', 'integerBits', 'degree', 'allocation'] as const) {
      demand(Number.isSafeInteger(limits[key]) && limits[key] >= (key === 'integerBits' ? 1 : 0),
        'invalid-input', `invalid ${key} limit`);
    }
    this.limits = Object.freeze({ ...limits });
    Object.freeze(this);
  }
  get usage() { return { work: this.#work, allocation: this.#allocation }; }
  /** Identity only; cache contents and authority are never exposed. */
  get operationToken(): object | undefined { return this.#operation?.token; }
  /** Every entry operation starts cold, even if the caller reuses this context. */
  operation<T>(run: () => T): T {
    this.allocate(5);
    const previous = this.#operation;
    this.#operation = { token: Object.freeze({}), integers: new Map(), cleanups: [] };
    try { return run(); }
    finally {
      for (const cleanup of this.#operation.cleanups) cleanup();
      this.#operation.integers.clear(); this.#operation = previous;
    }
  }
  /** Internal cache cleanup is unconditional, including after sticky exhaustion. */
  onOperationEnd(cleanup: () => void): void {
    demand(this.#operation !== undefined, 'invalid-input', 'missing operation scope');
    this.allocate(3); this.#operation.cleanups.push(cleanup);
  }
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
    // Truncation scratch is bounded by the configured limit, even for an
    // enormous rejected input. A right shift could allocate a huge remainder.
    const negative = value < 0n;
    const width = negative && this.limits.integerBits < Number.MAX_SAFE_INTEGER ? this.limits.integerBits + 1 : this.limits.integerBits;
    this.allocate(Math.ceil(width / 64));
    const narrowed = negative ? BigInt.asIntN(width, value) : BigInt.asUintN(width, value);
    if (narrowed !== value) this.#stop('integer-bits');
    const cache = this.#operation?.integers, saved = cache?.get(value);
    if (saved !== undefined) return saved;
    if (negative) this.allocate(Math.ceil((this.limits.integerBits + 1) / 64));
    const magnitude = negative ? -value : value;
    let bits: number;
    if (magnitude <= 0xffff_ffffn) {
      // Conversion is exact in this explicitly bounded 32-bit range.
      bits = 32 - Math.clz32(Number(magnitude));
    } else {
      // One conversion, with capacity reserved before allocating the string.
      // Include the possible negative boundary power's extra bit.
      this.allocate(this.limits.integerBits + 1);
      bits = magnitude.toString(2).length;
    }
    if (bits > this.limits.integerBits) this.#stop('integer-bits');
    if (cache) {
      // A cache capacity controls retention only; eviction never rejects math.
      if (cache.size === 2048) cache.clear();
      this.allocate(3 + Math.ceil(bits / 64)); cache.set(value, bits);
    }
    return bits;
  }
  integerText(text: string): void {
    this.tick();
    if (text.length > Math.ceil(this.limits.integerBits * Math.LOG10E * Math.LN2) + 1)
      this.#stop('integer-text-size');
    this.allocate(text.length);
  }
  add(a: bigint, b: bigint): bigint {
    const ab = this.integer(a), bb = this.integer(b);
    this.allocate(Math.ceil((Math.max(ab, bb) + 1) / 64));
    const result = a + b; // At most one extra bit; checked immediately.
    this.integer(result);
    return result;
  }
  multiply(a: bigint, b: bigint): bigint {
    const ab = this.integer(a), bb = this.integer(b);
    if (a === 0n || b === 0n) return 0n;
    if (ab + bb - 1 > this.limits.integerBits) this.#stop('integer-product-bits');
    this.allocate(Math.ceil((ab + bb) / 64));
    const result = a * b;
    this.integer(result);
    return result;
  }
  quotient(a: bigint, b: bigint): bigint {
    const ab = this.integer(a), bb = this.integer(b);
    demand(b !== 0n, 'division-by-zero', 'integer quotient');
    this.allocate(2 * Math.ceil(ab / 64) + Math.ceil(bb / 64));
    const result = a / b;
    this.integer(result);
    return result;
  }
  remainder(a: bigint, b: bigint): bigint {
    const ab = this.integer(a), bb = this.integer(b);
    demand(b !== 0n, 'division-by-zero', 'integer remainder');
    this.allocate(Math.ceil(ab / 64) + Math.ceil(bb / 64));
    return a % b;
  }
}
