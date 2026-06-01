'use strict';

const SETTINGS = [
  // finance
  { key: 'commission_percent', value: '10', type: 'number', group: 'finance', label: 'Platform Commission (%)', isPublic: false },
  { key: 'min_withdrawal_amount', value: '100', type: 'number', group: 'finance', label: 'Minimum Withdrawal Amount', isPublic: false },
  { key: 'currency', value: 'USD', type: 'string', group: 'finance', label: 'Default Currency', isPublic: true },
  // general
  { key: 'platform_name', value: 'Recovery Marketplace', type: 'string', group: 'general', label: 'Platform Name', isPublic: true },
  { key: 'support_email', value: 'support@recovery.local', type: 'string', group: 'general', label: 'Support Email', isPublic: true },
  // notifications
  { key: 'notifications_push_enabled', value: 'true', type: 'boolean', group: 'notifications', label: 'Push Notifications Enabled', isPublic: false },
  // requests
  { key: 'bid_radius_km', value: '25', type: 'number', group: 'requests', label: 'Vendor Broadcast Radius (km)', isPublic: false },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'settings',
      SETTINGS.map((s) => ({
        key: s.key,
        value: s.value,
        type: s.type,
        group: s.group,
        label: s.label,
        description: null,
        isPublic: s.isPublic,
        createdAt: now,
        updatedAt: now,
      })),
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('settings', null, {});
  },
};
