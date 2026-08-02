'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ride_tracking', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      rideId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'rides', key: 'id' },
      },
      towerId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      lat: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      lng: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      recordedAt: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('ride_tracking', ['rideId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ride_tracking');
  },
};
