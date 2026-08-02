'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('withdrawals', 'stripeTransferId', {
      type: Sequelize.STRING(128),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('withdrawals', 'stripeTransferId');
  },
};
