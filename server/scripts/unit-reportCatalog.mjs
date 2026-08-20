import assert from 'node:assert/strict';
import { OFFICIAL_REPORT_CATALOG, OFFICIAL_REPORT_IDS, resolveOfficialReportId, syncOfficialProgramSchedule, syncOfficialReportCatalog } from '../src/reportCatalog.js';

assert.equal(OFFICIAL_REPORT_CATALOG.length, 19);
assert.equal(new Set(OFFICIAL_REPORT_IDS).size, 19);
assert.deepEqual(
  OFFICIAL_REPORT_CATALOG.reduce((counts, report) => ({ ...counts, [report.field]: (counts[report.field] || 0) + 1 }), {}),
  { 'المجال العلمي': 3, 'المجال الكشفي': 4, 'المجال الفني': 4, 'المجال الثقافي': 2, 'المجال الديني': 4, 'المجال الرياضي': 2 },
);
assert.equal(new Set(OFFICIAL_REPORT_CATALOG.map(report => report.slug)).size, 19);
assert.equal(resolveOfficialReportId('report-ai-models'), 'comp-report-catalog-02');
assert.equal(resolveOfficialReportId('comp-report-17'), 'comp-report-catalog-02');
assert.equal(resolveOfficialReportId('report_model_presentation'), 'comp-report-catalog-02');

const upserts = [];
await syncOfficialReportCatalog({
  competition: {
    upsert: async args => { upserts.push(args); },
  },
});
assert.equal(upserts.length, 19);
assert.equal(upserts.every(({ create }) => create.type === 'manual_judged' && !('field' in create)), true);
assert.equal(OFFICIAL_REPORT_CATALOG.some(report => report.id === 'comp-report-catalog-16' && report.slug === 'report-carnival' && report.name === 'الكرنفال'), true);
assert.equal(OFFICIAL_REPORT_CATALOG.some(report => report.id === 'comp-schedule-6' && report.slug === 'sports-1' && report.name === 'المجال الرياضي'), true);
assert.equal(OFFICIAL_REPORT_CATALOG.some(report => report.id === 'comp-schedule-11' && report.slug === 'sports-2' && report.name === 'تكملة المجال الرياضي'), true);
assert.equal(OFFICIAL_REPORT_CATALOG.some(report => report.id === 'comp-schedule-23' && report.slug === 'king-ciphers' && report.name === 'كينج الشفرات'), true);
assert.equal(OFFICIAL_REPORT_CATALOG.some(report => report.id === 'comp-report-catalog-17' && report.slug === 'report-knots' && report.name === 'عقد وربطات'), true);

const agendaUpdates = [];
await syncOfficialProgramSchedule({
  systemSetting: { findUnique: async () => null },
  competition: { upsert: async () => {}, updateMany: async () => {} },
  agendaItem: { updateMany: async args => agendaUpdates.push(args) },
  $transaction: async callback => callback({
    competition: { upsert: async () => {}, updateMany: async () => {} },
    agendaItem: { updateMany: async args => agendaUpdates.push(args) },
    systemSetting: { upsert: async () => {} },
  }),
});
assert.equal(agendaUpdates.length, 30);
assert.equal(agendaUpdates.find(item => item.where.id === 'agenda-official-11')?.data.startTime, '11:30');
assert.equal(agendaUpdates.find(item => item.where.id === 'agenda-official-18')?.data.startTime, '15:00');

console.log('report catalog unit tests passed: 19 grouped reports and final 30-row program sync');
