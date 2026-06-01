module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    'Notification',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      type: { type: DataTypes.STRING(64), allowNull: false },
      title: { type: DataTypes.STRING(160), allowNull: false },
      body: { type: DataTypes.STRING(500), allowNull: true },
      data: { type: DataTypes.JSON, allowNull: true },
      channel: {
        type: DataTypes.ENUM('in_app', 'push', 'email'),
        defaultValue: 'in_app',
      },
      readAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'notifications' }
  );

  Notification.associate = (db) => {
    Notification.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
  };

  return Notification;
};
