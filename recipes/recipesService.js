const supabase = require('../shared/supabaseClient');
const { createError } = require('../shared/errorHandler');

// ── Dishes ────────────────────────────────────────────────────

const getAllDishes = async () => {
  // Join with the cogs view for live margin data
  const { data, error } = await supabase
    .from('dish_cogs_view')
    .select('*')
    .order('dish_name', { ascending: true });

  if (error) {
    // Fallback if view not yet created
    const { data: fallback, error: fe } = await supabase
      .from('dishes')
      .select('*')
      .order('name');
    if (fe) throw createError(fe.message, 500);
    return fallback;
  }
  return data;
};

const getDishById = async (id) => {
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw createError('Dish not found', 404);
  return data;
};

const createDish = async (payload) => {
  const { data, error } = await supabase
    .from('dishes')
    .insert([payload])
    .select()
    .single();

  if (error) throw createError(error.message, 500);
  return data;
};

const updateDish = async (id, payload) => {
  const { data, error } = await supabase
    .from('dishes')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw createError(error.message, 500);
  if (!data) throw createError('Dish not found', 404);
  return data;
};

const deleteDish = async (id) => {
  const { error } = await supabase.from('dishes').delete().eq('id', id);
  if (error) throw createError(error.message, 500);
  return { message: 'Dish deleted' };
};

// ── BOM (Recipe Ingredients) ──────────────────────────────────

const getBOM = async (dishId) => {
  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select(`
      id,
      quantity_required,
      raw_materials (
        id, name, unit_of_measurement, unit_cost, current_stock
      )
    `)
    .eq('dish_id', dishId);

  if (error) throw createError(error.message, 500);

  // Compute line-level cost
  return data.map((item) => ({
    id: item.id,
    raw_material_id: item.raw_materials.id,
    name: item.raw_materials.name,
    unit: item.raw_materials.unit_of_measurement,
    unit_cost: item.raw_materials.unit_cost,
    quantity_required: item.quantity_required,
    line_cost: parseFloat((item.quantity_required * item.raw_materials.unit_cost).toFixed(2)),
    current_stock: item.raw_materials.current_stock,
  }));
};

/**
 * Replace the BOM for a dish entirely (upsert pattern).
 * ingredients: [{ raw_material_id, quantity_required }]
 */
const setBOM = async (dishId, ingredients) => {
  // Delete existing BOM entries for this dish
  await supabase.from('recipe_ingredients').delete().eq('dish_id', dishId);

  if (!ingredients || ingredients.length === 0) return [];

  const rows = ingredients.map((ing) => ({
    dish_id: dishId,
    raw_material_id: ing.raw_material_id,
    quantity_required: ing.quantity_required,
  }));

  const { data, error } = await supabase
    .from('recipe_ingredients')
    .insert(rows)
    .select();

  if (error) throw createError(error.message, 500);
  return data;
};

// ── COGS Report ───────────────────────────────────────────────

const getCogsReport = async () => {
  const { data, error } = await supabase
    .from('dish_cogs_view')
    .select('*')
    .order('margin_pct', { ascending: true });

  if (error) throw createError(error.message, 500);
  return data;
};

module.exports = {
  getAllDishes,
  getDishById,
  createDish,
  updateDish,
  deleteDish,
  getBOM,
  setBOM,
  getCogsReport,
};
