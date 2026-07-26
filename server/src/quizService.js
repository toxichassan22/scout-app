import prisma from './db.js';

const MAX_ATTEMPTS = 3;

export async function startDigitalSession({ teamId, competitionId, deviceId, entryCode }) {
    return prisma.$transaction(async tx => {
        const competition = await tx.competition.findUnique({ where: { id: competitionId } });
        if (!competition || !competition.isOpen || competition.type !== 'auto_digital') throw Object.assign(new Error('المسابقة الرقمية مغلقة أو غير موجودة'), { status: 400 });
        if (competition.entryCode && competition.entryCode !== String(entryCode || '').trim()) throw Object.assign(new Error('كود الدخول غير صحيح'), { status: 403 });
        if (competition.entryCode) await tx.competitionAccess.upsert({ where: { teamId_competitionId: { teamId, competitionId } }, create: { teamId, competitionId }, update: { grantedAt: new Date() } });
        const score = await tx.score.findUnique({ where: { competitionId_teamId: { competitionId, teamId } } });
        if (score) throw Object.assign(new Error('لقد أكمل فريقك هذه المسابقة بالفعل'), { status: 409 });
        const existing = await tx.quizSession.findUnique({ where: { teamId_competitionId: { teamId, competitionId } }, include: { draftAnswers: true } });
        if (existing) {
            if (existing.deviceId !== deviceId) throw Object.assign(new Error('المسابقة مقفلة على جهاز آخر'), { status: 409 });
            if (existing.isCompleted || new Date() >= existing.expiresAt) throw Object.assign(new Error('انتهت جلسة المسابقة'), { status: 409 });
            return existing;
        }
        const seconds = Number.isInteger(competition.duration) && competition.duration > 0 ? competition.duration : 600;
        return tx.quizSession.create({ data: { teamId, competitionId, deviceId, expiresAt: new Date(Date.now() + seconds * 1000) }, include: { draftAnswers: true } });
    });
}

export async function saveDigitalAnswer({ sessionId, teamId, deviceId, questionId, selectedIndex }) {
    return prisma.$transaction(async tx => {
        const session = await tx.quizSession.findUnique({ where: { id: sessionId } });
        if (!session || session.teamId !== teamId) throw Object.assign(new Error('جلسة المسابقة غير موجودة'), { status: 404 });
        if (session.deviceId !== deviceId) throw Object.assign(new Error('الجهاز لا يطابق جلسة المسابقة'), { status: 403 });
        if (session.isCompleted || new Date() >= session.expiresAt) throw Object.assign(new Error('انتهت المسابقة'), { status: 409 });
        const question = await tx.question.findFirst({ where: { id: questionId, competitionId: session.competitionId } });
        if (!question) throw Object.assign(new Error('السؤال لا ينتمي لهذه المسابقة'), { status: 400 });
        let options;
        try { options = JSON.parse(question.options); } catch { options = []; }
        if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= options.length) throw Object.assign(new Error('الإجابة غير صالحة'), { status: 400 });
        const correct = question.correctOption === selectedIndex;
        return tx.draftAnswer.upsert({ where: { sessionId_questionId: { sessionId, questionId } }, update: { selectedIndex, isCorrect: correct, pointsEarned: correct ? question.points : 0, savedAt: new Date() }, create: { sessionId, questionId, selectedIndex, isCorrect: correct, pointsEarned: correct ? question.points : 0 } });
    });
}

export async function finalizeDigitalSession(sessionId) {
    try {
        return await prisma.$transaction(async tx => {
            const session = await tx.quizSession.findUnique({ where: { id: sessionId }, include: { draftAnswers: true } });
            if (!session) throw Object.assign(new Error('جلسة المسابقة غير موجودة'), { status: 404 });
            const existing = await tx.score.findUnique({ where: { competitionId_teamId: { competitionId: session.competitionId, teamId: session.teamId } } });
            if (existing) return { totalScore: existing.total, score: existing, idempotent: true };
            const totalScore = session.draftAnswers.reduce((sum, answer) => sum + answer.pointsEarned, 0);
            const score = await tx.score.create({ data: { competitionId: session.competitionId, teamId: session.teamId, total: totalScore, values: JSON.stringify({ mode: 'quiz_session', sessionId }), isFinal: true } });
            await tx.quizSession.updateMany({ where: { id: session.id, isCompleted: false }, data: { isCompleted: true, completedAt: new Date() } });
            return { totalScore, score, idempotent: false };
        });
    } catch (error) {
        if (error.code !== 'P2002') throw error;
        const session = await prisma.quizSession.findUnique({ where: { id: sessionId } });
        const score = session && await prisma.score.findUnique({ where: { competitionId_teamId: { competitionId: session.competitionId, teamId: session.teamId } } });
        if (!score) throw error;
        return { totalScore: score.total, score, idempotent: true };
    }
}

export { MAX_ATTEMPTS };
