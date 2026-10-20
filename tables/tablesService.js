const supabase = require('../shared/supabaseClient');
const { createError } = require('../shared/errorHandler');

const getAll = async () => {
  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*, orders(id, order_number, total_amount, status, created_at)')
    .order('table_number');
  if (error) throw createError(error.message, 500);
  return data;
};

const updateStatus = async (id, status, current_order_id = null) => {
  const { data, error } = await supabase
    .from('restaurant_tables')
    .update({ status, current_order_id: status === 'free' ? null : current_order_id })
    .eq('id', id)
    .select()
    .single();
  if (error) throw createError(error.message, 500);
  return data;
};

const occupyTable = async (tableNumber, orderId) => {
  const { data, error } = await supabase
    .from('restaurant_tables')
    .update({ status: 'occupied', current_order_id: orderId })
    .eq('table_number', tableNumber)
    .select()
    .single();
  if (error) throw createError(error.message, 500);
  return data;
};

const getFloorSummary = async () => {
  const { data, error } = await supabase.from('restaurant_tables').select('status');
  if (error) throw createError(error.message, 500);
  const summary = { free: 0, occupied: 0, reserved: 0, cleaning: 0 };
  for (const t of data) summary[t.status] = (summary[t.status] || 0) + 1;
  return { ...summary, total: data.length };
};

module.exports = { getAll, updateStatus, occupyTable, getFloorSummary };
