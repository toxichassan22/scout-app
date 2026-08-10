import assert from 'node:assert/strict';
import { isSessionRevoked } from '../src/middleware/auth.js';

// A genuinely dead session must be reported as revoked.
assert.equal(isSessionRevoked(Object.assign(new Error('jwt malformed'), { name: 'JsonWebTokenError' })), true, 'a bad signature is a revoked session');
assert.equal(isSessionRevoked(Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' })), true, 'an expired token is a revoked session');
assert.equal(isSessionRevoked(new Error('revoked')), true, 'a bumped authVersion is a revoked session');
assert.equal(isSessionRevoked(new Error('device_revoked')), true, 'a revoked device is a revoked session');
assert.equal(isSessionRevoked(new Error('device_required')), true, 'a token with no device is a revoked session');
assert.equal(isSessionRevoked(new Error('invalid_claims')), true, 'malformed claims are a revoked session');

// Anything else means the check could not be completed. Treating these as
// revoked is what used to sign every connected team and judge out at once
// whenever the database was briefly unavailable during a deploy.
assert.equal(isSessionRevoked(new Error('SQLITE_BUSY: database is locked')), false, 'a locked database is not a revoked session');
assert.equal(isSessionRevoked(Object.assign(new Error('connection closed'), { code: 'P1017' })), false, 'a dropped database connection is not a revoked session');
assert.equal(isSessionRevoked(new Error('Cannot read properties of undefined')), false, 'an unexpected bug is not a revoked session');
assert.equal(isSessionRevoked(undefined), false, 'a missing error is not a revoked session');
assert.equal(isSessionRevoked(null), false, 'a null error is not a revoked session');
assert.equal(isSessionRevoked({}), false, 'a non-error value is not a revoked session');

console.log('session revocation unit tests passed: infrastructure failures never end a live session');
