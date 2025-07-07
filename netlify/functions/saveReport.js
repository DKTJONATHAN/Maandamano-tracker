const { Octokit } = require('@octokit/rest');

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const reportData = JSON.parse(event.body);

    // Validate required fields (optional but recommended)
    if (!reportData.protest || !reportData.county || !reportData.constituency || !reportData.town) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Initialize GitHub API
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const [owner, repo] = process.env.GITHUB_REPO.split('/');
    const filePath = 'data/maandamanoCheck.json';
    let currentSha = null;
    let currentContent = [];

    // Fetch existing data (if any)
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: filePath });
      currentSha = data.sha;
      currentContent = JSON.parse(Buffer.from(data.content, 'base64').toString());
    } catch (error) {
      if (error.status !== 404) throw error; // Ignore "file not found"
    }

    // Add new report
    currentContent.push({
      ...reportData,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
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
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};