import crypto from 'node:crypto';
import prisma from './db.js';

export const HACKER_STAGES = [
  {
    id: 'bank-gate',
    title: 'استمارة تسجيل الفريق',
    scene: 'أحد المشاركين أرسل بيانات طويلة وغريبة في استمارة التسجيل، والواجهة قبلتها بدون اعتراض.',
    prompt: 'أين يجب فحص البيانات قبل حفظها؟',
    options: ['على السيرفر مع تحديد النوع والطول', 'بتغيير شكل زر الإرسال فقط', 'على جهاز المستخدم فقط'],
    answer: 0,
    feedback: 'السيرفر هو نقطة الحماية الأساسية؛ يفحص النوع والطول ويرفض البيانات غير المتوقعة حتى لو تم تجاوز الواجهة.',
  },
  {
    id: 'vault-access',
    title: 'لوحة إدارة المهرجان',
    scene: 'مستخدم عادي عرف رابط صفحة الإدارة، لكن حسابه لا يملك صلاحية تعديل المسابقات.',
    prompt: 'أين يجب التأكد من صلاحية المستخدم؟',
    options: ['بإخفاء زر الإدارة من الواجهة فقط', 'على السيرفر قبل تنفيذ كل عملية', 'بتغيير اسم صفحة الإدارة'],
    answer: 1,
    feedback: 'إخفاء الزر يحسن الواجهة لكنه لا يحمي البيانات. السيرفر يجب أن يراجع الدور والصلاحية قبل كل عملية حساسة.',
  },
  {
    id: 'transfer-room',
    title: 'تعديل درجات الفرق',
    scene: 'تم تعديل نتيجة فريق، ونحتاج أن نعرف من نفّذ التعديل ومتى وما القيمة السابقة.',
    prompt: 'ما أفضل طريقة لمراجعة التعديل لاحقًا؟',
    options: ['حفظ سجل بالمسؤول والوقت والقيم القديمة والجديدة', 'حذف أي أثر بعد الحفظ', 'تسجيل اسم الفريق فقط'],
    answer: 0,
    feedback: 'سجل التدقيق الكامل يحمي الحقوق ويسهّل اكتشاف الخطأ: من عدّل، ومتى، وماذا كان قبل التعديل وبعده.',
  },
  {
    id: 'fraud-control',
    title: 'محاولات دخول متكررة',
    scene: 'ظهرت مئات المحاولات السريعة لتخمين كلمة سر حساب واحد.',
    prompt: 'ما التصرف الأنسب بدون تعطيل الموقع على الجميع؟',
    options: ['تحديد معدل المحاولات وإضافة انتظار تدريجي', 'قبول كل المحاولات بلا حدود', 'إظهار كلمة السر الصحيحة في الخطأ'],
    answer: 0,
    feedback: 'تحديد المعدل والانتظار التدريجي يوقف التخمين الآلي مع استمرار الموقع للمستخدمين الطبيعيين.',
  },
  {
    id: 'recovery-desk',
    title: 'جهاز قائد مفقود',
    scene: 'فقد قائد جهازه المسجل ويريد استعادة حسابه بدون ترك رابط دائم يمكن لأي شخص استخدامه.',
    prompt: 'كيف يكون رابط الاستعادة أكثر أمانًا؟',
    options: ['قصير العمر ويعمل مرة واحدة', 'ثابت ولا تنتهي صلاحيته', 'يحتوي على كلمة السر القديمة'],
    answer: 0,
    feedback: 'الرابط المؤقت أحادي الاستخدام يقلل أثر التسريب، وبعد استخدامه أو انتهاء مدته يصبح بلا قيمة.',
  },
];

export const EASTER_EGG_STAGES = [
  { id: 'stage-01', title: 'نداء البداية', taskType: 'مهمة صوتية', task: 'غنّوا مقطعًا قصيرًا من أغنية المهرجان أمام أحد أفراد السواعد.', requiresSawaed: true, clue: '' },
  { id: 'stage-02', title: 'الشفرة المعكوسة', taskType: 'فك شفرة', task: 'فكّوا الكلمة التي يعطيها لكم الأدمن باستخدام جدول الشفرة المعكوسة: ا↔ي، ب↔و، ت↔ه، ثم أكملوا باقي الجدول بنفس النمط.', requiresSawaed: true, clue: '' },
  { id: 'stage-03', title: 'سؤال المهرجان', taskType: 'بحث سريع', task: 'ابحثوا عن إجابة سؤال ثقافي قصير يكتبه الأدمن عن المهرجان أو تاريخ الكشافة.', requiresSawaed: true, clue: '' },
  { id: 'stage-04', title: 'الحساب الخاطف', taskType: 'مسألة حسابية', task: 'حلّوا المسألة الحسابية البسيطة التي يكتبها الأدمن خلال دقيقة واحدة.', requiresSawaed: true, clue: '' },
  { id: 'stage-05', title: 'إشارة الفريق', taskType: 'مهمة حركية', task: 'كوّنوا بأجسادكم شكلًا يرمز للكشافة أو للمهرجان والتقطوا الصورة أمام السواعد.', requiresSawaed: true, clue: '' },
  { id: 'stage-06', title: 'ذاكرة المخيم', taskType: 'تحدي ذاكرة', task: 'احفظوا سلسلة الرموز أو الألوان التي يحددها الأدمن، ثم أعيدوها بالترتيب الصحيح.', requiresSawaed: true, clue: '' },
  { id: 'stage-07', title: 'عين الكشاف', taskType: 'ملاحظة واستكشاف', task: 'اعثروا على التفصيلة التي يحددها الأدمن في المكان، واذكروا لونها أو موقعها بدقة.', requiresSawaed: true, clue: '' },
  { id: 'stage-08', title: 'مهمة التعاون', taskType: 'عمل جماعي', task: 'نفّذوا المهمة التي يكتبها الأدمن بحيث يشارك فيها كل أفراد الفريق.', requiresSawaed: true, clue: '' },
  { id: 'stage-09', title: 'رسالة إبداعية', taskType: 'تحدي إبداع', task: 'اصنعوا هتافًا أو حركة قصيرة باسم فريقكم وقدّموها أمام السواعد في أقل من دقيقة.', requiresSawaed: true, clue: '' },
  { id: 'stage-10', title: 'خاتمة الرحلة', taskType: 'التحدي الأخير', task: 'اجمعوا ما تعلمتموه في المراحل السابقة ونفّذوا تحدي النهاية الذي يكتبه الأدمن للفريق.', requiresSawaed: true, clue: '' },
];

export const ACTIVITY_CATALOG = [
  { slug: 'color-hunter', name: 'Color Hunter', description: 'طابق اللون المستهدف خلال عشر جولات للمتعة.', minPlayers: 1, maxPlayers: 1, config: { kind: 'color', rounds: 10 } },
  { slug: 'guess-number', name: 'Guess the Number', description: 'غرفة تخمين جماعية من 3 إلى 10 لاعبين للمتعة.', minPlayers: 3, maxPlayers: 10, config: { kind: 'guess', autoWaitSeconds: 60 } },
  { slug: 'easter-egg', name: 'Easter Egg', description: 'رحلة QR مرتبة بمهام يحددها الأدمن.', minPlayers: 1, maxPlayers: 1, config: { kind: 'easter', stages: EASTER_EGG_STAGES } },
  { slug: 'hacker-sandbox', name: 'تحدي الحارس الرقمي', description: 'خمسة مواقف واضحة لتعلّم حماية تطبيق المهرجان في دقيقتين.', minPlayers: 1, maxPlayers: 1, config: { kind: 'hacker', stages: HACKER_STAGES.length } },
];

function parseJson(value, fallback = {}) {
  try { return JSON.parse(value || ''); } catch { return fallback; }
}

export function normalizeEasterEggStages(stages) {
  const source = Array.isArray(stages) && stages.length ? stages : EASTER_EGG_STAGES;
  return source.map((stage, index) => ({
    id: String(stage.id || `stage-${String(index + 1).padStart(2, '0')}`),
    title: String(stage.title || `المرحلة ${index + 1}`),
    taskType: String(stage.taskType || 'مهمة'),
    task: String(stage.task || ''),
    requiresSawaed: stage.requiresSawaed !== false,
    clue: String(stage.clue || ''),
  }));
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
  const secret = process.env.EASTER_EGG_QR_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('EASTER_EGG_QR_SECRET أو JWT_SECRET مطلوب لتوليد أكواد الرحلة');
  return secret;
}

function qrSignature(stageId) {
  return crypto.createHmac('sha256', getQrSecret()).update(`easter-egg:${stageId}`).digest('hex').slice(0, 32);
}

export function getEasterEggQrPayload(stageOrIndex, stages = EASTER_EGG_STAGES) {
  const stage = typeof stageOrIndex === 'number' ? stages[stageOrIndex] : stageOrIndex;
  return stage ? `SCOUT-EASTER:${stage.id}:${qrSignature(stage.id)}` : '';
}

export function matchesEasterEggQr(value, stage) {
  const provided = String(value || '').trim();
  const expected = getEasterEggQrPayload(stage);
  if (!provided || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export function getHackerStageView(stage, index) {
  if (!stage) return null;
  return { index, title: stage.title, scene: stage.scene, prompt: stage.prompt, options: stage.options };
}

export function getEasterStageView(stage, index, total = Infinity) {
  if (!stage) return null;
  const requiresSawaed = stage.requiresSawaed !== false;
  const isFinal = index >= total - 1;
  return {
    index,
    title: stage.title,
    taskType: stage.taskType,
    task: stage.task,
    requiresSawaed,
    clue: !requiresSawaed && !isFinal ? stage.clue : '',
    handoff: isFinal ? 'بعد إتمام المهمة اضغطوا زر إنهاء الرحلة.' : requiresSawaed ? 'نفّذوا المهمة أمام السواعد وانتظروا منهم QR المرحلة التالية.' : 'استخدموا الـclue للعثور على QR المرحلة التالية ثم امسحوه.',
  };
}

export async function finalizeActivitySession(tx, sessionId) {
  const claimed = await tx.activitySession.updateMany({ where: { id: sessionId, rewardsApplied: false }, data: { status: 'finished', endedAt: new Date(), rewardsApplied: true } });
  if (claimed.count === 0) return tx.activitySession.findUnique({ where: { id: sessionId }, include: { activity: true, participants: true } });
  return tx.activitySession.findUnique({ where: { id: sessionId }, include: { activity: true, participants: true } });
}
