const express = require('express');
const serverless = require('serverless-http');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_FILE = path.join(__dirname, 'maandamanoCheck.json');

// Middleware
app.use(express.json());

// Load data helper
function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// API Routes
app.post('/api/report', (req, res) => {
  const data = loadData();
  data.reports.push(req.body);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
  res.json({ success: true });
});

app.get('/api/stats', (req, res) => {
  const data = loadData();
  res.json(data.stats);
});

// Netlify requires this export
module.exports.handler = serverless(app);