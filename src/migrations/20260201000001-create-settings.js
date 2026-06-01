'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('settings', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      key: { type: Sequelize.STRING(96), allowNull: false, unique: true },
      value: { type: Sequelize.TEXT, allowNull: true },
      type: {
        type: Sequelize.ENUM('string', 'number', 'boolean', 'json'),
        defaultValue: 'string',
      },
      group: { type: Sequelize.STRING(64), defaultValue: 'general' },
      label: { type: Sequelize.STRING(128), allowNull: true },
      description: { type: Sequelize.STRING(255), allowNull: true },
      isPublic: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('settings', ['group']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('settings');
  },
};
