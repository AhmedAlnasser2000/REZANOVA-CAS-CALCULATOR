/**
 * Private Equation core execution context.
 *
 * The only ways a computation stops early are the three typed resource stops
 * below. There is deliberately no degree, depth, size, branch or count limit:
 * cost is charged in work and allocation units, and large integer operations
 * are charged by their limb sizes before they run.
 */
export const EQUATION_STOPS = ['work', 'allocation', 'cancelled'] as const;
export type EquationStop = (typeof EQUATION_STOPS)[number];

export type EquationErrorCode = 'invalid-input' | 'domain-mismatch' | 'division-by-zero'
  | 'nonexact-division' | 'resource' | 'verification-failed';

export class EquationAlgebraError extends Error {
  readonly code: EquationErrorCode;
  readonly reason: string;
  readonly stop: EquationStop | undefined;
  constructor(code: EquationErrorCode, reason: string, stop?: EquationStop) {
    super(`${code}: ${reason}`);
    this.name = 'EquationAlgebraError';
    this.code = code;
    this.reason = reason;
    this.stop = stop;
  }
}

/** Mathematical or input failure. Resource stops come only from the context. */
export function demand(condition: boolean, code: Exclude<EquationErrorCode, 'resource'>, reason: string): asserts condition {
  if (!condition) throw new EquationAlgebraError(code, reason);
}

export interface ExecutionBudget {
  /** Logical work units: primitive steps and limb-proportional integer costs. */
  readonly work: number;
  /** Cumulative allocation units: array slots, records and integer limbs. Not heap bytes. */
  readonly allocation: number;
}

export interface ExecutionOptions {
  /** Polled on every charge so an adapter can stop a running computation. */
  readonly shouldCancel?: () => boolean;
}

export class ExecutionContext {
  readonly budget: Readonly<ExecutionBudget>;
  #work = 0;
  #allocation = 0;
  #cancelled = false;
  #stopped: EquationAlgebraError | undefined;
  readonly #shouldCancel: (() => boolean) | undefined;

  constructor(budget: ExecutionBudget, options: ExecutionOptions = {}) {
    for (const key of ['work', 'allocation'] as const) {
      demand(Number.isSafeInteger(budget[key]) && budget[key] >= 0, 'invalid-input', `invalid ${key} budget`);
    }
    demand(options.shouldCancel === undefined || typeof options.shouldCancel === 'function', 'invalid-input', 'invalid cancellation hook');
    this.budget = Object.freeze({ work: budget.work, allocation: budget.allocation });
    this.#shouldCancel = options.shouldCancel;
    Object.freeze(this);
  }

  get usage() { return { work: this.#work, allocation: this.#allocation }; }
  get stopped(): EquationStop | undefined { return this.#stopped?.stop; }

  #stop(stop: EquationStop): never {
    this.#stopped = new EquationAlgebraError('resource', `stopped: ${stop}`, stop);
    throw this.#stopped;
  }

  /** Request cooperative cancellation; the next charge stops with `cancelled`. */
  cancel(): void { this.#cancelled = true; }

  checkCancelled(): void {
    if (this.#stopped) throw this.#stopped;
    if (this.#cancelled || this.#shouldCancel?.()) this.#stop('cancelled');
  }

  tick(units = 1): void {
    this.checkCancelled();
    demand(Number.isSafeInteger(units) && units >= 0, 'invalid-input', 'invalid work charge');
    if (units > this.budget.work - this.#work) this.#stop('work');
    this.#work += units;
  }

  allocate(units: number): void {
    this.tick();
    demand(Number.isSafeInteger(units) && units >= 0, 'invalid-input', 'invalid allocation charge');
    if (units > this.budget.allocation - this.#allocation) this.#stop('allocation');
    this.#allocation += units;
  }

  /** Charge an operation proportional to `work` units that produces `limbs` new limbs. */
  charge(work: number, limbs: number): void {
    this.tick(Math.max(1, Math.ceil(work)));
    this.allocate(Math.max(0, Math.ceil(limbs)));
  }
}
