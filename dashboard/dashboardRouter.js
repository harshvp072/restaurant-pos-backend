const express = require('express');
const router = express.Router();
const ctrl = require('./dashboardController');

router.get('/summary',      ctrl.getSummary);
router.get('/chart-data',   ctrl.getChartData);
router.get('/top-dishes',   ctrl.getTopDishes);
router.get('/recent-orders', ctrl.getRecentOrders);

module.exports = router;
