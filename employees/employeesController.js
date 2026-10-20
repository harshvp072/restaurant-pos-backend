const service = require('./employeesService');

const VALID_ROLES = ['admin', 'cashier', 'waiter'];

const getAll = async (req, res, next) => {
  try {
    const data = await service.getAllEmployees();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const data = await service.getEmployeeById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { name, role, pin_code, phone } = req.body;

    if (!name || !role || !pin_code) {
      return res.status(400).json({ success: false, error: 'name, role, and pin_code are required' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: `role must be one of: ${VALID_ROLES.join(', ')}` });
    }

    const data = await service.createEmployee({ name, role, pin_code, phone });
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const data = await service.updateEmployee(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const result = await service.deleteEmployee(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const verifyPin = async (req, res, next) => {
  try {
    const { pin_code } = req.body;
    if (!pin_code) {
      return res.status(400).json({ success: false, error: 'pin_code is required' });
    }
    const employee = await service.verifyPin(pin_code);
    res.json({ success: true, data: employee });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove, verifyPin };
