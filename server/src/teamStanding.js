import prisma from './db.js';

export async function recalculateTeamStanding(teamId, tx) {
  const aggregate = await tx.score.aggregate({
    where: { teamId },
    _sum: { total: true },
    _max: { submittedAt: true },
  });

  const totalScore = Number(aggregate._sum.total || 0);
  const latestSubmitted = aggregate._max.submittedAt || null;

  return tx.teamStanding.upsert({
    where: { teamId },
    update: { totalScore, latestSubmitted },
    create: { teamId, totalScore, latestSubmitted },
  });
}

export async function recalculateAllTeamStandings(tx) {
  const teams = await tx.team.findMany({ select: { id: true } });

  // Reset standings first so old records for teams with zero scores are cleared
  await tx.teamStanding.deleteMany({});

  const updates = await Promise.all(
    teams.map(async ({ id }) => {
      const aggregate = await tx.score.aggregate({
        where: { teamId: id },
        _sum: { total: true },
        _max: { submittedAt: true },
      });
      return {
        teamId: id,
        totalScore: Number(aggregate._sum.total || 0),
        latestSubmitted: aggregate._max.submittedAt || null,
      };
    }),
  );

  if (updates.length > 0) {
    await tx.teamStanding.createMany({ data: updates });
  }
}

export async function ensureTeamStandings(prismaClient = prisma) {
  const count = await prismaClient.teamStanding.count();
  if (count > 0) return;
  await prismaClient.$transaction(async (tx) => recalculateAllTeamStandings(tx));
}
