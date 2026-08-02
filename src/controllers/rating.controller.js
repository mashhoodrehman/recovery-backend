const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const notificationService = require('../services/notification.service');

// POST /mobile/rides/:id/rating  — customer rates the tower after a completed ride
const createRating = asyncHandler(async (req, res) => {
  const ride = await db.Ride.findByPk(req.params.id);
  if (!ride) throw ApiError.notFound('Ride not found');
  if (ride.customerId !== req.user.id) throw ApiError.forbidden('Only the customer can rate this ride');
  if (ride.status !== 'completed') throw ApiError.badRequest('Ride must be completed before rating');
  if (!ride.towerId) throw ApiError.badRequest('Ride has no assigned tower');

  const existing = await db.Rating.findOne({ where: { rideId: ride.id } });
  if (existing) throw ApiError.conflict('This ride has already been rated');

  const { stars, comment } = req.body;
  const rating = await db.Rating.create({
    rideId: ride.id,
    customerId: ride.customerId,
    towerId: ride.towerId,
    stars,
    comment: comment || null,
  });

  await notificationService.notify({
    userId: ride.towerId,
    type: 'rating_received',
    title: 'You received a new rating',
    body: `${stars}★${comment ? ` — "${comment}"` : ''}`,
    data: { rideId: ride.id, stars },
  });

  return created(res, rating, 'Rating submitted');
});

// GET /mobile/rides/:id/rating
const getRating = asyncHandler(async (req, res) => {
  const ride = await db.Ride.findByPk(req.params.id, { attributes: ['id', 'customerId', 'towerId'] });
  if (!ride) throw ApiError.notFound('Ride not found');
  if (ride.customerId !== req.user.id && ride.towerId !== req.user.id) {
    throw ApiError.forbidden('Not your ride');
  }

  const rating = await db.Rating.findOne({ where: { rideId: ride.id } });
  return ok(res, rating);
});

module.exports = { createRating, getRating };
