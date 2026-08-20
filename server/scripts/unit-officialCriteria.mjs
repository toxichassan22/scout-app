import assert from 'node:assert/strict';
import { OFFICIAL_CRITERIA_BY_SLUG } from '../src/officialCompetitionCriteria.js';

// Totals come from the official «توزيع درجات مسابقات المهرجان» sheet.
const OFFICIAL_TOTALS = {
  report_quran: 30,
  report_hadith: 20,
  report_prophets: 20,
  report_tilawa_festival: 25,
  report_campfire: 35,
  report_poster: 50,
  report_exhibition: 40,
  report_art_workshop: 45,
  report_art_piece: 25,
  report_video: 55,
  video_design: 55,
  report_carnival: 50,
  report_scout_magazine: 50,
  king_ciphers: 50,
  report_scout_model: 60,
  report_reels: 50,
  report_knots: 50,
  report_science_ideas: 70,
  report_model_presentation: 50,
  report_prep_video: 35,
  report_smart_detector: 60,
  report_first_aid: 25,
  report_public_service: 50,
  report_community_vision: 25,
};

for (const [slug, expectedTotal] of Object.entries(OFFICIAL_TOTALS)) {
  const criteria = JSON.parse(OFFICIAL_CRITERIA_BY_SLUG[slug] || 'null');
  assert.ok(Array.isArray(criteria) && criteria.length > 0, `${slug} must have official criteria`);
  const total = criteria.reduce((sum, criterion) => sum + Number(criterion.maxScore || 0), 0);
  assert.equal(total, expectedTotal, `${slug} total must match the official sheet`);
  assert.ok(criteria.every(criterion => criterion.key && criterion.label), `${slug} criteria need keys and labels`);
  assert.equal(new Set(criteria.map(criterion => criterion.key)).size, criteria.length, `${slug} keys must be unique`);
}

// The AI models competition uses its own sheet, not the scientific research one.
assert.equal(OFFICIAL_CRITERIA_BY_SLUG.report_ai_models, OFFICIAL_CRITERIA_BY_SLUG.report_model_presentation);
assert.notEqual(OFFICIAL_CRITERIA_BY_SLUG.report_ai_models, OFFICIAL_CRITERIA_BY_SLUG.report_science_ideas);

const artWorkshop = JSON.parse(OFFICIAL_CRITERIA_BY_SLUG.report_art_workshop);
assert.ok(artWorkshop.some(criterion => criterion.label === 'عدد (2 فرد)'), 'the art workshop counts two members');

const scoutModel = JSON.parse(OFFICIAL_CRITERIA_BY_SLUG.report_scout_model);
assert.ok(scoutModel.some(criterion => criterion.label === 'تنوع الدورات'), 'the model sheet lists cycle variety');

console.log('official criteria unit tests passed: every sheet total matches the approved distribution');
