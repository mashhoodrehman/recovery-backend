'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('wallets', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      userId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      totalBalance: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      availableBalance: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      pendingBalance: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      currency: { type: Sequelize.STRING(8), defaultValue: 'USD' },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.createTable('wallet_transactions', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      walletId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'wallets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM(
          'job_earning',
          'commission_deduction',
          'withdrawal_request',
          'withdrawal_approved',
          'withdrawal_rejected',
          'manual_adjustment'
        ),
        allowNull: false,
      },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      balanceAfter: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      currency: { type: Sequelize.STRING(8), defaultValue: 'USD' },
      referenceType: { type: Sequelize.STRING(48), allowNull: true },
      referenceId: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      note: { type: Sequelize.STRING(255), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('wallet_transactions', ['walletId']);
    await queryInterface.addIndex('wallet_transactions', ['userId']);
    await queryInterface.addIndex('wallet_transactions', ['type']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('wallet_transactions');
    await queryInterface.dropTable('wallets');
  },
};
