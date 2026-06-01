module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      firstName: { type: DataTypes.STRING(80), allowNull: false },
      lastName: { type: DataTypes.STRING(80), allowNull: true },
      email: {
        type: DataTypes.STRING(160),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      phone: { type: DataTypes.STRING(32), allowNull: true },
      password: { type: DataTypes.STRING(255), allowNull: false },
      avatar: { type: DataTypes.STRING(255), allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
      lastLoginAt: { type: DataTypes.DATE, allowNull: true },
      refreshTokenHash: { type: DataTypes.STRING(255), allowNull: true },
      fcmToken: { type: DataTypes.STRING(512), allowNull: true },
    },
    {
      tableName: 'users',
      defaultScope: {
        attributes: { exclude: ['password', 'refreshTokenHash'] },
      },
      scopes: {
        withSecret: { attributes: { include: ['password', 'refreshTokenHash'] } },
      },
    }
  );

  User.associate = (db) => {
    User.belongsToMany(db.Role, {
      through: db.UserRole,
      foreignKey: 'userId',
      otherKey: 'roleId',
      as: 'roles',
    });
    User.hasMany(db.RecoveryRequest, { foreignKey: 'requesterId', as: 'recoveryRequests' });
    User.hasMany(db.RecoveryBid, { foreignKey: 'bidderId', as: 'recoveryBids' });
  };

  User.prototype.hasPermission = function (permissionName) {
    if (!this.roles) return false;
    return this.roles.some(
      (role) => role.permissions && role.permissions.some((p) => p.name === permissionName)
    );
  };

  User.prototype.hasRole = function (roleName) {
    if (!this.roles) return false;
    return this.roles.some((r) => r.name === roleName);
  };

  return User;
};
