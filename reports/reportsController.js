const svc = require('./reportsService');

const sendCSV = (res, csv, filename) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};

const getSalesReport = async (req, res, next) => {
  try {
    const { period = 'month', date_from, date_to, format } = req.query;
    const { data, range } = await svc.getSalesReport(period, date_from, date_to);
    if (format === 'csv') return sendCSV(res, svc.buildSalesCSV(data), `sales_${range.from}_${range.to}.csv`);
    res.json({ success: true, data, range, total: data.length });
  } catch (e) { next(e); }
};

const getExpenseReport = async (req, res, next) => {
  try {
    const { period = 'month', date_from, date_to, format } = req.query;
    const { data, range } = await svc.getExpenseReport(period, date_from, date_to);
    if (format === 'csv') return sendCSV(res, svc.buildExpenseCSV(data), `expenses_${range.from}_${range.to}.csv`);
    res.json({ success: true, data, range, total: data.length, total_amount: data.reduce((s, e) => s + parseFloat(e.amount), 0) });
  } catch (e) { next(e); }
};

const getInventoryReport = async (req, res, next) => {
  try {
    const { format } = req.query;
    const { data, total_inventory_value } = await svc.getInventoryReport();
    if (format === 'csv') return sendCSV(res, svc.buildInventoryCSV(data), `inventory_valuation.csv`);
    res.json({ success: true, data, total_inventory_value });
  } catch (e) { next(e); }
};

const getWasteReport = async (req, res, next) => {
  try {
    const { period = 'month', date_from, date_to, format } = req.query;
    const { data, total_waste_cost, range } = await svc.getWasteReport(period, date_from, date_to);
    if (format === 'csv') return sendCSV(res, svc.buildWasteCSV(data), `waste_${range.from}_${range.to}.csv`);
    res.json({ success: true, data, total_waste_cost, range });
  } catch (e) { next(e); }
};

module.exports = { getSalesReport, getExpenseReport, getInventoryReport, getWasteReport };
