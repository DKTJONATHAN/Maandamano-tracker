const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parse incoming data
    const data = JSON.parse(event.body);

    // Simple authentication check
    if (data.auth !== 'secure-submission-token') {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Remove auth token before saving
    delete data.auth;

    // Path to our JSON file
    const filePath = path.join(process.cwd(), 'netlify', 'functions', 'maandamanoCheck.json');
    
    // Read existing data or initialize empty array
    let existingData = [];
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        existingData = JSON.parse(fileContent);
      }
    } catch (readError) {
      console.error('Error reading JSON file:', readError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error reading existing data' })
      };
    }

    // Add new data
    existingData.push(data);

    // Write back to file with error handling
    try {
      fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf8');
    } catch (writeError) {
      console.error('Error writing to JSON file:', writeError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error saving data' })
      };
    }

    // Success response
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Report saved successfully',
        savedData: data
      })
    };

  } catch (error) {
    console.error('Processing error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        details: error.message 
      })
    };
  }
};
