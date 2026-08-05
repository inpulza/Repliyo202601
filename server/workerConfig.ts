const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

export interface WorkerConfig {
  syncEnabled: boolean;
  lifecycleEnabled: boolean;
}

function resolveBooleanFlag(value: string | undefined, fallback: boolean, name: string): boolean {
  if (value === undefined || value.trim() === "") return fallback;

  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;

  throw new Error(
    `[Workers] ${name} must be one of: 1, 0, true, false, yes, no, on, off.`,
  );
}

export function resolveWorkerConfig(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  const backgroundWorkersEnabled = resolveBooleanFlag(
    env.BACKGROUND_WORKERS_ENABLED,
    true,
    "BACKGROUND_WORKERS_ENABLED",
  );

  return {
    syncEnabled: resolveBooleanFlag(
      env.SYNC_WORKER_ENABLED,
      backgroundWorkersEnabled,
      "SYNC_WORKER_ENABLED",
    ),
    lifecycleEnabled: resolveBooleanFlag(
      env.LIFECYCLE_WORKER_ENABLED,
      backgroundWorkersEnabled,
      "LIFECYCLE_WORKER_ENABLED",
    ),
  };
}

export const workerConfig = resolveWorkerConfig();
