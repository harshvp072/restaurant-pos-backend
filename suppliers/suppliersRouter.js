const express = require('express');
const router = express.Router();
const ctrl = require('./suppliersController');

router.get('/email-status',           ctrl.checkEmailStatus);
router.get('/summary',                ctrl.getSummary);
router.route('/').get(ctrl.getAll).post(ctrl.create);
router.route('/:id').get(ctrl.getById).put(ctrl.update).delete(ctrl.remove);
router.post('/:id/trigger-reorder',   ctrl.triggerReorder);

module.exports = router;
