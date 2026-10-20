const express = require('express');
const router = express.Router();
const ctrl = require('./employeesController');

router.route('/').get(ctrl.getAll).post(ctrl.create);
router.post('/verify-pin', ctrl.verifyPin);
router.route('/:id').get(ctrl.getById).put(ctrl.update).delete(ctrl.remove);

module.exports = router;
