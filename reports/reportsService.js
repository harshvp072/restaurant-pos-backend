const supabase = require('../shared/supabaseClient');
const { createError } = require('../shared/errorHandler');

// ── helpers ──────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const getRange = (period, from, to) => {
  if (from && to) return { from, to };
  const now = new Date();
  if (period === 'today')  return { from: toISO(now), to: toISO(now) };
  if (period === 'week')   { const d = new Date(now); d.setDate(now.getDate()-6); return { from: toISO(d), to: toISO(now) }; }
  if (period === 'month')  return { from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISO(now) };
  if (period === 'year')   return { from: toISO(new Date(now.getFullYear(), 0, 1)), to: toISO(now) };
  return { from: toISO(now), to: toISO(now) };
};

// ── Sales Report ──────────────────────────────────────────────

const getSalesReport = async (period, date_from, date_to) => {
  const range = getRange(period, date_from, date_to);
  const { data, error } = await supabase
    .from('orders')
    .select(`
      order_number, order_type, table_number, status,
      total_amount, discount_amount, tax_amount, payment_method,
      customer_name, notes, created_at,
      employees(name),
      order_items(quantity, unit_price, subtotal, dishes(name))
    `)
    .eq('status', 'completed')
    .gte('created_at', `${range.from}T00:00:00`)
    .lte('created_at', `${range.to}T23:59:59`)
    .order('created_at', { ascending: false });

  if (error) throw createError(error.message, 500);
  return { data, range };
};

// ── Expense Report ────────────────────────────────────────────

const getExpenseReport = async (period, date_from, date_to) => {
  const range = getRange(period, date_from, date_to);
  const { data, error } = await supabase
    .from('expenses')
    .select('title, category, amount, expense_date, paid_to, payment_method, notes, employees(name)')
    .gte('expense_date', range.from)
    .lte('expense_date', range.to)
    .order('expense_date', { ascending: false });
  if (error) throw createError(error.message, 500);
  return { data, range };
};

// ── Inventory Valuation Report ────────────────────────────────

const getInventoryReport = async () => {
  const { data, error } = await supabase
    .from('raw_materials')
    .select('name, category, unit_of_measurement, current_stock, unit_cost, min_threshold_alert, updated_at')
    .order('category')
    .order('name');
  if (error) throw createError(error.message, 500);
  const totalValue = data.reduce((s, m) => s + parseFloat(m.current_stock) * parseFloat(m.unit_cost), 0);
  return { data, total_inventory_value: parseFloat(totalValue.toFixed(2)) };
};

// ── Waste Report ──────────────────────────────────────────────

const getWasteReport = async (period, date_from, date_to) => {
  const range = getRange(period, date_from, date_to);
  const { data, error } = await supabase
    .from('waste_log')
    .select('reason, notes, quantity_wasted, waste_cost, created_at, raw_materials(name, unit_of_measurement)')
    .gte('created_at', `${range.from}T00:00:00`)
    .lte('created_at', `${range.to}T23:59:59`)
    .order('created_at', { ascending: false });
  if (error) throw createError(error.message, 500);
  const totalWasteCost = data.reduce((s, w) => s + parseFloat(w.waste_cost || 0), 0);
  return { data, total_waste_cost: parseFloat(totalWasteCost.toFixed(2)), range };
};

// ── CSV serializer ────────────────────────────────────────────

const toCSV = (rows, columns) => {
  const escape = (val) => {
    if (val == null) return '';
    const s = String(val).replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };
  const header = columns.map((c) => c.label).join(',');
  const lines  = rows.map((row) => columns.map((c) => escape(c.get(row))).join(','));
  return [header, ...lines].join('\r\n');
};

const buildSalesCSV = (rows) => toCSV(rows, [
  { label: 'Order #',          get: (r) => r.order_number },
  { label: 'Date',             get: (r) => r.created_at?.split('T')[0] },
  { label: 'Type',             get: (r) => r.order_type },
  { label: 'Table',            get: (r) => r.table_number || '' },
  { label: 'Customer',         get: (r) => r.customer_name || '' },
  { label: 'Items',            get: (r) => r.order_items?.map((i) => `${i.dishes?.name}×${i.quantity}`).join('; ') },
  { label: 'Subtotal (₹)',     get: (r) => (parseFloat(r.total_amount) - parseFloat(r.tax_amount||0) + parseFloat(r.discount_amount||0)).toFixed(2) },
  { label: 'Discount (₹)',     get: (r) => parseFloat(r.discount_amount||0).toFixed(2) },
  { label: 'Tax (₹)',          get: (r) => parseFloat(r.tax_amount||0).toFixed(2) },
  { label: 'Total (₹)',        get: (r) => parseFloat(r.total_amount).toFixed(2) },
  { label: 'Payment',          get: (r) => r.payment_method },
  { label: 'Staff',            get: (r) => r.employees?.name || '' },
]);

const buildExpenseCSV = (rows) => toCSV(rows, [
  { label: 'Date',             get: (r) => r.expense_date },
  { label: 'Title',            get: (r) => r.title },
  { label: 'Category',         get: (r) => r.category },
  { label: 'Amount (₹)',       get: (r) => parseFloat(r.amount).toFixed(2) },
  { label: 'Paid To',          get: (r) => r.paid_to || '' },
  { label: 'Payment Method',   get: (r) => r.payment_method },
  { label: 'Added By',         get: (r) => r.employees?.name || '' },
  { label: 'Notes',            get: (r) => r.notes || '' },
]);

const buildInventoryCSV = (rows) => toCSV(rows, [
  { label: 'Material',         get: (r) => r.name },
  { label: 'Category',         get: (r) => r.category },
  { label: 'Unit',             get: (r) => r.unit_of_measurement },
  { label: 'Stock',            get: (r) => r.current_stock },
  { label: 'Min Threshold',    get: (r) => r.min_threshold_alert },
  { label: 'Unit Cost (₹)',    get: (r) => parseFloat(r.unit_cost).toFixed(2) },
  { label: 'Stock Value (₹)',  get: (r) => (parseFloat(r.current_stock) * parseFloat(r.unit_cost)).toFixed(2) },
  { label: 'Status',           get: (r) => r.current_stock <= r.min_threshold_alert ? 'Low Stock' : 'OK' },
  { label: 'Last Updated',     get: (r) => r.updated_at?.split('T')[0] },
]);

const buildWasteCSV = (rows) => toCSV(rows, [
  { label: 'Date',             get: (r) => r.created_at?.split('T')[0] },
  { label: 'Material',         get: (r) => r.raw_materials?.name },
  { label: 'Qty Wasted',       get: (r) => r.quantity_wasted },
  { label: 'Unit',             get: (r) => r.raw_materials?.unit_of_measurement },
  { label: 'Reason',           get: (r) => r.reason },
  { label: 'Waste Cost (₹)',   get: (r) => parseFloat(r.waste_cost||0).toFixed(2) },
  { label: 'Notes',            get: (r) => r.notes || '' },
]);

module.exports = {
  getSalesReport, getExpenseReport, getInventoryReport, getWasteReport,
  buildSalesCSV, buildExpenseCSV, buildInventoryCSV, buildWasteCSV,
};
