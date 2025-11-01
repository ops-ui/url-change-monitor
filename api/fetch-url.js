/**
 * Vercel Serverless Function to Fetch URLs (CORS Proxy)
 * GET /api/fetch-url?url=<YOUR_URL>
 */

export default async function handler(req, res) {
  // === CORS Headers ===
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;

  // === Validate URL parameter ===
  if (!url) {
    return res.status(400).json({
      error: 'URL parameter is required',
      example: '/api/fetch-url?url=https://example.com/file.txt'
    });
  }

  // === Validate URL format ===
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return res.status(400).json({
      error: 'Invalid URL format. Must start with http:// or https://'
    });
  }

  try {
    // === Fetch the URL ===
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'URL-Monitor/1.0'
      },
      timeout: 10000 // 10 second timeout
    });

    // === Check response status ===
    if (!response.ok) {
      return res.status(response.status).json({
        error: `Server returned status ${response.status}`,
        url: url,
        statusText: response.statusText
      });
    }

    // === Get content as text ===
    const content = await response.text();

    // === Return content ===
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(content);

  } catch (error) {
    // === Handle errors ===
    res.status(500).json({
      error: 'Failed to fetch URL',
      details: error.message,
      url: url
    });
  }
}
