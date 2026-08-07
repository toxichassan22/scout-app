import assert from 'node:assert/strict';
import { strongPassword } from '../src/validation.js';

assert.equal(strongPassword('admin123'), 'admin123', 'accepts six-character alphanumeric passwords');
assert.equal(strongPassword('123456'), '123456', 'accepts six numeric characters');
assert.equal(strongPassword('abc12!'), 'abc12!', 'accepts six characters with symbols');
assert.throws(() => strongPassword('abc12'), /بين 6 و256/, 'rejects passwords shorter than six characters');
assert.throws(() => strongPassword(''), /بين 6 و256/, 'rejects empty passwords');
console.log('password policy unit tests passed: minimum six characters');
