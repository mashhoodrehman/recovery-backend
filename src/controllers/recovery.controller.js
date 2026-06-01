const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const { collectPermissions } = require('../middlewares/permission.middleware');
const walletService = require('../services/wallet.service');
const settingsService = require('../services/settings.service');
const notificationService = require('../services/notification.service');

const requestInclude = [
  { model: db.User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
  { model: db.User, as: 'assignedTo', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
  {
    model: db.RecoveryBid,
    as: 'bids',
    include: [
      { model: db.User, as: 'bidder', attributes: ['id', 'firstName', 'lastName', 'email'] },
    ],
  },
];

const createRequest = asyncHandler(async (req, res) => {
  const request = await db.RecoveryRequest.create({ ...req.body, requesterId: req.user.id });
  const full = await db.RecoveryRequest.findByPk(request.id, { include: requestInclude });

  // Notify eligible providers that a new request is available
  const providers = await db.User.findAll({
    attributes: ['id'],
    include: [{ model: db.Role, as: 'roles', where: { name: 'recovery-provider' }, attributes: [] }],
  });
  if (providers.length) {
    await notificationService.notifyMany({
      userIds: providers.map((p) => p.id),
      type: 'new_request',
      title: 'New recovery request',
      body: `A new request near ${request.pickupAddress} is open for bids.`,
      data: { requestId: request.id },
    });
  }
  return created(res, full, 'Recovery request created');
});

const listRequests = asyncHandler(async (req, res) => {
  const { page, limit, status, scope } = req.query;
  const perms = collectPermissions(req.user);
  const canViewAll = perms.has('*') || perms.has('recovery.request.view.any');

  const where = {};
  if (status) where.status = status;

  if (scope === 'mine' || !canViewAll) {
    where.requesterId = req.user.id;
  }

  const offset = (page - 1) * limit;
  const { rows, count } = await db.RecoveryRequest.findAndCountAll({
    where,
    include: requestInclude,
    limit,
    offset,
    order: [['id', 'DESC']],
    distinct: true,
  });
  return ok(res, rows, 'Recovery requests', { total: count, page, limit });
});

const getRequest = asyncHandler(async (req, res) => {
  const request = await db.RecoveryRequest.findByPk(req.params.id, { include: requestInclude });
  if (!request) throw ApiError.notFound('Recovery request not found');

  const perms = collectPermissions(req.user);
  const canViewAll = perms.has('*') || perms.has('recovery.request.view.any');
  if (!canViewAll && request.requesterId !== req.user.id) {
    throw ApiError.forbidden('Not allowed to view this request');
  }
  return ok(res, request);
});

const cancelRequest = asyncHandler(async (req, res) => {
  const request = await db.RecoveryRequest.findByPk(req.params.id);
  if (!request) throw ApiError.notFound('Recovery request not found');
  if (request.requesterId !== req.user.id) {
    throw ApiError.forbidden('Only the requester can cancel this');
  }
  if (['completed', 'cancelled'].includes(request.status)) {
    throw ApiError.badRequest(`Cannot cancel a ${request.status} request`);
  }
  await request.update({ status: 'cancelled' });
  return ok(res, request, 'Request cancelled');
});

const placeBid = asyncHandler(async (req, res) => {
  const request = await db.RecoveryRequest.findByPk(req.params.id);
  if (!request) throw ApiError.notFound('Recovery request not found');
  if (request.status !== 'open') {
    throw ApiError.badRequest('Bids are only accepted on open requests');
  }
  if (request.requesterId === req.user.id) {
    throw ApiError.badRequest('Cannot bid on your own request');
  }

  const bid = await db.RecoveryBid.create({
    ...req.body,
    requestId: request.id,
    bidderId: req.user.id,
  });

  await notificationService.notify({
    userId: request.requesterId,
    type: 'new_bid',
    title: 'New bid received',
    body: `You received a bid of ${bid.currency} ${bid.amount} on your request.`,
    data: { requestId: request.id, bidId: bid.id },
  });
  return created(res, bid, 'Bid placed');
});

const acceptBid = asyncHandler(async (req, res) => {
  const request = await db.RecoveryRequest.findByPk(req.params.id);
  if (!request) throw ApiError.notFound('Recovery request not found');
  if (request.requesterId !== req.user.id) {
    throw ApiError.forbidden('Only the requester can accept bids');
  }
  if (request.status !== 'open') {
    throw ApiError.badRequest('Request is no longer open');
  }
  const bid = await db.RecoveryBid.findByPk(req.params.bidId);
  if (!bid || bid.requestId !== request.id) throw ApiError.notFound('Bid not found');
  if (bid.status !== 'pending') throw ApiError.badRequest('Bid is not pending');

  const t = await db.sequelize.transaction();
  try {
    await bid.update({ status: 'accepted' }, { transaction: t });
    await db.RecoveryBid.update(
      { status: 'rejected' },
      {
        where: {
          requestId: request.id,
          id: { [db.Sequelize.Op.ne]: bid.id },
          status: 'pending',
        },
        transaction: t,
      }
    );
    await request.update(
      {
        status: 'assigned',
        acceptedBidId: bid.id,
        assignedToId: bid.bidderId,
      },
      { transaction: t }
    );
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  await notificationService.notify({
    userId: bid.bidderId,
    type: 'bid_accepted',
    title: 'Your bid was accepted',
    body: `Your bid on request #${request.id} was accepted. Please proceed.`,
    data: { requestId: request.id, bidId: bid.id },
  });
  const full = await db.RecoveryRequest.findByPk(request.id, { include: requestInclude });
  return ok(res, full, 'Bid accepted');
});

const withdrawBid = asyncHandler(async (req, res) => {
  const bid = await db.RecoveryBid.findByPk(req.params.bidId);
  if (!bid || bid.requestId !== Number(req.params.id)) {
    throw ApiError.notFound('Bid not found');
  }
  if (bid.bidderId !== req.user.id) throw ApiError.forbidden("Cannot withdraw another user's bid");
  if (bid.status !== 'pending') throw ApiError.badRequest('Only pending bids can be withdrawn');
  await bid.update({ status: 'withdrawn' });
  return ok(res, bid, 'Bid withdrawn');
});

// Assigned -> In Progress (the assigned provider starts the job)
const startRequest = asyncHandler(async (req, res) => {
  const request = await db.RecoveryRequest.findByPk(req.params.id);
  if (!request) throw ApiError.notFound('Recovery request not found');
  const perms = collectPermissions(req.user);
  const isAssignee = request.assignedToId === req.user.id;
  if (!isAssignee && !perms.has('*') && !perms.has('recovery.assign')) {
    throw ApiError.forbidden('Only the assigned provider can start this job');
  }
  if (request.status !== 'assigned') {
    throw ApiError.badRequest(`Cannot start a ${request.status} request`);
  }
  await request.update({ status: 'in_progress' });
  await notificationService.notify({
    userId: request.requesterId,
    type: 'job_started',
    title: 'Your job has started',
    body: `Work on request #${request.id} is now in progress.`,
    data: { requestId: request.id },
  });
  const full = await db.RecoveryRequest.findByPk(request.id, { include: requestInclude });
  return ok(res, full, 'Request in progress');
});

/**
 * Complete a job: settle the accepted bid into the provider's wallet,
 * deduct platform commission, and notify both parties.
 */
const completeRequest = asyncHandler(async (req, res) => {
  const request = await db.RecoveryRequest.findByPk(req.params.id);
  if (!request) throw ApiError.notFound('Recovery request not found');
  if (!['assigned', 'in_progress'].includes(request.status)) {
    throw ApiError.badRequest(`Cannot complete a ${request.status} request`);
  }

  const bid = request.acceptedBidId ? await db.RecoveryBid.findByPk(request.acceptedBidId) : null;

  await db.sequelize.transaction(async (t) => {
    await request.update({ status: 'completed', completedAt: new Date() }, { transaction: t });

    if (bid && request.assignedToId) {
      const commissionPercent = Number(await settingsService.get('commission_percent'));
      const gross = Number(bid.amount);
      const commission = Math.round((gross * commissionPercent) / 100 * 100) / 100;

      // Gross earning credited to provider
      await walletService.applyTransaction({
        userId: request.assignedToId,
        type: 'job_earning',
        amount: gross,
        referenceType: 'recovery_request',
        referenceId: request.id,
        note: `Earning for request #${request.id}`,
        transaction: t,
      });
      // Platform commission deducted (negative) -> counted as platform revenue
      if (commission > 0) {
        await walletService.applyTransaction({
          userId: request.assignedToId,
          type: 'commission_deduction',
          amount: -commission,
          referenceType: 'recovery_request',
          referenceId: request.id,
          note: `Platform commission (${commissionPercent}%) for request #${request.id}`,
          transaction: t,
        });
      }
    }
  });

  if (request.assignedToId) {
    await notificationService.notify({
      userId: request.assignedToId,
      type: 'job_completed',
      title: 'Job completed',
      body: `Request #${request.id} is complete and your earnings have been credited.`,
      data: { requestId: request.id },
    });
  }
  const full = await db.RecoveryRequest.findByPk(request.id, { include: requestInclude });
  return ok(res, full, 'Request completed');
});

module.exports = {
  createRequest,
  listRequests,
  getRequest,
  cancelRequest,
  placeBid,
  acceptBid,
  withdrawBid,
  startRequest,
  completeRequest,
};
