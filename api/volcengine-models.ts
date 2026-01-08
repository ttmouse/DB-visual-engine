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
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

        // Forward the request to Volcengine Models API
        const volcengineResponse = await fetch('https://ark.ap-southeast.bytepluses.com/api/v3/models', {
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
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
