import prisma from '../src/db.js';
import { recalculateAllTeamStandings } from '../src/teamStanding.js';

// One-off script to seed/recalculate TeamStanding from Score.
// Run manually after a fresh deploy or if the leaderboard looks wrong.

async function main() {
  await prisma.$transaction(async (tx) => recalculateAllTeamStandings(tx));
  const count = await prisma.teamStanding.count();
  console.log(`TeamStanding seeded/updated: ${count} rows`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
