const svc = require('./tablesService');

const getAll     = async (req, res, next) => { try { res.json({ success: true, data: await svc.getAll() }); } catch (e) { next(e); } };
const getSummary = async (req, res, next) => { try { res.json({ success: true, data: await svc.getFloorSummary() }); } catch (e) { next(e); } };

const updateStatus = async (req, res, next) => {
  try {
    const { status, current_order_id } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'status required' });
    res.json({ success: true, data: await svc.updateStatus(req.params.id, status, current_order_id) });
  } catch (e) { next(e); }
};

module.exports = { getAll, getSummary, updateStatus };
