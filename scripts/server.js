const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'maandamanoCheck.json');

app.use(bodyParser.json());
app.use(express.static('public'));

// Helper function to read data
function readData() {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (err) {
        console.error('Error reading data file:', err);
        return { reports: [], stats: {} };
    }
}

// Helper function to write data
function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error('Error writing data file:', err);
        return false;
    }
}

// API endpoint to submit reports
app.post('/api/report', (req, res) => {
    const report = req.body;
    report.id = Math.random().toString(36).substring(2, 10);
    report.timestamp = new Date().toISOString();
    
    const data = readData();
    data.reports.push(report);
    
    // Update stats
    updateStats(data);
    
    if (writeData(data)) {
        res.status(201).json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to save report' });
    }
});

// API endpoint to get stats
app.get('/api/stats', (req, res) => {
    const data = readData();
    res.json(data.stats);
});

// Function to update statistics
function updateStats(data) {
    const reports = data.reports;
    
    // Get unique counties
    const counties = [...new Set(reports.map(r => r.county))];
    
    // Get unique constituencies
    const constituencies = [...new Set(reports.map(r => r.constituency))];
    
    // Get active protests
    const activeProtests = [...new Set(reports.map(r => r.protest))];
    
    // Calculate hotspots
    const countyReports = {};
    reports.forEach(report => {
        if (!countyReports[report.county]) {
            countyReports[report.county] = {
                reports: 0,
                constituencies: new Set(),
                latest: report.timestamp
            };
        }
        countyReports[report.county].reports++;
        countyReports[report.county].constituencies.add(report.constituency);
        if (new Date(report.timestamp) > new Date(countyReports[report.county].latest)) {
            countyReports[report.county].latest = report.timestamp;
        }
    });
    
    const hotspots = Object.entries(countyReports)
        .map(([county, data]) => ({
            county,
            reports: data.reports,
            constituencies: data.constituencies.size,
            latest: data.latest
        }))
        .sort((a, b) => b.reports - a.reports)
        .slice(0, 5);
    
    // Update stats
    data.stats = {
        totalReports: reports.length,
        activeProtests,
        counties,
        totalConstituencies: constituencies.length,
        hotspots
    };
    
    writeData(data);
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});