import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma, { databaseReady } from '../src/db.js';

const isProduction = process.env.NODE_ENV === 'production';
const explicitlyAllowed = process.env.BOOTSTRAP_ADMIN === 'true';
const username = String(process.env.INITIAL_ADMIN_USERNAME || '').trim();
const password = String(process.env.INITIAL_ADMIN_PASSWORD || '');

if (isProduction && !explicitlyAllowed) throw new Error('Admin bootstrap refused. Set BOOTSTRAP_ADMIN=true for a planned one-time operation.');
if (!username || password.length < 6) throw new Error('Admin bootstrap requires INITIAL_ADMIN_USERNAME and an INITIAL_ADMIN_PASSWORD of at least 6 characters.');

await databaseReady;
try {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.admin.findUnique({ where: { username }, select: { id: true } });
  if (existing) {
    await prisma.admin.update({ where: { id: existing.id }, data: { passwordHash, authVersion: { increment: 1 } } });
    console.log(`Admin credentials reset for ${username}.`);
  } else {
    await prisma.admin.create({ data: { username, passwordHash } });
    console.log(`Admin account created for ${username}.`);
  }
} finally {
  await prisma.$disconnect();
}
