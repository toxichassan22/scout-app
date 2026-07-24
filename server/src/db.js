import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';

const prisma = new PrismaClient();

// Enable SQLite WAL mode & auto-heal missing/corrupted database tables on startup
async function initDatabase() {
  try {
    await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;');
    
    // Check if Team table exists
    await prisma.team.findFirst();
    console.log('[DB] SQLite database connected and validated.');
  } catch (err) {
    console.warn('[DB Init Warning]:', err.message || err);
    if (
      err.message &&
      (err.message.includes('does not exist') ||
       err.message.includes('malformed') ||
       err.message.includes('no such table'))
    ) {
      console.warn('[DB Auto-Repair] Database tables missing or malformed. Executing automated schema push & seed...');
      try {
        const serverDir = path.resolve(process.cwd(), 'server');
        const cwd = process.cwd().endsWith('server') ? process.cwd() : serverDir;
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd });
        execSync('node src/seed.js', { stdio: 'inherit', cwd });
        console.log('[DB Auto-Repair] Database schema created and seeded successfully!');
      } catch (pushErr) {
        console.error('[DB Auto-Repair Error]: Failed to push schema automatically:', pushErr.message);
      }
    }
  }
}

initDatabase();

export default prisma;
