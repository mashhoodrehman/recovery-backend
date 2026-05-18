'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roles', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      guardName: { type: Sequelize.STRING(64), allowNull: false, defaultValue: 'api' },
      description: { type: Sequelize.STRING(255), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('roles');
  },
};
