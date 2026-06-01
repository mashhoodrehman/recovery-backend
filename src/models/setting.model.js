module.exports = (sequelize, DataTypes) => {
  const Setting = sequelize.define(
    'Setting',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      key: { type: DataTypes.STRING(96), allowNull: false, unique: true },
      value: { type: DataTypes.TEXT, allowNull: true },
      type: {
        type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
        defaultValue: 'string',
      },
      group: { type: DataTypes.STRING(64), defaultValue: 'general' },
      label: { type: DataTypes.STRING(128), allowNull: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
      isPublic: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    { tableName: 'settings' }
  );

  // Cast a raw stored value into its declared type
  Setting.cast = (row) => {
    if (!row) return null;
    const { value, type } = row;
    if (value === null || value === undefined) return null;
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true' || value === '1' || value === true;
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      default:
        return value;
    }
  };

  return Setting;
};
