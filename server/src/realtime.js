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
