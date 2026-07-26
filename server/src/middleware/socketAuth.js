import prisma from '../db.js';
import { verifyAuthenticatedUser } from './auth.js';
import { LEADERBOARD_ROOM } from '../realtime.js';

const configuredRecheckMs = Number(process.env.SOCKET_AUTH_RECHECK_MS);
const SOCKET_AUTH_RECHECK_MS = Number.isFinite(configuredRecheckMs) && configuredRecheckMs > 0
    ? Math.max(10_000, configuredRecheckMs)
    : 60_000;

export const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token
            || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
        // Existing public clients may connect for public broadcasts, but cannot join privileged rooms.
        if (!token) {
            socket.user = { role: 'guest', id: null };
            return next();
        }
        const user = await verifyAuthenticatedUser(token);
        if (!['team', 'judge', 'admin'].includes(user.role) || !user.id) return next(new Error('Invalid authentication role'));
        socket.user = { ...user, token };
        next();
    } catch (error) {
        next(new Error('Invalid or expired authentication token'));
    }
};

export function startSocketRevocationMonitor(socket) {
    if (!socket.user?.token || socket.user.role === 'guest') return () => { };

    let checking = false;
    const timer = setInterval(async () => {
        if (checking || socket.disconnected) return;
        checking = true;
        try {
            await verifyAuthenticatedUser(socket.user.token);
        } catch {
            socket.emit('force-logout', { reason: 'Session expired or revoked' });
            socket.disconnect(true);
        } finally {
            checking = false;
        }
    }, SOCKET_AUTH_RECHECK_MS);
    timer.unref?.();

    return () => clearInterval(timer);
}

export async function canJoinRoom(socket, room) {
    if (room === LEADERBOARD_ROOM) return ['guest', 'team'].includes(socket.user.role);
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
