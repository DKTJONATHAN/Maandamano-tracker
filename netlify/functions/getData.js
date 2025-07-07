exports.handler = async function(event, context) {
  const { Octokit } = require('@octokit/rest');
  
  try {
    const octokit = new Octokit({ 
      auth: process.env.GITHUB_TOKEN,
      userAgent: 'MaandamanoTracker/v1.0'
    });

    const [owner, repo] = process.env.GITHUB_REPO.split('/');
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: 'data/maandamanoCheck.json'
    });

    const content = Buffer.from(data.content, 'base64').toString();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: content
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};