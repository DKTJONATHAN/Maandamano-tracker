const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { auth, ...reportData } = JSON.parse(event.body);
    
    if (auth !== 'secure-submission-token') {
      return { statusCode: 401, body: "Unauthorized" };
    }

    // Initialize GitHub API
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN, // Store in Netlify env vars
    });

    // Define repo details
    const [owner, repo] = process.env.GITHUB_REPO.split('/');
    const filePath = 'data/maandamanoCheck.json';

    // Fetch current file (if it exists)
    let currentContent = [];
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
      });
      currentContent = JSON.parse(Buffer.from(data.content, 'base64').toString());
    } catch (error) {
      if (error.status !== 404) throw error; // File doesn't exist yet
    }

    // Append new report
    currentContent.push({
      ...reportData,
      id: Date.now(),
    });

    // Commit updated file
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: 'Update maandamanoCheck.json',
      content: Buffer.from(JSON.stringify(currentContent, null, 2)).toString('base64'),
      sha: data?.sha, // Required if updating existing file
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
