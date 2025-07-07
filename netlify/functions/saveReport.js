// netlify/functions/saveReport.js
const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parse the incoming data
    const incomingData = JSON.parse(event.body);
    
    // Simple authentication check
    if (incomingData.auth !== 'secure-submission-token') {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Prepare the data to save (remove auth token)
    const { auth, ...reportData } = incomingData;
    
    // Define the path to the JSON file
    const filePath = path.join(process.cwd(), 'netlify', 'functions', 'maandamanoCheck.json');
    
    // Initialize data array
    let allReports = [];
    
    // Check if file exists and read existing data
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      allReports = JSON.parse(fileData);
    }
    
    // Add new report to the array
    allReports.push(reportData);
    
    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(allReports, null, 2));
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Report saved successfully' })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
    };
  }
};
