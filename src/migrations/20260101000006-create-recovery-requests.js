'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('recovery_requests', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      requesterId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      vehicleType: { type: Sequelize.STRING(64), allowNull: true },
      vehiclePlate: { type: Sequelize.STRING(32), allowNull: true },
      issueDescription: { type: Sequelize.TEXT, allowNull: true },
      pickupAddress: { type: Sequelize.STRING(255), allowNull: false },
      pickupLat: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      pickupLng: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      dropoffAddress: { type: Sequelize.STRING(255), allowNull: true },
      dropoffLat: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      dropoffLng: { type: Sequelize.DECIMAL(10, 7), allowNull: true },
      status: {
        type: Sequelize.ENUM('open', 'assigned', 'in_progress', 'completed', 'cancelled'),
        defaultValue: 'open',
      },
      acceptedBidId: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      assignedToId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      completedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('recovery_requests', ['status']);
    await queryInterface.addIndex('recovery_requests', ['requesterId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('recovery_requests');
  },
};
