const svc = require('./notificationsService');
const { runReorderCheck } = require('./reorderEngine');

const getAll     = async (req, res, next) => { try { res.json({ success: true, data: await svc.getAll(req.query) }); } catch (e) { next(e); } };
const getStats   = async (req, res, next) => { try { res.json({ success: true, data: await svc.getStats() }); } catch (e) { next(e); } };
const acknowledge = async (req, res, next) => { try { res.json({ success: true, data: await svc.acknowledge(req.params.id) }); } catch (e) { next(e); } };
const markFulfilled = async (req, res, next) => { try { res.json({ success: true, data: await svc.markFulfilled(req.params.id) }); } catch (e) { next(e); } };

/** Manually run a full reorder check right now */
const triggerManualCheck = async (req, res, next) => {
  try {
    const result = await runReorderCheck({ triggerType: 'manual' });
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

module.exports = { getAll, getStats, acknowledge, markFulfilled, triggerManualCheck };
