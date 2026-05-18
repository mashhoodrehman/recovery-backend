module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define(
    'RolePermission',
    {
      roleId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true,
      },
      permissionId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true,
      },
    },
    { tableName: 'role_permissions' }
  );
  return RolePermission;
};
