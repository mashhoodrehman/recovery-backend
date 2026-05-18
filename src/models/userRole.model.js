module.exports = (sequelize, DataTypes) => {
  const UserRole = sequelize.define(
    'UserRole',
    {
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true,
      },
      roleId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true,
      },
    },
    { tableName: 'user_roles' }
  );
  return UserRole;
};
