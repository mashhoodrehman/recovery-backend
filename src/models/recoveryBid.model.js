module.exports = (sequelize, DataTypes) => {
  const RecoveryBid = sequelize.define(
    'RecoveryBid',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      requestId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      bidderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      currency: { type: DataTypes.STRING(8), defaultValue: 'USD' },
      etaMinutes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      note: { type: DataTypes.STRING(500), allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'withdrawn'),
        defaultValue: 'pending',
      },
    },
    { tableName: 'recovery_bids' }
  );

  RecoveryBid.associate = (db) => {
    RecoveryBid.belongsTo(db.RecoveryRequest, { foreignKey: 'requestId', as: 'request' });
    RecoveryBid.belongsTo(db.User, { foreignKey: 'bidderId', as: 'bidder' });
  };

  return RecoveryBid;
};
