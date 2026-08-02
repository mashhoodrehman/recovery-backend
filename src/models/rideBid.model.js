module.exports = (sequelize, DataTypes) => {
  const RideBid = sequelize.define(
    'RideBid',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      rideId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      towerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      etaMinutes: { type: DataTypes.INTEGER, allowNull: true },
      note: { type: DataTypes.STRING(255), allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'expired'),
        defaultValue: 'pending',
      },
    },
    { tableName: 'ride_bids' }
  );

  RideBid.associate = (db) => {
    RideBid.belongsTo(db.Ride, { foreignKey: 'rideId', as: 'ride' });
    RideBid.belongsTo(db.User, { foreignKey: 'towerId', as: 'tower' });
  };

  return RideBid;
};
