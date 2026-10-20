const svc = require('./suppliersService');
const { runReorderCheck } = require('../notifications/reorderEngine');
const { verifyConnection } = require('../notifications/emailService');

const getAll     = async (req, res, next) => { try { res.json({ success: true, data: await svc.getAll() }); } catch (e) { next(e); } };
const getById    = async (req, res, next) => { try { res.json({ success: true, data: await svc.getById(req.params.id) }); } catch (e) { next(e); } };
const getSummary = async (req, res, next) => { try { res.json({ success: true, data: await svc.getSummary() }); } catch (e) { next(e); } };

const create = async (req, res, next) => {
  try {
    const { name, email, contact_person, phone, address, notes } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, error: 'name and email are required' });
    res.status(201).json({ success: true, data: await svc.create({ name, email, contact_person, phone, address, notes }) });
  } catch (e) { next(e); }
};

const update = async (req, res, next) => {
  try { res.json({ success: true, data: await svc.update(req.params.id, req.body) }); } catch (e) { next(e); }
};

const remove = async (req, res, next) => {
  try { res.json({ success: true, ...await svc.remove(req.params.id) }); } catch (e) { next(e); }
};

/**
 * POST /api/suppliers/:id/trigger-reorder
 * Manually trigger a reorder email to a specific supplier.
 */
const triggerReorder = async (req, res, next) => {
  try {
    const supplier = await svc.getById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, error: 'Supplier not found' });

    const result = await runReorderCheck({
      triggeredByOrderId: null,
      triggerType: 'manual',
      // Only check materials belonging to this supplier
      onlyMaterialIds: (supplier.raw_materials || []).map((m) => m.id),
    });

    res.json({ success: true, data: result, message: `Reorder check complete: ${result.sent} email(s) sent` });
  } catch (e) { next(e); }
};

/**
 * GET /api/suppliers/email-status
 * Verify SMTP connection is working.
 */
const checkEmailStatus = async (req, res, next) => {
  try {
    const result = await verifyConnection();
    res.json({ success: result.ok, data: result });
  } catch (e) { next(e); }
};

module.exports = { getAll, getById, create, update, remove, getSummary, triggerReorder, checkEmailStatus };
