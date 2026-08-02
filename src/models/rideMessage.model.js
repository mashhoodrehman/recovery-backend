module.exports = (sequelize, DataTypes) => {
  const RideMessage = sequelize.define(
    'RideMessage',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      rideId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      senderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      messageType: { type: DataTypes.ENUM('text', 'image'), defaultValue: 'text' },
      message: { type: DataTypes.TEXT, allowNull: true },
      imageUrl: { type: DataTypes.STRING(500), allowNull: true },
      isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    { tableName: 'ride_messages' }
  );

  RideMessage.associate = (db) => {
    RideMessage.belongsTo(db.Ride, { foreignKey: 'rideId', as: 'ride' });
    RideMessage.belongsTo(db.User, { foreignKey: 'senderId', as: 'sender' });
  };

  return RideMessage;
};
