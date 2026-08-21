import assert from 'node:assert/strict';
import { OFFICIAL_JUDGE_COMPETITION_CATALOG, OFFICIAL_REPORT_CATALOG, OFFICIAL_REPORT_IDS, OFFICIAL_UPLOAD_COMPETITION_IDS, resolveOfficialReportId, syncOfficialJudgeCompetitionCatalog, syncOfficialProgramSchedule, syncOfficialReportCatalog } from '../src/reportCatalog.js';

assert.equal(OFFICIAL_REPORT_CATALOG.length, 17);
assert.equal(OFFICIAL_REPORT_IDS.length, 17);
assert.deepEqual(
  OFFICIAL_REPORT_CATALOG.reduce((counts, report) => ({ ...counts, [report.field]: (counts[report.field] || 0) + 1 }), {}),
  { 'المجال العلمي': 3, 'المجال الكشفي': 3, 'المجال الفني': 4, 'المجال الثقافي': 2, 'المجال الديني': 4, 'مجال الخدمة العامة': 1 },
);
assert.equal(new Set(OFFICIAL_REPORT_CATALOG.map(report => report.slug)).size, 17);
assert.equal(OFFICIAL_UPLOAD_COMPETITION_IDS.length, 17);
assert.equal(resolveOfficialReportId('report-ai-models'), 'comp-report-catalog-02');
assert.equal(resolveOfficialReportId('comp-report-17'), 'comp-report-catalog-02');
assert.equal(resolveOfficialReportId('report_model_presentation'), 'comp-report-catalog-02');
assert.equal(resolveOfficialReportId('report-community-vision'), 'comp-report-catalog-18');
assert.equal(resolveOfficialReportId('report_community_project'), 'comp-report-catalog-18');

const upserts = [];
await syncOfficialReportCatalog({
  competition: {
    upsert: async args => { upserts.push(args); },
  },
});
assert.equal(upserts.length, 17);
assert.equal(upserts.every(({ create }) => create.type === 'manual_judged' && !('field' in create)), true);
assert.equal(OFFICIAL_REPORT_CATALOG.some(report => report.id === 'comp-video-1' && report.slug === 'video_design' && report.name === 'الفيديو'), true);
assert.equal(OFFICIAL_REPORT_CATALOG.some(report => report.id === 'comp-report-catalog-18' && report.slug === 'report-community-vision' && report.name === 'المشروع المجتمعي'), true);
assert.equal(resolveOfficialReportId('comp-report-catalog-11'), 'comp-video-1');
assert.equal(resolveOfficialReportId('report-video'), 'comp-video-1');

const judgeUpserts = [];
await syncOfficialJudgeCompetitionCatalog({ competition: { upsert: async args => judgeUpserts.push(args) } });
assert.equal(judgeUpserts.length, 4);
assert.equal(OFFICIAL_JUDGE_COMPETITION_CATALOG.some(report => report.id === 'comp-schedule-6' && report.name === 'المجال الرياضي'), true);
assert.equal(OFFICIAL_JUDGE_COMPETITION_CATALOG.some(report => report.id === 'comp-report-catalog-17' && report.slug === 'report-knots'), true);

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

console.log('report catalog unit tests passed: 17 report competitions, 4 judge-only competitions, and final 30-row program sync');
