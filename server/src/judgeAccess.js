export const MAX_JUDGES_PER_COMPETITION = 2;

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
