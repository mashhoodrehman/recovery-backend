'use strict';

const ROLES = [
  { name: 'super-admin', description: 'Full system access' },
  { name: 'admin', description: 'Administrative access' },
  { name: 'recovery-provider', description: 'Can view requests and place bids' },
  { name: 'customer', description: 'Can request recovery and accept bids' },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'roles',
      ROLES.map((r) => ({
        name: r.name,
        guardName: 'api',
        description: r.description,
        createdAt: now,
        updatedAt: now,
      })),
      { ignoreDuplicates: true }
    );

    // wire role <-> permission rows
    const [roles] = await queryInterface.sequelize.query('SELECT id, name FROM roles');
    const [permissions] = await queryInterface.sequelize.query('SELECT id, name FROM permissions');

    const roleByName = Object.fromEntries(roles.map((r) => [r.name, r.id]));
    const permByName = Object.fromEntries(permissions.map((p) => [p.name, p.id]));

    const mapping = {
      'super-admin': permissions.map((p) => p.name),
      admin: [
        'dashboard.view',
        'users.view',
        'users.create',
        'users.update',
        'users.delete',
        'roles.view',
        'roles.create',
        'roles.update',
        'roles.delete',
        'permissions.view',
        'recovery.request.view.any',
        'recovery.bid.view',
        'recovery.assign',
        'recovery.complete',
        'vehicles.manage.any',
        'wallets.view.any',
        'wallets.adjust',
        'withdrawals.manage',
        'notifications.send',
        'settings.view',
        'settings.update',
        'audit.view',
      ],
      'recovery-provider': [
        'dashboard.view',
        'recovery.request.view.any',
        'recovery.bid.create',
        'recovery.bid.view',
        'recovery.bid.withdraw',
        'vehicles.view.own',
        'vehicles.create',
        'vehicles.update',
        'vehicles.delete',
        'wallets.view.own',
        'withdrawals.view.own',
        'withdrawals.create',
      ],
      customer: [
        'recovery.request.create',
        'recovery.request.view.own',
        'recovery.request.cancel.own',
        'recovery.bid.view',
        'recovery.bid.accept',
      ],
    };

    const rows = [];
    for (const [roleName, permNames] of Object.entries(mapping)) {
      const roleId = roleByName[roleName];
      if (!roleId) continue;
      for (const pname of permNames) {
        const pid = permByName[pname];
        if (!pid) continue;
        rows.push({ roleId, permissionId: pid, createdAt: now, updatedAt: now });
      }
    }
    if (rows.length) {
      await queryInterface.bulkInsert('role_permissions', rows, { ignoreDuplicates: true });
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('role_permissions', null, {});
    await queryInterface.bulkDelete('roles', null, {});
  },
};
