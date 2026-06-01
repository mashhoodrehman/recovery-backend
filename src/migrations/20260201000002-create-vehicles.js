'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vehicles', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      ownerId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      driverId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      vehicleType: {
        type: Sequelize.ENUM(
          'tow_truck',
          'flatbed_truck',
          'recovery_truck',
          'pickup_truck',
          'roadside_assistance'
        ),
        allowNull: false,
      },
      plateNumber: { type: Sequelize.STRING(32), allowNull: false },
      model: { type: Sequelize.STRING(64), allowNull: true },
      year: { type: Sequelize.INTEGER, allowNull: true },
      capacity: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      towingCapacity: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'maintenance'),
        defaultValue: 'active',
      },
      availability: {
        type: Sequelize.ENUM('available', 'busy', 'offline'),
        defaultValue: 'available',
      },
      latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('vehicles', ['ownerId']);
    await queryInterface.addIndex('vehicles', ['status']);
    await queryInterface.addIndex('vehicles', ['availability']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vehicles');
  },
};
