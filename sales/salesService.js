const supabase = require('../shared/supabaseClient');
const tablesService = require('../tables/tablesService');
const { createError } = require('../shared/errorHandler');
const { runReorderCheck } = require('../notifications/reorderEngine');

const getOrders = async ({ status, order_type, date_from, date_to, limit = 50 }) => {
  let query = supabase
    .from('orders')
    .select(`
      *,
      employees (id, name, role),
      order_items (
        id, quantity, unit_price, subtotal,
        dishes (id, name, category)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status)     query = query.eq('status', status);
  if (order_type) query = query.eq('order_type', order_type);
  if (date_from)  query = query.gte('created_at', date_from);
  if (date_to)    query = query.lte('created_at', date_to);

  const { data, error } = await query;
  if (error) throw createError(error.message, 500);
  return data;
};

const getOrderById = async (id) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      employees (id, name, role),
      order_items (
        id, quantity, unit_price, subtotal,
        dishes (id, name, category, selling_price)
      )
    `)
    .eq('id', id)
    .single();
  if (error) throw createError('Order not found', 404);
  return data;
};

const createOrder = async ({
  order_type, table_number, employee_id, items,
  discount_type = 'none', discount_value = 0,
  payment_method = 'cash', payment_note,
  notes, customer_name, customer_phone,
  tax_rate = 5,
}) => {
  if (!items || items.length === 0) throw createError('Order must have at least one item', 400);

  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  // Compute discount
  let discount_amount = 0;
  if (discount_type === 'flat')    discount_amount = Math.min(discount_value, subtotal);
  if (discount_type === 'percent') discount_amount = parseFloat(((subtotal * discount_value) / 100).toFixed(2));

  const taxable   = subtotal - discount_amount;
  const tax_amount= parseFloat(((taxable * tax_rate) / 100).toFixed(2));
  const total_amount = parseFloat((taxable + tax_amount).toFixed(2));

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{
      order_type,
      table_number:    table_number || null,
      employee_id:     employee_id  || null,
      total_amount,
      discount_type,
      discount_value:  parseFloat(discount_value),
      discount_amount,
      tax_amount,
      payment_method,
      payment_note:    payment_note  || null,
      notes:           notes         || null,
      customer_name:   customer_name || null,
      customer_phone:  customer_phone|| null,
      status: 'pending',
    }])
    .select()
    .single();

  if (orderError) throw createError(orderError.message, 500);

  const orderItems = items.map((item) => ({
    order_id:   order.id,
    dish_id:    item.dish_id,
    quantity:   item.quantity,
    unit_price: item.unit_price,
    subtotal:   parseFloat((item.unit_price * item.quantity).toFixed(2)),
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) throw createError(itemsError.message, 500);

  // Mark table as occupied (DB trigger handles freeing on completion)
  if (order_type === 'dine_in' && table_number) {
    try { await tablesService.occupyTable(table_number, order.id); } catch (_) {}
  }

  return getOrderById(order.id);
};

const updateOrderStatus = async (id, status) => {
  const VALID = ['pending', 'preparing', 'completed', 'cancelled'];
  if (!VALID.includes(status)) throw createError(`Invalid status. Must be one of: ${VALID.join(', ')}`, 400);

  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw createError(error.message, 500);
  if (!data) throw createError('Order not found', 404);

  // After order completion → run inventory deduction (DB trigger) then check reorder thresholds
  if (status === 'completed') {
    // Fire-and-forget: run asynchronously so it never blocks the HTTP response
    setImmediate(async () => {
      try {
        await runReorderCheck({ triggeredByOrderId: id, triggerType: 'auto' });
      } catch (err) {
        console.error('[SalesService] Reorder check failed after order completion:', err.message);
      }
    });
  }

  return data;
};

const getMenuDishes = async () => {
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('name');
  if (error) throw createError(error.message, 500);
  return data;
};

module.exports = { getOrders, getOrderById, createOrder, updateOrderStatus, getMenuDishes };
