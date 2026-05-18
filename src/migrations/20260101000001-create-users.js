'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      firstName: { type: Sequelize.STRING(80), allowNull: false },
      lastName: { type: Sequelize.STRING(80), allowNull: true },
      email: { type: Sequelize.STRING(160), allowNull: false, unique: true },
      phone: { type: Sequelize.STRING(32), allowNull: true },
      password: { type: Sequelize.STRING(255), allowNull: false },
      avatar: { type: Sequelize.STRING(255), allowNull: true },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      lastLoginAt: { type: Sequelize.DATE, allowNull: true },
      refreshTokenHash: { type: Sequelize.STRING(255), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('users', ['email']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
