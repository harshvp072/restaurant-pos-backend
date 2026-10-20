/**
 * Email Service — Nodemailer-based SMTP mailer.
 * Sends beautifully formatted HTML reorder request emails to suppliers.
 */
const nodemailer = require('nodemailer');

// ── Transporter (singleton) ───────────────────────────────────
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  return _transporter;
}

/**
 * Verify SMTP connection.
 */
async function verifyConnection() {
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ── HTML Email Template ───────────────────────────────────────

function buildReorderEmailHTML({
  restaurantName, restaurantAddress, restaurantPhone, restaurantEmail, restaurantGstin,
  supplierName, contactPerson,
  materials,           // [{ name, unit, currentStock, thresholdValue, quantityRequested, unitCost, estimatedCost }]
  triggerType,         // 'auto' | 'manual'
  orderRef,
  totalEstimatedCost,
  requestDate,
}) {
  const rows = materials.map((m) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-weight:600;color:#1a1a2e">${m.name}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;color:#555;text-align:center">${m.currentStock} ${m.unit}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;color:#e53e3e;text-align:center;font-weight:600">${m.thresholdValue} ${m.unit}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;color:#2d6a4f;font-weight:700;text-align:center">${m.quantityRequested} ${m.unit}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;color:#555">₹${parseFloat(m.unitCost).toFixed(2)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;color:#1a1a2e">₹${parseFloat(m.estimatedCost).toFixed(2)}</td>
    </tr>
  `).join('');

  const triggerBadge = triggerType === 'auto'
    ? `<span style="background:#fff3cd;color:#856404;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600">🤖 Auto-triggered after order completion</span>`
    : `<span style="background:#d1ecf1;color:#0c5460;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600">👤 Manually requested by manager</span>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Reorder Request — ${restaurantName}</title></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f6f8">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
  
  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#ea580c 0%,#c2410c 100%);padding:28px 32px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px">🍽️ ${restaurantName}</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px">${restaurantAddress}</div>
          </td>
          <td style="text-align:right">
            <div style="background:rgba(255,255,255,0.2);border-radius:8px;padding:10px 16px;display:inline-block">
              <div style="color:#fff;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase">REORDER REQUEST</div>
              <div style="color:#fff;font-size:18px;font-weight:800;margin-top:2px">#${orderRef}</div>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:28px 32px">
      
      <!-- Greeting -->
      <p style="font-size:16px;color:#1a1a2e;margin:0 0 6px 0">
        Dear <strong>${contactPerson || supplierName}</strong>,
      </p>
      <p style="font-size:14px;color:#555;margin:0 0 20px 0;line-height:1.6">
        This is an automated procurement request from <strong>${restaurantName}</strong>.
        Our inventory monitoring system has detected that the following raw materials have fallen below
        their minimum threshold levels and require immediate restocking.
      </p>

      <!-- Trigger badge -->
      <div style="margin-bottom:20px">${triggerBadge}</div>

      <!-- Date & Ref -->
      <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8f9fa;border-radius:8px;padding:14px 18px;margin-bottom:24px">
        <tr>
          <td style="font-size:13px;color:#666">Request Date</td>
          <td style="font-size:13px;color:#1a1a2e;font-weight:600;text-align:right">${requestDate}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#666;padding-top:6px">Request Reference</td>
          <td style="font-size:13px;color:#1a1a2e;font-weight:600;text-align:right;padding-top:6px">#${orderRef}</td>
        </tr>
        ${restaurantGstin ? `
        <tr>
          <td style="font-size:13px;color:#666;padding-top:6px">GSTIN</td>
          <td style="font-size:13px;color:#1a1a2e;font-weight:600;text-align:right;padding-top:6px">${restaurantGstin}</td>
        </tr>` : ''}
      </table>

      <!-- Materials table -->
      <h3 style="font-size:15px;font-weight:700;color:#1a1a2e;margin:0 0 12px 0;padding-bottom:8px;border-bottom:2px solid #ea580c">
        📦 Materials Required
      </h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #e8e8e8">
        <thead>
          <tr style="background:#1a1a2e">
            <th style="padding:10px 14px;text-align:left;font-size:12px;color:#aaa;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Material</th>
            <th style="padding:10px 14px;text-align:center;font-size:12px;color:#aaa;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Current Stock</th>
            <th style="padding:10px 14px;text-align:center;font-size:12px;color:#aaa;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Min Level</th>
            <th style="padding:10px 14px;text-align:center;font-size:12px;color:#e47a2e;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Qty Needed</th>
            <th style="padding:10px 14px;text-align:right;font-size:12px;color:#aaa;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Unit Cost</th>
            <th style="padding:10px 14px;text-align:right;font-size:12px;color:#aaa;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Est. Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:#f8f9fa">
            <td colspan="5" style="padding:12px 14px;font-size:14px;font-weight:700;color:#1a1a2e;text-align:right">Total Estimated Cost</td>
            <td style="padding:12px 14px;font-size:16px;font-weight:800;color:#ea580c;text-align:right">₹${parseFloat(totalEstimatedCost).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Action needed -->
      <div style="margin-top:24px;padding:16px 20px;background:#fff8f3;border-left:4px solid #ea580c;border-radius:0 8px 8px 0">
        <p style="font-size:14px;font-weight:700;color:#1a1a2e;margin:0 0 6px 0">⚡ Action Required</p>
        <p style="font-size:13px;color:#555;margin:0;line-height:1.6">
          Kindly acknowledge this request and confirm expected delivery date. 
          Please reply to this email or contact us at 
          <a href="tel:${restaurantPhone}" style="color:#ea580c;text-decoration:none">${restaurantPhone}</a> or
          <a href="mailto:${restaurantEmail}" style="color:#ea580c;text-decoration:none">${restaurantEmail}</a>.
        </p>
      </div>

    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f8f9fa;padding:18px 32px;border-top:1px solid #eee">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:12px;color:#999">
            ${restaurantName} • ${restaurantAddress}<br>
            ${restaurantPhone} • ${restaurantEmail}
          </td>
          <td style="text-align:right;font-size:11px;color:#bbb">
            Powered by RestoPOS<br>
            Auto-generated on ${requestDate}
          </td>
        </tr>
      </table>
    </td>
  </tr>

</table>
</body>
</html>`;
}

// ── Plain-text fallback ───────────────────────────────────────

function buildReorderEmailText({ restaurantName, supplierName, materials, orderRef, requestDate, totalEstimatedCost }) {
  const lines = materials.map((m) =>
    `  • ${m.name}: Need ${m.quantityRequested} ${m.unit} (current: ${m.currentStock}, min: ${m.thresholdValue}) — Est. ₹${parseFloat(m.estimatedCost).toFixed(2)}`
  ).join('\n');

  return `
REORDER REQUEST #${orderRef}
From: ${restaurantName}
Date: ${requestDate}
To: ${supplierName}

The following items need restocking:
${lines}

Total Estimated Cost: ₹${parseFloat(totalEstimatedCost).toFixed(2)}

Please acknowledge and confirm delivery date.
`.trim();
}

// ── Main send function ────────────────────────────────────────

/**
 * Send a reorder request email to a supplier.
 * Returns { success, messageId, error }.
 */
async function sendReorderEmail({
  toEmail,
  supplierName,
  contactPerson,
  materials,
  triggerType = 'auto',
  orderRef,
  triggeredByOrderNumber,
}) {
  const restaurantName    = process.env.RESTAURANT_NAME    || 'RestoPOS Restaurant';
  const restaurantEmail   = process.env.RESTAURANT_EMAIL   || process.env.SMTP_USER || '';
  const restaurantPhone   = process.env.RESTAURANT_PHONE   || '';
  const restaurantAddress = process.env.RESTAURANT_ADDRESS || '';
  const restaurantGstin   = process.env.RESTAURANT_GSTIN   || '';

  const requestDate = new Date().toLocaleString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const totalEstimatedCost = materials.reduce((s, m) => s + parseFloat(m.estimatedCost || 0), 0);

  const subject = `[Reorder Request #${orderRef}] ${materials.length} item${materials.length > 1 ? 's' : ''} needed — ${restaurantName}`;

  const html = buildReorderEmailHTML({
    restaurantName, restaurantAddress, restaurantPhone, restaurantEmail, restaurantGstin,
    supplierName, contactPerson,
    materials, triggerType, orderRef,
    totalEstimatedCost, requestDate,
  });

  const text = buildReorderEmailText({
    restaurantName, supplierName, materials, orderRef, requestDate, totalEstimatedCost,
  });

  try {
    const info = await getTransporter().sendMail({
      from:    `"${restaurantName}" <${restaurantEmail}>`,
      to:      toEmail,
      replyTo: restaurantEmail,
      subject,
      html,
      text,
    });

    console.log(`[Email] Reorder sent to ${toEmail} — MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId, subject };
  } catch (err) {
    console.error(`[Email] Failed to send reorder to ${toEmail}:`, err.message);
    return { success: false, error: err.message, subject };
  }
}

module.exports = { sendReorderEmail, verifyConnection };
