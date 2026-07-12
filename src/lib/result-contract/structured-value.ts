export type StructuredValueInspectionFailure = {
  reason:
    | 'invalid-root'
    | 'unsupported-value'
    | 'non-finite-number'
    | 'non-plain-object'
    | 'cyclic-value'
    | 'node-limit'
    | 'depth-limit'
    | 'byte-limit';
  message: string;
  path?: string;
};

export type StructuredValueInspection =
  | {
      ok: true;
      serialized: string;
      nodeCount: number;
      depth: number;
      byteLength: number;
    }
  | { ok: false; failure: StructuredValueInspectionFailure };

export type StructuredValueInspectionOptions = {
  label: string;
  maxNodes: number;
  maxDepth: number;
  maxBytes: number;
};

function fail(
  reason: StructuredValueInspectionFailure['reason'],
  message: string,
  path?: string,
): StructuredValueInspection {
  return { ok: false, failure: { reason, message, ...(path ? { path } : {}) } };
}

function isPlainObject(value: object) {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function inspectJsonCompatibleStructuredValue(
  input: unknown,
  options: StructuredValueInspectionOptions,
): StructuredValueInspection {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return fail('invalid-root', `${options.label} must be a plain object.`);
  }

  const active = new WeakSet<object>();
  let nodeCount = 0;
  let deepest = 0;
  let failure: StructuredValueInspectionFailure | null = null;

  const visit = (value: unknown, depth: number, valuePath: string) => {
    if (failure) return;
    nodeCount += 1;
    deepest = Math.max(deepest, depth);
    if (nodeCount > options.maxNodes) {
      failure = {
        reason: 'node-limit',
        message: `${options.label} exceeds the ${options.maxNodes} node limit.`,
        path: valuePath,
      };
      return;
    }
    if (depth > options.maxDepth) {
      failure = {
        reason: 'depth-limit',
        message: `${options.label} exceeds the ${options.maxDepth} level depth limit.`,
        path: valuePath,
      };
      return;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        failure = {
          reason: 'non-finite-number',
          message: `${options.label} numbers must be finite.`,
          path: valuePath,
        };
      }
      return;
    }
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value !== 'object') {
      failure = {
        reason: 'unsupported-value',
        message: `${options.label} contains only JSON-compatible values.`,
        path: valuePath,
      };
      return;
    }
    if (!Array.isArray(value) && !isPlainObject(value)) {
      failure = {
        reason: 'non-plain-object',
        message: `${options.label} contains only arrays and plain objects.`,
        path: valuePath,
      };
      return;
    }
    if (active.has(value)) {
      failure = {
        reason: 'cyclic-value',
        message: `${options.label} cannot contain cyclic references.`,
        path: valuePath,
      };
      return;
    }
    active.add(value);

    if (Array.isArray(value)) {
      const keys = Reflect.ownKeys(value);
      if (keys.some((key) => typeof key !== 'string')) {
        failure = {
          reason: 'unsupported-value',
          message: `${options.label} array keys must be strings.`,
          path: valuePath,
        };
      } else if ((keys as string[]).some(
        (key) => key !== 'length' && !/^(0|[1-9]\d*)$/u.test(key),
      )) {
        failure = {
          reason: 'unsupported-value',
          message: `${options.label} arrays cannot carry custom properties.`,
          path: valuePath,
        };
      } else {
        for (let index = 0; index < value.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
          if (!descriptor?.enumerable || !('value' in descriptor)) {
            failure = {
              reason: 'unsupported-value',
              message: `${options.label} arrays must contain enumerable data values without gaps.`,
              path: `${valuePath}[${index}]`,
            };
            break;
          }
          visit(descriptor.value, depth + 1, `${valuePath}[${index}]`);
        }
      }
    } else {
      const names = Object.getOwnPropertyNames(value);
      if (Reflect.ownKeys(value).length !== names.length) {
        failure = {
          reason: 'unsupported-value',
          message: `${options.label} object keys must be strings.`,
          path: valuePath,
        };
      } else {
        for (const key of names) {
          const descriptor = Object.getOwnPropertyDescriptor(value, key);
          if (!descriptor?.enumerable || !('value' in descriptor)) {
            failure = {
              reason: 'unsupported-value',
              message: `${options.label} properties must be enumerable data values.`,
              path: `${valuePath}.${key}`,
            };
            break;
          }
          visit(descriptor.value, depth + 1, `${valuePath}.${key}`);
        }
      }
    }
    active.delete(value);
  };

  visit(input, 1, '$');
  if (failure) return { ok: false, failure };

  const serialized = JSON.stringify(input);
  const byteLength = new TextEncoder().encode(serialized).byteLength;
  if (byteLength > options.maxBytes) {
    return fail(
      'byte-limit',
      `${options.label} exceeds the ${options.maxBytes} byte limit.`,
    );
  }
  return { ok: true, serialized, nodeCount, depth: deepest, byteLength };
}
