// Every authenticated socket auto-joins `user:<id>` on connect (see socket/index.js).
// With the Socket.IO Redis adapter attached, room membership is synced across all
// pm2/cluster instances, so this check is accurate cluster-wide, not just on this process.
const isUserOnline = (io, userId) => {
  if (!io || !userId) return false;
  const room = io.sockets.adapter.rooms.get(`user:${userId}`);
  return !!room && room.size > 0;
};

module.exports = { isUserOnline };
