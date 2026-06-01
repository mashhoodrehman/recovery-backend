const db = require('../models');
const ApiError = require('../utils/ApiError');

const toNumber = (v) => Number(v || 0);

// Ensure a wallet row exists for the user
const getOrCreateWallet = async (userId, options = {}) => {
  let wallet = await db.Wallet.findOne({ where: { userId }, ...options });
  if (!wallet) {
    wallet = await db.Wallet.create({ userId }, options);
  }
  return wallet;
};

/**
 * Apply a balance movement and record a transaction, atomically.
 *
 * @param {object} params
 * @param {number} params.userId
 * @param {string} params.type   one of WalletTransaction.TX_TYPES
 * @param {number} params.amount signed amount applied to availableBalance (+credit / -debit)
 * @param {number} [params.pendingDelta] optional change to pendingBalance
 * @param {string} [params.referenceType]
 * @param {number} [params.referenceId]
 * @param {string} [params.note]
 * @param {object} [params.transaction] existing sequelize transaction
 */
const applyTransaction = async ({
  userId,
  type,
  amount = 0,
  pendingDelta = 0,
  referenceType,
  referenceId,
  note,
  transaction,
}) => {
  const runInTx = async (t) => {
    const wallet = await getOrCreateWallet(userId, { transaction: t, lock: t.LOCK.UPDATE });

    const available = toNumber(wallet.availableBalance) + toNumber(amount);
    const pending = toNumber(wallet.pendingBalance) + toNumber(pendingDelta);

    if (available < 0) throw ApiError.badRequest('Insufficient available balance');
    if (pending < 0) throw ApiError.badRequest('Insufficient pending balance');

    const total = available + pending;
    await wallet.update(
      { availableBalance: available, pendingBalance: pending, totalBalance: total },
      { transaction: t }
    );

    const tx = await db.WalletTransaction.create(
      {
        walletId: wallet.id,
        userId,
        type,
        amount,
        balanceAfter: available,
        currency: wallet.currency,
        referenceType,
        referenceId,
        note,
      },
      { transaction: t }
    );

    return { wallet, transaction: tx };
  };

  if (transaction) return runInTx(transaction);
  return db.sequelize.transaction(runInTx);
};

module.exports = { getOrCreateWallet, applyTransaction };
