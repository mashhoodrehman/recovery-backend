'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('companies', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: { type: Sequelize.STRING(128), allowNull: false },
      email: { type: Sequelize.STRING(128), allowNull: true },
      phone: { type: Sequelize.STRING(32), allowNull: true },
      registrationNumber: { type: Sequelize.STRING(64), allowNull: true },
      website: { type: Sequelize.STRING(255), allowNull: true },
      address: { type: Sequelize.STRING(255), allowNull: true },
      city: { type: Sequelize.STRING(64), allowNull: true },
      country: { type: Sequelize.STRING(64), allowNull: true },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
      deletedAt: { type: Sequelize.DATE, allowNull: true },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('companies');
  },
};
