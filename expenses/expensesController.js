const svc = require('./expensesService');

const CATEGORIES = ['rent','utilities','salaries','maintenance','marketing','supplies','other'];

const getAll = async (req, res, next) => {
  try { res.json({ success: true, data: await svc.getAll(req.query) }); } catch (e) { next(e); }
};

const getSummary = async (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;
    res.json({ success: true, data: await svc.getSummaryByCategory(date_from, date_to) });
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const { title, category, amount, expense_date, paid_to, payment_method, notes } = req.body;
    if (!title || !category || !amount) {
      return res.status(400).json({ success: false, error: 'title, category, and amount are required' });
    }
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, error: `category must be one of: ${CATEGORIES.join(', ')}` });
    }
    const data = await svc.create({ title, category, amount: parseFloat(amount), expense_date: expense_date || new Date().toISOString().split('T')[0], paid_to, payment_method, notes });
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try { res.json({ success: true, data: await svc.update(req.params.id, req.body) }); } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try { res.json({ success: true, ...await svc.remove(req.params.id) }); } catch (e) { next(e); }
};

module.exports = { getAll, getSummary, create, update, remove };
