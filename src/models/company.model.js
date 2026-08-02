module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define(
    'Company',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(128), allowNull: false },
      email: { type: DataTypes.STRING(128), allowNull: true },
      phone: { type: DataTypes.STRING(32), allowNull: true },
      registrationNumber: { type: DataTypes.STRING(64), allowNull: true },
      website: { type: DataTypes.STRING(255), allowNull: true },
      address: { type: DataTypes.STRING(255), allowNull: true },
      city: { type: DataTypes.STRING(64), allowNull: true },
      country: { type: DataTypes.STRING(64), allowNull: true },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active',
      },
    },
    { tableName: 'companies', paranoid: true }
  );

  return Company;
};
