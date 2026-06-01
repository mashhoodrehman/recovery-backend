const TX_TYPES = [
  'job_earning',
  'commission_deduction',
  'withdrawal_request',
  'withdrawal_approved',
  'withdrawal_rejected',
  'manual_adjustment',
];

module.exports = (sequelize, DataTypes) => {
  const WalletTransaction = sequelize.define(
    'WalletTransaction',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      walletId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      type: { type: DataTypes.ENUM(...TX_TYPES), allowNull: false },
      // signed amount: positive = credit, negative = debit
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      balanceAfter: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      currency: { type: DataTypes.STRING(8), defaultValue: 'USD' },
      referenceType: { type: DataTypes.STRING(48), allowNull: true }, // e.g. 'recovery_request', 'withdrawal'
      referenceId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      note: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'wallet_transactions' }
  );

  WalletTransaction.associate = (db) => {
    WalletTransaction.belongsTo(db.Wallet, { foreignKey: 'walletId', as: 'wallet' });
    WalletTransaction.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
  };

  WalletTransaction.TX_TYPES = TX_TYPES;
  return WalletTransaction;
};
