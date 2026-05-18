module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define(
    'Role',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      guardName: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'api' },
      description: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'roles' }
  );

  Role.associate = (db) => {
    Role.belongsToMany(db.User, {
      through: db.UserRole,
      foreignKey: 'roleId',
      otherKey: 'userId',
      as: 'users',
    });
    Role.belongsToMany(db.Permission, {
      through: db.RolePermission,
      foreignKey: 'roleId',
      otherKey: 'permissionId',
      as: 'permissions',
    });
  };

  return Role;
};
