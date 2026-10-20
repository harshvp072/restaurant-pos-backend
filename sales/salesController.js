const service = require('./salesService');

const getOrders = async (req, res, next) => {
  try {
    const data = await service.getOrders(req.query);
    res.json({ success: true, data, count: data.length });
  } catch (e) { next(e); }
};

const getOrderById = async (req, res, next) => {
  try {
    const data = await service.getOrderById(req.params.id);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

const createOrder = async (req, res, next) => {
  try {
    const { order_type, table_number, employee_id, items } = req.body;
    if (!order_type || !items?.length) {
      return res.status(400).json({ success: false, error: 'order_type and items are required' });
    }
    const data = await service.createOrder({ order_type, table_number, employee_id, items });
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'status is required' });
    const data = await service.updateOrderStatus(req.params.id, status);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

const getMenu = async (req, res, next) => {
  try {
    const data = await service.getMenuDishes();
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

module.exports = { getOrders, getOrderById, createOrder, updateStatus, getMenu };
