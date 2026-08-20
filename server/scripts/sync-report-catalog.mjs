import prisma from '../src/db.js';
import { OFFICIAL_REPORT_CATALOG, syncOfficialCompetitionAgendaLinks, syncOfficialReportCatalog } from '../src/reportCatalog.js';

try {
  await syncOfficialReportCatalog(prisma);
  await syncOfficialCompetitionAgendaLinks(prisma);
  console.log(`[Reports] Official report catalog synchronized: ${OFFICIAL_REPORT_CATALOG.length} reports.`);
} finally {
  await prisma.$disconnect();
}
