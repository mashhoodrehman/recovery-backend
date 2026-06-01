const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const walletService = require('../services/wallet.service');
const { collectPermissions } = require('../middlewares/permission.middleware');

const canViewAny = (req) => {
  const perms = collectPermissions(req.user);
  return perms.has('*') || perms.has('wallets.view.any');
};

// GET /wallets/me — current user's wallet
const myWallet = asyncHandler(async (req, res) => {
  const wallet = await walletService.getOrCreateWallet(req.user.id);
  return ok(res, wallet, 'Wallet');
});

// GET /wallets/:userId — admin view of a vendor wallet
const getWallet = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  if (!canViewAny(req) && userId !== req.user.id) {
    throw ApiError.forbidden('Not allowed to view this wallet');
  }
  const wallet = await walletService.getOrCreateWallet(userId);
  return ok(res, wallet, 'Wallet');
});

// GET /wallets/transactions — ledger (own, or any with permission + userId filter)
const listTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, userId } = req.query;
  const where = {};
  if (type) where.type = type;

  if (canViewAny(req)) {
    if (userId) where.userId = userId;
  } else {
    where.userId = req.user.id;
  }

  const offset = (page - 1) * limit;
  const { rows, count } = await db.WalletTransaction.findAndCountAll({
    where,
    include: [{ model: db.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }],
    limit: Number(limit),
    offset,
    order: [['id', 'DESC']],
  });
  return ok(res, rows, 'Wallet transactions', {
    total: count,
    page: Number(page),
    limit: Number(limit),
  });
});

// POST /wallets/adjust — manual admin adjustment (credit or debit)
const adjust = asyncHandler(async (req, res) => {
  const { userId, amount, note } = req.body;
  const user = await db.User.findByPk(userId);
  if (!user) throw ApiError.notFound('User not found');

  const { wallet, transaction } = await walletService.applyTransaction({
    userId,
    type: 'manual_adjustment',
    amount: Number(amount),
    referenceType: 'manual',
    note: note || `Manual adjustment by ${req.user.email}`,
  });
  return ok(res, { wallet, transaction }, 'Wallet adjusted');
});

module.exports = { myWallet, getWallet, listTransactions, adjust };
