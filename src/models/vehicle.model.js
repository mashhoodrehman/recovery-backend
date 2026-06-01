module.exports = (sequelize, DataTypes) => {
  const Vehicle = sequelize.define(
    'Vehicle',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      ownerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false }, // vendor (user)
      driverId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true }, // assigned driver (user)
      vehicleType: {
        type: DataTypes.ENUM(
          'tow_truck',
          'flatbed_truck',
          'recovery_truck',
          'pickup_truck',
          'roadside_assistance'
        ),
        allowNull: false,
      },
      plateNumber: { type: DataTypes.STRING(32), allowNull: false },
      model: { type: DataTypes.STRING(64), allowNull: true },
      year: { type: DataTypes.INTEGER, allowNull: true },
      capacity: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      towingCapacity: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'maintenance'),
        defaultValue: 'active',
      },
      availability: {
        type: DataTypes.ENUM('available', 'busy', 'offline'),
        defaultValue: 'available',
      },
      latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
      longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    },
    { tableName: 'vehicles', paranoid: true }
  );

  Vehicle.associate = (db) => {
    Vehicle.belongsTo(db.User, { foreignKey: 'ownerId', as: 'owner' });
    Vehicle.belongsTo(db.User, { foreignKey: 'driverId', as: 'driver' });
  };

  return Vehicle;
};
