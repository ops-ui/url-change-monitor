/**
 * Vercel Serverless Function to Clear Old Logs
 * POST /api/clear-old-logs
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { days = 30 } = req.body;
  const daysNum = parseInt(days) || 30;

  try {
    // === Check if log file exists ===
    if (!fs.existsSync(LOG_FILE)) {
      return res.status(200).json({
        success: true,
        message: 'No logs to clear',
        removed: 0
      });
    }

    // === Read log file ===
    const fileContent = fs.readFileSync(LOG_FILE, 'utf-8');
    const lines = fileContent.trim().split('\n').filter(line => line.length > 0);

    // === Filter out old entries ===
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - daysNum * 24 * 60 * 60 * 1000);

    const newLines = [];
    let removedCount = 0;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const entryDate = new Date(entry.timestamp);

        // === Keep entries from last N days ===
        if (entryDate >= cutoffDate) {
          newLines.push(line);
        } else {
          removedCount++;
        }
      } catch (error) {
        // Keep invalid lines (don't remove them)
        newLines.push(line);
      }
    }

    // === Write filtered logs back ===
    if (newLines.length > 0) {
      fs.writeFileSync(LOG_FILE, newLines.join('\n') + '\n');
    } else {
      fs.writeFileSync(LOG_FILE, '');
    }

    return res.status(200).json({
      success: true,
      message: `Cleared ${removedCount} old log entries`,
      removed: removedCount,
      remaining: newLines.length
    });

  } catch (error) {
    console.error('Error clearing logs:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
