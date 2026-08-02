'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'country', {
      type: Sequelize.STRING(10),
      allowNull: true,
      defaultValue: 'UK',
      after: 'lastSeenAt',
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'country');
  },
};
