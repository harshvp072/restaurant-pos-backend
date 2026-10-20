const svc = require('./wasteService');

const getAll = async (req, res, next) => {
  try { res.json({ success: true, data: await svc.getAll(req.query) }); } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const { raw_material_id, quantity_wasted, reason } = req.body;
    if (!raw_material_id || !quantity_wasted || !reason) {
      return res.status(400).json({ success: false, error: 'raw_material_id, quantity_wasted, reason required' });
    }
    res.status(201).json({ success: true, data: await svc.create(req.body) });
  } catch (e) { next(e); }
};

const getSummary = async (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;
    res.json({ success: true, data: await svc.getWasteSummary(date_from, date_to) });
  } catch (e) { next(e); }
};

module.exports = { getAll, create, getSummary };
