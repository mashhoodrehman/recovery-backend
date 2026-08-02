'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ride_bids', {
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
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      etaMinutes: { type: Sequelize.INTEGER, allowNull: true },
      note: { type: Sequelize.STRING(255), allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'accepted', 'rejected', 'expired'),
        defaultValue: 'pending',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('ride_bids', ['rideId']);
    await queryInterface.addIndex('ride_bids', ['towerId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ride_bids');
  },
};
