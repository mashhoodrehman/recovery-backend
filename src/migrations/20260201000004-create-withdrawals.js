'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('withdrawals', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      userId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      currency: { type: Sequelize.STRING(8), defaultValue: 'USD' },
      method: {
        type: Sequelize.ENUM('bank_transfer', 'paypal', 'stripe'),
        defaultValue: 'bank_transfer',
      },
      payoutDetails: { type: Sequelize.JSON, allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'paid'),
        defaultValue: 'pending',
      },
      adminNote: { type: Sequelize.STRING(255), allowNull: true },
      processedById: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      processedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('withdrawals', ['userId']);
    await queryInterface.addIndex('withdrawals', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('withdrawals');
  },
};
