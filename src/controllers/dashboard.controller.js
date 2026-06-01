const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');

const { Op, fn, col, literal } = db.Sequelize;

const countUsersByRole = async (roleName) =>
  db.User.count({
    include: [
      {
        model: db.Role,
        as: 'roles',
        where: { name: roleName },
        attributes: [],
        through: { attributes: [] },
      },
    ],
  });

// Sum of platform commission captured (stored as negative commission_deduction tx)
const platformRevenue = async (where = {}) => {
  const row = await db.WalletTransaction.findOne({
    attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
    where: { type: 'commission_deduction', ...where },
    raw: true,
  });
  return Math.abs(Number(row?.total || 0));
};

// GET /dashboard/stats
const stats = asyncHandler(async (req, res) => {
  const [
    totalCustomers,
    totalVendors,
    totalCompanies,
    totalVehicles,
    activeJobs,
    completedJobs,
    totalRevenue,
    pendingWithdrawalsCount,
    pendingWithdrawalsAmountRow,
    recentRequests,
  ] = await Promise.all([
    countUsersByRole('customer'),
    countUsersByRole('recovery-provider'),
    countUsersByRole('company'),
    db.Vehicle.count(),
    db.RecoveryRequest.count({ where: { status: { [Op.in]: ['assigned', 'in_progress'] } } }),
    db.RecoveryRequest.count({ where: { status: 'completed' } }),
    platformRevenue(),
    db.Withdrawal.count({ where: { status: 'pending' } }),
    db.Withdrawal.findOne({
      attributes: [[fn('COALESCE', fn('SUM', col('amount')), 0), 'total']],
      where: { status: 'pending' },
      raw: true,
    }),
    db.RecoveryRequest.findAll({
      include: [
        { model: db.User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email'] },
      ],
      order: [['id', 'DESC']],
      limit: 5,
    }),
  ]);

  // Current calendar month revenue
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthlyRevenue = await platformRevenue({ createdAt: { [Op.gte]: monthStart } });

  return ok(res, {
    totalCustomers,
    totalVendors,
    totalCompanies,
    totalVehicles,
    activeJobs,
    completedJobs,
    totalRevenue,
    monthlyRevenue,
    pendingWithdrawals: {
      count: pendingWithdrawalsCount,
      amount: Number(pendingWithdrawalsAmountRow?.total || 0),
    },
    recentRequests,
  });
});

// Group rows into a 6-month { labels, data } series
const monthlySeries = (rows, valueKey) => {
  const labels = [];
  const map = {};
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    labels.push(d.toLocaleString('en', { month: 'short' }));
    map[key] = 0;
  }
  for (const r of rows) {
    const key = String(r.ym);
    if (key in map) map[key] = Number(r[valueKey]);
  }
  return { labels, data: Object.values(map) };
};

// GET /dashboard/charts
const charts = asyncHandler(async (req, res) => {
  const dialect = db.sequelize.getDialect();
  // Portable year-month expression
  const ymExpr =
    dialect === 'postgres'
      ? literal('to_char("createdAt", \'YYYY-MM\')')
      : fn('DATE_FORMAT', col('createdAt'), '%Y-%m');

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [revenueRows, registrationRows, jobStatusRows, withdrawalStatusRows] = await Promise.all([
    db.WalletTransaction.findAll({
      attributes: [[ymExpr, 'ym'], [fn('SUM', col('amount')), 'total']],
      where: { type: 'commission_deduction', createdAt: { [Op.gte]: sixMonthsAgo } },
      group: ['ym'],
      raw: true,
    }),
    db.User.findAll({
      attributes: [[ymExpr, 'ym'], [fn('COUNT', col('id')), 'total']],
      where: { createdAt: { [Op.gte]: sixMonthsAgo } },
      group: ['ym'],
      raw: true,
    }),
    db.RecoveryRequest.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'total']],
      group: ['status'],
      raw: true,
    }),
    db.Withdrawal.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'total']],
      group: ['status'],
      raw: true,
    }),
  ]);

  const revenue = monthlySeries(
    revenueRows.map((r) => ({ ym: r.ym, total: Math.abs(Number(r.total)) })),
    'total'
  );
  const registrations = monthlySeries(registrationRows, 'total');

  return ok(res, {
    revenue,
    registrations,
    jobsByStatus: jobStatusRows.map((r) => ({ status: r.status, count: Number(r.total) })),
    withdrawalsByStatus: withdrawalStatusRows.map((r) => ({
      status: r.status,
      count: Number(r.total),
    })),
  });
});

module.exports = { stats, charts };
