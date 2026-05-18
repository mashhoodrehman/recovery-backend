'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('recovery_bids', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      requestId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'recovery_requests', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      bidderId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      currency: { type: Sequelize.STRING(8), defaultValue: 'USD' },
      etaMinutes: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      note: { type: Sequelize.STRING(500), allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'accepted', 'rejected', 'withdrawn'),
        defaultValue: 'pending',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('recovery_bids', ['requestId']);
    await queryInterface.addIndex('recovery_bids', ['bidderId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('recovery_bids');
  },
};
