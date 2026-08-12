import assert from 'node:assert/strict';
import { OFFICIAL_REPORT_CATALOG, OFFICIAL_REPORT_IDS, syncOfficialReportCatalog } from '../src/reportCatalog.js';

assert.equal(OFFICIAL_REPORT_CATALOG.length, 15);
assert.equal(new Set(OFFICIAL_REPORT_IDS).size, 15);
assert.deepEqual(
  OFFICIAL_REPORT_CATALOG.reduce((counts, report) => ({ ...counts, [report.field]: (counts[report.field] || 0) + 1 }), {}),
  { 'المجال العلمي': 3, 'المجال الكشفي': 3, 'المجال الفني': 4, 'المجال الثقافي': 1, 'المجال الديني': 4 },
);
assert.equal(new Set(OFFICIAL_REPORT_CATALOG.map(report => report.slug)).size, 15);

const upserts = [];
await syncOfficialReportCatalog({
  competition: {
    upsert: async args => { upserts.push(args); },
  },
});
assert.equal(upserts.length, 15);
assert.equal(upserts.every(({ create }) => create.type === 'manual_judged' && !('field' in create)), true);

console.log('report catalog unit tests passed: 15 grouped reports and safe upserts');
