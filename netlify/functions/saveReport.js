const { Octokit } = require('@octokit/rest');

exports.handler = async (event) => {
  // Handle CORS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST'
      },
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Validate environment variables
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
      throw new Error('Server configuration error');
    }

    const reportData = JSON.parse(event.body);

    // Validate and sanitize input
    const requiredFields = ['protest', 'county', 'constituency', 'town'];
    for (const field of requiredFields) {
      if (!reportData[field] || typeof reportData[field] !== 'string') {
        throw new Error(`Invalid ${field} provided`);
      }
      // Basic sanitization
      reportData[field] = reportData[field]
        .replace(/<[^>]*>?/gm, '') // Remove HTML tags
        .substring(0, 100); // Limit length
    }

    // Initialize GitHub API
    const octokit = new Octokit({ 
      auth: process.env.GITHUB_TOKEN,
      userAgent: 'MaandamanoTracker/v1.0'
    });

    const [owner, repo] = process.env.GITHUB_REPO.split('/');
    const filePath = 'data/maandamanoCheck.json';
    let currentSha = null;
    let currentContent = [];

    // Fetch existing data
    try {
      const { data } = await octokit.repos.getContent({ 
        owner, 
        repo, 
        path: filePath 
      });
      currentSha = data.sha;
      currentContent = JSON.parse(Buffer.from(data.content, 'base64').toString());
      
      // Prevent overly large datasets
      if (currentContent.length > 5000) {
        throw new Error('Dataset too large');
      }
    } catch (error) {
      if (error.status !== 404) throw error; // Ignore "file not found"
    }

    // Add new report
    currentContent.push({
      ...reportData,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ip: event.headers['client-ip'] || null
    });

    // Push to GitHub
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `New report: ${reportData.protest} in ${reportData.town}`,
      content: Buffer.from(JSON.stringify(currentContent, null, 2)).toString('base64'),
      sha: currentSha,
    });

    return {
      statusCode: 200,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    return {
      statusCode: error.status || 500,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined 
      })
    };
  }
};