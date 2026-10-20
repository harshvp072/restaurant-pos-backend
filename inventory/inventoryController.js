const inventoryService = require('./inventoryService');

const getAll = async (req, res, next) => {
  try {
    const { category } = req.query;
    const data = await inventoryService.getAllMaterials(category);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await inventoryService.getMaterialById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const {
      name, category, unit_of_measurement,
      current_stock, min_threshold_alert, unit_cost,
    } = req.body;

    if (!name || !category || !unit_of_measurement) {
      return res.status(400).json({
        success: false,
        error: 'name, category, and unit_of_measurement are required',
      });
    }

    const data = await inventoryService.createMaterial({
      name: name.trim(),
      category,
      unit_of_measurement,
      current_stock: current_stock ?? 0,
      min_threshold_alert: min_threshold_alert ?? 0,
      unit_cost: unit_cost ?? 0,
    });

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await inventoryService.updateMaterial(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await inventoryService.deleteMaterial(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const getAlerts = async (req, res, next) => {
  try {
    const data = await inventoryService.getLowStockAlerts();
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    next(err);
  }
};

const adjustStock = async (req, res, next) => {
  try {
    const { adjustment } = req.body;
    if (adjustment === undefined) {
      return res.status(400).json({ success: false, error: 'adjustment value required' });
    }
    const data = await inventoryService.adjustStock(req.params.id, Number(adjustment));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove, getAlerts, adjustStock };
