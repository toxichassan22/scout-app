import { getOfficialCriteria } from './officialCompetitionCriteria.js';

export function parseCompetitionCriteria(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value || '[]') : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * One source of truth for the maximum score of every competition.
 * Manual competitions use the sum of their criteria; older digital
 * competitions fall back to their configured question count.
 */
export function getCompetitionMaxScore(competition) {
  const official = getOfficialCriteria(competition);
  const criteria = parseCompetitionCriteria(official || competition?.criteria);
  if (criteria.length > 0) {
    return criteria.reduce((sum, criterion) => {
      const max = Number(criterion?.maxScore);
      return sum + (Number.isFinite(max) && max >= 0 ? max : 0);
    }, 0);
  }

  // A manual competition without an official distribution must never inherit
  // a digital question count such as 100.
  if (competition?.type === 'manual_judged') return 0;

  const questionCount = Number(competition?.questionCount);
  return Number.isFinite(questionCount) && questionCount > 0 ? questionCount : 0;
}

export function validateScoreLimit(total, competition) {
  const numericTotal = Number(total);
  const maxScore = getCompetitionMaxScore(competition);
  if (!Number.isFinite(numericTotal) || numericTotal < 0) {
    return { valid: false, maxScore, error: 'الدرجة يجب أن تكون رقماً يساوي صفراً أو أكثر' };
  }
  if (numericTotal > maxScore) {
    return { valid: false, maxScore, error: `الدرجة لا يمكن أن تتجاوز الحد الأقصى للمسابقة (${maxScore} نقطة)` };
  }
  return { valid: true, maxScore, total: numericTotal };
}
