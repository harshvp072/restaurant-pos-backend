const supabase = require('../shared/supabaseClient');
const { createError } = require('../shared/errorHandler');

const getAll = async ({ status, trigger_type, date_from, date_to, limit = 100 }) => {
  let q = supabase
    .from('reorder_requests')
    .select(`
      *,
      raw_materials (id, name, unit_of_measurement, current_stock, category),
      suppliers (id, name, email, phone),
      orders (id, order_number)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status)       q = q.eq('status', status);
  if (trigger_type) q = q.eq('trigger_type', trigger_type);
  if (date_from)    q = q.gte('created_at', `${date_from}T00:00:00`);
  if (date_to)      q = q.lte('created_at', `${date_to}T23:59:59`);

  const { data, error } = await q;
  if (error) throw createError(error.message, 500);
  return data;
};

const acknowledge = async (id) => {
  const { data, error } = await supabase
    .from('reorder_requests')
    .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw createError(error.message, 500);
  return data;
};

const markFulfilled = async (id) => {
  const { data, error } = await supabase
    .from('reorder_requests')
    .update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw createError(error.message, 500);
  return data;
};

const getStats = async () => {
  const { data, error } = await supabase
    .from('reorder_requests')
    .select('status, trigger_type, estimated_cost');

  if (error) throw createError(error.message, 500);

  const stats = { total: data.length, sent: 0, acknowledged: 0, fulfilled: 0, failed: 0, auto: 0, manual: 0, total_estimated_cost: 0 };
  for (const r of data) {
    stats[r.status]   = (stats[r.status]   || 0) + 1;
    stats[r.trigger_type] = (stats[r.trigger_type] || 0) + 1;
    stats.total_estimated_cost += parseFloat(r.estimated_cost || 0);
  }
  return stats;
};

module.exports = { getAll, acknowledge, markFulfilled, getStats };
