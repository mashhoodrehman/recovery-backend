module.exports = (sequelize, DataTypes) => {
  const Ride = sequelize.define(
    'Ride',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      customerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      towerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      fromAddress: { type: DataTypes.STRING(255), allowNull: true },
      fromLat: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
      fromLng: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
      toAddress: { type: DataTypes.STRING(255), allowNull: true },
      toLat: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
      toLng: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
      status: {
        type: DataTypes.ENUM(
          'searching',
          'bidding',
          'accepted',
          'tower_en_route',
          'at_pickup',
          'in_progress',
          'completed',
          'cancelled',
          'no_towers_available'
        ),
        defaultValue: 'searching',
      },
      searchRadiusKm: { type: DataTypes.INTEGER, defaultValue: 5 },
      customerNote: { type: DataTypes.TEXT, allowNull: true },
      acceptedBidId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      fareAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      completedAt: { type: DataTypes.DATE, allowNull: true },
      cancelledAt: { type: DataTypes.DATE, allowNull: true },
      cancelReason: { type: DataTypes.STRING(255), allowNull: true },
      paymentStatus: {
        type: DataTypes.ENUM('unpaid', 'pending', 'paid', 'failed', 'refunded'),
        defaultValue: 'unpaid',
      },
      stripePaymentIntentId: { type: DataTypes.STRING(128), allowNull: true },
      paidAt: { type: DataTypes.DATE, allowNull: true },
      platformCommissionAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      vendorEarningAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    },
    { tableName: 'rides', paranoid: true }
  );

  Ride.associate = (db) => {
    Ride.belongsTo(db.User, { foreignKey: 'customerId', as: 'customer' });
    Ride.belongsTo(db.User, { foreignKey: 'towerId', as: 'tower' });
    Ride.hasMany(db.RideBid, { foreignKey: 'rideId', as: 'bids' });
    Ride.hasMany(db.RideTracking, { foreignKey: 'rideId', as: 'tracking' });
    Ride.hasOne(db.Rating, { foreignKey: 'rideId', as: 'rating' });
  };

  return Ride;
};
