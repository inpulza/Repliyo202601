/**
 * Child process used by the guard tests to observe real Node exit semantics.
 *
 * Usage: tsx tests/fixtures/transientGuardProcess.ts <transient|fatal|rejection>
 * A transient failure must be absorbed and let the process reach SURVIVED (0);
 * anything else must terminate the process with exit code 1.
 */
import { registerTransientSocketGuards } from '../../server/dbTransientErrors';

registerTransientSocketGuards();

const mode = process.argv[2];

setTimeout(() => {
  if (mode === 'transient') {
    const wrapped = new Error('read ECONNRESET') as Error & { code: string };
    wrapped.code = 'ECONNRESET';
    throw { type: 'error', message: 'read ECONNRESET', error: wrapped };
  }
  if (mode === 'rejection') {
    void Promise.reject(new Error('genuine application bug'));
    return;
  }
  throw new Error('genuine application bug');
}, 1);

setTimeout(() => {
  console.log('SURVIVED');
  process.exit(0);
}, 400);
