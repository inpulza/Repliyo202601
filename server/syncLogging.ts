/**
 * Verbosity switch for the per-message sync diagnostics.
 *
 * The sync loop used to emit two lines for every processed message, one of
 * them serialising the conversation participants, and reconciliation misses
 * added eight more. On a busy brand that is thousands of lines per round, and
 * the strings are built whether or not anyone reads them.
 *
 * The diagnostics are still valuable when chasing a specific sync bug, so they
 * are kept behind this flag rather than deleted. Set `SYNC_VERBOSE_LOGS=1` to
 * bring them back.
 */
export function verboseSyncLogsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.SYNC_VERBOSE_LOGS;
  return raw === "1" || raw === "true";
}
