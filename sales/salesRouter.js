const express = require('express');
const router = express.Router();
const ctrl = require('./salesController');

router.get('/menu', ctrl.getMenu);
router.route('/orders').get(ctrl.getOrders).post(ctrl.createOrder);
router.get('/orders/:id', ctrl.getOrderById);
router.patch('/orders/:id/status', ctrl.updateStatus);

module.exports = router;
