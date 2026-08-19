import assert from 'node:assert/strict';

process.env.HF_REPORTS_REPO = '';
process.env.HF_REPORTS_TOKEN = '';

const { getHuggingFaceReportLocation, isHuggingFaceReportsConfigured } = await import('../src/huggingfaceReports.js');

assert.equal(isHuggingFaceReportsConfigured(), false);
assert.deepEqual(
  getHuggingFaceReportLocation({
    team: { id: 'team-1' },
    report: { competitionId: 'competition-1', fileUrl: '/uploads/report.pdf' },
  }),
  {
    filePath: 'reports/team-1/competition-1/current.pdf',
    metadataPath: 'reports/team-1/competition-1/metadata.json',
  },
);
assert.equal(
  getHuggingFaceReportLocation({
    team: { id: 'team-1' },
    report: { competitionId: 'competition-1', fileUrl: '/uploads/replacement.pdf' },
  }).metadataPath,
  'reports/team-1/competition-1/metadata.json',
);

console.log('Hugging Face report path unit tests passed: stable team/competition paths and disabled configuration');
