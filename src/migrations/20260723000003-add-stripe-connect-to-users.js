'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'stripeAccountId', {
      type: Sequelize.STRING(128),
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'stripeOnboardingComplete', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
    await queryInterface.addColumn('users', 'stripePayoutsEnabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'stripeAccountId');
    await queryInterface.removeColumn('users', 'stripeOnboardingComplete');
    await queryInterface.removeColumn('users', 'stripePayoutsEnabled');
  },
};
