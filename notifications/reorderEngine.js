/**
 * Reorder Engine
 * --------------
 * After an order is completed, this module:
 *   1. Fetches all raw materials that dropped below min_threshold_alert
 *   2. Groups them by supplier
 *   3. Checks if a reorder was ALREADY sent recently (debounce: 1 hour) to avoid spam
 *   4. Sends one consolidated email per supplier
 *   5. Logs every attempt (success or failure) in reorder_requests table
 */

const supabase          = require('../shared/supabaseClient');
const { sendReorderEmail } = require('./emailService');

// Don't send duplicate reorder emails to the same supplier within 1 hour
const DEBOUNCE_MINUTES = 60;

/**
 * Generate a short readable reference ID.
 */
function genRef() {
  const now = new Date();
  return `RO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

/**
 * Check if a reorder was already sent to this supplier in the last DEBOUNCE_MINUTES.
 */
async function recentlySent(supplierId) {
  const cutoff = new Date(Date.now() - DEBOUNCE_MINUTES * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('reorder_requests')
    .select('id')
    .eq('supplier_id', supplierId)
    .eq('status', 'sent')
    .gte('created_at', cutoff)
    .limit(1);
  return (data || []).length > 0;
}

/**
 * Log a reorder request record.
 */
async function logReorderRequest({
  rawMaterialId, supplierId, triggerType, stockAtTrigger,
  thresholdValue, quantityRequested, estimatedCost,
  emailTo, emailSubject, emailBody, status, errorMessage, triggeredByOrderId,
}) {
  const { data, error } = await supabase
    .from('reorder_requests')
    .insert([{
      raw_material_id:    rawMaterialId,
      supplier_id:        supplierId,
      trigger_type:       triggerType,
      stock_at_trigger:   stockAtTrigger,
      threshold_value:    thresholdValue,
      quantity_requested: quantityRequested,
      estimated_cost:     estimatedCost,
      email_to:           emailTo,
      email_subject:      emailSubject || '',
      email_body:         emailBody    || '',
      status:             status,
      error_message:      errorMessage || null,
      triggered_by_order: triggeredByOrderId || null,
    }])
    .select()
    .single();

  if (error) console.error('[ReorderEngine] Failed to log request:', error.message);
  return data;
}

/**
 * Main entry point.
 * Call this after every order is marked 'completed'.
 *
 * @param {string}  triggeredByOrderId  - The completed order's UUID
 * @param {string}  triggerType         - 'auto' | 'manual'
 * @param {string[]} [onlyMaterialIds]  - Optional: only check specific material IDs
 */
async function runReorderCheck({ triggeredByOrderId = null, triggerType = 'auto', onlyMaterialIds = null } = {}) {
  console.log(`[ReorderEngine] Running check (trigger: ${triggerType}, order: ${triggeredByOrderId || 'N/A'})`);

  // Step 1: Fetch all materials below threshold that have a supplier with email
  let query = supabase
    .from('supplier_inventory_view')
    .select('*')
    .in('stock_status', ['low_stock', 'out_of_stock'])
    .not('supplier_id', 'is', null)
    .not('supplier_email', 'is', null);

  if (onlyMaterialIds && onlyMaterialIds.length > 0) {
    query = query.in('id', onlyMaterialIds);
  }

  const { data: lowStockItems, error } = await query;

  if (error) {
    console.error('[ReorderEngine] Failed to fetch low-stock items:', error.message);
    return { sent: 0, skipped: 0, failed: 0 };
  }

  if (!lowStockItems || lowStockItems.length === 0) {
    console.log('[ReorderEngine] No low-stock items found. Done.');
    return { sent: 0, skipped: 0, failed: 0 };
  }

  console.log(`[ReorderEngine] Found ${lowStockItems.length} low-stock items across suppliers`);

  // Step 2: Group by supplier
  const bySupplier = {};
  for (const item of lowStockItems) {
    const sid = item.supplier_id;
    if (!bySupplier[sid]) {
      bySupplier[sid] = {
        supplierId:    sid,
        supplierName:  item.supplier_name,
        supplierEmail: item.supplier_email,
        contactPerson: item.contact_person,
        materials:     [],
      };
    }
    bySupplier[sid].materials.push(item);
  }

  let sent = 0, skipped = 0, failed = 0;

  // Step 3: For each supplier, check debounce then send
  for (const group of Object.values(bySupplier)) {
    // Debounce: skip if already sent in last DEBOUNCE_MINUTES
    if (triggerType === 'auto') {
      const already = await recentlySent(group.supplierId);
      if (already) {
        console.log(`[ReorderEngine] Skipping ${group.supplierName} — sent within last ${DEBOUNCE_MINUTES} min`);
        skipped++;
        continue;
      }
    }

    const orderRef = genRef();

    // Build materials payload for email
    const materialsPayload = group.materials.map((m) => {
      const reorderQty  = parseFloat(m.reorder_quantity) > 0
        ? parseFloat(m.reorder_quantity)
        : parseFloat(m.min_threshold_alert) * 3; // default: 3× the threshold
      const unitCost    = parseFloat(m.reorder_unit_cost) > 0
        ? parseFloat(m.reorder_unit_cost)
        : parseFloat(m.unit_cost);
      const estCost     = reorderQty * unitCost;

      return {
        id:                 m.id,
        rawMaterialId:      m.id,
        supplierId:         m.supplier_id,
        name:               m.material_name,
        unit:               m.unit_of_measurement,
        currentStock:       parseFloat(m.current_stock),
        thresholdValue:     parseFloat(m.min_threshold_alert),
        stockPct:           parseFloat(m.stock_pct_of_threshold),
        quantityRequested:  reorderQty,
        unitCost,
        estimatedCost:      estCost,
      };
    });

    const totalEstimatedCost = materialsPayload.reduce((s, m) => s + m.estimatedCost, 0);

    // Step 4: Send email
    const emailResult = await sendReorderEmail({
      toEmail:       group.supplierEmail,
      supplierName:  group.supplierName,
      contactPerson: group.contactPerson,
      materials:     materialsPayload,
      triggerType,
      orderRef,
      triggeredByOrderNumber: triggeredByOrderId,
    });

    // Step 5: Log EVERY material in the request separately (for granular tracking)
    for (const mat of materialsPayload) {
      await logReorderRequest({
        rawMaterialId:      mat.rawMaterialId,
        supplierId:         group.supplierId,
        triggerType,
        stockAtTrigger:     mat.currentStock,
        thresholdValue:     mat.thresholdValue,
        quantityRequested:  mat.quantityRequested,
        estimatedCost:      mat.estimatedCost,
        emailTo:            group.supplierEmail,
        emailSubject:       emailResult.subject,
        emailBody:          `Reorder #${orderRef} — ${group.supplierName} — ${group.materials.length} items`,
        status:             emailResult.success ? 'sent' : 'failed',
        errorMessage:       emailResult.success ? null : emailResult.error,
        triggeredByOrderId,
      });
    }

    if (emailResult.success) {
      sent++;
      console.log(`[ReorderEngine] ✓ Sent reorder email to ${group.supplierEmail} (${group.materials.length} items, ₹${totalEstimatedCost.toFixed(2)})`);
    } else {
      failed++;
      console.error(`[ReorderEngine] ✗ Failed to send to ${group.supplierEmail}: ${emailResult.error}`);
    }
  }

  console.log(`[ReorderEngine] Complete — Sent: ${sent}, Skipped: ${skipped}, Failed: ${failed}`);
  return { sent, skipped, failed };
}

module.exports = { runReorderCheck, logReorderRequest };
