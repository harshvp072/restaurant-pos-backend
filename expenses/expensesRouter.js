const express = require('express');
const router = express.Router();
const ctrl = require('./expensesController');

router.get('/summary', ctrl.getSummary);
router.route('/').get(ctrl.getAll).post(ctrl.create);
router.route('/:id').put(ctrl.update).delete(ctrl.remove);

module.exports = router;
