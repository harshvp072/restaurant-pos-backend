const express = require('express');
const router = express.Router();
const ctrl = require('./inventoryController');

// GET  /api/inventory              - List all raw materials (optional ?category=)
// POST /api/inventory              - Create new raw material
router.route('/')
  .get(ctrl.getAll)
  .post(ctrl.create);

// GET /api/inventory/alerts        - Low-stock alert list
router.get('/alerts', ctrl.getAlerts);

// GET    /api/inventory/:id        - Get single material
// PUT    /api/inventory/:id        - Update material
// DELETE /api/inventory/:id        - Delete material
router.route('/:id')
  .get(ctrl.getById)
  .put(ctrl.update)
  .delete(ctrl.remove);

// PATCH /api/inventory/:id/adjust  - Adjust stock quantity
router.patch('/:id/adjust', ctrl.adjustStock);

module.exports = router;
