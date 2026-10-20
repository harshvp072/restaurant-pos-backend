const express = require('express');
const router = express.Router();
const ctrl = require('./notificationsController');

router.get('/stats',               ctrl.getStats);
router.get('/',                    ctrl.getAll);
router.post('/trigger-check',      ctrl.triggerManualCheck);
router.patch('/:id/acknowledge',   ctrl.acknowledge);
router.patch('/:id/fulfilled',     ctrl.markFulfilled);

module.exports = router;
