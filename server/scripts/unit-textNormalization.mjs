import assert from 'node:assert/strict';
import { normalizeArabicText } from '../src/textNormalization.js';

assert.equal(normalizeArabicText('  مصر  '), 'مصر', 'trims whitespace');
assert.equal(normalizeArabicText('أإآٱ'), 'اااا', 'unifies alef variants');
assert.equal(normalizeArabicText('ة'), 'ه', 'unifies ta marbuta');
assert.equal(normalizeArabicText('مَصْر'), 'مصر', 'removes tashkeel and collapses spaces');
assert.equal(normalizeArabicText('١٢٣'), '123', 'converts Arabic-Indic digits');
assert.equal(normalizeArabicText('۱۲۳'), '123', 'converts Eastern-Arabic digits');
assert.equal(normalizeArabicText('Hello World'), 'hello world', 'lowercase and collapse spaces');
assert.equal(normalizeArabicText(null), '', 'handles null');
assert.equal(normalizeArabicText(), '', 'handles undefined');
assert.equal(normalizeArabicText('Egypt'), normalizeArabicText('egypt'), 'case insensitivity');
assert.equal(normalizeArabicText('القـاهـرة'), 'القاهره', 'alef + ta marbuta normalization');

console.log('textNormalization unit tests passed');
