import crypto from 'node:crypto';
import prisma from './db.js';

export const HACKER_STAGES = [
  {
    id: 'bank-gate',
    title: 'بوابة بنك بيكسل',
    scene: 'تصلون إلى بوابة الدخول في بنك بيكسل التجريبي، لكن الحارس الآلي يرفض أي طلب غير واضح.',
    prompt: 'ما القرار الذي يجعل استقبال بيانات الدخول أكثر أمانًا؟',
    options: ['التحقق من النوع والطول على السيرفر', 'إخفاء الزر من الواجهة فقط', 'تغيير لون حقل كلمة السر'],
    answer: 0,
    feedback: 'التحقق على السيرفر يمنع تجاوز قواعد الواجهة ويرفض المدخلات غير المتوقعة قبل وصولها للمنطق الحساس.',
  },
  {
    id: 'vault-access',
    title: 'ممر الخزنة',
    scene: 'وجدتم حسابًا يطلب فتح خزنة البنك. الحساب صحيح، لكنه ليس بالضرورة مخولًا لكل العمليات.',
    prompt: 'أين يجب التأكد من صلاحية فتح الخزنة؟',
    options: ['في الواجهة فقط', 'في السيرفر قبل العملية', 'في اسم الزر'],
    answer: 1,
    feedback: 'الصلاحيات قرار أمني ويجب فرضه على السيرفر لكل عملية، لا الاعتماد على إخفاء زر في الواجهة.',
  },
  {
    id: 'transfer-room',
    title: 'غرفة التحويلات',
    scene: 'طلب تحويل تجريبي يمر عبر النظام. المطلوب التأكد من أن الطلب قابل للتتبع والمراجعة.',
    prompt: 'ما السجل الذي تحتاجه العملية الحساسة؟',
    options: ['سجل بالفاعل والعملية والتوقيت والنتيجة', 'حذف السجل بعد نجاح التحويل', 'عدم تسجيل العملية حتى لا يراها أحد'],
    answer: 0,
    feedback: 'السجل المفيد يوضح من فعل ماذا ومتى وما النتيجة، ويساعد على اكتشاف الأخطاء ومراجعة الحوادث.',
  },
  {
    id: 'fraud-control',
    title: 'إنذار المحاولات',
    scene: 'لاحظتم محاولات دخول كثيرة على حساب واحد. النظام يحتاج إلى حماية المستخدم بدون إغلاق البنك على الجميع.',
    prompt: 'ما الإجراء الأنسب لتقليل التخمين المتكرر؟',
    options: ['تحديد معدل المحاولات وإضافة تأخير تدريجي', 'قبول كل المحاولات بلا حدود', 'إظهار كلمة السر في رسالة الخطأ'],
    answer: 0,
    feedback: 'تحديد المعدل والتأخير التدريجي يقللان التخمين الآلي مع إبقاء النظام قابلًا للاستخدام.',
  },
  {
    id: 'recovery-desk',
    title: 'مكتب الاستعادة',
    scene: 'فقد أحد الحراس جهازه. يريد استعادة حسابه دون أن يصبح رابط الاستعادة مفتاحًا دائمًا للخزنة.',
    prompt: 'كيف يكون رابط استعادة الحساب أكثر أمانًا؟',
    options: ['رابط قصير العمر ويُستخدم مرة واحدة', 'رابط ثابت لا ينتهي', 'إرسال كلمة السر القديمة في الرابط'],
    answer: 0,
    feedback: 'الرابط المؤقت أحادي الاستخدام يقلل أثر التسريب ويمنع إعادة استعمال نفس المفتاح.',
  },
];

export const EASTER_EGG_STAGES = [
  {
    id: 'stage-01',
    title: 'نداء البداية',
    taskType: 'مهمة صوتية',
    task: 'غنّوا مقطعًا قصيرًا من أغنية المهرجان أمام أحد أفراد السواعد.',
    handoff: 'بعد اعتماد المهمة، استلموا QR المرحلة التالية من السواعد.',
  },
  {
    id: 'stage-02',
    title: 'الشفرة المعكوسة',
    taskType: 'فك شفرة',
    task: 'فكّوا الكلمة التي يعطيها لكم السواعد باستخدام جدول الشفرة المعكوسة: ا↔ي، ب↔و، ت↔ه، ثم أكملوا باقي الجدول بنفس النمط.',
    handoff: 'اعرضوا الحل على السواعد لاستلام QR التالي.',
  },
  {
    id: 'stage-03',
    title: 'سؤال المهرجان',
    taskType: 'بحث سريع',
    task: 'ابحثوا عن إجابة سؤال ثقافي قصير يحدده السواعد عن المهرجان أو تاريخ الكشافة.',
    handoff: 'بعد الإجابة الصحيحة، يسلّمكم السواعد QR التالي.',
  },
  {
    id: 'stage-04',
    title: 'الحساب الخاطف',
    taskType: 'مسألة حسابية',
    task: 'حلّوا المسألة الحسابية البسيطة المكتوبة على بطاقة السواعد خلال دقيقة واحدة.',
    handoff: 'سلّموا الناتج للسواعد لاستلام QR التالي.',
  },
  {
    id: 'stage-05',
    title: 'إشارة الفريق',
    taskType: 'مهمة حركية',
    task: 'كوّنوا بإجسادكم شكلًا يرمز للكشافة أو للمهرجان، والتقطوا الصورة أمام السواعد.',
    handoff: 'بعد موافقة السواعد، استلموا QR التالي.',
  },
  {
    id: 'stage-06',
    title: 'ذاكرة المخيم',
    taskType: 'تحدي ذاكرة',
    task: 'احفظوا سلسلة الرموز أو الألوان التي يعرضها لكم السواعد، ثم أعيدوها بالترتيب الصحيح.',
    handoff: 'الإجابة الصحيحة تفتح لكم QR المرحلة التالية من السواعد.',
  },
  {
    id: 'stage-07',
    title: 'عين الكشاف',
    taskType: 'ملاحظة واستكشاف',
    task: 'اعثروا على تفصيلة صغيرة يحددها السواعد في المكان، واذكروا لونها أو موقعها بدقة.',
    handoff: 'أثبتوا الملاحظة للسواعد لاستلام QR التالي.',
  },
  {
    id: 'stage-08',
    title: 'مهمة التعاون',
    taskType: 'عمل جماعي',
    task: 'نفّذوا المهمة التي يشرحها السواعد بحيث يشارك فيها كل أفراد الفريق، وليس قائد الفريق وحده.',
    handoff: 'بعد التنفيذ الجماعي، يسلّمكم السواعد QR التالي.',
  },
  {
    id: 'stage-09',
    title: 'رسالة إبداعية',
    taskType: 'تحدي إبداع',
    task: 'اصنعوا هتافًا أو حركة قصيرة باسم فريقكم وقدّموها أمام السواعد في أقل من دقيقة.',
    handoff: 'بعد اعتماد العرض، استلموا QR المرحلة الأخيرة.',
  },
  {
    id: 'stage-10',
    title: 'خاتمة الرحلة',
    taskType: 'التحدي الأخير',
    task: 'اجمعوا ما تعلمتموه في المراحل السابقة ونفّذوا تحدي النهاية الذي يحدده السواعد للفريق.',
    handoff: 'بعد إتمام التحدي، اضغطوا زر إنهاء الرحلة وأبلغوا السواعد بالنتيجة.',
  },
];

export const ACTIVITY_CATALOG = [
  { slug: 'color-hunter', name: 'Color Hunter', description: 'طابق اللون المستهدف خلال عشر جولات للمتعة.', minPlayers: 1, maxPlayers: 1, config: { kind: 'color', rounds: 10 } },
  { slug: 'guess-number', name: 'Guess the Number', description: 'غرفة تخمين جماعية من 3 إلى 10 لاعبين للمتعة.', minPlayers: 3, maxPlayers: 10, config: { kind: 'guess', autoWaitSeconds: 60 } },
  { slug: 'easter-egg', name: 'Easter Egg', description: 'رحلة QR مرتبة بمهام متنوعة مع السواعد.', minPlayers: 1, maxPlayers: 1, config: { kind: 'easter', stages: EASTER_EGG_STAGES.length } },
  { slug: 'hacker-sandbox', name: 'Hacker Sandbox', description: 'قصة بنك بيكسل وهمي بقرارات أمنية آمنة.', minPlayers: 1, maxPlayers: 1, config: { kind: 'hacker', stages: HACKER_STAGES.length } },
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

function getQrSecret() {
  const secret = process.env.EASTER_EGG_QR_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('EASTER_EGG_QR_SECRET أو JWT_SECRET مطلوب لتوليد أكواد الرحلة');
  return secret;
}

function qrSignature(stageId) {
  return crypto.createHmac('sha256', getQrSecret()).update(`easter-egg:${stageId}`).digest('hex').slice(0, 32);
}

export function getEasterEggQrPayload(stageOrIndex) {
  const stage = typeof stageOrIndex === 'number' ? EASTER_EGG_STAGES[stageOrIndex] : stageOrIndex;
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

export function getEasterStageView(stage, index) {
  if (!stage) return null;
  return { index, title: stage.title, taskType: stage.taskType, task: stage.task, handoff: stage.handoff };
}

export async function finalizeActivitySession(tx, sessionId) {
  const claimed = await tx.activitySession.updateMany({ where: { id: sessionId, rewardsApplied: false }, data: { status: 'finished', endedAt: new Date(), rewardsApplied: true } });
  if (claimed.count === 0) return tx.activitySession.findUnique({ where: { id: sessionId }, include: { activity: true, participants: true } });
  return tx.activitySession.findUnique({ where: { id: sessionId }, include: { activity: true, participants: true } });
}
