const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const dispatch = require('../services/dispatch.service');
const walletService = require('../services/wallet.service');
const settingsService = require('../services/settings.service');

const rideInclude = [
  { model: db.User, as: 'customer', attributes: ['id', 'username', 'phone'] },
  { model: db.User, as: 'tower', attributes: ['id', 'username', 'phone', 'currentLat', 'currentLng'] },
  {
    model: db.RideBid, as: 'bids',
    include: [{ model: db.User, as: 'tower', attributes: ['id', 'username', 'phone'] }],
  },
];

// POST /mobile/rides  — customer creates ride request
const createRide = asyncHandler(async (req, res) => {
  if (req.user.userType !== 'customer') throw ApiError.forbidden('Only customers can create ride requests');

  const { fromAddress, fromLat, fromLng, toAddress, toLat, toLng, customerNote } = req.body;

  // Check customer has no active ride already
  const existing = await db.Ride.findOne({
    where: {
      customerId: req.user.id,
      status: ['searching', 'bidding', 'accepted', 'tower_en_route', 'at_pickup', 'in_progress'],
    },
  });
  if (existing) throw ApiError.conflict('You already have an active ride request');

  const ride = await db.Ride.create({
    customerId: req.user.id,
    fromAddress,
    fromLat,
    fromLng,
    toAddress,
    toLat,
    toLng,
    customerNote,
    status: 'searching',
    searchRadiusKm: 5,
  });

  // Start radius expansion dispatch (async, does not block response)
  dispatch.startDispatch(ride);

  // Notify admin
  dispatch._broadcastAdminRideUpdate(ride.id, 'searching');

  return created(res, { id: ride.id, status: ride.status }, 'Ride request created — searching for towers');
});

// GET /mobile/rides/:id  — get ride details + bids
const getRide = asyncHandler(async (req, res) => {
  const ride = await db.Ride.findByPk(req.params.id, { include: rideInclude });
  if (!ride) throw ApiError.notFound('Ride not found');

  const uid = req.user.id;
  if (ride.customerId !== uid && ride.towerId !== uid) {
    throw ApiError.forbidden('Not your ride');
  }
  return ok(res, ride);
});

// GET /mobile/rides  — list rides for current user
const listRides = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const where = {};
  if (req.user.userType === 'customer') where.customerId = req.user.id;
  else where.towerId = req.user.id;
  if (status) where.status = status;

  const offset = (page - 1) * limit;
  const { rows, count } = await db.Ride.findAndCountAll({
    where, include: rideInclude, limit: Number(limit), offset, order: [['id', 'DESC']], distinct: true,
  });
  return ok(res, rows, 'Rides', { total: count, page: Number(page), limit: Number(limit) });
});

// POST /mobile/rides/:id/cancel  — customer or tower cancels
const cancelRide = asyncHandler(async (req, res) => {
  const ride = await db.Ride.findByPk(req.params.id);
  if (!ride) throw ApiError.notFound('Ride not found');

  const cancelableStatuses = ['searching', 'bidding', 'accepted', 'tower_en_route'];
  if (!cancelableStatuses.includes(ride.status)) {
    throw ApiError.badRequest(`Cannot cancel a ride with status: ${ride.status}`);
  }
  if (ride.customerId !== req.user.id && ride.towerId !== req.user.id) {
    throw ApiError.forbidden('Not your ride');
  }

  await ride.update({ status: 'cancelled', cancelledAt: new Date(), cancelReason: req.body.reason || null });

  dispatch.stopDispatch(ride.id);
  if (ride.towerId) dispatch.towerEndRide(ride.towerId);

  // Notify the other party
  const otherPartyId = ride.customerId === req.user.id ? ride.towerId : ride.customerId;
  if (otherPartyId) {
    dispatch.io?.to(`user:${otherPartyId}`).emit('ride:cancelled', { rideId: ride.id, reason: req.body.reason });
  }
  dispatch._broadcastAdminRideUpdate(ride.id, 'cancelled');

  return ok(res, { status: 'cancelled' }, 'Ride cancelled');
});

// ─── Tower places a bid ───────────────────────────────────────────────────────

// POST /mobile/rides/:id/bids
const placeBid = asyncHandler(async (req, res) => {
  if (req.user.userType !== 'tower') throw ApiError.forbidden('Only towers can place bids');

  const ride = await db.Ride.findByPk(req.params.id);
  if (!ride) throw ApiError.notFound('Ride not found');
  if (!['searching', 'bidding'].includes(ride.status)) {
    throw ApiError.badRequest(`Ride is not accepting bids (status: ${ride.status})`);
  }

  // One bid per tower per ride
  const existingBid = await db.RideBid.findOne({ where: { rideId: ride.id, towerId: req.user.id } });
  if (existingBid) throw ApiError.conflict('You already placed a bid on this ride');

  const { amount, etaMinutes, note } = req.body;
  const bid = await db.RideBid.create({ rideId: ride.id, towerId: req.user.id, amount, etaMinutes, note });

  // Move ride to bidding state
  if (ride.status === 'searching') {
    await ride.update({ status: 'bidding' });
    dispatch.stopDispatch(ride.id); // stop radius expansion
  }

  const bidWithTower = await db.RideBid.findByPk(bid.id, {
    include: [{ model: db.User, as: 'tower', attributes: ['id', 'username', 'phone'] }],
  });

  // Notify customer
  dispatch.io?.to(`user:${ride.customerId}`).emit('ride:new_bid', {
    rideId: ride.id,
    bid: bidWithTower,
  });
  dispatch._broadcastAdminRideUpdate(ride.id, 'bidding');

  return created(res, bidWithTower, 'Bid placed');
});

// POST /mobile/rides/:id/bids/:bidId/accept
const acceptBid = asyncHandler(async (req, res) => {
  if (req.user.userType !== 'customer') throw ApiError.forbidden('Only customers can accept bids');

  const ride = await db.Ride.findByPk(req.params.id);
  if (!ride) throw ApiError.notFound('Ride not found');
  if (ride.customerId !== req.user.id) throw ApiError.forbidden('Not your ride');
  if (ride.status !== 'bidding') throw ApiError.badRequest('Ride is not in bidding state');

  const bid = await db.RideBid.findByPk(req.params.bidId);
  if (!bid || bid.rideId !== ride.id) throw ApiError.notFound('Bid not found');

  // Accept this bid, reject all others
  await db.RideBid.update({ status: 'rejected' }, { where: { rideId: ride.id, id: { [db.Sequelize.Op.ne]: bid.id } } });
  await bid.update({ status: 'accepted' });
  await ride.update({ status: 'accepted', towerId: bid.towerId, acceptedBidId: bid.id, fareAmount: bid.amount });

  // Notify winning tower
  dispatch.io?.to(`user:${bid.towerId}`).emit('ride:bid_accepted', {
    rideId: ride.id,
    bidId: bid.id,
    fromLat: Number(ride.fromLat),
    fromLng: Number(ride.fromLng),
    fromAddress: ride.fromAddress,
  });

  // Add tower to ride room for location streaming
  dispatch.io?.to(`user:${bid.towerId}`).socketsJoin(`ride:${ride.id}`);
  dispatch.io?.to(`user:${ride.customerId}`).socketsJoin(`ride:${ride.id}`);

  dispatch.towerStartRide(bid.towerId, ride.id);
  dispatch._broadcastAdminRideUpdate(ride.id, 'accepted');

  return ok(res, { status: 'accepted', towerId: bid.towerId, fareAmount: bid.amount }, 'Bid accepted');
});

// POST /mobile/rides/:id/bids/:bidId/reject
const rejectBid = asyncHandler(async (req, res) => {
  if (req.user.userType !== 'customer') throw ApiError.forbidden('Only customers can reject bids');

  const ride = await db.Ride.findByPk(req.params.id);
  if (!ride || ride.customerId !== req.user.id) throw ApiError.forbidden('Not your ride');

  const bid = await db.RideBid.findByPk(req.params.bidId);
  if (!bid || bid.rideId !== ride.id) throw ApiError.notFound('Bid not found');

  await bid.update({ status: 'rejected' });

  // Notify tower
  dispatch.io?.to(`user:${bid.towerId}`).emit('ride:bid_rejected', { rideId: ride.id, bidId: bid.id });

  // If no more pending bids, move back to searching
  const remaining = await db.RideBid.count({ where: { rideId: ride.id, status: 'pending' } });
  if (remaining === 0) {
    await ride.update({ status: 'searching' });
    dispatch.startDispatch(ride); // restart with current radius
  }

  return ok(res, { status: 'rejected' });
});

// ─── Tower ride lifecycle ─────────────────────────────────────────────────────

// POST /mobile/rides/:id/arrived  — tower arrived at pickup point
const towerArrived = asyncHandler(async (req, res) => {
  const ride = await _getTowerRide(req);
  if (ride.status !== 'accepted' && ride.status !== 'tower_en_route') {
    throw ApiError.badRequest(`Cannot mark arrived from status: ${ride.status}`);
  }
  await ride.update({ status: 'at_pickup' });

  dispatch.io?.to(`user:${ride.customerId}`).emit('ride:tower_arrived', { rideId: ride.id });
  dispatch._broadcastAdminRideUpdate(ride.id, 'at_pickup');

  return ok(res, { status: 'at_pickup' }, 'Marked as arrived at pickup');
});

// POST /mobile/rides/:id/start  — tower starts ride
const startRide = asyncHandler(async (req, res) => {
  const ride = await _getTowerRide(req);
  if (ride.status !== 'at_pickup') throw ApiError.badRequest('Must be at pickup before starting ride');
  if (ride.paymentStatus !== 'paid') {
    throw ApiError.badRequest('Customer has not completed payment for this ride yet');
  }

  await ride.update({ status: 'in_progress', startedAt: new Date() });

  dispatch.io?.to(`ride:${ride.id}`).emit('ride:started', { rideId: ride.id, startedAt: ride.startedAt });
  dispatch._broadcastAdminRideUpdate(ride.id, 'in_progress');

  return ok(res, { status: 'in_progress', startedAt: ride.startedAt }, 'Ride started');
});

// POST /mobile/rides/:id/complete  — tower completes ride
const completeRide = asyncHandler(async (req, res) => {
  const ride = await _getTowerRide(req);
  if (ride.status !== 'in_progress') throw ApiError.badRequest('Ride is not in progress');

  // Fare minus platform commission goes straight to the tower's wallet as an available balance.
  const commissionPercent = Number(await settingsService.get('commission_percent'));
  const fare = Number(ride.fareAmount || 0);
  const platformCommissionAmount = Math.round(fare * (commissionPercent / 100) * 100) / 100;
  const vendorEarningAmount = Math.round((fare - platformCommissionAmount) * 100) / 100;

  await ride.update({
    status: 'completed',
    completedAt: new Date(),
    platformCommissionAmount,
    vendorEarningAmount,
  });

  if (vendorEarningAmount > 0) {
    await walletService.applyTransaction({
      userId: ride.towerId,
      type: 'job_earning',
      amount: vendorEarningAmount,
      referenceType: 'ride',
      referenceId: ride.id,
      note: `Ride #${ride.id} fare (${commissionPercent}% commission deducted)`,
    });
  }

  dispatch.towerEndRide(ride.towerId);

  dispatch.io?.to(`ride:${ride.id}`).emit('ride:completed', {
    rideId: ride.id,
    completedAt: ride.completedAt,
    fareAmount: Number(ride.fareAmount),
  });
  dispatch._broadcastAdminRideUpdate(ride.id, 'completed');

  return ok(res, { status: 'completed', fareAmount: Number(ride.fareAmount) }, 'Ride completed');
});

// GET /mobile/rides/:id/tracking  — get stored GPS trail
const getTracking = asyncHandler(async (req, res) => {
  const ride = await db.Ride.findByPk(req.params.id, { attributes: ['id', 'customerId', 'towerId'] });
  if (!ride) throw ApiError.notFound('Ride not found');
  if (ride.customerId !== req.user.id && ride.towerId !== req.user.id) {
    throw ApiError.forbidden('Not your ride');
  }
  const points = await db.RideTracking.findAll({
    where: { rideId: ride.id },
    order: [['recordedAt', 'ASC']],
    attributes: ['lat', 'lng', 'recordedAt'],
  });
  return ok(res, points);
});

// ─── Admin endpoints ──────────────────────────────────────────────────────────

// GET /mobile/rides/admin/active  — admin view of all active rides
const adminActiveRides = asyncHandler(async (req, res) => {
  const rides = await db.Ride.findAll({
    where: { status: ['searching', 'bidding', 'accepted', 'tower_en_route', 'at_pickup', 'in_progress'] },
    include: rideInclude,
    order: [['createdAt', 'DESC']],
  });
  return ok(res, rides, 'Active rides');
});

// ─── Helper ───────────────────────────────────────────────────────────────────

async function _getTowerRide(req) {
  if (req.user.userType !== 'tower') throw ApiError.forbidden('Only towers can update ride status');
  const ride = await db.Ride.findByPk(req.params.id);
  if (!ride) throw ApiError.notFound('Ride not found');
  if (ride.towerId !== req.user.id) throw ApiError.forbidden('This is not your assigned ride');
  return ride;
}

module.exports = {
  createRide, getRide, listRides, cancelRide,
  placeBid, acceptBid, rejectBid,
  towerArrived, startRide, completeRide, getTracking,
  adminActiveRides,
};
