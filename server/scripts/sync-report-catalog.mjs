import prisma from '../src/db.js';
import { OFFICIAL_REPORT_CATALOG, syncOfficialCompetitionAgendaLinks, syncOfficialJudgeCompetitionCatalog, syncOfficialReportCatalog } from '../src/reportCatalog.js';

try {
  await syncOfficialReportCatalog(prisma);
  await syncOfficialJudgeCompetitionCatalog(prisma);
  await syncOfficialCompetitionAgendaLinks(prisma);
  console.log(`[Reports] Official report catalog synchronized: ${OFFICIAL_REPORT_CATALOG.length} reports.`);
} finally {
  await prisma.$disconnect();
}
