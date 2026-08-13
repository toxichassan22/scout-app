import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prismaDir = path.resolve(__dirname, '..', 'prisma');
const schemaPath = path.join(prismaDir, 'schema.prisma');
const pgSchemaPath = path.join(prismaDir, 'schema.pg.prisma');

async function syncToSupabase() {
  const targetUrl = process.env.SUPABASE_DATABASE_URL || process.env.DIRECT_URL || (process.env.DATABASE_URL?.startsWith('postgres') ? process.env.DATABASE_URL : '');
  if (!targetUrl || (!targetUrl.startsWith('postgres://') && !targetUrl.startsWith('postgresql://'))) {
    console.log('[Supabase Sync] Skipping: No valid PostgreSQL connection string found in SUPABASE_DATABASE_URL or DIRECT_URL.');
    return;
  }

  console.log('[Supabase Sync] Converting schema for PostgreSQL deployment...');
  let content = await readFile(schemaPath, 'utf8');
  content = content.replace('provider = "sqlite"', 'provider = "postgresql"');
  
  const envForPrisma = { ...process.env, DATABASE_URL: targetUrl };
  if (process.env.DIRECT_URL) {
    content = content.replace(
      'url      = env("DATABASE_URL")',
      'url      = env("DATABASE_URL")\n  directUrl = env("DIRECT_URL")'
    );
  }

  await writeFile(pgSchemaPath, content, 'utf8');

  try {
    console.log('[Supabase Sync] Pushing schema tables to Supabase PostgreSQL...');
    execSync(`npx prisma db push --schema="${pgSchemaPath}" --skip-generate`, {
      stdio: 'inherit',
      env: envForPrisma,
    });
    console.log('✅ [Supabase Sync] Successfully created and synced all tables in Supabase!');
  } catch (err) {
    console.error('❌ [Supabase Sync] Failed to push schema to Supabase:', err.message);
  } finally {
    try {
      await unlink(pgSchemaPath);
    } catch {}
  }
}

syncToSupabase();
