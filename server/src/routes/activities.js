import { Router } from 'express';
import prisma from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { enforceNotFrozen } from '../freeze.js';
import { validate, zId, zNumber, zString } from '../middleware/validate.js';
import { getActivityConfig, getCatalogEntry, generateColorTarget, generateRoomCode, HACKER_CHALLENGES, ensureActivityCatalog, ensureTeamWallet, finalizeActivityRewards } from '../activityService.js';
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
  return { id: participant.id, teamId: participant.teamId, displayName: participant.displayName, score: participant.score, rank: participant.rank, ready: Boolean(parseJson(participant.metadata, {}).secretCode), eliminated: Boolean(participant.eliminated), joinedAt: participant.joinedAt, finishedAt: participant.finishedAt };
}

function sessionView(session, config = {}, viewer = null) {
  const safeSession = { ...session };
  const participants = safeSession.participants;
  const gameState = parseJson(safeSession.gameState, {});
  const currentPlayerId = config.kind === 'guess' ? gameState.order?.[gameState.currentIndex] || null : null;
  const activeOrder = config.kind === 'guess' ? (gameState.order || []).filter(id => participants?.some(item => item.id === id && !item.eliminated)) : [];
  const targetPlayerId = currentPlayerId && activeOrder.length > 1 ? activeOrder[(activeOrder.indexOf(currentPlayerId) + 1) % activeOrder.length] : null;
  const mine = viewer && participants?.find(item => item.teamId === (viewer.teamId || viewer.id) && item.deviceId === viewer.deviceId);
  delete safeSession.gameState;
  delete safeSession.participants;
  return { ...safeSession, config, participantId: mine?.id || null, currentPlayerId, targetPlayerId, history: config.kind === 'guess' ? gameState.history || [] : [], participants: participants?.map(participantView) || [] };
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
  const [activities, wallet] = await Promise.all([
    prisma.activity.findMany({ where: { isOpen: true }, orderBy: { createdAt: 'asc' } }),
    ensureTeamWallet(prisma, req.user.id),
  ]);
  res.json({ success: true, activities: activities.map(activity => ({ ...activity, config: parseJson(activity.config) })), wallet });
});

router.get('/wallet', async (req, res) => {
  const [wallet, transactions] = await Promise.all([
    ensureTeamWallet(prisma, req.user.id),
    prisma.walletTransaction.findMany({ where: { teamId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
  ]);
  res.json({ success: true, wallet, transactions });
});

router.get('/shop', async (req, res) => {
  const [items, wallet] = await Promise.all([
    prisma.shopItem.findMany({ where: { isActive: true }, orderBy: { price: 'asc' } }),
    ensureTeamWallet(prisma, req.user.id),
  ]);
  res.json({ success: true, wallet, items: items.map(item => ({ ...item, effect: parseJson(item.effect) })) });
});

router.post('/shop/:itemId/purchase', enforceNotFrozen, validate({ params: { itemId: zId('المنتج') }, body: { quantity: zNumber('الكمية', { min: 1, max: 10, int: true, optional: true }) } }), async (req, res) => {
  const quantity = Number(req.body.quantity || 1);
  const result = await prisma.$transaction(async tx => {
    const item = await tx.shopItem.findUnique({ where: { id: req.params.itemId } });
    if (!item || !item.isActive) throw Object.assign(new Error('المنتج غير متاح'), { status: 404 });
    if (item.category !== 'cosmetic') throw Object.assign(new Error('هذا النوع من المميزات مؤجل حاليًا'), { status: 400 });
    const total = item.price * quantity;
    const wallet = await ensureTeamWallet(tx, req.user.id);
    if (wallet.balance < total) throw Object.assign(new Error('رصيد الفريق غير كافٍ'), { status: 400 });
    await tx.teamWallet.update({ where: { teamId: req.user.id }, data: { balance: { decrement: total }, totalSpent: { increment: total } } });
    const purchase = await tx.purchase.create({ data: { teamId: req.user.id, itemId: item.id, quantity, unitPrice: item.price, effectSnapshot: item.effect } });
    await tx.walletTransaction.create({ data: { teamId: req.user.id, type: 'purchase', amount: -total, reason: `شراء ${item.name}`, metadata: JSON.stringify({ itemId: item.id, quantity }) } });
    return { purchase, wallet: await tx.teamWallet.findUnique({ where: { teamId: req.user.id } }) };
  });
  res.status(201).json({ success: true, ...result });
});

router.get('/:slug/leaderboard', async (req, res) => {
  const activity = await getActivity(req.params.slug);
  if (!activity) return res.status(404).json({ error: 'النشاط غير موجود' });
  const participants = await prisma.activityParticipant.findMany({ where: { session: { activityId: activity.id, status: 'finished' } }, orderBy: [{ score: 'desc' }, { finishedAt: 'asc' }], take: 100 });
  const own = participants.filter(participant => participant.teamId === req.user.id).map(participantView);
  res.json({ success: true, activity: { slug: activity.slug, name: activity.name }, global: participants.map(participantView), own });
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
    session = await prisma.activitySession.create({ data: { activityId: activity.id, status: config.kind === 'guess' ? 'waiting' : 'active', minPlayers: catalog?.minPlayers || 1, maxPlayers: catalog?.maxPlayers || 1, gameState: config.kind === 'guess' ? JSON.stringify({ secret: null }) : '{}', startedAt: config.kind === 'guess' ? null : new Date() }, include: { participants: true } });
  }

  try {
    await prisma.activityParticipant.create({ data: { sessionId: session.id, teamId: req.user.id, deviceId: req.user.deviceId, displayName } });
  } catch (error) {
    if (error.code !== 'P2002') throw error;
  }
  const current = await prisma.activitySession.findUnique({ where: { id: session.id }, include: { participants: true, activity: true } });
  res.status(201).json({ success: true, session: { ...sessionView(current, config, req.user), fallbackAvailable: config.kind === 'guess' && !current.roomCode && Date.now() - new Date(current.createdAt).getTime() >= (config.autoWaitSeconds || 60) * 1000 } });
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
      if (normalizedOrder.length <= 1) await prisma.$transaction(tx => finalizeActivityRewards(tx, session.id));
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
    const finalSession = finished ? await finalizeActivityRewards(tx, latest.id) : latest;
    return { feedback, eliminated, finished, targetId, currentPlayerId: nextCurrentId, session: finalSession };
  });
  res.json({ success: true, feedback: result.feedback, eliminated: result.eliminated, finished: result.finished, targetId: result.targetId, currentPlayerId: result.currentPlayerId, history: parseJson(result.session.gameState, {}).history || [], participants: result.session.participants.map(participantView) });
});

router.post('/sessions/:sessionId/hacker-answer', enforceNotFrozen, validate({ params: { sessionId: zId('الجلسة') }, body: { challenge: zNumber('التحدي', { min: 0, max: 20, int: true }), selectedIndex: zNumber('الإجابة', { min: 0, max: 10, int: true }) } }), async (req, res) => {
  const session = await prisma.activitySession.findUnique({ where: { id: req.params.sessionId }, include: { participants: true, activity: true } });
  const participant = session && session.participants.find(item => item.teamId === req.user.id && item.deviceId === req.user.deviceId);
  const challenge = HACKER_CHALLENGES[req.body.challenge];
  if (!session || !participant || session.activity.slug !== 'hacker-sandbox' || !challenge) return res.status(404).json({ error: 'تحدي المحاكي غير موجود' });
  const metadata = parseJson(participant.metadata, { answers: {} });
  metadata.answers ||= {};
  const key = String(req.body.challenge);
  if (metadata.answers[key] === undefined) metadata.answers[key] = Number(req.body.selectedIndex) === challenge.answer ? 10 : 0;
  const score = Object.values(metadata.answers).reduce((sum, value) => sum + Number(value || 0), 0);
  await prisma.activityParticipant.update({ where: { id: participant.id }, data: { score, metadata: JSON.stringify(metadata) } });
  res.json({ success: true, score, challenge: { title: challenge.title, prompt: challenge.prompt, options: challenge.options } });
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
  if (!session || !participant) return res.status(404).json({ error: 'الجلسة غير موجودة' });
  const metadata = parseJson(participant.metadata, { rounds: {} });
  metadata.rounds ||= {};
  const key = String(req.body.round);
  metadata.rounds[key] ||= { target: generateColorTarget() };
  const current = metadata.rounds[key];
  if (req.body.r !== undefined && !current.score) {
    const value = { r: req.body.r, g: req.body.g, b: req.body.b };
    current.value = value;
    current.score = Math.max(0, 100 - (Math.abs(current.target.r - value.r) + Math.abs(current.target.g - value.g) + Math.abs(current.target.b - value.b)) / 7.65);
  }
  const total = Object.values(metadata.rounds).reduce((sum, round) => sum + Number(round.score || 0), 0);
  await prisma.activityParticipant.update({ where: { id: participant.id }, data: { score: total, metadata: JSON.stringify(metadata) } });
  res.json({ success: true, round: req.body.round, target: current.target, score: current.score || null, total });
});

router.post('/sessions/:sessionId/finish', enforceNotFrozen, validate({ params: { sessionId: zId('الجلسة') }, body: { score: zNumber('النتيجة', { min: 0, max: 100000 }), metadata: z.record(z.any()).optional() } }), async (req, res) => {
  const result = await prisma.$transaction(async tx => {
    const session = await tx.activitySession.findUnique({ where: { id: req.params.sessionId }, include: { participants: true, activity: true } });
    const participant = session && session.participants.find(item => item.teamId === req.user.id && item.deviceId === req.user.deviceId);
    if (!session || !participant) throw Object.assign(new Error('الجلسة غير موجودة'), { status: 404 });
    const config = getActivityConfig(session.activity);
    const currentMetadata = ['color', 'hacker'].includes(config.kind) ? participant.metadata : (req.body.metadata ? JSON.stringify(req.body.metadata) : participant.metadata);
    const metadata = parseJson(currentMetadata, {});
    const calculatedScore = config.kind === 'color'
      ? Object.values(metadata.rounds || {}).reduce((sum, round) => sum + Number(round.score || 0), 0)
      : config.kind === 'hacker'
        ? Object.values(metadata.answers || {}).reduce((sum, value) => sum + Number(value || 0), 0)
        : Number(req.body.score);
    await tx.activityParticipant.update({ where: { id: participant.id }, data: { score: calculatedScore, metadata: currentMetadata, finishedAt: new Date() } });
    const latest = await tx.activitySession.findUnique({ where: { id: session.id }, include: { participants: true, activity: true } });
    const finished = latest.activity.slug !== 'guess-number' || latest.participants.every(item => item.finishedAt);
    const finalSession = finished ? await finalizeActivityRewards(tx, latest.id) : latest;
    return { session: finalSession, finished };
  });
  res.json({ success: true, finished: result.finished, session: sessionView(result.session, getActivityConfig(result.session.activity), req.user) });
});

export default router;
