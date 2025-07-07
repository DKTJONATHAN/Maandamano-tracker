const { json } = require('@netlify/functions');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'maandamanoCheck.json');

// Initialize JSON file if doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    reports: [],
    stats: {
      totalReports: 0,
      counties: [],
      constituencies: [],
      protests: [],
      hotspots: []
    }
  }));
}

// Helper to read data
function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

// Helper to save data
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Update statistics
function updateStats(data) {
  const reports = data.reports;
  
  const counties = [...new Set(reports.map(r => r.county))];
  const constituencies = [...new Set(reports.map(r => r.constituency))];
  const protests = [...new Set(reports.map(r => r.protest))];
  
  // Calculate hotspots (top 5 counties by report count)
  const countyMap = {};
  reports.forEach(report => {
    countyMap[report.county] = (countyMap[report.county] || 0) + 1;
  });
  
  const hotspots = Object.entries(countyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([county, reports]) => ({
      county,
      reports,
      latest: reports[0]?.timestamp || new Date().toISOString()
    }));

  data.stats = {
    totalReports: reports.length,
    counties: counties,
    constituencies: constituencies,
    protests: protests,
    hotspots: hotspots
  };
  
  saveData(data);
}

// API Handler
exports.handler = async (event, context) => {
  const data = readData();
  
  // Handle POST request (form submission)
  if (event.httpMethod === 'POST') {
    const newReport = JSON.parse(event.body);
    newReport.timestamp = new Date().toISOString();
    data.reports.push(newReport);
    updateStats(data);
    
    return json({
      status: 'success',
      reportId: newReport.timestamp
    });
  }
  
  // Handle GET request (stats retrieval)
  if (event.httpMethod === 'GET') {
    return json(data.stats);
  }

  return json({ error: 'Method not allowed' }, { status: 405 });
};