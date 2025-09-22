import { IAMCredentialsClient } from '@google-cloud/iam-credentials';
import { getVercelOidcToken } from '@vercel/functions/oidc';
import { NextRequest, NextResponse } from 'next/server';

// --- Environment Variable Validation ---
const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER;
const GCP_SERVICE_ACCOUNT_EMAIL = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
const GCP_WORKLOAD_IDENTITY_POOL_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
const GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;
const WEBSOCKET_SERVER_URL = process.env.WEBSOCKET_SERVER_URL;

if (
  !GCP_PROJECT_NUMBER ||
  !GCP_SERVICE_ACCOUNT_EMAIL ||
  !GCP_WORKLOAD_IDENTITY_POOL_ID ||
  !GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID ||
  !WEBSOCKET_SERVER_URL
) {
  throw new Error("Missing required GCP or WebSocket environment variables.");
}


// --- Client Initialization (Singleton Pattern) ---
let iamClient: IAMCredentialsClient;

function getIamClient() {
  if (!iamClient) {
    // 1. Initialize the IAM client directly with the external account credentials.
    // The client's internal GoogleAuth instance will handle creating the
    // federation client and attaching the token supplier for you.
    iamClient = new IAMCredentialsClient({
      credentials: {
        type: 'external_account',
        audience: `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        token_url: 'https://sts.googleapis.com/v1/token',
        subject_token_supplier: {
            getSubjectToken: getVercelOidcToken,
        },
      }
    });
  }
  return iamClient;
}


// --- API Route Handler ---
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('Requesting identity token for WebSocket authentication...');

    const client = getIamClient();
    
    // 2. Use the IAM client to generate an identity token.
    const [response] = await client.generateIdToken({
      name: `projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}`,
      audience: WEBSOCKET_SERVER_URL,
      includeEmail: true,
    });

    if (!response.token) {
        throw new Error("Received an empty token from IAM Credentials API.");
    }

    console.log('Identity token generated successfully.');

    return NextResponse.json({
      token: response.token,
      expiresIn: 3600, // ID tokens expire in 1 hour
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error getting identity token:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    return NextResponse.json({
      error: 'Failed to get authentication token',
      details: errorMessage,
    }, { status: 500 });
  }
}