const supabase = require('../shared/supabaseClient');
const { createError } = require('../shared/errorHandler');

const getAll = async ({ category, date_from, date_to, limit = 100 }) => {
  let q = supabase
    .from('expenses')
    .select('*, employees(name)')
    .order('expense_date', { ascending: false })
    .limit(limit);
  if (category) q = q.eq('category', category);
  if (date_from) q = q.gte('expense_date', date_from);
  if (date_to)   q = q.lte('expense_date', date_to);
  const { data, error } = await q;
  if (error) throw createError(error.message, 500);
  return data;
};

const getSummaryByCategory = async (date_from, date_to) => {
  let q = supabase.from('expenses').select('category, amount');
  if (date_from) q = q.gte('expense_date', date_from);
  if (date_to)   q = q.lte('expense_date', date_to);
  const { data, error } = await q;
  if (error) throw createError(error.message, 500);
  // Aggregate in JS
  const map = {};
  for (const e of data) {
    map[e.category] = (map[e.category] || 0) + parseFloat(e.amount);
  }
  return Object.entries(map).map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
};

const create = async (payload) => {
  const { data, error } = await supabase.from('expenses').insert([payload]).select('*, employees(name)').single();
  if (error) throw createError(error.message, 500);
  return data;
};

const update = async (id, payload) => {
  const { data, error } = await supabase.from('expenses').update(payload).eq('id', id).select().single();
  if (error) throw createError(error.message, 500);
  return data;
};

const remove = async (id) => {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw createError(error.message, 500);
  return { message: 'Expense deleted' };
};

module.exports = { getAll, getSummaryByCategory, create, update, remove };
