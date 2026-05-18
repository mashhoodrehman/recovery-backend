module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define(
    'Permission',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(96), allowNull: false, unique: true },
      guardName: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'api' },
      group: { type: DataTypes.STRING(64), allowNull: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'permissions' }
  );

  Permission.associate = (db) => {
    Permission.belongsToMany(db.Role, {
      through: db.RolePermission,
      foreignKey: 'permissionId',
      otherKey: 'roleId',
      as: 'roles',
    });
  };

  return Permission;
};
