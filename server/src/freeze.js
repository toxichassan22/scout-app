import prisma from './db.js';

export async function isEmergencyFrozen(client = prisma) {
    const setting = await client.systemSetting.findUnique({ where: { key: 'EMERGENCY_FREEZE' }, select: { value: true } });
    return setting?.value === 'true';
}

export async function enforceNotFrozen(req, res, next) {
    try {
        if (req.user?.role === 'admin') return next();
        if (await isEmergencyFrozen()) return res.status(423).json({ error: 'تم إيقاف العمليات مؤقتاً بواسطة إدارة المهرجان', frozen: true });
        next();
    } catch (error) {
        next(error);
    }
}
