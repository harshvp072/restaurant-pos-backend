const supabase = require('../shared/supabaseClient');
const { createError } = require('../shared/errorHandler');

/**
 * Returns date range boundaries based on period string.
 */
const getDateRange = (period = 'today') => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (period) {
    case 'today':
      return { from: toISO(now), to: toISO(now) };
    case 'week': {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 6);
      return { from: toISO(weekAgo), to: toISO(now) };
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toISO(monthStart), to: toISO(now) };
    }
    default:
      return { from: toISO(now), to: toISO(now) };
  }
};

/**
 * KPI summary: total revenue, cogs, profit, order count.
 */
const getSummary = async (period, date_from, date_to) => {
  const range = date_from && date_to ? { from: date_from, to: date_to } : getDateRange(period);

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, total_amount, created_at,
      order_items (
        quantity, unit_price,
        dishes (
          id,
          recipe_ingredients (
            quantity_required,
            raw_materials ( unit_cost )
          )
        )
      )
    `)
    .eq('status', 'completed')
    .gte('created_at', `${range.from}T00:00:00`)
    .lte('created_at', `${range.to}T23:59:59`);

  if (error) throw createError(error.message, 500);

  let totalRevenue = 0;
  let totalCogs = 0;
  let totalDiscounts = 0;
  let totalTax = 0;

  for (const order of orders) {
    totalRevenue   += parseFloat(order.total_amount);
    totalDiscounts += parseFloat(order.discount_amount || 0);
    totalTax       += parseFloat(order.tax_amount || 0);

    for (const item of order.order_items || []) {
      const ingredients = item.dishes?.recipe_ingredients || [];
      for (const ing of ingredients) {
        totalCogs += parseFloat(ing.quantity_required) * parseFloat(ing.raw_materials?.unit_cost || 0) * item.quantity;
      }
    }
  }

  // Fetch expenses for the same period
  const { data: expenseRows } = await supabase
    .from('expenses')
    .select('amount')
    .gte('expense_date', range.from)
    .lte('expense_date', range.to);
  const totalExpenses = (expenseRows || []).reduce((s, e) => s + parseFloat(e.amount), 0);

  // Fetch waste cost for the same period
  const { data: wasteRows } = await supabase
    .from('waste_log')
    .select('waste_cost')
    .gte('created_at', `${range.from}T00:00:00`)
    .lte('created_at', `${range.to}T23:59:59`);
  const totalWasteCost = (wasteRows || []).reduce((s, w) => s + parseFloat(w.waste_cost || 0), 0);

  const grossProfit = totalRevenue - totalCogs;
  const netIncome   = grossProfit - totalExpenses - totalWasteCost;
  const marginPct   = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  return {
    period: range,
    total_orders:    orders.length,
    total_revenue:   parseFloat(totalRevenue.toFixed(2)),
    total_cogs:      parseFloat(totalCogs.toFixed(2)),
    total_discounts: parseFloat(totalDiscounts.toFixed(2)),
    total_tax:       parseFloat(totalTax.toFixed(2)),
    gross_profit:    parseFloat(grossProfit.toFixed(2)),
    total_expenses:  parseFloat(totalExpenses.toFixed(2)),
    total_waste_cost:parseFloat(totalWasteCost.toFixed(2)),
    net_income:      parseFloat(netIncome.toFixed(2)),
    margin_pct:      parseFloat(marginPct.toFixed(2)),
  };
};

/**
 * Time-series data for charts (revenue and COGS by day).
 */
const getChartData = async (period) => {
  const range = getDateRange(period);

  const { data, error } = await supabase
    .from('daily_pnl_view')
    .select('*')
    .gte('sale_date', range.from)
    .lte('sale_date', range.to)
    .order('sale_date', { ascending: true });

  if (error) {
    // Fallback: compute manually from orders
    return [];
  }
  return data;
};

/**
 * Top-selling dishes by revenue and count.
 */
const getTopDishes = async (period) => {
  const range = getDateRange(period);

  const { data: items, error } = await supabase
    .from('order_items')
    .select(`
      quantity, subtotal,
      dishes ( id, name, category ),
      orders!inner ( status, created_at )
    `)
    .eq('orders.status', 'completed')
    .gte('orders.created_at', `${range.from}T00:00:00`)
    .lte('orders.created_at', `${range.to}T23:59:59`);

  if (error) throw createError(error.message, 500);

  // Aggregate by dish
  const dishMap = {};
  for (const item of items || []) {
    const id = item.dishes?.id;
    if (!id) continue;
    if (!dishMap[id]) {
      dishMap[id] = {
        dish_id: id,
        name: item.dishes.name,
        category: item.dishes.category,
        total_quantity: 0,
        total_revenue: 0,
      };
    }
    dishMap[id].total_quantity += item.quantity;
    dishMap[id].total_revenue += parseFloat(item.subtotal);
  }

  return Object.values(dishMap)
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 10);
};

/**
 * Recent orders (last N orders across all statuses).
 */
const getRecentOrders = async (limit = 10) => {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, order_type, table_number, status, total_amount, created_at, employees(name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw createError(error.message, 500);
  return data;
};

module.exports = { getSummary, getChartData, getTopDishes, getRecentOrders };
