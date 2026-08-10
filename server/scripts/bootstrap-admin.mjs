import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma, { databaseReady } from '../src/db.js';

// BOOTSTRAP_ADMIN=true means "make sure an admin exists". It is idempotent: an
// account that is already there is left alone, so forgetting to switch the flag off
// costs nothing. Rewriting the password on every deploy — which is what this script
// used to do — reset the operator's own credentials and invalidated their session
// each time, mid-event included.
// BOOTSTRAP_ADMIN=reset is the deliberate "I lost the password" path.
const mode = String(process.env.BOOTSTRAP_ADMIN || '').trim().toLowerCase();
const isProduction = process.env.NODE_ENV === 'production';
const ensure = mode === 'true';
const forceReset = mode === 'reset';
const username = String(process.env.INITIAL_ADMIN_USERNAME || '').trim();
const password = String(process.env.INITIAL_ADMIN_PASSWORD || '');

if (isProduction && !ensure && !forceReset) throw new Error('Admin bootstrap refused. Set BOOTSTRAP_ADMIN=true to ensure an account exists, or BOOTSTRAP_ADMIN=reset to replace its password.');
if (!username || password.length < 6) throw new Error('Admin bootstrap requires INITIAL_ADMIN_USERNAME and an INITIAL_ADMIN_PASSWORD of at least 6 characters.');

await databaseReady;
try {
  const existing = await prisma.admin.findUnique({ where: { username }, select: { id: true } });

  if (existing && !forceReset) {
    console.log(`Admin ${username} already exists; leaving the password untouched. Use BOOTSTRAP_ADMIN=reset to replace it.`);
  } else if (existing) {
    // authVersion is bumped so tokens signed against the old password stop working.
    await prisma.admin.update({ where: { id: existing.id }, data: { passwordHash: await bcrypt.hash(password, 12), authVersion: { increment: 1 } } });
    console.log(`Admin credentials reset for ${username}. Existing admin sessions were signed out.`);
  } else {
    await prisma.admin.create({ data: { username, passwordHash: await bcrypt.hash(password, 12) } });
    console.log(`Admin account created for ${username}.`);
  }
} finally {
  await prisma.$disconnect();
}
