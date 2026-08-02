'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tower_documents', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      towerId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      country: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'UK' },
      docType: {
        type: Sequelize.ENUM(
          // UK docs
          'driving_license',
          'vehicle_insurance',
          'mot_certificate',
          'operators_license',
          'cpc_certificate',
          'public_liability_insurance',
          // PK docs
          'cnic_front',
          'cnic_back',
          'vehicle_registration',
          'fitness_certificate',
          // Universal
          'vehicle_photo',
          'profile_photo'
        ),
        allowNull: false,
      },
      docUrl: { type: Sequelize.STRING(500), allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
      },
      rejectionReason: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('tower_documents');
  },
};
