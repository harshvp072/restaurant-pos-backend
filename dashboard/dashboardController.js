const service = require('./dashboardService');

const getSummary = async (req, res, next) => {
  try {
    const { period = 'today', date_from, date_to } = req.query;
    const data = await service.getSummary(period, date_from, date_to);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

const getChartData = async (req, res, next) => {
  try {
    const { period = 'week' } = req.query;
    const data = await service.getChartData(period);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

const getTopDishes = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const data = await service.getTopDishes(period);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

const getRecentOrders = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const data = await service.getRecentOrders(parseInt(limit));
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

module.exports = { getSummary, getChartData, getTopDishes, getRecentOrders };
