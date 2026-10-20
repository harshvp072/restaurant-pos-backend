const service = require('./recipesService');

const getAllDishes    = async (req, res, next) => { try { res.json({ success: true, data: await service.getAllDishes() }); } catch (e) { next(e); } };
const getDishById    = async (req, res, next) => { try { res.json({ success: true, data: await service.getDishById(req.params.id) }); } catch (e) { next(e); } };
const getCogsReport  = async (req, res, next) => { try { res.json({ success: true, data: await service.getCogsReport() }); } catch (e) { next(e); } };

const createDish = async (req, res, next) => {
  try {
    const { name, category, selling_price, image_url } = req.body;
    if (!name || !category || !selling_price) {
      return res.status(400).json({ success: false, error: 'name, category, selling_price required' });
    }
    const data = await service.createDish({ name: name.trim(), category, selling_price, image_url });
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
};

const updateDish = async (req, res, next) => {
  try {
    const data = await service.updateDish(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

const deleteDish = async (req, res, next) => {
  try {
    const result = await service.deleteDish(req.params.id);
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};

const getBOM = async (req, res, next) => {
  try {
    const data = await service.getBOM(req.params.id);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

const setBOM = async (req, res, next) => {
  try {
    const { ingredients } = req.body;
    if (!Array.isArray(ingredients)) {
      return res.status(400).json({ success: false, error: 'ingredients must be an array' });
    }
    const data = await service.setBOM(req.params.id, ingredients);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

module.exports = { getAllDishes, getDishById, createDish, updateDish, deleteDish, getBOM, setBOM, getCogsReport };
