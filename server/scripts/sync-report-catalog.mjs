import prisma from '../src/db.js';
import { OFFICIAL_REPORT_CATALOG, syncOfficialReportCatalog } from '../src/reportCatalog.js';

try {
  await syncOfficialReportCatalog(prisma);
  console.log(`[Reports] Official report catalog synchronized: ${OFFICIAL_REPORT_CATALOG.length} reports.`);
} finally {
  await prisma.$disconnect();
}
