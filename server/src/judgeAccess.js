import { getCanonicalReportId, resolveOfficialReportId } from './reportCatalog.js';

export const MAX_JUDGES_PER_COMPETITION = 2;

export const cleanCompName = name => String(name || '')
  .replace(/\s*\(.*?\)\s*/g, '')
  .replace(/المعرض الكشفي/g, '')
  .replace(/مسابقة/g, '')
  .trim();

export async function getEquivalentCompetitionIds(prisma, competitionId) {
  if (!competitionId) return [];
  try {
    const comp = await prisma.competition.findUnique({
      where: { id: competitionId },
      select: { id: true, name: true, slug: true },
    });
    if (!comp) return [competitionId];

    const targetCleanName = cleanCompName(comp.name);
    const canonicalId = getCanonicalReportId(comp.id) || getCanonicalReportId(comp.slug) || (comp.id && comp.id.startsWith('comp-') ? comp.id : null);

    const allComps = await prisma.competition.findMany({
      select: { id: true, name: true, slug: true },
    });

    const matchingIds = new Set([comp.id]);
    if (canonicalId) matchingIds.add(canonicalId);

    for (const c of allComps) {
      if (c.id === comp.id) continue;
      const cCanon = getCanonicalReportId(c.id) || getCanonicalReportId(c.slug) || (c.id && c.id.startsWith('comp-') ? c.id : null);
      if (canonicalId && cCanon === canonicalId) {
        matchingIds.add(c.id);
      } else if (targetCleanName && cleanCompName(c.name) === targetCleanName && targetCleanName.length > 0) {
        matchingIds.add(c.id);
      } else if (c.slug && comp.slug && (c.slug === comp.slug || c.slug.replace(/[-_]/g, '') === comp.slug.replace(/[-_]/g, ''))) {
        matchingIds.add(c.id);
      }
    }

    return [...matchingIds];
  } catch {
    return [competitionId];
  }
}

export async function ensureJudgeCompetitionAssignment(prisma, competitionId, judgeId) {
  return prisma.$transaction(async tx => {
    const assignments = await tx.judgeCompetition.findMany({
      where: { competitionId },
      orderBy: { createdAt: 'asc' },
    });
    const existing = assignments.find(assignment => assignment.judgeId === judgeId);
    if (existing) return { assignment: existing, created: false, count: assignments.length };
    if (assignments.length >= MAX_JUDGES_PER_COMPETITION) {
      throw Object.assign(new Error('هذه المسابقة لديها محكمان بالفعل'), { status: 409, code: 'JUDGE_LIMIT_REACHED' });
    }
    const assignment = await tx.judgeCompetition.create({ data: { competitionId, judgeId } });
    return { assignment, created: true, count: assignments.length + 1 };
  });
}

