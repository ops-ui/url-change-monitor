/**
 * Vercel Serverless Function to Get Change Logs
 * GET /api/get-logs?days=30
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(__dirname, '../changes.log');

export default async function handler(req, res) {
  // === CORS Headers ===
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { days = 30 } = req.query;
  const daysNum = parseInt(days) || 30;

  try {
    // === Check if log file exists ===
    if (!fs.existsSync(LOG_FILE)) {
      return res.status(200).json({
        logs: [],
        message: 'No logs yet',
        statistics: {
          total_changes: 0,
          total_emails_sent: 0,
          total_emails_failed: 0
        }
      });
    }

    // === Read log file ===
    const fileContent = fs.readFileSync(LOG_FILE, 'utf-8');
    const lines = fileContent.trim().split('\n').filter(line => line.length > 0);

    // === Parse log entries ===
    const logs = [];
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - daysNum * 24 * 60 * 60 * 1000);

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const entryDate = new Date(entry.timestamp);

        // === Only include entries from last N days ===
        if (entryDate >= cutoffDate) {
          logs.push(entry);
        }
      } catch (error) {
        // Skip invalid JSON lines
        console.error('Invalid log entry:', line, error);
      }
    }

    // === Sort by timestamp (newest first) ===
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // === Calculate statistics ===
    const statistics = {
      total_changes: logs.length,
      total_emails_sent: logs.filter(l => l.email_status === 'sent').length,
      total_emails_failed: logs.filter(l => l.email_status === 'failed').length,
      unique_urls: new Set(logs.map(l => l.url)).size,
      date_range: {
        from: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
        to: logs.length > 0 ? logs.timestamp : null
      }
    };

    return res.status(200).json({
      logs,
      statistics,
      count: logs.length,
      message: `Retrieved ${logs.length} log entries from last ${daysNum} days`
    });

  } catch (error) {
    console.error('Error reading logs:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
