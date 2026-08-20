import crypto from 'node:crypto';
import prisma from './db.js';

export const EASTER_EGG_STAGES = [
  { id: 'stage-01', title: 'نداء البداية', taskType: 'مهمة صوتية', task: 'غنّوا مقطعًا قصيرًا من أغنية المهرجان أمام أحد أفراد السواعد.', requiresSawaed: true, clue: '', qrCode: 'SCOUT-EASTER:stage-01' },
  { id: 'stage-02', title: 'الشفرة المعكوسة', taskType: 'فك شفرة', task: 'فكّوا الكلمة التي يعطيها لكم الأدمن باستخدام جدول الشفرة المعكوسة.', requiresSawaed: true, clue: '', qrCode: 'SCOUT-EASTER:stage-02' },
  { id: 'stage-03', title: 'سؤال المهرجان', taskType: 'بحث سريع', task: 'ابحثوا عن إجابة سؤال ثقافي قصير يكتبه الأدمن عن المهرجان أو تاريخ الكشافة.', requiresSawaed: true, clue: '', qrCode: 'SCOUT-EASTER:stage-03' },
  { id: 'stage-04', title: 'الحساب الخاطف', taskType: 'مسألة حسابية', task: 'حلّوا المسألة الحسابية البسيطة التي يكتبها الأدمن خلال دقيقة واحدة.', requiresSawaed: true, clue: '', qrCode: 'SCOUT-EASTER:stage-04' },
  { id: 'stage-05', title: 'إشارة الفريق', taskType: 'مهمة حركية', task: 'كوّنوا بأجسادكم شكلًا يرمز للكشافة أو للمهرجان والتقطوا الصورة أمام السواعد.', requiresSawaed: true, clue: '', qrCode: 'SCOUT-EASTER:stage-05' },
  { id: 'stage-06', title: 'ذاكرة المخيم', taskType: 'تحدي ذاكرة', task: 'احفظوا سلسلة الرموز أو الألوان التي يحددها الأدمن، ثم أعيدوها بالترتيب الصحيح.', requiresSawaed: true, clue: '', qrCode: 'SCOUT-EASTER:stage-06' },
  { id: 'stage-07', title: 'عين الكشاف', taskType: 'ملاحظة واستكشاف', task: 'اعثروا على التفصيلة التي يحددها الأدمن في المكان، واذكروا لونها أو موقعها بدقة.', requiresSawaed: true, clue: '', qrCode: 'SCOUT-EASTER:stage-07' },
  { id: 'stage-08', title: 'مهمة التعاون', taskType: 'عمل جماعي', task: 'نفّذوا المهمة التي يكتبها الأدمن بحيث يشارك فيها كل أفراد الفريق.', requiresSawaed: true, clue: '', qrCode: 'SCOUT-EASTER:stage-08' },
  { id: 'stage-09', title: 'رسالة إبداعية', taskType: 'تحدي إبداع', task: 'اصنعوا هتافًا أو حركة قصيرة باسم فريقكم وقدّموها أمام السواعد في أقل من دقيقة.', requiresSawaed: true, clue: '', qrCode: 'SCOUT-EASTER:stage-09' },
  { id: 'stage-10', title: 'خاتمة الرحلة', taskType: 'التحدي الأخير', task: 'اجمعوا ما تعلمتموه في المراحل السابقة ونفّذوا تحدي النهاية الذي يكتبه الأدمن للفريق.', requiresSawaed: true, clue: '', qrCode: 'SCOUT-EASTER:stage-10' },
];

export const ACTIVITY_CATALOG = [
  { slug: 'color-hunter', name: 'Color Hunter', description: 'طابق اللون المستهدف خلال عشر جولات للمتعة.', minPlayers: 1, maxPlayers: 1, config: { kind: 'color', rounds: 10 } },
  { slug: 'guess-number', name: 'Guess the Number', description: 'غرفة تخمين جماعية من 3 إلى 10 لاعبين للمتعة.', minPlayers: 3, maxPlayers: 10, config: { kind: 'guess', autoWaitSeconds: 60 } },
  { slug: 'easter-egg', name: 'Easter Egg', description: 'رحلة QR مرتبة بمهام يحددها الأدمن.', minPlayers: 1, maxPlayers: 1, config: { kind: 'easter', stages: EASTER_EGG_STAGES } },
];

function parseJson(value, fallback = {}) {
  try { return JSON.parse(value || ''); } catch { return fallback; }
}

export function normalizeEasterEggStages(stages) {
  const source = Array.isArray(stages) && stages.length ? stages : EASTER_EGG_STAGES;
  return source.map((stage, index) => {
    const num = String(index + 1).padStart(2, '0');
    const id = String(stage.id || `stage-${num}`);
    const qrCode = stage.qrCode ? String(stage.qrCode).trim() : `SCOUT-EASTER:${id}`;
    return {
      id,
      title: String(stage.title || `المرحلة ${index + 1}`),
      taskType: String(stage.taskType || (stage.requiresSawaed !== false ? 'مهمة سواعد' : 'بحث واستكشاف')),
      task: String(stage.task || ''),
      requiresSawaed: stage.requiresSawaed !== false,
      clue: String(stage.clue || ''),
      qrCode,
    };
  });
}

export async function ensureActivityCatalog(client = prisma) {
  for (const activity of ACTIVITY_CATALOG) {
    const existing = await client.activity.findUnique({ where: { slug: activity.slug }, select: { config: true } }).catch(error => {
      if (error.code === 'P2021') return null;
      throw error;
    });
    const storedConfig = parseJson(existing?.config, {});
    const config = activity.slug === 'easter-egg' && Array.isArray(storedConfig.stages)
      ? { ...activity.config, ...storedConfig, stages: normalizeEasterEggStages(storedConfig.stages) }
      : activity.config;
    await client.activity.upsert({
      where: { slug: activity.slug },
      update: { name: activity.name, description: activity.description, config: JSON.stringify(config) },
      create: { slug: activity.slug, name: activity.name, description: activity.description, config: JSON.stringify(config), isOpen: true },
    }).catch(async error => {
      if (error.code !== 'P2025') throw error;
      await client.activity.upsert({ where: { slug: activity.slug }, update: { name: activity.name, description: activity.description, config: JSON.stringify(config) }, create: { slug: activity.slug, name: activity.name, description: activity.description, config: JSON.stringify(config), isOpen: true } });
    });
  }
  await client.activity.updateMany({ where: { slug: 'hacker-sandbox', isOpen: true }, data: { isOpen: false } });
}

export function getCatalogEntry(slug) {
  return ACTIVITY_CATALOG.find(activity => activity.slug === slug) || null;
}

export function getActivityConfig(activity) {
  const catalog = getCatalogEntry(activity.slug);
  return { ...(catalog?.config || {}), ...parseJson(activity.config, {}) };
}

export function getActivityPublicConfig(config) {
  const safeConfig = { ...config };
  if (safeConfig.kind === 'easter') safeConfig.stages = normalizeEasterEggStages(safeConfig.stages).length;
  return safeConfig;
}

export function getEasterEggStages(activityOrConfig = {}) {
  const config = activityOrConfig?.slug ? getActivityConfig(activityOrConfig) : activityOrConfig;
  return normalizeEasterEggStages(config?.stages);
}

export function generateRoomCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export function generateColorTarget() {
  return { r: crypto.randomInt(0, 256), g: crypto.randomInt(0, 256), b: crypto.randomInt(0, 256) };
}

function getQrSecret() {
  return process.env.EASTER_EGG_QR_SECRET || process.env.JWT_SECRET || 'scout-camp-secret';
}

function qrSignature(stageId) {
  return crypto.createHmac('sha256', getQrSecret()).update(`easter-egg:${stageId}`).digest('hex').slice(0, 32);
}

export function getEasterEggQrPayload(stageOrIndex, stages = EASTER_EGG_STAGES) {
  const stage = typeof stageOrIndex === 'number' ? stages[stageOrIndex] : stageOrIndex;
  if (!stage) return '';
  if (stage.qrCode) return String(stage.qrCode).trim();
  const stageId = stage.id || 'stage-01';
  return `SCOUT-EASTER:${stageId}`;
}

export function matchesEasterEggQr(value, stage) {
  let provided = String(value || '').trim();
  if (!provided || !stage) return false;
  try {
    const parsed = new URL(provided);
    provided = parsed.searchParams.get('qr') || parsed.searchParams.get('code') || provided;
  } catch {}
  provided = decodeURIComponent(provided).trim();

  const stageId = String(stage.id || '').trim();
  const rawQr = stage.qrCode ? String(stage.qrCode).trim() : '';

  // 1. Direct exact or lowercase match
  if (rawQr && provided.toLowerCase() === rawQr.toLowerCase()) return true;

  // 2. Standard stable format match: `SCOUT-EASTER:stage-01`, `SCOUT-EASTER:stage-1`, `SCOUT-EASTER:${stageId}`
  if (stageId && provided.toLowerCase() === `scout-easter:${stageId}`.toLowerCase()) return true;

  // 3. Extract stage number (e.g. stage-02 -> 2) and match variants
  const stageNumMatches = stageId.match(/\d+/);
  if (stageNumMatches) {
    const num = parseInt(stageNumMatches[0], 10);
    const padded = String(num).padStart(2, '0');
    if (provided.toLowerCase() === `scout-easter:stage-${padded}`.toLowerCase()) return true;
    if (provided.toLowerCase() === `scout-easter:stage-${num}`.toLowerCase()) return true;
    if (provided.toLowerCase() === `scout-easter:${num}`.toLowerCase()) return true;
  }

  // 4. HMAC signature match fallback
  if (stageId) {
    const signed = `SCOUT-EASTER:${stageId}:${qrSignature(stageId)}`;
    if (provided.toLowerCase() === signed.toLowerCase()) return true;
  }

  return false;
}

export function getEasterStageView(stage, index, total = Infinity) {
  if (!stage) return null;
  const requiresSawaed = stage.requiresSawaed !== false;
  const isFinal = index >= total - 1;
  return {
    index,
    title: stage.title,
    taskType: stage.taskType,
    task: stage.task || (requiresSawaed ? 'نفّذوا المهمة أمام السواعد' : (stage.clue || 'ابحثوا عن QR المرحلة التالية')),
    requiresSawaed,
    clue: !requiresSawaed && !isFinal ? stage.clue : '',
    handoff: isFinal
      ? 'بعد إتمام المهمة اضغطوا زر إنهاء الرحلة.'
      : requiresSawaed
        ? 'نفّذوا المهمة أمام السواعد وانتظروا منهم QR المرحلة التالية.'
        : 'استخدموا الـclue للعثور على QR المرحلة التالية ثم امسحوه.',
  };
}

export async function finalizeActivitySession(tx, sessionId) {
  const session = await tx.activitySession.findUnique({
    where: { id: sessionId },
    include: { activity: true, participants: true },
  });
  if (!session || session.status === 'finished') return session;
  const now = new Date();
  await tx.activitySession.update({ where: { id: session.id }, data: { status: 'finished', endedAt: now } });
  await tx.activityParticipant.updateMany({ where: { sessionId: session.id, finishedAt: null }, data: { finishedAt: now } });
  return tx.activitySession.findUnique({ where: { id: session.id }, include: { activity: true, participants: true } });
}
