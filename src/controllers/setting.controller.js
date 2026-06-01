const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');

const serialize = (row) => ({
  id: row.id,
  key: row.key,
  value: db.Setting.cast(row),
  type: row.type,
  group: row.group,
  label: row.label,
  description: row.description,
  isPublic: row.isPublic,
});

const groupRows = (rows) => {
  const grouped = {};
  for (const row of rows) {
    (grouped[row.group] = grouped[row.group] || []).push(serialize(row));
  }
  return grouped;
};

// GET /settings — grouped settings for the admin panel
const list = asyncHandler(async (req, res) => {
  const rows = await db.Setting.findAll({ order: [['group', 'ASC'], ['key', 'ASC']] });
  return ok(res, groupRows(rows), 'Settings');
});

// GET /settings/public — settings safe to expose to clients (e.g. mobile app)
const publicSettings = asyncHandler(async (req, res) => {
  const rows = await db.Setting.findAll({ where: { isPublic: true } });
  const map = Object.fromEntries(rows.map((r) => [r.key, db.Setting.cast(r)]));
  return ok(res, map, 'Public settings');
});

// PUT /settings — bulk upsert
const update = asyncHandler(async (req, res) => {
  const { settings } = req.body;
  const t = await db.sequelize.transaction();
  try {
    for (const item of settings) {
      const row = await db.Setting.findOne({ where: { key: item.key }, transaction: t });
      const serialized =
        item.value !== null && typeof item.value === 'object'
          ? JSON.stringify(item.value)
          : String(item.value);
      if (row) {
        await row.update({ value: serialized }, { transaction: t });
      } else {
        await db.Setting.create(
          { key: item.key, value: serialized, type: 'string' },
          { transaction: t }
        );
      }
    }
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }
  const rows = await db.Setting.findAll({ order: [['group', 'ASC'], ['key', 'ASC']] });
  return ok(res, groupRows(rows), 'Settings updated');
});

module.exports = { list, publicSettings, update };
