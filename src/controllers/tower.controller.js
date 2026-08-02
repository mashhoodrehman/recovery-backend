const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const dispatch = require('../services/dispatch.service');

// POST /mobile/tower/online
const goOnline = asyncHandler(async (req, res) => {
  const { lat, lng, ts } = req.body;
  if (req.user.userType !== 'tower') throw ApiError.forbidden('Only towers can go online');

  await req.user.update({
    isOnline: true,
    currentLat: lat,
    currentLng: lng,
    lastSeenAt: new Date(),
  });

  // Also update in-memory (socket will do this too, this is REST fallback)
  dispatch.towerOnline(req.user.id, null, lat, lng, ts);

  return ok(res, { isOnline: true, lat, lng }, 'Tower is online');
});

// POST /mobile/tower/offline
const goOffline = asyncHandler(async (req, res) => {
  await req.user.update({ isOnline: false, lastSeenAt: new Date() });
  dispatch.towerOffline(req.user.id);
  return ok(res, { isOnline: false }, 'Tower is offline');
});

// PATCH /mobile/tower/location  (REST fallback — prefer socket for real-time)
const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng, ts } = req.body;
  if (req.user.userType !== 'tower') throw ApiError.forbidden('Only towers can update location');

  await req.user.update({ currentLat: lat, currentLng: lng, lastSeenAt: new Date() });
  dispatch.updateTowerLocation(req.user.id, lat, lng, null, ts);

  return ok(res, { lat, lng });
});

// GET /mobile/tower/nearby  — find online towers near a lat/lng (for customer to preview)
const nearby = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 10 } = req.query;
  if (!lat || !lng) throw ApiError.badRequest('lat and lng are required');

  const allTowers = await dispatch.getOnlineTowers();
  const towers = allTowers.filter((t) => {
    const dist = haversine(Number(lat), Number(lng), t.lat, t.lng);
    return dist <= Number(radius);
  });

  return ok(res, towers, 'Nearby towers');
});

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { goOnline, goOffline, updateLocation, nearby };
