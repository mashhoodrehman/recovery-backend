'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      userId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      action: { type: Sequelize.STRING(16), allowNull: false },
      entity: { type: Sequelize.STRING(96), allowNull: true },
      entityId: { type: Sequelize.STRING(48), allowNull: true },
      statusCode: { type: Sequelize.INTEGER, allowNull: true },
      method: { type: Sequelize.STRING(8), allowNull: true },
      path: { type: Sequelize.STRING(255), allowNull: true },
      ip: { type: Sequelize.STRING(64), allowNull: true },
      userAgent: { type: Sequelize.STRING(255), allowNull: true },
      meta: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('audit_logs', ['userId']);
    await queryInterface.addIndex('audit_logs', ['entity']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  },
};
