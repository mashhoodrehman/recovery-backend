'use strict';

const PERMISSIONS = [
  { group: 'users', items: ['users.view', 'users.create', 'users.update', 'users.delete'] },
  { group: 'roles', items: ['roles.view', 'roles.create', 'roles.update', 'roles.delete'] },
  {
    group: 'permissions',
    items: ['permissions.view', 'permissions.create', 'permissions.update', 'permissions.delete'],
  },
  {
    group: 'recovery',
    items: [
      'recovery.request.create',
      'recovery.request.view.any',
      'recovery.request.view.own',
      'recovery.request.cancel.own',
      'recovery.bid.create',
      'recovery.bid.view',
      'recovery.bid.accept',
      'recovery.bid.withdraw',
      'recovery.assign',
      'recovery.complete',
    ],
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const rows = [];
    for (const { group, items } of PERMISSIONS) {
      for (const name of items) {
        rows.push({
          name,
          guardName: 'api',
          group,
          description: null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    await queryInterface.bulkInsert('permissions', rows, { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('permissions', null, {});
  },
};
