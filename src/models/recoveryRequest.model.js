module.exports = (sequelize, DataTypes) => {
  const RecoveryRequest = sequelize.define(
    'RecoveryRequest',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      requesterId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      vehicleType: { type: DataTypes.STRING(64), allowNull: true },
      vehiclePlate: { type: DataTypes.STRING(32), allowNull: true },
      issueDescription: { type: DataTypes.TEXT, allowNull: true },
      pickupAddress: { type: DataTypes.STRING(255), allowNull: false },
      pickupLat: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
      pickupLng: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
      dropoffAddress: { type: DataTypes.STRING(255), allowNull: true },
      dropoffLat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      dropoffLng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      status: {
        type: DataTypes.ENUM('open', 'assigned', 'in_progress', 'completed', 'cancelled'),
        defaultValue: 'open',
      },
      acceptedBidId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      assignedToId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      completedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'recovery_requests' }
  );

  RecoveryRequest.associate = (db) => {
    RecoveryRequest.belongsTo(db.User, { foreignKey: 'requesterId', as: 'requester' });
    RecoveryRequest.belongsTo(db.User, { foreignKey: 'assignedToId', as: 'assignedTo' });
    RecoveryRequest.hasMany(db.RecoveryBid, { foreignKey: 'requestId', as: 'bids' });
    RecoveryRequest.belongsTo(db.RecoveryBid, {
      foreignKey: 'acceptedBidId',
      as: 'acceptedBid',
      constraints: false,
    });
  };

  return RecoveryRequest;
};
