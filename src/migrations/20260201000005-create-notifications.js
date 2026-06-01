'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      userId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: { type: Sequelize.STRING(64), allowNull: false },
      title: { type: Sequelize.STRING(160), allowNull: false },
      body: { type: Sequelize.STRING(500), allowNull: true },
      data: { type: Sequelize.JSON, allowNull: true },
      channel: {
        type: Sequelize.ENUM('in_app', 'push', 'email'),
        defaultValue: 'in_app',
      },
      readAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('notifications', ['userId']);
    await queryInterface.addIndex('notifications', ['readAt']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notifications');
  },
};
