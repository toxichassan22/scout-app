import { Router } from 'express';
import prisma from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { enforceNotFrozen } from '../freeze.js';
import { validate, zId, zNumber, zString } from '../middleware/validate.js';
import { getActivityConfig, getCatalogEntry, getActivityPublicConfig, getEasterEggStages, generateColorTarget, generateRoomCode, HACKER_STAGES, getEasterStageView, getHackerStageView, matchesEasterEggQr, ensureActivityCatalog, finalizeActivitySession } from '../activityService.js';
import { z } from 'zod';

const router = Router();
router.use(requireRole(['team']));

const sessionBody = {
  body: {
    mode: z.enum(['auto', 'code']).optional(),
    roomCode: zString('كود الغرفة', { min: 4, max: 20 }).optional(),
    displayName: zString('اسم اللاعب', { min: 1, max: 80 }).optional(),
  },
};

function parseJson(value, fallback = {}) {
  try { return JSON.parse(value || ''); } catch { return fallback; }
}

function compareCodes(secret, guess) {
  const exact = [];
  let exactCount = 0;
  for (let index = 0; index < 5; index += 1) {
    exact[index] = secret[index] === guess[index];
    if (exact[index]) exactCount += 1;
  }
  const secretCounts = {};
  const guessCounts = {};
  for (let index = 0; index < 5; index += 1) {
    if (exact[index]) continue;
    secretCounts[secret[index]] = (secretCounts[secret[index]] || 0) + 1;
    guessCounts[guess[index]] = (guessCounts[guess[index]] || 0) + 1;
  }
  const misplacedCount = Object.keys(guessCounts).reduce((total, digit) => total + Math.min(guessCounts[digit] || 0, secretCounts[digit] || 0), 0);
  return { exactCount, misplacedCount };
}

function participantView(participant) {
  return { id: participant.id, teamId: participant.teamId, displayName: participant.displayName, score: participant.score, ready: Boolean(parseJson(participant.metadata, {}).secretCode), eliminated: Boolean(participant.eliminated), joinedAt: participant.joinedAt, finishedAt: participant.finishedAt };
}

function sessionView(session, config = {}, viewer = null) {
  const safeSession = { ...session };
  const participants = safeSession.participants || [];
  const gameState = parseJson(safeSession.gameState, {});
  const currentPlayerId = config.kind === 'guess' ? gameState.order?.[gameState.currentIndex] || null : null;
  const activeOrder = config.kind === 'guess' ? (gameState.order || []).filter(id => participants.some(item => item.id === id && !item.eliminated)) : [];
  const targetPlayerId = currentPlayerId && activeOrder.length > 1 ? activeOrder[(activeOrder.indexOf(currentPlayerId) + 1) % activeOrder.length] : null;
  const mine = viewer && participants.find(item => item.teamId === (viewer.teamId || viewer.id) && item.deviceId === viewer.deviceId);
  const hackerMetadata = mine ? parseJson(mine.metadata, {}) : {};
  const hackerStageIndex = Number(hackerMetadata.currentStage || 0);
  const easterStages = config.kind === 'easter'
    ? getEasterEggStages({ ...config, stages: Array.isArray(gameState.easterStages) ? gameState.easterStages : config.stages })
    : [];
  const easterStageIndex = Number(gameState.stageIndex || 0);
  delete safeSession.gameState;
  delete safeSession.participants;
  return {
    ...safeSession,
    config: getActivityPublicConfig(config),
    participantId: mine?.id || null,
    currentPlayerId,
    targetPlayerId,
    history: config.kind === 'guess' ? gameState.history || [] : [],
    participants: participants.map(participantView),
    ...(config.kind === 'hacker' ? {
      challenge: getHackerStageView(HACKER_STAGES[hackerStageIndex], hackerStageIndex),
      progress: { current: Math.min(hackerStageIndex, HACKER_STAGES.length), total: HACKER_STAGES.length },
    } : {}),
    ...(config.kind === 'easter' ? {
      easterProgress: { current: Math.min(easterStageIndex + (gameState.awaitingTask ? 1 : 0), easterStages.length), total: easterStages.length, awaitingTask: Boolean(gameState.awaitingTask) },
      stage: gameState.awaitingTask ? getEasterStageView(easterStages[easterStageIndex], easterStageIndex, easterStages.length) : null,
    } : {}),
  };
}

async function getActivity(slug) {
  await ensureActivityCatalog();
  return prisma.activity.findUnique({ where: { slug } });
}

async function findParticipant(sessionId, teamId, deviceId) {
  return prisma.activityParticipant.findUnique({ where: { sessionId_deviceId: { sessionId, deviceId } } }).then(participant => participant?.teamId === teamId ? participant : null);
}

router.get('/', async (req, res) => {
  await ensureActivityCatalog();
  const activities = await prisma.activity.findMany({ where: { isOpen: true }, orderBy: { createdAt: 'asc' } });
  res.json({ success: true, activities: activities.map(activity => ({ ...activity, config: getActivityPublicConfig(getActivityConfig(activity)) })) });
});

router.post('/:slug/sessions', enforceNotFrozen, validate(sessionBody), async (req, res) => {
  const activity = await getActivity(req.params.slug);
  if (!activity || !activity.isOpen) return res.status(404).json({ error: 'النشاط غير متاح' });
  const catalog = getCatalogEntry(activity.slug);
  const config = getActivityConfig(activity);
  const mode = req.body.mode || 'auto';
  const displayName = req.body.displayName || req.user.deviceName || req.user.username;
  let session = null;

  if (mode === 'code') {
    if (!req.body.roomCode) return res.status(400).json({ error: 'كود الغرفة مطلوب' });
    session = await prisma.activitySession.findFirst({ where: { activityId: activity.id, roomCode: req.body.roomCode.trim().toUpperCase(), status: 'waiting' }, include: { participants: true } });
  } else if (config.kind === 'guess') {
    const waiting = await prisma.activitySession.findFirst({ where: { activityId: activity.id, status: 'waiting', roomCode: null }, include: { participants: true }, orderBy: { createdAt: 'asc' } });
    if (waiting && waiting.participants.length < (catalog?.maxPlayers || 10)) session = waiting;
  }

  if (!session) {
    const gameState = config.kind === 'guess'
      ? { secret: null }
      : config.kind === 'easter'
        ? { stageIndex: 0, scannedStages: [], awaitingTask: false, easterStages: getEasterEggStages(config) }
        : '{}';
    session = await prisma.activitySession.create({ data: { activityId: activity.id, status: config.kind === 'guess' ? 'waiting' : 'active', minPlayers: catalog?.minPlayers || 1, maxPlayers: catalog?.maxPlayers || 1, gameState: JSON.stringify(gameState), startedAt: config.kind === 'guess' ? null : new Date() }, include: { participants: true } });
  }

  try {
    await prisma.activityParticipant.create({ data: { sessionId: session.id, teamId: req.user.id, deviceId: req.user.deviceId, displayName } });
  } catch (error) {
    if (error.code !== 'P2002') throw error;
  }
  const current = await prisma.activitySession.findUnique({ where: { id: session.id }, include: { participants: true, activity: true } });
  res.status(201).json({ success: true, session: sessionView(current, config, req.user), fallbackAvailable: config.kind === 'guess' && !current.roomCode && Date.now() - new Date(current.createdAt).getTime() >= (config.autoWaitSeconds || 60) * 1000 });
});

const guessSecretSchema = { params: { sessionId: zId('الجلسة') }, body: { secretCode: zString('الكود السري', { min: 5, max: 5 }).regex(/^\d{5}$/, 'الكود يجب أن يتكون من خمس خانات رقمية') } };
router.post('/sessions/:sessionId/secret', enforceNotFrozen, validate(guessSecretSchema), async (req, res) => {
  const session = await prisma.activitySession.findUnique({ where: { id: req.params.sessionId }, include: { participants: true, activity: true } });
  const participant = session?.participants.find(item => item.teamId === req.user.id && item.deviceId === req.user.deviceId);
  if (!session || !participant || session.activity.slug !== 'guess-number') return res.status(404).json({ error: 'جلسة Guess غير موجودة' });
  if (session.status !== 'waiting') return res.status(409).json({ error: 'لا يمكن تغيير الكود بعد بدء اللعبة' });
  const metadata = parseJson(participant.metadata, {});
  await prisma.activityParticipant.update({ where: { id: participant.id }, data: { metadata: JSON.stringify({ ...metadata, secretCode: req.body.secretCode }), lastSeenAt: new Date() } });
  res.json({ success: true, ready: true });
});

router.post('/sessions/:sessionId/heartbeat', validate({ params: { sessionId: zId('الجلسة') } }), async (req, res) => {
  const updated = await prisma.activityParticipant.updateMany({ where: { sessionId: req.params.sessionId, teamId: req.user.id, deviceId: req.user.deviceId, eliminated: false }, data: { lastSeenAt: new Date() } });
  res.json({ success: updated.count > 0 });
});

router.post('/sessions/:sessionId/invite', enforceNotFrozen, validate({ params: { sessionId: zId('الجلسة') } }), async (req, res) => {
  const session = await prisma.activitySession.findUnique({ where: { id: req.params.sessionId }, include: { participants: true, activity: true } });
  if (!session) return res.status(404).json({ error: 'الجلسة غير موجودة' });
  if (!session.participants.some(participant => participant.teamId === req.user.id && participant.deviceId === req.user.deviceId)) return res.status(403).json({ error: 'غير مصرح بهذه الجلسة' });
  if (session.status !== 'waiting') return res.status(409).json({ error: 'الجلسة بدأت بالفعل' });
  const roomCode = session.roomCode || generateRoomCode();
  const updated = await prisma.activitySession.update({ where: { id: session.id }, data: { roomCode }, include: { participants: true, activity: true } });
  res.json({ success: true, roomCode, session: sessionView(updated, getActivityConfig(updated.activity), req.user) });
});

router.get('/sessions/:sessionId', validate({ params: { sessionId: zId('الجلسة') } }), async (req, res) => {
  let session = await prisma.activitySession.findUnique({ where: { id: req.params.sessionId }, include: { participants: true, activity: true } });
  if (!session || !session.participants.some(participant => participant.teamId === req.user.id)) return res.status(404).json({ error: 'الجلسة غير موجودة' });
  if (session.status === 'active' && session.activity.slug === 'guess-number') {
    const cutoff = new Date(Date.now() - 30_000);
    const stale = await prisma.activityParticipant.updateMany({ where: { sessionId: session.id, eliminated: false, lastSeenAt: { lt: cutoff } }, data: { eliminated: true, eliminatedAt: new Date() } });
    if (stale.count > 0) {
      const activeIds = session.participants.filter(participant => !participant.eliminated && new Date(participant.lastSeenAt) >= cutoff).map(participant => participant.id);
      const state = parseJson(session.gameState, { order: [], currentIndex: 0, history: [] });
      const currentId = state.order?.[state.currentIndex] || null;
      const normalizedOrder = (state.order || []).filter(id => activeIds.includes(id));
      const normalizedCurrent = normalizedOrder.includes(currentId) ? normalizedOrder.indexOf(currentId) : 0;
      await prisma.activitySession.update({ where: { id: session.id }, data: { gameState: JSON.stringify({ ...state, order: normalizedOrder, currentIndex: normalizedCurrent }) } });
      if (normalizedOrder.length <= 1) await prisma.$transaction(tx => finalizeActivitySession(tx, session.id));
    }
    session = await prisma.activitySession.findUnique({ where: { id: session.id }, include: { participants: true, activity: true } });
  }
  const config = getActivityConfig(session.activity);
  res.json({ success: true, session: sessionView(session, config, req.user) });
});

router.post('/sessions/:sessionId/start', enforceNotFrozen, validate({ params: { sessionId: zId('الجلسة') } }), async (req, res) => {
  const session = await prisma.activitySession.findUnique({ where: { id: req.params.sessionId }, include: { participants: true, activity: true } });
  if (!session || !session.participants.some(participant => participant.teamId === req.user.id && participant.deviceId === req.user.deviceId)) return res.status(404).json({ error: 'الجلسة غير موجودة' });
  if (session.status !== 'waiting') return res.json({ success: true, session: sessionView(session, getActivityConfig(session.activity), req.user) });
  if (session.participants.length < session.minPlayers) return res.status(409).json({ error: `نحتاج إلى ${session.minPlayers} لاعبين على الأقل` });
  if (session.activity.slug === 'guess-number' && session.participants.some(participant => !parseJson(participant.metadata, {}).secretCode)) return res.status(409).json({ error: 'كل لاعب يجب أن يختار كوده السري أولاً' });
  const order = session.activity.slug === 'guess-number' ? session.participants.map(participant => participant.id).sort(() => Math.random() - 0.5) : [];
  const gameState = session.activity.slug === 'guess-number' ? { order, currentIndex: 0, history: [] } : {};
  const updated = await prisma.activitySession.update({ where: { id: session.id }, data: { status: 'active', startedAt: new Date(), gameState: JSON.stringify(gameState) }, include: { participants: true, activity: true } });
  res.json({ success: true, session: sessionView(updated, getActivityConfig(updated.activity), req.user) });
});

const guessSchema = { params: { sessionId: zId('الجلسة') }, body: { guessCode: zString('التخمين', { min: 5, max: 5 }).regex(/^\d{5}$/, 'التخمين يجب أن يتكون من خمس خانات رقمية') } };
router.post('/sessions/:sessionId/guess', enforceNotFrozen, validate(guessSchema), async (req, res) => {
  const result = await prisma.$transaction(async tx => {
    const session = await tx.activitySession.findUnique({ where: { id: req.params.sessionId }, include: { participants: true, activity: true } });
    const participant = session && session.participants.find(item => item.teamId === req.user.id && item.deviceId === req.user.deviceId && !item.eliminated);
    if (!session || !participant || session.activity.slug !== 'guess-number') throw Object.assign(new Error('جلسة Guess غير موجودة'), { status: 404 });
    if (session.status !== 'active') throw Object.assign(new Error('الجلسة لم تبدأ بعد'), { status: 409 });
    const state = parseJson(session.gameState, { order: [], currentIndex: 0, history: [] });
    const activeOrder = state.order.filter(id => session.participants.some(item => item.id === id && !item.eliminated));
    const currentIndex = activeOrder.indexOf(participant.id);
    if (currentIndex < 0 || activeOrder[(Number(state.currentIndex) || 0) % activeOrder.length] !== participant.id) throw Object.assign(new Error('ليس دورك الآن'), { status: 409 });
    if (activeOrder.length <= 1) throw Object.assign(new Error('انتهت اللعبة'), { status: 409 });
    const targetId = activeOrder[(currentIndex + 1) % activeOrder.length];
    const target = session.participants.find(item => item.id === targetId);
    const targetMetadata = parseJson(target.metadata, {});
    const feedback = compareCodes(String(targetMetadata.secretCode || ''), req.body.guessCode);
    const attackerMetadata = parseJson(participant.metadata, {});
    const history = Array.isArray(state.history) ? state.history : [];
    history.push({ attackerId: participant.id, attackerName: participant.displayName, targetId: target.id, targetName: target.displayName, guessCode: req.body.guessCode, exactCount: feedback.exactCount, misplacedCount: feedback.misplacedCount, createdAt: new Date().toISOString() });
    const eliminated = feedback.exactCount === 5;
    if (eliminated) await tx.activityParticipant.update({ where: { id: target.id }, data: { eliminated: true, eliminatedAt: new Date() } });
    const nextActiveOrder = eliminated ? activeOrder.filter(id => id !== target.id) : activeOrder;
    const nextCurrentId = eliminated ? participant.id : nextActiveOrder[(currentIndex + 1) % nextActiveOrder.length];
    const nextCurrentIndex = Math.max(0, nextActiveOrder.indexOf(nextCurrentId));
    await tx.activityParticipant.update({ where: { id: participant.id }, data: { score: { increment: eliminated ? 1 : 0 }, metadata: JSON.stringify({ ...attackerMetadata, lastGuess: req.body.guessCode }), lastSeenAt: new Date() } });
    const finished = nextActiveOrder.length === 1;
    const updatedState = { order: nextActiveOrder, currentIndex: nextCurrentIndex, history };
    await tx.activitySession.update({ where: { id: session.id }, data: { gameState: JSON.stringify(updatedState) } });
    const latest = await tx.activitySession.findUnique({ where: { id: session.id }, include: { participants: true, activity: true } });
    const finalSession = finished ? await finalizeActivitySession(tx, latest.id) : latest;
    return { feedback, eliminated, finished, targetId, currentPlayerId: nextCurrentId, session: finalSession };
  });
  res.json({ success: true, feedback: result.feedback, eliminated: result.eliminated, finished: result.finished, targetId: result.targetId, currentPlayerId: result.currentPlayerId, history: parseJson(result.session.gameState, {}).history || [], participants: result.session.participants.map(participantView) });
});

const hackerAnswerSchema = { params: { sessionId: zId('الجلسة') }, body: { challenge: zNumber('المرحلة', { min: 0, max: HACKER_STAGES.length - 1, int: true }), selectedIndex: zNumber('الإجابة', { min: 0, max: 10, int: true }) } };
router.post('/sessions/:sessionId/hacker-answer', enforceNotFrozen, validate(hackerAnswerSchema), async (req, res) => {
  const result = await prisma.$transaction(async tx => {
    const session = await tx.activitySession.findUnique({ where: { id: req.params.sessionId }, include: { participants: true, activity: true } });
    const participant = session && session.participants.find(item => item.teamId === req.user.id && item.deviceId === req.user.deviceId);
    const stage = HACKER_STAGES[req.body.challenge];
    if (!session || !participant || session.activity.slug !== 'hacker-sandbox' || !stage) throw Object.assign(new Error('مرحلة المحاكي غير موجودة'), { status: 404 });
    if (session.status !== 'active') throw Object.assign(new Error('انتهت جلسة المحاكي'), { status: 409 });
    const metadata = parseJson(participant.metadata, { answers: {}, currentStage: 0 });
    metadata.answers ||= {};
    const currentStage = Number(metadata.currentStage || 0);
    if (req.body.challenge !== currentStage) throw Object.assign(new Error('يجب حل مراحل البنك بالترتيب'), { status: 409 });
    const correct = Number(req.body.selectedIndex) === stage.answer;
    metadata.answers[String(currentStage)] = { correct, points: correct ? 1 : 0 };
    metadata.currentStage = currentStage + 1;
    const score = Object.values(metadata.answers).reduce((sum, answer) => sum + Number(answer?.points || 0), 0);
    const completed = metadata.currentStage >= HACKER_STAGES.length;
    await tx.activityParticipant.update({ where: { id: participant.id }, data: { score, metadata: JSON.stringify(metadata), ...(completed && { finishedAt: new Date() }) } });
    const latest = await tx.activitySession.findUnique({ where: { id: session.id }, include: { participants: true, activity: true } });
    const finalSession = completed ? await finalizeActivitySession(tx, session.id) : latest;
    return { correct, score, completed, session: finalSession, nextStage: completed ? null : getHackerStageView(HACKER_STAGES[metadata.currentStage], metadata.currentStage), feedback: stage.feedback };
  });
  res.json({ success: true, correct: result.correct, score: result.score, completed: result.completed, feedback: result.feedback, challenge: result.nextStage, session: sessionView(result.session, getActivityConfig(result.session.activity), req.user) });
});

const colorRoundSchema = {
  params: { sessionId: zId('الجلسة') },
  body: {
    round: zNumber('الجولة', { min: 1, max: 10, int: true }),
    r: zNumber('الأحمر', { min: 0, max: 255, int: true, optional: true }),
    g: zNumber('الأخضر', { min: 0, max: 255, int: true, optional: true }),
    b: zNumber('الأزرق', { min: 0, max: 255, int: true, optional: true }),
  },
};
router.post('/sessions/:sessionId/color-round', enforceNotFrozen, validate(colorRoundSchema), async (req, res) => {
  const session = await prisma.activitySession.findUnique({ where: { id: req.params.sessionId }, include: { activity: true } });
  const participant = session && await findParticipant(session.id, req.user.id, req.user.deviceId);
  if (!session || !participant || getActivityConfig(session.activity).kind !== 'color') return res.status(404).json({ error: 'جلسة Color Hunt غير موجودة' });
  const metadata = parseJson(participant.metadata, { rounds: {} });
  metadata.rounds ||= {};
  const key = String(req.body.round);
  metadata.rounds[key] ||= { target: generateColorTarget() };
  const current = metadata.rounds[key];
  if (req.body.r !== undefined && current.score === undefined) {
    const value = { r: req.body.r, g: req.body.g, b: req.body.b };
    current.value = value;
    current.score = Math.max(0, 100 - (Math.abs(current.target.r - value.r) + Math.abs(current.target.g - value.g) + Math.abs(current.target.b - value.b)) / 7.65);
  }
  const total = Object.values(metadata.rounds).reduce((sum, round) => sum + Number(round.score || 0), 0);
  await prisma.activityParticipant.update({ where: { id: participant.id }, data: { score: total, metadata: JSON.stringify(metadata) } });
  res.json({ success: true, round: req.body.round, target: current.target, score: current.score ?? null, total });
});

const easterScanSchema = { params: { sessionId: zId('الجلسة') }, body: { qrValue: zString('QR المرحلة', { min: 1, max: 500 }) } };
router.post('/sessions/:sessionId/easter-scan', enforceNotFrozen, validate(easterScanSchema), async (req, res) => {
  const result = await prisma.$transaction(async tx => {
    const session = await tx.activitySession.findUnique({ where: { id: req.params.sessionId }, include: { participants: true, activity: true } });
    const participant = session && session.participants.find(item => item.teamId === req.user.id && item.deviceId === req.user.deviceId);
    if (!session || !participant || session.activity.slug !== 'easter-egg') throw Object.assign(new Error('جلسة Easter Egg غير موجودة'), { status: 404 });
    if (session.status !== 'active') throw Object.assign(new Error('انتهت رحلة Easter Egg'), { status: 409 });
    const state = parseJson(session.gameState, { stageIndex: 0, scannedStages: [], awaitingTask: false });
    const activityConfig = getActivityConfig(session.activity);
    const stages = getEasterEggStages({ ...activityConfig, stages: Array.isArray(state.easterStages) ? state.easterStages : activityConfig.stages });
    const currentStageIndex = Number(state.stageIndex) || 0;
    const nextStageIndex = state.awaitingTask ? currentStageIndex + 1 : currentStageIndex;
    const stage = stages[nextStageIndex];
    if (!stage) throw Object.assign(new Error('اكتملت رحلة Easter Egg بالفعل'), { status: 409 });
    if (!matchesEasterEggQr(req.body.qrValue, stage)) throw Object.assign(new Error('هذا QR ليس المرحلة المطلوبة'), { status: 409 });
    const nextState = { ...state, stageIndex: nextStageIndex, awaitingTask: true, scannedStages: [...(state.scannedStages || []), stage.id] };
    await tx.activitySession.update({ where: { id: session.id }, data: { gameState: JSON.stringify(nextState) } });
    return { session: await tx.activitySession.findUnique({ where: { id: session.id }, include: { participants: true, activity: true } }), stage: getEasterStageView(stage, nextStageIndex, stages.length), total: stages.length };
  });
  res.json({ success: true, stage: result.stage, progress: { current: result.stage.index + 1, total: result.total }, session: sessionView(result.session, getActivityConfig(result.session.activity), req.user) });
});

router.post('/sessions/:sessionId/easter-finish', enforceNotFrozen, validate({ params: { sessionId: zId('الجلسة') } }), async (req, res) => {
  const result = await prisma.$transaction(async tx => {
    const session = await tx.activitySession.findUnique({ where: { id: req.params.sessionId }, include: { participants: true, activity: true } });
    const participant = session && session.participants.find(item => item.teamId === req.user.id && item.deviceId === req.user.deviceId);
    if (!session || !participant || session.activity.slug !== 'easter-egg') throw Object.assign(new Error('جلسة Easter Egg غير موجودة'), { status: 404 });
    const state = parseJson(session.gameState, { stageIndex: 0, scannedStages: [], awaitingTask: false });
    const activityConfig = getActivityConfig(session.activity);
    const stages = getEasterEggStages({ ...activityConfig, stages: Array.isArray(state.easterStages) ? state.easterStages : activityConfig.stages });
    const finalStageIndex = stages.length - 1;
    if (!state.awaitingTask || Number(state.stageIndex) !== finalStageIndex) throw Object.assign(new Error('أكملوا كل مراحل الرحلة قبل الإنهاء'), { status: 409 });
    await tx.activityParticipant.update({ where: { id: participant.id }, data: { finishedAt: new Date() } });
    return finalizeActivitySession(tx, session.id);
  });
  res.json({ success: true, completed: true, session: sessionView(result, getActivityConfig(result.activity), req.user) });
});

router.post('/sessions/:sessionId/finish', enforceNotFrozen, validate({ params: { sessionId: zId('الجلسة') }, body: { score: zNumber('النتيجة', { min: 0, max: 100000 }), metadata: z.record(z.any()).optional() } }), async (req, res) => {
  const result = await prisma.$transaction(async tx => {
    const session = await tx.activitySession.findUnique({ where: { id: req.params.sessionId }, include: { participants: true, activity: true } });
    const participant = session && session.participants.find(item => item.teamId === req.user.id && item.deviceId === req.user.deviceId);
    if (!session || !participant) throw Object.assign(new Error('الجلسة غير موجودة'), { status: 404 });
    const config = getActivityConfig(session.activity);
    if (config.kind === 'easter') throw Object.assign(new Error('يجب إنهاء مراحل QR بالترتيب'), { status: 409 });
    const currentMetadata = config.kind === 'color' ? participant.metadata : (req.body.metadata ? JSON.stringify(req.body.metadata) : participant.metadata);
    const metadata = parseJson(currentMetadata, {});
    if (config.kind === 'hacker' && Number(metadata.currentStage || 0) < HACKER_STAGES.length) throw Object.assign(new Error('يجب حل مراحل البنك بالترتيب'), { status: 409 });
    const calculatedScore = config.kind === 'color'
      ? Object.values(metadata.rounds || {}).reduce((sum, round) => sum + Number(round.score || 0), 0)
      : config.kind === 'hacker'
        ? Object.values(metadata.answers || {}).reduce((sum, answer) => sum + Number(answer?.points || 0), 0)
        : Number(req.body.score);
    await tx.activityParticipant.update({ where: { id: participant.id }, data: { score: calculatedScore, metadata: currentMetadata, finishedAt: new Date() } });
    const latest = await tx.activitySession.findUnique({ where: { id: session.id }, include: { participants: true, activity: true } });
    const finished = latest.activity.slug !== 'guess-number' || latest.participants.every(item => item.finishedAt);
    const finalSession = finished ? await finalizeActivitySession(tx, latest.id) : latest;
    return { session: finalSession, finished };
  });
  res.json({ success: true, finished: result.finished, session: sessionView(result.session, getActivityConfig(result.session.activity), req.user) });
});

export default router;
