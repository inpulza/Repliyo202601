const LOCAL_SESSION_SECRET = "dev-secret-for-local-only";

export function isReplitEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.REPL_ID || env.REPLIT_DEPLOYMENT);
}

export function isProductionEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "production" || isReplitEnvironment(env);
}

export function resolveSessionSecret(env: NodeJS.ProcessEnv = process.env): string {
  const configuredSecret = env.SESSION_SECRET;

  if (isProductionEnvironment(env) && !configuredSecret) {
    throw new Error(
      "[Session] FATAL: SESSION_SECRET environment variable is required in production! Set it in your secrets before deploying.",
    );
  }

  return configuredSecret || LOCAL_SESSION_SECRET;
}

export const isReplit = isReplitEnvironment();
export const isProduction = isProductionEnvironment();
export const sessionSecret = resolveSessionSecret();
