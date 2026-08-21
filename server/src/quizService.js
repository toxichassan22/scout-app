import prisma from './db.js';
import logger from './logger.js';
import { getCompetitionState } from './competitionState.js';
import { recalculateTeamStanding } from './teamStanding.js';
import { buildGeographyQuestions } from './geographyQuestions.js';
import { getCompetitionMaxScore } from './scoreRules.js';
import { getGeniusQuestions, getTwoTruthsQuestions } from './canonicalDigitalQuestions.js';

const MAX_ATTEMPTS = 3;
const GEOGRAPHY_COMPETITION_ID = 'comp-digital-3';

function parseOrder(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function shuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function findCompetition(client, key) {
  return client.competition.findFirst({ where: { OR: [{ id: String(key) }, { slug: String(key) }] } });
}

async function ensureGeographyCountries(tx) {
  const count = await tx.geographyCountry.count();
  if (count > 0) return;

  const ARAB_CODES = ['EG', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'JO', 'IQ', 'SY', 'LB', 'PS', 'YE', 'SD', 'LY', 'TN', 'DZ', 'MA', 'MR', 'SO', 'DJ', 'KM'];
  const fallback = [
    { id: 'geo-1', name: 'مصر', capital: 'القاهرة', division: '27 محافظة', governance: 'جمهوري رئاسي', currency: 'جنيه مصري', flag: '🇪🇬', sortOrder: 1 },
    { id: 'geo-2', name: 'السعودية', capital: 'الرياض', division: '13 منطقة إدارية', governance: 'ملكي مطلق', currency: 'ريال سعودي', flag: '🇸🇦', sortOrder: 2 },
    { id: 'geo-3', name: 'الإمارات', capital: 'أبوظبي', division: '7 إمارات اتحادية', governance: 'إتحادي رئاسي', currency: 'درهم إماراتي', flag: '🇦🇪', sortOrder: 3 },
    { id: 'geo-4', name: 'الكويت', capital: 'الكويت', division: '6 محافظات', governance: 'أميري دستوري', currency: 'دينار كويتي', flag: '🇰🇼', sortOrder: 4 },
    { id: 'geo-5', name: 'قطر', capital: 'الدوحة', division: '8 بلديات', governance: 'أميري وراثي', currency: 'ريال قطري', flag: '🇶🇦', sortOrder: 5 },
    { id: 'geo-6', name: 'البحرين', capital: 'المنامة', division: '4 محافظات', governance: 'ملكي دستوري', currency: 'دينار بحريني', flag: '🇧🇭', sortOrder: 6 },
    { id: 'geo-7', name: 'سلطنة عُمان', capital: 'مسقط', division: '11 محافظة', governance: 'سلطاني وراثي', currency: 'ريال عُماني', flag: '🇴🇲', sortOrder: 7 },
    { id: 'geo-8', name: 'الأردن', capital: 'عمّان', division: '12 محافظة', governance: 'ملكي نيابي وراثي', currency: 'دينار أردني', flag: '🇯🇴', sortOrder: 8 },
    { id: 'geo-9', name: 'العراق', capital: 'بغداد', division: '18 محافظة', governance: 'جمهوري برلماني اتحادي', currency: 'دينار عراقي', flag: '🇮🇶', sortOrder: 9 },
    { id: 'geo-10', name: 'سوريا', capital: 'دمشق', division: '14 محافظة', governance: 'جمهوري', currency: 'ليرة سورية', flag: '🇸🇾', sortOrder: 10 },
    { id: 'geo-11', name: 'لبنان', capital: 'بيروت', division: '9 محافظات', governance: 'جمهوري برلماني', currency: 'ليرة لبنانية', flag: '🇱🇧', sortOrder: 11 },
    { id: 'geo-12', name: 'فلسطين', capital: 'القدس', division: '16 محافظة', governance: 'جمهوري شبه رئاسي', currency: 'الشيكل / الدينار الأردني', flag: '🇵🇸', sortOrder: 12 },
    { id: 'geo-13', name: 'اليمن', capital: 'صنعاء', division: '22 محافظة', governance: 'جمهوري', currency: 'ريال يمني', flag: '🇾🇪', sortOrder: 13 },
    { id: 'geo-14', name: 'السودان', capital: 'الخرطوم', division: '18 ولاية', governance: 'جمهوري', currency: 'جنيه سوداني', flag: '🇸🇩', sortOrder: 14 },
    { id: 'geo-15', name: 'ليبيا', capital: 'طرابلس', division: '22 بلدية', governance: 'جمهوري', currency: 'دينار ليبي', flag: '🇱🇾', sortOrder: 15 },
    { id: 'geo-16', name: 'تونس', capital: 'تونس', division: '24 ولاية', governance: 'جمهوري رئاسي', currency: 'دينار تونسي', flag: '🇹🇳', sortOrder: 16 },
    { id: 'geo-17', name: 'الجزائر', capital: 'الجزائر', division: '58 ولاية', governance: 'جمهوري شبه رئاسي', currency: 'دينار جزائري', flag: '🇩🇿', sortOrder: 17 },
    { id: 'geo-18', name: 'المغرب', capital: 'الرباط', division: '12 جهة', governance: 'ملكي دستوري نيابي', currency: 'درهم مغربي', flag: '🇲🇦', sortOrder: 18 },
    { id: 'geo-19', name: 'موريتانيا', capital: 'نواكشوط', division: '15 ولاية', governance: 'جمهوري إسلامي', currency: 'أوقية موريتانية', flag: '🇲🇷', sortOrder: 19 },
    { id: 'geo-20', name: 'الصومال', capital: 'مقديشو', division: '18 إقليماً', governance: 'جمهوري اتحادي برلماني', currency: 'شلن صومالي', flag: '🇸🇴', sortOrder: 20 },
    { id: 'geo-21', name: 'جيبوتي', capital: 'جيبوتي', division: '6 أقاليم', governance: 'جمهوري شبه رئاسي', currency: 'فرنك جيبوتي', flag: '🇩🇯', sortOrder: 21 },
    { id: 'geo-22', name: 'جزر القمر', capital: 'موروني', division: '3 جزر رئيسية', governance: 'جمهوري اتحادي رئاسي', currency: 'فرنك قمري', flag: '🇰🇲', sortOrder: 22 },
  ];

  for (const item of fallback) {
    const mapUrl = `/maps/arab/${ARAB_CODES[item.sortOrder - 1]}.svg`;
    await tx.geographyCountry.create({ data: { ...item, mapUrl } });
  }
  logger.info({ count: fallback.length }, 'auto-seeded GeographyCountry table with fallback data');
}

async function ensureGeographyQuestions(tx, competitionId) {
  if (competitionId !== GEOGRAPHY_COMPETITION_ID) return;
  const existing = await tx.question.count({ where: { competitionId } });
  if (existing > 0) return;

  await ensureGeographyCountries(tx);
  const countries = await tx.geographyCountry.findMany({ orderBy: { sortOrder: 'asc' } });
  if (countries.length === 0) {
    logger.warn('GeographyCountry table is still empty after fallback — cannot auto-generate questions');
    return;
  }

  const questions = buildGeographyQuestions(countries);
  for (const q of questions) {
    await tx.question.create({
      data: {
        id: q.id,
        competitionId,
        text: q.text,
        category: q.category || '',
        options: JSON.stringify(q.options),
        correctOption: q.correctOption,
        points: Number(q.points || 1),
        questionType: q.questionType || 'text',
        mediaUrl: q.mediaUrl || null,
        mediaAlt: q.mediaAlt || '',
        sortOrder: q.sortOrder || 0,
      },
    });
  }
  logger.info({ competitionId, count: questions.length }, 'auto-generated geography questions from GeographyCountry table');
}

async function ensureDigitalQuestions(tx, competitionId) {
  const comp = await tx.competition.findFirst({ where: { OR: [{ id: competitionId }, { slug: competitionId }] } });
  if (!comp) return;
  const targetId = comp.id;

  if (targetId === GEOGRAPHY_COMPETITION_ID || comp.slug === 'geography') {
    await ensureGeographyQuestions(tx, targetId);
    return;
  }

  const existingCount = await tx.question.count({ where: { competitionId: targetId } });
  const isGenius = comp.slug === 'genius' || targetId === 'comp-digital-1';
  const isTwoTruths = comp.slug === 'two_truths' || targetId === 'comp-digital-2';

  if (!isGenius && !isTwoTruths) {
    if (existingCount > 0) return;
  }

  const pool = isGenius ? getGeniusQuestions() : (isTwoTruths ? getTwoTruthsQuestions() : []);
  if (pool.length === 0) return;

  if (existingCount >= pool.length) return;

  if (existingCount > 0) {
    await tx.draftAnswer.deleteMany({ where: { session: { competitionId: targetId } } });
    await tx.question.deleteMany({ where: { competitionId: targetId } });
  }

  for (let i = 0; i < pool.length; i++) {
    const q = pool[i];
    await tx.question.create({
      data: {
        id: `${targetId}-${q.id || `q-${i + 1}`}`,
        competitionId: targetId,
        text: q.text,
        category: q.category || 'عام',
        options: JSON.stringify(q.options),
        correctOption: q.correctOption,
        points: Number(q.points || 1),
        questionType: 'multiple_choice',
        sortOrder: q.sortOrder || (i + 1),
      }
    });
  }
  logger.info({ competitionId: targetId, count: pool.length }, 'auto-seeded digital quiz questions');
}

async function createQuestionOrder(tx, competitionId, questionCount) {
  await ensureDigitalQuestions(tx, competitionId);
  const questions = await tx.question.findMany({ where: { competitionId }, select: { id: true }, orderBy: { sortOrder: 'asc' } });
  const selected = shuffle(questions.map(question => question.id)).slice(0, Math.min(questionCount, questions.length));
  if (selected.length === 0) throw Object.assign(new Error('لا توجد أسئلة منشورة لهذه المسابقة'), { status: 503 });
  return selected;
}

async function finalizeDigitalSessionTx(tx, sessionId, teamId, deviceId) {
  const session = await tx.quizSession.findUnique({ where: { id: sessionId }, include: { draftAnswers: true } });
  if (!session) throw Object.assign(new Error('جلسة المسابقة غير موجودة'), { status: 404 });
  if (teamId && session.teamId !== teamId) throw Object.assign(new Error('جلسة المسابقة غير موجودة'), { status: 404 });
  if (deviceId && session.deviceId !== deviceId) throw Object.assign(new Error('الجهاز لا يطابق جلسة المسابقة'), { status: 403 });

  const order = parseOrder(session.questionOrder);
  const attemptedCount = session.draftAnswers.length;
  const correctCount = session.draftAnswers.filter(answer => answer.isCorrect).length;
  const questionCount = order.length;
  const completedAll = questionCount > 0 && attemptedCount >= questionCount;
  const completedAt = session.completedAt || new Date();
  const competition = await tx.competition.findUnique({ where: { id: session.competitionId }, select: { criteria: true, questionCount: true } });
  const totalScore = session.draftAnswers.reduce((sum, answer) => sum + Number(answer.pointsEarned || 0), 0);
  const maxScore = getCompetitionMaxScore(competition);
  if (totalScore > maxScore) throw Object.assign(new Error(`نتيجة المسابقة تجاوزت الحد الأقصى (${maxScore} نقطة)`), { status: 400 });
  const score = await tx.score.upsert({
    where: { competitionId_teamId: { competitionId: session.competitionId, teamId: session.teamId } },
    update: {
      total: totalScore,
      attemptedCount,
      correctCount,
      questionCount,
      completedAll,
      submittedAt: completedAt,
      values: JSON.stringify({ mode: 'quiz_session', sessionId, attemptedCount, correctCount, questionCount, completedAll }),
      isFinal: true,
    },
    create: {
      competitionId: session.competitionId,
      teamId: session.teamId,
      total: totalScore,
      attemptedCount,
      correctCount,
      questionCount,
      completedAll,
      submittedAt: completedAt,
      values: JSON.stringify({ mode: 'quiz_session', sessionId, attemptedCount, correctCount, questionCount, completedAll }),
      isFinal: true,
    },
  });
  await tx.quizSession.updateMany({
    where: { id: session.id, isCompleted: false },
    data: { isCompleted: true, completedAt, attemptedCount, correctCount },
  });
  await recalculateTeamStanding(session.teamId, tx);
  return { totalScore, score, idempotent: false };
}

export async function finalizeDigitalSession(sessionId, teamId = null, deviceId = null) {
  try {
    return await prisma.$transaction(async tx => finalizeDigitalSessionTx(tx, sessionId, teamId, deviceId));
  } catch (error) {
    if (error.code !== 'P2002') throw error;
    const session = await prisma.quizSession.findUnique({ where: { id: sessionId } });
    if (!session || (teamId && session.teamId !== teamId)) throw Object.assign(new Error('جلسة المسابقة غير موجودة'), { status: 404 });
    const score = await prisma.score.findUnique({ where: { competitionId_teamId: { competitionId: session.competitionId, teamId: session.teamId } } });
    if (!score) throw error;
    return { totalScore: score.total, score, idempotent: true };
  }
}

export async function startDigitalSession({ teamId, competitionId, deviceId, entryCode }) {
  return prisma.$transaction(async tx => {
    const competition = await findCompetition(tx, competitionId);
    if (!competition || competition.type !== 'auto_digital') throw Object.assign(new Error('المسابقة الرقمية غير موجودة'), { status: 400 });
    const state = getCompetitionState(competition);
    if (state !== 'active') throw Object.assign(new Error(state === 'scheduled' ? 'المسابقة لم تبدأ بعد' : 'المسابقة الرقمية مغلقة'), { status: 400 });
    if (competition.requiresQr) {
      const access = await tx.competitionAccess.findUnique({ where: { teamId_competitionId: { teamId, competitionId: competition.id } } });
      if (!access) throw Object.assign(new Error('يجب مسح QR الخاص بالمسابقة أولاً'), { status: 403 });
    }
    if (competition.entryCode && competition.entryCode !== String(entryCode || '').trim()) throw Object.assign(new Error('كود الدخول غير صحيح'), { status: 403 });

    const score = await tx.score.findUnique({ where: { competitionId_teamId: { competitionId: competition.id, teamId } } });
    if (score && (score.completedAll || score.isFinal)) return { kind: 'finalized', session: null, score, finalized: true };

    const existing = await tx.quizSession.findUnique({ where: { teamId_competitionId: { teamId, competitionId: competition.id } }, include: { draftAnswers: true } });
    if (existing) {
      if (existing.isCompleted || new Date() >= existing.expiresAt) {
        if (score) {
          const result = await finalizeDigitalSessionTx(tx, existing.id, teamId, deviceId);
          return { kind: 'finalized', session: null, score: result.score, finalized: true };
        }
        // Score was deleted by admin! Clean up stale completed/expired session and start fresh
        await tx.draftAnswer.deleteMany({ where: { sessionId: existing.id } });
        await tx.quizSession.delete({ where: { id: existing.id } });
      } else {
        if (existing.deviceId !== deviceId) throw Object.assign(new Error('المسابقة مقفلة على جهاز آخر'), { status: 409 });
        if (parseOrder(existing.questionOrder).length === 0) {
          const questionCount = Number.isInteger(competition.questionCount) && competition.questionCount > 0 ? competition.questionCount : 50;
          const questionOrder = await createQuestionOrder(tx, competition.id, questionCount);
          const repaired = await tx.quizSession.update({ where: { id: existing.id }, data: { questionOrder: JSON.stringify(questionOrder) }, include: { draftAnswers: true } });
          return { kind: 'session', session: repaired, score: null, finalized: false };
        }
        return { kind: 'session', session: existing, score: null, finalized: false };
      }
    }

    const seconds = Number.isInteger(competition.duration) && competition.duration > 0 ? competition.duration : 600;
    const questionCount = Number.isInteger(competition.questionCount) && competition.questionCount > 0 ? competition.questionCount : 50;
    const questionOrder = await createQuestionOrder(tx, competition.id, questionCount);
    const session = await tx.quizSession.create({ data: { teamId, competitionId: competition.id, deviceId, questionOrder: JSON.stringify(questionOrder), expiresAt: new Date(Date.now() + seconds * 1000) }, include: { draftAnswers: true } });
    return { kind: 'session', session, score: null, finalized: false };
  });
}

export async function saveDigitalAnswer({ sessionId, teamId, deviceId, questionId, selectedIndex }) {
  return prisma.$transaction(async tx => {
    const session = await tx.quizSession.findUnique({ where: { id: sessionId }, include: { draftAnswers: true } });
    if (!session || session.teamId !== teamId) throw Object.assign(new Error('جلسة المسابقة غير موجودة'), { status: 404 });
    if (session.deviceId !== deviceId) throw Object.assign(new Error('الجهاز لا يطابق جلسة المسابقة'), { status: 403 });
    if (session.isCompleted || new Date() >= session.expiresAt) throw Object.assign(new Error('انتهت المسابقة'), { status: 409 });

    const competition = await tx.competition.findUnique({ where: { id: session.competitionId } });
    if (getCompetitionState(competition) !== 'active') throw Object.assign(new Error('تم إغلاق المسابقة بواسطة الإدارة'), { status: 423 });
    const maxScore = getCompetitionMaxScore(competition);

    const order = parseOrder(session.questionOrder);
    const existingAnswer = session.draftAnswers.find(answer => answer.questionId === questionId);
    if (existingAnswer) {
      if (existingAnswer.selectedIndex !== selectedIndex) throw Object.assign(new Error('تم حفظ إجابة مختلفة لهذا السؤال'), { status: 409 });
      return { ...existingAnswer, correct: existingAnswer.isCorrect, idempotent: true };
    }
    const answered = new Set(session.draftAnswers.map(answer => answer.questionId));
    const expectedQuestionId = order.find(id => !answered.has(id));
    if (questionId !== expectedQuestionId) throw Object.assign(new Error('يجب الإجابة عن السؤال الحالي مرة واحدة قبل الانتقال'), { status: 409 });

    const question = await tx.question.findUnique({ where: { id: questionId } });
    if (!question || question.competitionId !== session.competitionId) throw Object.assign(new Error('السؤال لا ينتمي لهذه المسابقة'), { status: 400 });
    let options;
    try { options = JSON.parse(question.options); } catch { options = []; }
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= options.length) throw Object.assign(new Error('الإجابة غير صالحة'), { status: 400 });

    const correct = question.correctOption === selectedIndex;
    const now = new Date();
    const pointsEarned = correct ? Number(question.points || 1) : 0;
    const currentTotal = session.draftAnswers.reduce((sum, answer) => sum + Number(answer.pointsEarned || 0), 0);
    if (currentTotal + pointsEarned > maxScore) throw Object.assign(new Error(`نتيجة المسابقة تجاوزت الحد الأقصى (${maxScore} نقطة)`), { status: 400 });
    const answer = await tx.draftAnswer.create({ data: { sessionId, questionId, selectedIndex, isCorrect: correct, pointsEarned, savedAt: now } });

    const allAnswers = [...session.draftAnswers, answer];
    const attemptedCount = allAnswers.length;
    const correctCount = allAnswers.filter(a => a.isCorrect).length;
    const totalScore = allAnswers.reduce((sum, a) => sum + Number(a.pointsEarned || 0), 0);
    const questionCount = order.length;
    const completedAll = questionCount > 0 && attemptedCount >= questionCount;

    await tx.quizSession.update({
      where: { id: sessionId },
      data: {
        attemptedCount,
        correctCount,
        lastAnswerAt: now,
        ...(completedAll && { isCompleted: true, completedAt: now }),
      },
    });

    const score = await tx.score.upsert({
      where: { competitionId_teamId: { competitionId: session.competitionId, teamId: session.teamId } },
      update: {
        total: totalScore,
        attemptedCount,
        correctCount,
        questionCount,
        completedAll,
        submittedAt: now,
        values: JSON.stringify({ mode: 'quiz_session', sessionId, attemptedCount, correctCount, questionCount, completedAll }),
        isFinal: true,
      },
      create: {
        competitionId: session.competitionId,
        teamId: session.teamId,
        total: totalScore,
        attemptedCount,
        correctCount,
        questionCount,
        completedAll,
        submittedAt: now,
        values: JSON.stringify({ mode: 'quiz_session', sessionId, attemptedCount, correctCount, questionCount, completedAll }),
        isFinal: true,
      },
    });

    await recalculateTeamStanding(session.teamId, tx);

    return { ...answer, correct, totalScore, score };
  });
}

export async function finalizeCompetitionSessions(competitionId) {
  const sessions = await prisma.quizSession.findMany({ where: { competitionId, isCompleted: false }, select: { id: true } });
  for (const { id } of sessions) {
    try {
      await finalizeDigitalSession(id);
    } catch (err) {
      logger.warn({ err, sessionId: id, competitionId }, 'failed to finalize closed competition session');
    }
  }
}

export async function finalizeExpiredSessions() {
  const now = new Date();
  const expired = await prisma.quizSession.findMany({ where: { isCompleted: false, expiresAt: { lt: now } }, select: { id: true } });
  for (const { id } of expired) {
    try {
      await finalizeDigitalSession(id);
    } catch (err) {
      logger.warn({ err, sessionId: id }, 'failed to finalize expired session');
    }
  }
}

export { MAX_ATTEMPTS };
