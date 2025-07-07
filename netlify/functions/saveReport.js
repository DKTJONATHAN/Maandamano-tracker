const { Octokit } = require('@octokit/rest');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    // Parse and validate input
    if (!event.body) {
      throw new Error('No data provided');
    }
    
    const { auth, ...reportData } = JSON.parse(event.body);

    // Validate auth token
    if (auth !== process.env.FORM_SUBMISSION_TOKEN || !process.env.FORM_SUBMISSION_TOKEN) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Validate required report data
    if (!reportData.protest || !reportData.county || !reportData.constituency || !reportData.town) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    // Initialize GitHub API
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });

    // Parse repo details from environment
    const [owner, repo] = process.env.GITHUB_REPO.split('/');
    const filePath = 'data/maandamanoCheck.json';
    let currentSha = null;
    let currentContent = [];

    try {
      // Try to get existing file
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
      });
      
      currentSha = data.sha;
      currentContent = JSON.parse(Buffer.from(data.content, 'base64').toString());
      
      // Validate existing content is an array
      if (!Array.isArray(currentContent)) {
        throw new Error('Existing data is not an array');
      }
    } catch (error) {
      // Only ignore 404 (file not found) errors
      if (error.status !== 404) {
        throw error;
      }
    }

    // Add new report with additional metadata
    currentContent.push({
      ...reportData,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ip: event.headers['client-ip'] || null
    });

    // Commit changes to GitHub
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Add protest report: ${reportData.protest} in ${reportData.county}`,
      content: Buffer.from(JSON.stringify(currentContent, null, 2)).toString('base64'),
      sha: currentSha,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id: Date.now().toString() }),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: error.status || 500,
      body: JSON.stringify({ 
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};