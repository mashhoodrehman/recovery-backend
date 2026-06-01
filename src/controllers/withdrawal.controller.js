const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const walletService = require('../services/wallet.service');
const settingsService = require('../services/settings.service');
const notificationService = require('../services/notification.service');
const { collectPermissions } = require('../middlewares/permission.middleware');

const include = [
  { model: db.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
  { model: db.User, as: 'processedBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
];

const canManageAny = (req) => {
  const perms = collectPermissions(req.user);
  return perms.has('*') || perms.has('withdrawals.manage');
};

// GET /withdrawals
const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, userId, scope } = req.query;
  const where = {};
  if (status) where.status = status;

  if (!canManageAny(req) || scope === 'mine') {
    where.userId = req.user.id;
  } else if (userId) {
    where.userId = userId;
  }

  const offset = (page - 1) * limit;
  const { rows, count } = await db.Withdrawal.findAndCountAll({
    where,
    include,
    limit: Number(limit),
    offset,
    order: [['id', 'DESC']],
    distinct: true,
  });
  return ok(res, rows, 'Withdrawals', { total: count, page: Number(page), limit: Number(limit) });
});

const getOne = asyncHandler(async (req, res) => {
  const wd = await db.Withdrawal.findByPk(req.params.id, { include });
  if (!wd) throw ApiError.notFound('Withdrawal not found');
  if (!canManageAny(req) && wd.userId !== req.user.id) {
    throw ApiError.forbidden('Not allowed to view this withdrawal');
  }
  return ok(res, wd);
});

// POST /withdrawals — vendor requests a withdrawal
const create = asyncHandler(async (req, res) => {
  const amount = Number(req.body.amount);
  const { method, payoutDetails } = req.body;

  const [minAmount, currency] = await Promise.all([
    settingsService.get('min_withdrawal_amount'),
    settingsService.get('currency'),
  ]);

  if (amount < Number(minAmount)) {
    throw ApiError.badRequest(`Minimum withdrawal amount is ${minAmount}`);
  }

  const wallet = await walletService.getOrCreateWallet(req.user.id);
  if (Number(wallet.availableBalance) < amount) {
    throw ApiError.badRequest('Insufficient available balance');
  }

  const result = await db.sequelize.transaction(async (t) => {
    const withdrawal = await db.Withdrawal.create(
      {
        userId: req.user.id,
        amount,
        currency,
        method: method || 'bank_transfer',
        payoutDetails: payoutDetails || null,
      },
      { transaction: t }
    );
    // Move funds from available -> pending (held while under review)
    await walletService.applyTransaction({
      userId: req.user.id,
      type: 'withdrawal_request',
      amount: -amount,
      pendingDelta: amount,
      referenceType: 'withdrawal',
      referenceId: withdrawal.id,
      note: 'Withdrawal requested',
      transaction: t,
    });
    return withdrawal;
  });

  const full = await db.Withdrawal.findByPk(result.id, { include });
  return created(res, full, 'Withdrawal requested');
});

// POST /withdrawals/:id/approve
const approve = asyncHandler(async (req, res) => {
  const wd = await db.Withdrawal.findByPk(req.params.id);
  if (!wd) throw ApiError.notFound('Withdrawal not found');
  if (wd.status !== 'pending') throw ApiError.badRequest(`Cannot approve a ${wd.status} withdrawal`);

  await wd.update({ status: 'approved', processedById: req.user.id, processedAt: new Date() });
  await notificationService.notify({
    userId: wd.userId,
    type: 'withdrawal_approved',
    title: 'Withdrawal approved',
    body: `Your withdrawal of ${wd.currency} ${wd.amount} has been approved.`,
    data: { withdrawalId: wd.id },
  });
  const full = await db.Withdrawal.findByPk(wd.id, { include });
  return ok(res, full, 'Withdrawal approved');
});

// POST /withdrawals/:id/paid — funds actually sent
const markPaid = asyncHandler(async (req, res) => {
  const wd = await db.Withdrawal.findByPk(req.params.id);
  if (!wd) throw ApiError.notFound('Withdrawal not found');
  if (!['approved', 'pending'].includes(wd.status)) {
    throw ApiError.badRequest(`Cannot mark a ${wd.status} withdrawal as paid`);
  }

  await db.sequelize.transaction(async (t) => {
    await wd.update(
      { status: 'paid', processedById: req.user.id, processedAt: new Date() },
      { transaction: t }
    );
    // Release the held pending funds (money leaves the platform)
    await walletService.applyTransaction({
      userId: wd.userId,
      type: 'withdrawal_approved',
      amount: 0,
      pendingDelta: -Number(wd.amount),
      referenceType: 'withdrawal',
      referenceId: wd.id,
      note: 'Withdrawal paid out',
      transaction: t,
    });
  });
  const full = await db.Withdrawal.findByPk(wd.id, { include });
  return ok(res, full, 'Withdrawal marked as paid');
});

// POST /withdrawals/:id/reject — return held funds to available
const reject = asyncHandler(async (req, res) => {
  const wd = await db.Withdrawal.findByPk(req.params.id);
  if (!wd) throw ApiError.notFound('Withdrawal not found');
  if (!['pending', 'approved'].includes(wd.status)) {
    throw ApiError.badRequest(`Cannot reject a ${wd.status} withdrawal`);
  }

  await db.sequelize.transaction(async (t) => {
    await wd.update(
      {
        status: 'rejected',
        adminNote: req.body.adminNote || null,
        processedById: req.user.id,
        processedAt: new Date(),
      },
      { transaction: t }
    );
    await walletService.applyTransaction({
      userId: wd.userId,
      type: 'withdrawal_rejected',
      amount: Number(wd.amount),
      pendingDelta: -Number(wd.amount),
      referenceType: 'withdrawal',
      referenceId: wd.id,
      note: 'Withdrawal rejected, funds returned',
      transaction: t,
    });
  });
  await notificationService.notify({
    userId: wd.userId,
    type: 'withdrawal_rejected',
    title: 'Withdrawal rejected',
    body: `Your withdrawal of ${wd.currency} ${wd.amount} was rejected.`,
    data: { withdrawalId: wd.id },
  });
  const full = await db.Withdrawal.findByPk(wd.id, { include });
  return ok(res, full, 'Withdrawal rejected');
});

module.exports = { list, getOne, create, approve, markPaid, reject };
