// pages/api/auth-token.js - Get identity token for WebSocket authentication
import { getVercelOidcToken } from '@vercel/functions/oidc';
import { ExternalAccountClient } from 'google-auth-library';

const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER;
const GCP_SERVICE_ACCOUNT_EMAIL = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
const GCP_WORKLOAD_IDENTITY_POOL_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
const GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;

// Your WebSocket server URL (for audience in the token)
const WEBSOCKET_SERVER_URL = process.env.WEBSOCKET_SERVER_URL;

const authClient = ExternalAccountClient.fromJSON({
  type: 'external_account',
  audience: `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
  subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
  token_url: 'https://sts.googleapis.com/v1/token',
  service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
  subject_token_supplier: {
    getSubjectToken: getVercelOidcToken,
  },
});

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Getting identity token for WebSocket authentication...');
    
    // Get an identity token for your WebSocket server
    const idTokenClient = await authClient.getIdTokenClient(WEBSOCKET_SERVER_URL);
    
    // Get the token (this will be a JWT)
    const token = await idTokenClient.idTokenProvider.fetchIdToken(WEBSOCKET_SERVER_URL);
    
    console.log('Identity token generated successfully');
    
    res.status(200).json({ 
      token,
      expiresIn: 3600 // Identity tokens typically expire in 1 hour
    });
    
  } catch (error) {
    console.error('Error getting identity token:', error);
    res.status(500).json({ 
      error: 'Failed to get authentication token',
      details: error.message 
    });
  }
}
