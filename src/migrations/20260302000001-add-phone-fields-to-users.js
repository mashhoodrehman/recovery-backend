'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 'phone' already exists from the base users migration — skip it
    await queryInterface.addColumn('users', 'phoneOtp', {
      type: Sequelize.STRING(10),
      allowNull: true,
      after: 'phone',
    });
    await queryInterface.addColumn('users', 'phoneOtpExpiresAt', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'phoneOtp',
    });
    await queryInterface.addColumn('users', 'isPhoneVerified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      after: 'phoneOtpExpiresAt',
    });
    await queryInterface.addColumn('users', 'username', {
      type: Sequelize.STRING(64),
      allowNull: true,
      after: 'isPhoneVerified',
    });
    await queryInterface.addColumn('users', 'userType', {
      type: Sequelize.ENUM('customer', 'tower'),
      allowNull: true,
      after: 'username',
    });
    await queryInterface.addColumn('users', 'city', {
      type: Sequelize.STRING(64),
      allowNull: true,
      after: 'userType',
    });
    await queryInterface.addColumn('users', 'isProfileComplete', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      after: 'city',
    });
    await queryInterface.addColumn('users', 'isOnline', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      after: 'isProfileComplete',
    });
    await queryInterface.addColumn('users', 'currentLat', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
      after: 'isOnline',
    });
    await queryInterface.addColumn('users', 'currentLng', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
      after: 'currentLat',
    });
    await queryInterface.addColumn('users', 'lastSeenAt', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'currentLng',
    });
  },

  async down(queryInterface) {
    const cols = [
      'phoneOtp', 'phoneOtpExpiresAt', 'isPhoneVerified',
      'username', 'userType', 'city', 'isProfileComplete',
      'isOnline', 'currentLat', 'currentLng', 'lastSeenAt',
    ];
    for (const col of cols) {
      await queryInterface.removeColumn('users', col);
    }
  },
};
