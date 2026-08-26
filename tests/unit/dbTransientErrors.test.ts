import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  isTransientSocketError,
  registerTransientSocketGuards,
  type TransientGuardTarget,
} from '../../server/dbTransientErrors';

describe('transient Neon socket errors', () => {
  it('recognizes the socket error codes that must not kill the process', () => {
    assert.equal(isTransientSocketError({ code: 'ECONNRESET' }), true);
    assert.equal(isTransientSocketError({ code: 'EPIPE' }), true);
    assert.equal(isTransientSocketError({ code: 'ETIMEDOUT' }), true);
  });

  it('recognizes the transport messages the driver reports without a code', () => {
    assert.equal(isTransientSocketError(new Error('socket hang up')), true);
    assert.equal(
      isTransientSocketError(
        new Error('WebSocket was closed before the connection was established'),
      ),
      true,
    );
  });

  it('unwraps the socket error the ws ErrorEvent carries', () => {
    assert.equal(isTransientSocketError({ type: 'error', error: { code: 'ECONNRESET' } }), true);
    assert.equal(
      isTransientSocketError({ type: 'error', error: new Error('socket hang up') }),
      true,
    );
    assert.equal(isTransientSocketError({ error: { code: 'ECONNRESET' } }), true);
  });

  it('requires real transport evidence, not just the ErrorEvent shape', () => {
    assert.equal(
      isTransientSocketError({ type: 'error', error: new Error('application failure') }),
      false,
    );
    assert.equal(isTransientSocketError({ type: 'error', error: { code: 'EACCES' } }), false);
    assert.equal(isTransientSocketError({ type: 'error', error: null }), false);
  });

  it('leaves genuine application errors alone so they still crash the process', () => {
    assert.equal(isTransientSocketError(new TypeError('x is not a function')), false);
    assert.equal(isTransientSocketError(new Error('column "foo" does not exist')), false);
    assert.equal(isTransientSocketError({ code: 'ENOENT' }), false);
  });

  it('rejects non-object reasons instead of guessing', () => {
    assert.equal(isTransientSocketError(null), false);
    assert.equal(isTransientSocketError(undefined), false);
    assert.equal(isTransientSocketError('ECONNRESET'), false);
    assert.equal(isTransientSocketError(42), false);
  });
});

function captureGuards() {
  const listeners = new Map<string, (reason: unknown) => void>();
  const exits: number[] = [];
  const logs: unknown[][] = [];
  const target: TransientGuardTarget = {
    on(event, listener) {
      listeners.set(event, listener);
      return target;
    },
    exit(code) {
      exits.push(code);
      return undefined;
    },
  };
  registerTransientSocketGuards(target, (...args) => logs.push(args));
  return { listeners, exits, logs };
}

describe('transient socket guard handlers', () => {
  it('absorbs transient failures without exiting', () => {
    const { listeners, exits, logs } = captureGuards();

    listeners.get('uncaughtException')?.({ type: 'error', error: { code: 'ECONNRESET' } });
    listeners.get('unhandledRejection')?.(new Error('socket hang up'));

    assert.deepEqual(exits, []);
    assert.equal(logs.length, 2);
  });

  it('exits with code 1 on anything that is not a transient socket failure', () => {
    const { listeners, exits } = captureGuards();

    listeners.get('uncaughtException')?.(new TypeError('x is not a function'));
    listeners.get('unhandledRejection')?.(new Error('genuine application bug'));

    assert.deepEqual(exits, [1, 1]);
  });
});

function runFixture(mode: string) {
  const tsxCli = fileURLToPath(import.meta.resolve('tsx/cli'));
  const fixture = fileURLToPath(new URL('../fixtures/transientGuardProcess.ts', import.meta.url));
  const result = spawnSync(process.execPath, [tsxCli, fixture, mode], {
    encoding: 'utf8',
    timeout: 30_000,
  });

  assert.ifError(result.error);
  return result;
}

describe('transient socket guard in a real process', () => {
  it('survives a transient socket failure', () => {
    const result = runFixture('transient');

    assert.equal(result.status, 0);
    assert.match(result.stdout, /SURVIVED/);
  });

  it('dies with exit code 1 on an uncaught application error', () => {
    const result = runFixture('fatal');

    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout, /SURVIVED/);
  });

  it('dies with exit code 1 on an unhandled rejection', () => {
    const result = runFixture('rejection');

    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout, /SURVIVED/);
  });
});
