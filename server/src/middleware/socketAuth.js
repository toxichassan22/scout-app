import jwt from 'jsonwebtoken';
import prisma from '../db.js';
import { JWT_SECRET } from '../security.js';

export const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token
            || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
        // Existing public clients may connect for public broadcasts, but cannot join privileged rooms.
        if (!token) {
            socket.user = { role: 'guest', id: null };
            return next();
        }
        const user = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        if (!['team', 'judge', 'admin'].includes(user.role) || !user.id) return next(new Error('Invalid authentication role'));

        if (user.role === 'team') await prisma.team.findUniqueOrThrow({ where: { id: user.id }, select: { id: true } });
        if (user.role === 'judge') await prisma.judge.findUniqueOrThrow({ where: { id: user.id }, select: { id: true } });
        if (user.role === 'admin') await prisma.admin.findUniqueOrThrow({ where: { id: user.id }, select: { id: true } });
        socket.user = user;
        next();
    } catch (error) {
        next(new Error('Invalid or expired authentication token'));
    }
};

export async function canJoinRoom(socket, room) {
    if (room === 'admin') return socket.user.role === 'admin';
    if (room === 'judge') return socket.user.role === 'judge';
    if (room.startsWith('team:')) return socket.user.role === 'team' && room === `team:${socket.user.id}`;
    if (room.startsWith('competition:') && socket.user.role === 'judge') {
        const competitionId = room.slice('competition:'.length);
        if (!competitionId || competitionId.length > 100) return false;
        const assignment = await prisma.judgeCompetition.findUnique({
            where: { judgeId_competitionId: { judgeId: socket.user.id, competitionId } },
            select: { id: true },
        });
        return Boolean(assignment);
    }
    return false;
}
