import logger from './logger.js';

export const LEADERBOARD_ROOM = 'leaderboard:participants';

export function joinPublicRealtimeRooms(socket) {
    if (socket.user?.role === 'guest' || socket.user?.role === 'team') {
        socket.join(LEADERBOARD_ROOM);
    }
}

export async function emitLeaderboardUpdate(io, loadLeaderboard) {
    if (!io) return;

    try {
        const leaderboard = await loadLeaderboard();
        io.to(LEADERBOARD_ROOM).emit('leaderboard:update', leaderboard);
    } catch (error) {
        logger.error({ error }, '[Socket] leaderboard broadcast failed');
    }
}
