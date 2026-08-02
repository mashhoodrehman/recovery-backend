module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      firstName: { type: DataTypes.STRING(80), allowNull: true },
      lastName: { type: DataTypes.STRING(80), allowNull: true },
      email: {
        type: DataTypes.STRING(160),
        allowNull: true,
        unique: true,
        validate: { isEmail: true },
      },
      phone: { type: DataTypes.STRING(32), allowNull: true, unique: true },
      password: { type: DataTypes.STRING(255), allowNull: true },
      avatar: { type: DataTypes.STRING(255), allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
      lastLoginAt: { type: DataTypes.DATE, allowNull: true },
      refreshTokenHash: { type: DataTypes.STRING(255), allowNull: true },
      fcmToken: { type: DataTypes.STRING(512), allowNull: true },
      // Mobile / phone auth fields
      phoneOtp: { type: DataTypes.STRING(10), allowNull: true },
      phoneOtpExpiresAt: { type: DataTypes.DATE, allowNull: true },
      isPhoneVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
      username: { type: DataTypes.STRING(64), allowNull: true },
      userType: { type: DataTypes.ENUM('customer', 'tower'), allowNull: true },
      city: { type: DataTypes.STRING(64), allowNull: true },
      isProfileComplete: { type: DataTypes.BOOLEAN, defaultValue: false },
      isOnline: { type: DataTypes.BOOLEAN, defaultValue: false },
      currentLat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      currentLng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      lastSeenAt: { type: DataTypes.DATE, allowNull: true },
      country: { type: DataTypes.STRING(10), allowNull: true, defaultValue: 'UK' },
      stripeAccountId: { type: DataTypes.STRING(128), allowNull: true },
      stripeOnboardingComplete: { type: DataTypes.BOOLEAN, defaultValue: false },
      stripePayoutsEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
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
    User.hasMany(db.TowerDocument, { foreignKey: 'towerId', as: 'documents' });
    User.hasMany(db.RideMessage, { foreignKey: 'senderId', as: 'sentMessages' });
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
