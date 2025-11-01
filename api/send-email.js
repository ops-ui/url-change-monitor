/**
 * Vercel Serverless Function to Send Email Notifications
 * POST /api/send-email
 */

export default async function handler(req, res) {
  // === CORS Headers ===
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    email,
    url,
    lines_added,
    lines_removed,
    diff_preview,
    timestamp,
    service,
    api_key,
    domain,
    smtp_server,
    smtp_port,
    smtp_email,
    smtp_password
  } = req.body;

  // === Validate required fields ===
  if (!email || !url || !service) {
    return res.status(400).json({
      error: 'Email, URL, and service are required'
    });
  }

  // === Validate email format ===
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Invalid email address'
    });
  }

  try {
    let result;

    if (service === 'sendgrid') {
      result = await sendViasendGrid(email, url, lines_added, lines_removed, diff_preview, timestamp, api_key);
    } else if (service === 'mailgun') {
      result = await sendViaMailgun(email, url, lines_added, lines_removed, diff_preview, timestamp, api_key, domain);
    } else if (service === 'smtp') {
      result = await sendViaSMTP(email, url, lines_added, lines_removed, diff_preview, timestamp, smtp_server, smtp_port, smtp_email, smtp_password);
    } else {
      return res.status(400).json({
        error: 'Unknown email service'
      });
    }

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        service: service
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// === SendGrid Email Function ===
async function sendViasentGrid(email, url, lines_added, lines_removed, diff_preview, timestamp, api_key) {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: email }],
        }],
        from: { email: 'notifications@urlmonitor.vercel.app', name: 'URL Monitor' },
        subject: `URL Change Detected: ${new URL(url).hostname}`,
        content: [{
          type: 'text/html',
          value: generateEmailHTML(url, lines_added, lines_removed, diff_preview, timestamp)
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// === Mailgun Email Function ===
async function sendViaMailgun(email, url, lines_added, lines_removed, diff_preview, timestamp, api_key, domain) {
  try {
    const formData = new URLSearchParams();
    formData.append('from', `URL Monitor <noreply@${domain}>`);
    formData.append('to', email);
    formData.append('subject', `URL Change Detected: ${new URL(url).hostname}`);
    formData.append('html', generateEmailHTML(url, lines_added, lines_removed, diff_preview, timestamp));

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`api:${api_key}`).toString('base64'),
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mailgun API error: ${response.status} - ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// === SMTP Email Function (Generic) ===
async function sendViaSMTP(email, url, lines_added, lines_removed, diff_preview, timestamp, smtp_server, smtp_port, smtp_email, smtp_password) {
  try {
    // Note: Sending via generic SMTP from Vercel is limited
    // This is a simplified version. For production, use a library like nodemailer
    // with custom build configuration
    
    return {
      success: false,
      error: 'SMTP sending requires additional setup. Use SendGrid or Mailgun for easier setup.'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// === Generate Email HTML ===
function generateEmailHTML(url, lines_added, lines_removed, diff_preview, timestamp) {
  const total_changes = (lines_added || 0) + (lines_removed || 0);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .header h2 { margin: 0; color: #d9534f; }
        .details { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #5cb85c; margin-bottom: 20px; }
        .details p { margin: 8px 0; }
        .stats { display: flex; gap: 20px; margin: 15px 0; }
        .stat { flex: 1; padding: 10px; background-color: #f0f0f0; border-radius: 5px; text-align: center; }
        .stat-number { font-size: 24px; font-weight: bold; }
        .stat-label { color: #666; font-size: 12px; text-transform: uppercase; }
        .added { color: #28a745; }
        .removed { color: #dc3545; }
        .diff-preview { background-color: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px; max-height: 300px; overflow: auto; }
        .footer { color: #999; font-size: 12px; margin-top: 30px; text-align: center; }
        a { color: #007bff; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🔔 URL Change Detected!</h2>
        </div>

        <div class="details">
          <p><strong>URL:</strong><br/><a href="${url}">${url}</a></p>
          <p><strong>Detected at:</strong><br/>${new Date(timestamp).toLocaleString()}</p>
        </div>

        <div class="stats">
          <div class="stat">
            <div class="stat-number added">+${lines_added || 0}</div>
            <div class="stat-label">Lines Added</div>
          </div>
          <div class="stat">
            <div class="stat-number removed">-${lines_removed || 0}</div>
            <div class="stat-label">Lines Removed</div>
          </div>
          <div class="stat">
            <div class="stat-number">${total_changes}</div>
            <div class="stat-label">Total Changes</div>
          </div>
        </div>

        ${diff_preview ? `
          <div style="margin-bottom: 20px;">
            <p><strong>Change Preview:</strong></p>
            <div class="diff-preview">${escapeHtml(diff_preview)}</div>
          </div>
        ` : ''}

        <div class="footer">
          <p>This is an automated message from URL Monitor.<br/>
          View the full diff in your URL Monitor application.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// === Escape HTML for safe display ===
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
