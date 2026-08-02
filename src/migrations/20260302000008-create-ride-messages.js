'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ride_messages', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      rideId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'rides', key: 'id' },
        onDelete: 'CASCADE',
      },
      senderId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      messageType: {
        type: Sequelize.ENUM('text', 'image'),
        defaultValue: 'text',
      },
      message: { type: Sequelize.TEXT, allowNull: true },
      imageUrl: { type: Sequelize.STRING(500), allowNull: true },
      isRead: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('ride_messages', ['rideId', 'createdAt']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('ride_messages');
  },
};
