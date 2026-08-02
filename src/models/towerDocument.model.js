module.exports = (sequelize, DataTypes) => {
  const TowerDocument = sequelize.define(
    'TowerDocument',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      towerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      country: { type: DataTypes.STRING(10), defaultValue: 'UK' },
      docType: {
        type: DataTypes.ENUM(
          'driving_license', 'vehicle_insurance', 'mot_certificate',
          'operators_license', 'cpc_certificate', 'public_liability_insurance',
          'cnic_front', 'cnic_back', 'vehicle_registration', 'fitness_certificate',
          'vehicle_photo', 'profile_photo'
        ),
        allowNull: false,
      },
      docUrl: { type: DataTypes.STRING(500), allowNull: false },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
      },
      rejectionReason: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'tower_documents' }
  );

  TowerDocument.associate = (db) => {
    TowerDocument.belongsTo(db.User, { foreignKey: 'towerId', as: 'tower' });
  };

  return TowerDocument;
};
