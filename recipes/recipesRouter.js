const express = require('express');
const router = express.Router();
const ctrl = require('./recipesController');

// COGS report (before :id routes to avoid conflict)
router.get('/cogs-report', ctrl.getCogsReport);

// Dish CRUD
router.route('/dishes').get(ctrl.getAllDishes).post(ctrl.createDish);
router.route('/dishes/:id').get(ctrl.getDishById).put(ctrl.updateDish).delete(ctrl.deleteDish);

// BOM management per dish
router.route('/dishes/:id/bom').get(ctrl.getBOM).post(ctrl.setBOM);

module.exports = router;
