require('dotenv').config();

const shared = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_NAME || 'recovery_db',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  dialect: process.env.DB_DIALECT || 'mysql',
  define: {
    underscored: false,
    timestamps: true,
  },
  logging: false,
};

module.exports = {
  development: shared,
  test: { ...shared, database: `${shared.database}_test` },
  production: shared,
};
