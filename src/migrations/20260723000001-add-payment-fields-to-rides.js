'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('rides', 'paymentStatus', {
      type: Sequelize.ENUM('unpaid', 'pending', 'paid', 'failed', 'refunded'),
      defaultValue: 'unpaid',
    });
    await queryInterface.addColumn('rides', 'stripePaymentIntentId', {
      type: Sequelize.STRING(128),
      allowNull: true,
    });
    await queryInterface.addColumn('rides', 'paidAt', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('rides', 'platformCommissionAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('rides', 'vendorEarningAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
    await queryInterface.addIndex('rides', ['stripePaymentIntentId']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('rides', 'paymentStatus');
    await queryInterface.removeColumn('rides', 'stripePaymentIntentId');
    await queryInterface.removeColumn('rides', 'paidAt');
    await queryInterface.removeColumn('rides', 'platformCommissionAmount');
    await queryInterface.removeColumn('rides', 'vendorEarningAmount');
  },
};
