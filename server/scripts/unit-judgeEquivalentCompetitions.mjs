import assert from 'node:assert/strict';
import { getEquivalentCompetitionIds, cleanCompName } from '../src/judgeAccess.js';

// Test cleanCompName
assert.equal(cleanCompName('مسابقة تصميم الفيديو الكشفي (المعرض الكشفي)'), 'تصميم الفيديو الكشفي');
assert.equal(cleanCompName('مسابقة الجغرافيا'), 'الجغرافيا');

// Mock Prisma for getEquivalentCompetitionIds
const mockCompetitions = [
  { id: 'comp-video-1', name: 'الفيديو', slug: 'video_design' },
  { id: 'uuid-video-seed', name: 'مسابقة تصميم الفيديو الكشفي', slug: 'video' },
  { id: 'comp-report-catalog-18', name: 'المشروع المجتمعي', slug: 'report-community-vision' },
  { id: 'uuid-community-seed', name: 'المشروع المجتمعي', slug: 'report_community_project' },
  { id: 'comp-digital-1', name: 'مسابقة عبقرينو', slug: 'genius' },
];

const mockPrisma = {
  competition: {
    findUnique: async ({ where }) => mockCompetitions.find(c => c.id === where.id) || null,
    findMany: async () => mockCompetitions,
  }
};

// Video competitions should resolve both canonical comp-video-1 and seed video competition
const videoEquiv = await getEquivalentCompetitionIds(mockPrisma, 'comp-video-1');
assert.equal(videoEquiv.includes('comp-video-1'), true);
assert.equal(videoEquiv.includes('uuid-video-seed'), true);

const videoSeedEquiv = await getEquivalentCompetitionIds(mockPrisma, 'uuid-video-seed');
assert.equal(videoSeedEquiv.includes('comp-video-1'), true);
assert.equal(videoSeedEquiv.includes('uuid-video-seed'), true);

// Community project competitions should resolve both
const commEquiv = await getEquivalentCompetitionIds(mockPrisma, 'comp-report-catalog-18');
assert.equal(commEquiv.includes('comp-report-catalog-18'), true);
assert.equal(commEquiv.includes('uuid-community-seed'), true);

// Independent competition resolves itself
const geniusEquiv = await getEquivalentCompetitionIds(mockPrisma, 'comp-digital-1');
assert.deepEqual(geniusEquiv, ['comp-digital-1']);

console.log('judge equivalent competitions unit tests passed: cross-slug and cross-name deduplication verified');
