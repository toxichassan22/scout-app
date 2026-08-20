import assert from 'node:assert/strict';
import { decodeMultipartFileName } from '../src/routes/reports.js';

const arabicName = 'تقرير الورشة الفنية.pdf';
const mangled = Buffer.from(arabicName, 'utf8').toString('latin1');

assert.equal(decodeMultipartFileName(mangled), arabicName, 'latin1 multipart names must be re-decoded as UTF-8');
assert.equal(decodeMultipartFileName(arabicName), arabicName, 'already-correct Arabic names must stay unchanged');
assert.equal(decodeMultipartFileName('report.pdf'), 'report.pdf', 'ASCII names must stay unchanged');
assert.equal(decodeMultipartFileName(''), '', 'missing names must stay empty');

console.log('upload file name unit tests passed: Arabic multipart names are decoded as UTF-8');
