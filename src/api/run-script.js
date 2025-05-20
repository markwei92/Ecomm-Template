// This file serves as a proxy for running server-side scripts
// It should be deployed as a serverless function or API route

import { spawn } from 'child_process';
import path from 'path';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { script, args = [] } = req.body;

    if (!script) {
      return res.status(400).json({ error: 'Script name is required' });
    }

    // Validate script name to prevent command injection
    if (!/^[a-zA-Z0-9_-]+\.js$/.test(script)) {
      return res.status(400).json({ error: 'Invalid script name' });
    }

    // Validate args to prevent command injection
    for (const arg of args) {
      if (typeof arg !== 'string' || /[;&|`$]/.test(arg)) {
        return res.status(400).json({ error: 'Invalid argument' });
      }
    }

    // Get the script path
    const scriptPath = path.join(process.cwd(), 'scripts', script);

    // Run the script
    const result = await runScript(scriptPath, args);

    return res.status(200).json({
      success: true,
      message: 'Script executed successfully',
      output: result
    });
  } catch (error) {
    console.error('Error in run-script API:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}

// Function to run a script and return its output
function runScript(scriptPath, args) {
  return new Promise((resolve, reject) => {
    // Spawn the script process
    const process = spawn('node', [scriptPath, ...args]);

    let stdout = '';
    let stderr = '';

    // Collect stdout
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    // Collect stderr
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Handle process completion
    process.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`Script exited with code ${code}: ${stderr}`));
      }
    });

    // Handle process errors
    process.on('error', (error) => {
      reject(error);
    });
  });
}
