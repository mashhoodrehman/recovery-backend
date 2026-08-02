module.exports = (sequelize, DataTypes) => {
  const Rating = sequelize.define(
    'Rating',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      rideId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
      customerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      towerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      stars: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, validate: { min: 1, max: 5 } },
      comment: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'ratings' }
  );

  Rating.associate = (db) => {
    Rating.belongsTo(db.Ride, { foreignKey: 'rideId', as: 'ride' });
    Rating.belongsTo(db.User, { foreignKey: 'customerId', as: 'customer' });
    Rating.belongsTo(db.User, { foreignKey: 'towerId', as: 'tower' });
  };

  return Rating;
};
