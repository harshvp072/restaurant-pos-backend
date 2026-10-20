const supabase = require('../shared/supabaseClient');
const bcrypt = require('bcryptjs');
const { createError } = require('../shared/errorHandler');

const SALT_ROUNDS = 10;

const getAllEmployees = async () => {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, role, phone, created_at') // never return pin_code
    .order('created_at', { ascending: false });

  if (error) throw createError(error.message, 500);
  return data;
};

const getEmployeeById = async (id) => {
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, role, phone, created_at')
    .eq('id', id)
    .single();

  if (error) throw createError('Employee not found', 404);
  return data;
};

const createEmployee = async ({ name, role, pin_code, phone }) => {
  // Hash the PIN before storing
  const hashedPin = await bcrypt.hash(String(pin_code), SALT_ROUNDS);

  const { data, error } = await supabase
    .from('employees')
    .insert([{ name: name.trim(), role, pin_code: hashedPin, phone }])
    .select('id, name, role, phone, created_at')
    .single();

  if (error) {
    if (error.code === '23505') throw createError('PIN code is already in use', 409);
    throw createError(error.message, 500);
  }
  return data;
};

const updateEmployee = async (id, { name, role, phone, pin_code }) => {
  const updates = {};
  if (name)     updates.name  = name.trim();
  if (role)     updates.role  = role;
  if (phone)    updates.phone = phone;
  if (pin_code) updates.pin_code = await bcrypt.hash(String(pin_code), SALT_ROUNDS);

  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select('id, name, role, phone, created_at')
    .single();

  if (error) throw createError(error.message, 500);
  if (!data) throw createError('Employee not found', 404);
  return data;
};

const deleteEmployee = async (id) => {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);

  if (error) throw createError(error.message, 500);
  return { message: 'Employee deleted successfully' };
};

/**
 * Verify a PIN code against stored hash.
 * Returns the employee record (without pin_code) if valid.
 */
const verifyPin = async (pin_code) => {
  // Fetch all employees with their hashed pins for comparison
  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, name, role, phone, pin_code, created_at');

  if (error) throw createError(error.message, 500);

  for (const employee of employees) {
    const match = await bcrypt.compare(String(pin_code), employee.pin_code);
    if (match) {
      const { pin_code: _, ...safeEmployee } = employee;
      return safeEmployee;
    }
  }

  throw createError('Invalid PIN code', 401);
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  verifyPin,
};
