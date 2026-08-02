'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rides', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      customerId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      towerId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      fromAddress: { type: Sequelize.STRING(255), allowNull: true },
      fromLat: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      fromLng: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      toAddress: { type: Sequelize.STRING(255), allowNull: true },
      toLat: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      toLng: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      status: {
        type: Sequelize.ENUM(
          'searching',
          'bidding',
          'accepted',
          'tower_en_route',
          'at_pickup',
          'in_progress',
          'completed',
          'cancelled',
          'no_towers_available'
        ),
        defaultValue: 'searching',
      },
      searchRadiusKm: { type: Sequelize.INTEGER, defaultValue: 5 },
      customerNote: { type: Sequelize.TEXT, allowNull: true },
      acceptedBidId: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      fareAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      startedAt: { type: Sequelize.DATE, allowNull: true },
      completedAt: { type: Sequelize.DATE, allowNull: true },
      cancelledAt: { type: Sequelize.DATE, allowNull: true },
      cancelReason: { type: Sequelize.STRING(255), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('rides', ['customerId']);
    await queryInterface.addIndex('rides', ['towerId']);
    await queryInterface.addIndex('rides', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rides');
  },
};
