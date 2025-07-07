const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/maandamanoCheck.json');

// Load data file
function loadData() {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (err) {
        console.error('Error loading data file:', err);
        return { reports: [], stats: {} };
    }
}

// Save data back to file
function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error('Error saving data file:', err);
        return false;
    }
}

// Calculate and update statistics
function updateStatistics() {
    const data = loadData();
    const reports = data.reports || [];
    
    // Get unique counties
    const counties = [...new Set(reports.map(r => r.county))];
    
    // Get unique constituencies
    const constituencies = [...new Set(reports.map(r => r.constituency))];
    
    // Get active protests
    const activeProtests = [...new Set(reports.map(r => r.protest))];
    
    // Calculate county hotspots
    const countyData = {};
    
    reports.forEach(report => {
        if (!countyData[report.county]) {
            countyData[report.county] = {
                reports: 0,
                constituencies: new Set(),
                latestTimestamp: report.timestamp
            };
        }
        
        countyData[report.county].reports++;
        countyData[report.county].constituencies.add(report.constituency);
        
        if (new Date(report.timestamp) > new Date(countyData[report.county].latestTimestamp)) {
            countyData[report.county].latestTimestamp = report.timestamp;
        }
    });
    
    // Prepare hotspots data
    const hotspots = Object.entries(countyData)
        .map(([county, data]) => ({
            county,
            reports: data.reports,
            constituencies: data.constituencies.size,
            latest: data.latestTimestamp
        }))
        .sort((a, b) => b.reports - a.reports)
        .slice(0, 10); // Top 10 hotspots
    
    // Update stats
    data.stats = {
        lastUpdated: new Date().toISOString(),
        totalReports: reports.length,
        activeProtests: activeProtests,
        participatingCounties: counties.length,
        participatingConstituencies: constituencies.length,
        hotspots: hotspots,
        countyBreakdown: counties.map(county => ({
            name: county,
            reports: countyData[county]?.reports || 0,
            constituencies: countyData[county]?.constituencies.size || 0
        }))
    };
    
    // Save updated data
    if (saveData(data)) {
        console.log('Statistics updated successfully');
        console.log(`- Total reports: ${data.stats.totalReports}`);
        console.log(`- Participating counties: ${data.stats.participatingCounties}/47`);
        console.log(`- Participating constituencies: ${data.stats.participatingConstituencies}/290`);
    } else {
        console.error('Failed to update statistics');
    }
}

// Run the update
updateStatistics();

// Export for use in server.js if needed
module.exports = {
    updateStatistics
};