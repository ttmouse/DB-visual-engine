// Vercel Serverless Function to proxy Volcengine Chat API requests (including Vision)
// This bypasses CORS restrictions by making server-to-server calls

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
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
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

        // Parse the request body
        const body = await request.json();

        // Forward the request to Volcengine Chat API
        const volcengineResponse = await fetch('https://ark.ap-southeast.bytepluses.com/api/v3/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
            body: JSON.stringify(body),
        });

        // Get the response data
        const data = await volcengineResponse.json();

        // Return the response with CORS headers
        return new Response(JSON.stringify(data), {
            status: volcengineResponse.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    } catch (error: any) {
        console.error('Volcengine Chat proxy error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Proxy error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
