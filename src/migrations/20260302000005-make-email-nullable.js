'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'email', {
      type: Sequelize.STRING(160),
      allowNull: true,
      unique: true,
    });
    await queryInterface.changeColumn('users', 'firstName', {
      type: Sequelize.STRING(80),
      allowNull: true,
    });
    await queryInterface.changeColumn('users', 'password', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'email', {
      type: Sequelize.STRING(160),
      allowNull: false,
    });
    await queryInterface.changeColumn('users', 'firstName', {
      type: Sequelize.STRING(80),
      allowNull: false,
    });
    await queryInterface.changeColumn('users', 'password', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  },
};
