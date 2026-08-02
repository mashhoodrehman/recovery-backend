module.exports = (sequelize, DataTypes) => {
  const RideTracking = sequelize.define(
    'RideTracking',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      rideId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      towerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      lat: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
      lng: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
      recordedAt: { type: DataTypes.DATE, allowNull: false },
    },
    { tableName: 'ride_tracking' }
  );

  RideTracking.associate = (db) => {
    RideTracking.belongsTo(db.Ride, { foreignKey: 'rideId', as: 'ride' });
  };

  return RideTracking;
};
