const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const agoraService = require('../services/agora.service');

const CALLABLE_STATUSES = ['accepted', 'tower_en_route', 'at_pickup', 'in_progress'];

// GET /mobile/rides/:id/call/token  — either ride participant, once a tower is assigned
const getCallToken = asyncHandler(async (req, res) => {
  const ride = await db.Ride.findByPk(req.params.id, {
    attributes: ['id', 'customerId', 'towerId', 'status'],
  });
  if (!ride) throw ApiError.notFound('Ride not found');
  if (ride.customerId !== req.user.id && ride.towerId !== req.user.id) {
    throw ApiError.forbidden('Not your ride');
  }
  if (!CALLABLE_STATUSES.includes(ride.status)) {
    throw ApiError.badRequest('Calling is only available once a tower is assigned to the ride');
  }

  const channel = `ride_${ride.id}`;
  const { appId, token, expiresAt } = agoraService.generateRtcToken(channel, req.user.id);

  return ok(res, { appId, channel, token, uid: req.user.id, expiresAt });
});

module.exports = { getCallToken };
