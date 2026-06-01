module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      action: { type: DataTypes.STRING(16), allowNull: false }, // HTTP method
      entity: { type: DataTypes.STRING(96), allowNull: true }, // route/resource
      entityId: { type: DataTypes.STRING(48), allowNull: true },
      statusCode: { type: DataTypes.INTEGER, allowNull: true },
      method: { type: DataTypes.STRING(8), allowNull: true },
      path: { type: DataTypes.STRING(255), allowNull: true },
      ip: { type: DataTypes.STRING(64), allowNull: true },
      userAgent: { type: DataTypes.STRING(255), allowNull: true },
      meta: { type: DataTypes.JSON, allowNull: true },
    },
    { tableName: 'audit_logs', updatedAt: false }
  );

  AuditLog.associate = (db) => {
    AuditLog.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });
  };

  return AuditLog;
};
