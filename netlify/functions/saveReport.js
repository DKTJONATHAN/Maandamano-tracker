const { Octokit } = require('@octokit/rest');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const reportData = JSON.parse(event.body);
    
    // Basic validation
    if (!reportData.protest || !reportData.county || !reportData.constituency || !reportData.town) {
      return { statusCode: 400, body: "Missing required fields" };
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const [owner, repo] = process.env.GITHUB_REPO.split('/');
    const filePath = 'data/maandamanoCheck.json';
    let currentContent = [];
    let currentSha = null;

    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: filePath });
      currentSha = data.sha;
      currentContent = JSON.parse(Buffer.from(data.content, 'base64').toString());
    } catch (error) {
      if (error.status !== 404) throw error;
    }

    currentContent.push({
      ...reportData,
      id: Date.now(),
      timestamp: new Date().toISOString()
    });

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `New report: ${reportData.protest} in ${reportData.county}`,
      content: Buffer.from(JSON.stringify(currentContent, null, 2)).toString('base64'),
      sha: currentSha
    });

    return { statusCode: 200, body: "Report saved" };
  } catch (error) {
    return { statusCode: 500, body: error.message };
  }
};