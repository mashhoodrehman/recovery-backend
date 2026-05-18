'use strict';

const bcrypt = require('bcryptjs');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@recovery.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await queryInterface.bulkInsert(
      'users',
      [
        {
          firstName: 'Super',
          lastName: 'Admin',
          email: ADMIN_EMAIL,
          password: hash,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ],
      { ignoreDuplicates: true }
    );

    const [users] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = '${ADMIN_EMAIL}' LIMIT 1`
    );
    const [roles] = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name = 'super-admin' LIMIT 1`
    );
    if (users[0] && roles[0]) {
      await queryInterface.bulkInsert(
        'user_roles',
        [{ userId: users[0].id, roleId: roles[0].id, createdAt: now, updatedAt: now }],
        { ignoreDuplicates: true }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: ADMIN_EMAIL }, {});
  },
};
