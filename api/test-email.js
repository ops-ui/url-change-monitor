/**
 * Vercel Serverless Function to Test Email Configuration
 * POST /api/test-email
 */

export default async function handler(req, res) {
  // === CORS Headers ===
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, service, api_key, domain } = req.body;

  // === Validate input ===
  if (!email || !service) {
    return res.status(400).json({
      error: 'Email and service are required',
      valid: false
    });
  }

  // === Validate email format ===
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Invalid email address format',
      valid: false
    });
  }

  try {
    let isValid = false;
    let message = '';

    if (service === 'sendgrid') {
      const response = await fetch('https://api.sendgrid.com/v3/user/account', {
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        isValid = true;
        message = 'SendGrid API key is valid!';
      } else {
        message = 'Invalid SendGrid API key. Status: ' + response.status;
      }
    } else if (service === 'mailgun') {
      const response = await fetch('https://api.mailgun.net/v3/domains', {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`api:${api_key}`).toString('base64')
        }
      });

      if (response.ok) {
        isValid = true;
        message = 'Mailgun API key is valid!';
      } else {
        message = 'Invalid Mailgun API key. Status: ' + response.status;
      }
    } else {
      message = 'Unknown email service';
    }

    res.status(200).json({
      valid: isValid,
      message: message,
      service: service,
      email: email
    });

  } catch (error) {
    res.status(500).json({
      valid: false,
      error: error.message
    });
  }
}
