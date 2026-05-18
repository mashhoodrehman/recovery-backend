const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, noContent } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const { collectPermissions } = require('../middlewares/permission.middleware');

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
    const full = await db.RecoveryRequest.findByPk(request.id, { include: requestInclude });
    return ok(res, full, 'Bid accepted');
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

const withdrawBid = asyncHandler(async (req, res) => {
  const bid = await db.RecoveryBid.findByPk(req.params.bidId);
  if (!bid || bid.requestId !== Number(req.params.id)) {
    throw ApiError.notFound('Bid not found');
  }
  if (bid.bidderId !== req.user.id) throw ApiError.forbidden('Cannot withdraw another user\'s bid');
  if (bid.status !== 'pending') throw ApiError.badRequest('Only pending bids can be withdrawn');
  await bid.update({ status: 'withdrawn' });
  return ok(res, bid, 'Bid withdrawn');
});

const completeRequest = asyncHandler(async (req, res) => {
  const request = await db.RecoveryRequest.findByPk(req.params.id);
  if (!request) throw ApiError.notFound('Recovery request not found');
  if (!['assigned', 'in_progress'].includes(request.status)) {
    throw ApiError.badRequest(`Cannot complete a ${request.status} request`);
  }
  await request.update({ status: 'completed', completedAt: new Date() });
  return ok(res, request, 'Request completed');
});

module.exports = {
  createRequest,
  listRequests,
  getRequest,
  cancelRequest,
  placeBid,
  acceptBid,
  withdrawBid,
  completeRequest,
};
