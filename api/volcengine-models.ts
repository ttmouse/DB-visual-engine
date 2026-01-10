// Vercel Serverless Function to proxy Volcengine Models API
// Lists available models for the user's API key

export const config = {
    runtime: 'edge',
};

export default async function handler(request: Request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-Base-URL',
            },
        });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // Get the authorization header from the incoming request
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Authorization header required' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Get target base URL from header or use default (SEA)
        const targetBaseUrl = request.headers.get('X-Target-Base-URL') || 'https://ark.ap-southeast.bytepluses.com/api/v3/';
        // Ensure ends with slash for concatenation
        const baseUrl = targetBaseUrl.endsWith('/') ? targetBaseUrl : `${targetBaseUrl}/`;
        const apiUrl = `${baseUrl}models`;

        // Forward the request to Volcengine Models API
        const volcengineResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
            },
        });

        // Get the response data
        const data = await volcengineResponse.json();

        // Return the response with CORS headers
        return new Response(JSON.stringify(data), {
            status: volcengineResponse.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Target-Base-URL',
            },
        });
    } catch (error: any) {
        console.error('Volcengine Models proxy error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Proxy error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
