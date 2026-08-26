import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isTransientSocketError } from '../../server/dbTransientErrors';

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

  it('unwraps the nested error the ws ErrorEvent carries', () => {
    assert.equal(isTransientSocketError({ type: 'error', error: { code: 'ECONNRESET' } }), true);
    assert.equal(isTransientSocketError({ error: { code: 'ECONNRESET' } }), true);
  });

  it('leaves genuine application errors alone so they still crash the process', () => {
    assert.equal(isTransientSocketError(new TypeError('x is not a function')), false);
    assert.equal(isTransientSocketError(new Error('column "foo" does not exist')), false);
    assert.equal(isTransientSocketError({ code: 'ENOENT' }), false);
    assert.equal(isTransientSocketError({ type: 'error', error: null }), false);
  });

  it('rejects non-object reasons instead of guessing', () => {
    assert.equal(isTransientSocketError(null), false);
    assert.equal(isTransientSocketError(undefined), false);
    assert.equal(isTransientSocketError('ECONNRESET'), false);
    assert.equal(isTransientSocketError(42), false);
  });
});
