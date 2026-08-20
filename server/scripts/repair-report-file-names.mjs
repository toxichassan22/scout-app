import 'dotenv/config';
import prisma, { databaseReady } from '../src/db.js';
import { decodeMultipartFileName } from '../src/routes/reports.js';

// Reports uploaded before the multipart filename fix stored Arabic names decoded
// as latin1. Only the display name is repaired; stored files stay untouched.
await databaseReady;

try {
  const reports = await prisma.report.findMany({ select: { id: true, fileName: true } });
  let repaired = 0;

  for (const report of reports) {
    const current = String(report.fileName || '');
    if (!current) continue;
    const decoded = decodeMultipartFileName(current);
    if (decoded === current) continue;
    await prisma.report.update({ where: { id: report.id }, data: { fileName: decoded.slice(0, 255) } });
    repaired += 1;
  }

  console.log(`[reports] repaired ${repaired} of ${reports.length} report file names`);
} finally {
  await prisma.$disconnect();
}
