const express = require('express');
const router = express.Router();
const ctrl = require('./reportsController');

router.get('/sales',     ctrl.getSalesReport);
router.get('/expenses',  ctrl.getExpenseReport);
router.get('/inventory', ctrl.getInventoryReport);
router.get('/waste',     ctrl.getWasteReport);

module.exports = router;
