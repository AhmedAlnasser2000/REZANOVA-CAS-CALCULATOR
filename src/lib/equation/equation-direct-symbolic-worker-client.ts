// Compatibility facade: keep root imports stable for the direct-symbolic worker client.
export {
  EQUATION_DIRECT_SYMBOLIC_FALLBACK_HOST_ID,
  EQUATION_DIRECT_SYMBOLIC_WORKER_HOST_ID,
  runEquationDirectSymbolicViaIsolatedWorker,
} from './direct-symbolic-worker/client';
