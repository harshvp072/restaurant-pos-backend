const supabase = require('../shared/supabaseClient');
const { createError } = require('../shared/errorHandler');

const getAll = async () => {
  const { data, error } = await supabase
    .from('suppliers')
    .select(`
      *,
      raw_materials (id, name, category, current_stock, min_threshold_alert, unit_of_measurement)
    `)
    .eq('is_active', true)
    .order('name');
  if (error) throw createError(error.message, 500);
  return data;
};

const getById = async (id) => {
  const { data, error } = await supabase
    .from('suppliers')
    .select(`
      *,
      raw_materials (id, name, category, current_stock, min_threshold_alert, unit_of_measurement, unit_cost)
    `)
    .eq('id', id)
    .single();
  if (error) throw createError('Supplier not found', 404);
  return data;
};

const create = async (payload) => {
  const { data, error } = await supabase
    .from('suppliers')
    .insert([payload])
    .select()
    .single();
  if (error) throw createError(error.message, 500);
  return data;
};

const update = async (id, payload) => {
  const { data, error } = await supabase
    .from('suppliers')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw createError(error.message, 500);
  return data;
};

const remove = async (id) => {
  // Soft delete
  const { data, error } = await supabase
    .from('suppliers')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();
  if (error) throw createError(error.message, 500);
  return { message: 'Supplier deactivated', data };
};

const getSummary = async () => {
  const { data, error } = await supabase
    .from('reorder_summary_view')
    .select('*');
  if (error) {
    // View may not exist yet — return empty
    return [];
  }
  return data;
};

module.exports = { getAll, getById, create, update, remove, getSummary };
