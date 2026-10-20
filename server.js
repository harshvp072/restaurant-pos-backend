require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { errorHandler } = require('./shared/errorHandler');

// Domain Routers
const inventoryRouter  = require('./inventory/inventoryRouter');
const salesRouter      = require('./sales/salesRouter');
const employeesRouter  = require('./employees/employeesRouter');
const recipesRouter    = require('./recipes/recipesRouter');
const dashboardRouter  = require('./dashboard/dashboardRouter');
const expensesRouter   = require('./expenses/expensesRouter');
const wasteRouter      = require('./waste/wasteRouter');
const tablesRouter     = require('./tables/tablesRouter');
const reportsRouter    = require('./reports/reportsRouter');
const suppliersRouter  = require('./suppliers/suppliersRouter');
const notificationsRouter = require('./notifications/notificationsRouter');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────
// Support multiple CORS origins (comma-separated in FRONTEND_URL)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Render health checks, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Health Check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Restaurant POS API',
  });
});

// ── Domain Routes (Modular mounting) ─────────────────────────
app.use('/api/inventory',  inventoryRouter);
app.use('/api/sales',      salesRouter);
app.use('/api/employees',  employeesRouter);
app.use('/api/recipes',    recipesRouter);
app.use('/api/dashboard',  dashboardRouter);
app.use('/api/expenses',       expensesRouter);
app.use('/api/waste',          wasteRouter);
app.use('/api/tables',         tablesRouter);
app.use('/api/reports',        reportsRouter);
app.use('/api/suppliers',      suppliersRouter);
app.use('/api/notifications',  notificationsRouter);

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.path} not found` });
});

// ── Global Error Handler ──────────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Restaurant POS API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
