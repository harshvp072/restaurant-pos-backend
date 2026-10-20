const supabase = require('../shared/supabaseClient');
const { createError } = require('../shared/errorHandler');

const getAll = async ({ date_from, date_to, limit = 100 }) => {
  let q = supabase
    .from('waste_log')
    .select('*, raw_materials(name, unit_of_measurement, unit_cost)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (date_from) q = q.gte('created_at', `${date_from}T00:00:00`);
  if (date_to)   q = q.lte('created_at', `${date_to}T23:59:59`);
  const { data, error } = await q;
  if (error) throw createError(error.message, 500);
  return data;
};

const create = async ({ raw_material_id, quantity_wasted, reason, notes, recorded_by }) => {
  // The DB trigger handles stock deduction and waste_cost computation
  const { data, error } = await supabase
    .from('waste_log')
    .insert([{ raw_material_id, quantity_wasted: parseFloat(quantity_wasted), reason, notes, recorded_by }])
    .select('*, raw_materials(name, unit_of_measurement)')
    .single();
  if (error) throw createError(error.message, 500);
  return data;
};

const getWasteSummary = async (date_from, date_to) => {
  let q = supabase.from('waste_log').select('waste_cost, reason, created_at');
  if (date_from) q = q.gte('created_at', `${date_from}T00:00:00`);
  if (date_to)   q = q.lte('created_at', `${date_to}T23:59:59`);
  const { data, error } = await q;
  if (error) throw createError(error.message, 500);
  const total = data.reduce((s, w) => s + parseFloat(w.waste_cost || 0), 0);
  const byReason = {};
  for (const w of data) {
    byReason[w.reason] = (byReason[w.reason] || 0) + parseFloat(w.waste_cost || 0);
  }
  return { total_waste_cost: total, by_reason: byReason, count: data.length };
};

module.exports = { getAll, create, getWasteSummary };
