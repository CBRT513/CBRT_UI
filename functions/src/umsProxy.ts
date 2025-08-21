import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const UMS_BASE_URL = process.env.UMS_BASE_URL || 'http://127.0.0.1:8091';

export const umsProxy = functions.https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Verify Firebase token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing token' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }

    // Extract path after /api/ums
    const path = req.url.replace(/^\/api\/ums/, '/api/graph');
    const targetUrl = `${UMS_BASE_URL}${path}`;

    console.log(`Proxying ${req.method} request to: ${targetUrl}`);
    console.log('User:', decodedToken.email || decodedToken.uid);

    // Forward request to UMS
    const headers: any = {
      'Content-Type': 'application/json',
      'X-User-ID': decodedToken.uid,
      'X-User-Email': decodedToken.email || '',
    };

    const options: any = {
      method: req.method,
      headers,
    };

    // Add body for POST requests
    if (req.method === 'POST' && req.body) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, options);
    const data = await response.json();

    // Forward response
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});