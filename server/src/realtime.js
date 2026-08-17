import logger from './logger.js';
import { getTeamRanks } from './routes/leaderboard.js';

export const LEADERBOARD_ROOM = 'leaderboard:participants';

let broadcastCooldown = false;
let pendingBroadcast = false;

export function joinPublicRealtimeRooms(socket) {
    if (socket.user?.role === 'guest' || socket.user?.role === 'team') {
        socket.join(LEADERBOARD_ROOM);
    }
}

export function emitCompetitionStarted(io, competition) {
    if (!io || !competition) return;
    io.emit('competition:update', {
        action: 'opened',
        competitionId: competition.id,
        name: competition.name,
        isOpen: true,
    });
    io.emit('competition:mandatory_alert', {
        title: `🏁 انطلقت المسابقة الآن: ${competition.name}`,
        message: `تم فتح باب المشاركة في مسابقة (${competition.name}) رسمياً. حظاً موفقاً لجميع الفرق!`,
        type: 'competition',
        competitionId: competition.id,
    });
}

async function doBroadcast(io, loadLeaderboard) {
    try {
        const [leaderboard, teamRanks] = await Promise.all([
            loadLeaderboard(),
            getTeamRanks(),
        ]);
        io.to(LEADERBOARD_ROOM).emit('leaderboard:update', leaderboard);
        for (const { teamId, rank, points, gapToNext } of teamRanks) {
            io.to(`team:${teamId}`).emit('leaderboard:self', { rank, points, gapToNext });
        }
    } catch (error) {
        logger.error({ error }, '[Socket] leaderboard broadcast failed');
    }
}

export async function emitLeaderboardUpdate(io, loadLeaderboard) {
    if (!io) return;

    if (broadcastCooldown) {
        pendingBroadcast = true;
        return;
    }

    await doBroadcast(io, loadLeaderboard);
    broadcastCooldown = true;
    setTimeout(() => {
        broadcastCooldown = false;
        if (pendingBroadcast) {
            pendingBroadcast = false;
            emitLeaderboardUpdate(io, loadLeaderboard);
        }
    }, 500).unref?.();
}
