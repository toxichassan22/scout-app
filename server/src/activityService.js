import crypto from 'node:crypto';
import prisma from './db.js';

export const ACTIVITY_CATALOG = [
  { slug: 'color-hunter', name: 'Color Hunter', description: 'طابق اللون المستهدف خلال عشر جولات.', minPlayers: 1, maxPlayers: 1, config: { kind: 'color', rounds: 10, rewards: [100, 70, 50, 30, 20] } },
  { slug: 'guess-number', name: 'Guess the Number', description: 'غرفة تخمين جماعية من 3 إلى 10 لاعبين.', minPlayers: 3, maxPlayers: 10, config: { kind: 'guess', autoWaitSeconds: 60, rewards: [100, 70, 50, 30, 20, 10] } },
  { slug: 'easter-egg', name: 'Easter Egg', description: 'اكتشف أماكن النادي وصوّر اللقطة المطابقة.', minPlayers: 1, maxPlayers: 1, config: { kind: 'easter', rewards: [100, 70, 50] } },
  { slug: 'hacker-sandbox', name: 'Hacker Sandbox', description: 'تحديات CTF آمنة ببيانات وهمية ومعزولة.', minPlayers: 1, maxPlayers: 1, config: { kind: 'hacker', rewards: [100, 70, 50] } },
];

export const HACKER_CHALLENGES = [
  { title: 'تحدي التحقق الوهمي', prompt: 'أي ممارسة تمنع قبول مدخلات غير متوقعة في نموذج تسجيل الدخول؟', options: ['التحقق من النوع والطول على السيرفر', 'إخفاء الزر فقط', 'تغيير لون الحقل'], answer: 0 },
  { title: 'تحدي الصلاحيات', prompt: 'أين يجب التأكد من أن المستخدم أدمن قبل تعديل نتيجة؟', options: ['في الواجهة فقط', 'في السيرفر قبل العملية', 'في اسم الزر'], answer: 1 },
  { title: 'تحدي السجلات', prompt: 'ما أفضل طريقة لتتبع عملية حساسة في نظام مسابقات؟', options: ['حذف السجل بعد العملية', 'تسجيل الحدث والفاعل والتوقيت', 'عدم تسجيل أي شيء'], answer: 1 },
];

export const SHOP_CATALOG = [
  { slug: 'campfire-theme', name: 'ثيم نار المخيم', description: 'ثيم تجميلي لصفحات الفريق.', category: 'cosmetic', price: 50, effect: { theme: 'campfire' } },
  { slug: 'scout-badge', name: 'شارة الكشاف', description: 'شارة تظهر بجانب اسم الفريق في الأنشطة.', category: 'cosmetic', price: 75, effect: { badge: 'scout' } },
  { slug: 'neon-frame', name: 'إطار نيون', description: 'إطار تجميلي للبطاقات والنتائج.', category: 'cosmetic', price: 100, effect: { frame: 'neon' } },
];

function parseJson(value, fallback = {}) {
  try { return JSON.parse(value || ''); } catch { return fallback; }
}

export async function ensureActivityCatalog(client = prisma) {
  for (const activity of ACTIVITY_CATALOG) {
    await client.activity.upsert({
      where: { slug: activity.slug },
      update: { name: activity.name, description: activity.description, config: JSON.stringify(activity.config) },
      create: { slug: activity.slug, name: activity.name, description: activity.description, config: JSON.stringify(activity.config), isOpen: true },
    }).catch(async error => {
      if (error.code !== 'P2025') throw error;
      await client.activity.upsert({ where: { slug: activity.slug }, update: { name: activity.name, description: activity.description, config: JSON.stringify(activity.config) }, create: { slug: activity.slug, name: activity.name, description: activity.description, config: JSON.stringify(activity.config), isOpen: true } });
    });
  }
  for (const item of SHOP_CATALOG) {
    await client.shopItem.upsert({ where: { slug: item.slug }, update: { name: item.name, description: item.description, category: item.category, price: item.price, effect: JSON.stringify(item.effect), isActive: true }, create: { slug: item.slug, name: item.name, description: item.description, category: item.category, price: item.price, effect: JSON.stringify(item.effect) } });
  }
}

export function getCatalogEntry(slug) {
  return ACTIVITY_CATALOG.find(activity => activity.slug === slug) || null;
}

export function getActivityConfig(activity) {
  const catalog = getCatalogEntry(activity.slug);
  return { ...(catalog?.config || {}), ...parseJson(activity.config, {}) };
}

export function generateRoomCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export function generateColorTarget() {
  return { r: crypto.randomInt(0, 256), g: crypto.randomInt(0, 256), b: crypto.randomInt(0, 256) };
}

export function generateGuessSecret() {
  return crypto.randomInt(1, 101);
}

export async function ensureTeamWallet(tx, teamId) {
  return tx.teamWallet.upsert({ where: { teamId }, update: {}, create: { teamId } });
}

async function grantCoins(tx, { teamId, activityId, sessionId, amount, reason, metadata = {} }) {
  if (amount <= 0) return;
  const existing = await tx.walletTransaction.findFirst({ where: { teamId, sessionId, type: 'activity_reward' } });
  if (existing) return;
  await ensureTeamWallet(tx, teamId);
  await tx.teamWallet.update({ where: { teamId }, data: { balance: { increment: amount }, totalEarned: { increment: amount } } });
  await tx.walletTransaction.create({ data: { teamId, activityId, sessionId, type: 'activity_reward', amount, reason, metadata: JSON.stringify(metadata) } });
}

export async function finalizeActivityRewards(tx, sessionId) {
  const session = await tx.activitySession.findUnique({ where: { id: sessionId }, include: { activity: true, participants: { orderBy: [{ score: 'desc' }, { finishedAt: 'asc' }, { joinedAt: 'asc' }] } } });
  if (!session) return session;
  const claimed = await tx.activitySession.updateMany({ where: { id: sessionId, rewardsApplied: false }, data: { status: 'finished', endedAt: new Date(), rewardsApplied: true } });
  if (claimed.count === 0) return tx.activitySession.findUnique({ where: { id: sessionId }, include: { activity: true, participants: true } });
  const config = getActivityConfig(session.activity);
  const ranked = session.participants;
  for (let index = 0; index < ranked.length; index += 1) {
    await tx.activityParticipant.update({ where: { id: ranked[index].id }, data: { rank: index + 1 } });
  }

  if (config.kind === 'guess') {
    const firstTeamIds = [];
    for (const participant of ranked) {
      if (!firstTeamIds.includes(participant.teamId)) firstTeamIds.push(participant.teamId);
    }
    if (firstTeamIds.length > 1) {
      for (const participant of ranked) {
        if (firstTeamIds.indexOf(participant.teamId) !== ranked.findIndex(item => item.teamId === participant.teamId)) continue;
        const amount = Number(config.rewards?.[participant.rank - 1] || 0);
        await grantCoins(tx, { teamId: participant.teamId, activityId: session.activityId, sessionId, amount, reason: `مكافأة المركز ${participant.rank} في ${session.activity.name}`, metadata: { rank: participant.rank, score: participant.score } });
      }
    }
  } else {
    for (const participant of ranked) {
      const amount = Number(config.rewards?.[participant.rank - 1] || Math.max(0, Math.round(participant.score)));
      await grantCoins(tx, { teamId: participant.teamId, activityId: session.activityId, sessionId, amount, reason: `مكافأة نشاط ${session.activity.name}`, metadata: { rank: participant.rank, score: participant.score } });
    }
  }

  return tx.activitySession.findUnique({ where: { id: sessionId }, include: { activity: true, participants: true } });
}
