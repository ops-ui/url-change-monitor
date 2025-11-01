/**
 * Vercel Serverless Function to Save Change Logs
 * POST /api/save-log
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

  const {
    timestamp,
    url,
    email,
    lines_added,
    lines_removed,
    diff_preview,
    email_status,
    check_type
  } = req.body;

  // === Validate required fields ===
  if (!timestamp || !url || !email) {
    return res.status(400).json({
      error: 'Missing required fields: timestamp, url, email'
    });
  }

  try {
    // === Create log entry ===
    const logEntry = {
      timestamp,
      url,
      email,
      lines_added: lines_added || 0,
      lines_removed: lines_removed || 0,
      diff_preview: diff_preview || '',
      email_status: email_status || 'pending',
      check_type: check_type || 'manual'
    };

    // === Convert to JSON string ===
    const logLine = JSON.stringify(logEntry) + '\n';

    // === Append to log file ===
    // Note: In Vercel, file system is ephemeral per deployment
    // For production, consider using a database instead
    try {
      fs.appendFileSync(LOG_FILE, logLine);
    } catch (error) {
      // Fil
