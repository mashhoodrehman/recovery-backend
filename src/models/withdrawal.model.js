module.exports = (sequelize, DataTypes) => {
  const Withdrawal = sequelize.define(
    'Withdrawal',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      currency: { type: DataTypes.STRING(8), defaultValue: 'USD' },
      method: {
        type: DataTypes.ENUM('bank_transfer', 'paypal', 'stripe'),
        defaultValue: 'bank_transfer',
      },
      payoutDetails: { type: DataTypes.JSON, allowNull: true }, // bank/paypal account info
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'paid'),
        defaultValue: 'pending',
      },
      adminNote: { type: DataTypes.STRING(255), allowNull: true },
      processedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      processedAt: { type: DataTypes.DATE, allowNull: true },
      stripeTransferId: { type: DataTypes.STRING(128), allowNull: true },
    },
    { tableName: 'withdrawals' }
  );

  Withdrawal.associate = (db) => {
    Withdrawal.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
    Withdrawal.belongsTo(db.User, { foreignKey: 'processedById', as: 'processedBy' });
  };

  return Withdrawal;
};
