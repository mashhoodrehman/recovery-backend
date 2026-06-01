module.exports = (sequelize, DataTypes) => {
  const Wallet = sequelize.define(
    'Wallet',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
      totalBalance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      availableBalance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      pendingBalance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
      currency: { type: DataTypes.STRING(8), defaultValue: 'USD' },
    },
    { tableName: 'wallets' }
  );

  Wallet.associate = (db) => {
    Wallet.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
    Wallet.hasMany(db.WalletTransaction, { foreignKey: 'walletId', as: 'transactions' });
  };

  return Wallet;
};
