const db = require('../models');

// Sensible fallbacks so finance logic works even before settings are seeded
const DEFAULTS = {
  commission_percent: 10,
  min_withdrawal_amount: 100,
  currency: 'USD',
  platform_name: 'Recovery Marketplace',
};

const get = async (key, fallback = undefined) => {
  const row = await db.Setting.findOne({ where: { key } });
  if (!row) return fallback !== undefined ? fallback : DEFAULTS[key];
  const casted = db.Setting.cast(row);
  return casted === null ? (fallback !== undefined ? fallback : DEFAULTS[key]) : casted;
};

const getMany = async (keys) => {
  const rows = await db.Setting.findAll({ where: { key: keys } });
  const map = Object.fromEntries(rows.map((r) => [r.key, db.Setting.cast(r)]));
  const result = {};
  for (const key of keys) {
    result[key] = map[key] ?? DEFAULTS[key];
  }
  return result;
};

const all = async () => db.Setting.findAll({ order: [['group', 'ASC'], ['key', 'ASC']] });

const set = async (key, value) => {
  const row = await db.Setting.findOne({ where: { key } });
  const serialized =
    value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (!row) {
    return db.Setting.create({ key, value: serialized, type: 'string' });
  }
  await row.update({ value: serialized });
  return row;
};

module.exports = { get, getMany, all, set, DEFAULTS };
