const express = require('express');
const router = express.Router();
const ctrl = require('./tablesController');

router.get('/summary', ctrl.getSummary);
router.get('/', ctrl.getAll);
router.patch('/:id/status', ctrl.updateStatus);

module.exports = router;
