const supabase = require('../shared/supabaseClient');
const { createError } = require('../shared/errorHandler');

const getAllMaterials = async (category) => {
  let query = supabase
    .from('raw_materials')
    .select('*, suppliers(id, name, email, phone, contact_person)')
    .order('name', { ascending: true });

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw createError(error.message, 500);
  return data;
};

const getMaterialById = async (id) => {
  const { data, error } = await supabase
    .from('raw_materials')
    .select('*, suppliers(id, name, email, phone, contact_person)')
    .eq('id', id)
    .single();

  if (error) throw createError('Raw material not found', 404);
  return data;
};

const createMaterial = async (payload) => {
  const { data, error } = await supabase
    .from('raw_materials')
    .insert([payload])
    .select('*, suppliers(id, name, email)')
    .single();

  if (error) {
    if (error.code === '23505') throw createError('A material with that name already exists', 409);
    throw createError(error.message, 500);
  }
  return data;
};

const updateMaterial = async (id, payload) => {
  const { data, error } = await supabase
    .from('raw_materials')
    .update(payload)
    .eq('id', id)
    .select('*, suppliers(id, name, email)')
    .single();

  if (error) throw createError(error.message, 500);
  if (!data) throw createError('Raw material not found', 404);
  return data;
};

const deleteMaterial = async (id) => {
  const { error } = await supabase
    .from('raw_materials')
    .delete()
    .eq('id', id);

  if (error) {
    if (error.code === '23503') {
      throw createError(
        'Cannot delete: this material is referenced in one or more recipes. Remove it from all recipes first.',
        409
      );
    }
    throw createError(error.message, 500);
  }
  return { message: 'Raw material deleted successfully' };
};

/**
 * Get all materials below their minimum threshold.
 * Uses supplier_inventory_view if available, falls back to direct query.
 */
const getLowStockAlerts = async () => {
  // Try the supplier_inventory_view first (richer data)
  const { data: viewData, error: viewError } = await supabase
    .from('supplier_inventory_view')
    .select('*')
    .in('stock_status', ['low_stock', 'out_of_stock'])
    .order('stock_pct_of_threshold', { ascending: true });

  if (!viewError && viewData) return viewData;

  // Fallback: direct query with client-side filter
  const { data, error } = await supabase
    .from('raw_materials')
    .select('*, suppliers(id, name, email, phone)');

  if (error) throw createError(error.message, 500);
  return data.filter((m) => parseFloat(m.current_stock) <= parseFloat(m.min_threshold_alert));
};

const adjustStock = async (id, adjustment) => {
  const material = await getMaterialById(id);
  const newStock = Math.max(0, parseFloat(material.current_stock) + adjustment);
  return updateMaterial(id, { current_stock: newStock });
};

module.exports = {
  getAllMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getLowStockAlerts,
  adjustStock,
};
