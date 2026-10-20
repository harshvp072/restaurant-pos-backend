const express = require('express');
const router = express.Router();
const ctrl = require('./wasteController');

router.get('/summary', ctrl.getSummary);
router.route('/').get(ctrl.getAll).post(ctrl.create);

module.exports = router;
