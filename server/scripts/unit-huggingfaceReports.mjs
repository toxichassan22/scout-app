import assert from 'node:assert/strict';

process.env.HF_REPORTS_REPO = '';
process.env.HF_REPORTS_TOKEN = '';

const { getHuggingFaceReportLocation, getHuggingFaceSyncStatus, isHuggingFaceReportsConfigured, startHuggingFaceReportsSync } = await import('../src/huggingfaceReports.js');

assert.equal(isHuggingFaceReportsConfigured(), false);
assert.equal(getHuggingFaceSyncStatus().running, false);
assert.equal(startHuggingFaceReportsSync([], 'uploads').skipped, true);
assert.deepEqual(
  getHuggingFaceReportLocation({
    team: { id: 'team-12345678', label: 'فريق النصر' },
    competitionName: 'مسابقة الاختبار',
    report: { competitionId: 'competition-1', fileUrl: '/uploads/report.pdf' },
  }),
  {
    filePath: 'reports/فريق_النصر-team-123/مسابقة_الاختبار-competition-1/current.pdf',
    metadataPath: 'reports/فريق_النصر-team-123/مسابقة_الاختبار-competition-1/metadata.json',
  },
);
assert.equal(
  getHuggingFaceReportLocation({
    team: { id: 'team-12345678', label: 'فريق النصر' },
    competitionName: 'مسابقة الاختبار',
    report: { competitionId: 'competition-1', fileUrl: '/uploads/replacement.pdf' },
  }).metadataPath,
  'reports/فريق_النصر-team-123/مسابقة_الاختبار-competition-1/metadata.json',
);

console.log('Hugging Face report path unit tests passed: stable team/competition paths and disabled configuration');
