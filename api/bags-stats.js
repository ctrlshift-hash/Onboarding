// Vercel Serverless Function to fetch Bags.fm data
// This keeps your API key secure in environment variables

export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const BAGS_API_KEY = process.env.BAGS_API_KEY;

    // Token addresses - these are public blockchain data, no need to hide them
    const TOKEN_ADDRESSES = [
        '9XzKDJ9wP9yqi9G5okp9UFNxFuhqyk5GNyUnnBaRBAGS',
        '71qnmtNQYuSGMi7w8auGEJaStaB1zbJPa5ZZ6mZtBAGS',
        'GZj4qMQFtwPpStknSaisn7shPJJ7Dv7wsuksEborBAGS',
        // Add more token addresses here as needed
    ];

    if (!BAGS_API_KEY) {
        return res.status(500).json({
            error: 'Server configuration error. Set BAGS_API_KEY in Vercel environment variables.'
        });
    }

    if (TOKEN_ADDRESSES.length === 0) {
        return res.status(500).json({
            error: 'No token addresses configured. Add them to api/bags-stats.js'
        });
    }

    try {
        const addresses = TOKEN_ADDRESSES;
        const baseURL = 'https://public-api-v2.bags.fm/api/v1';

        // Fetch lifetime fees for all tokens in parallel
        const promises = addresses.map(async (tokenAddress) => {
            try {
                const response = await fetch(
                    `${baseURL}/token-launch/lifetime-fees?tokenMint=${tokenAddress}`,
                    {
                        method: 'GET',
                        headers: {
                            'x-api-key': BAGS_API_KEY,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (!response.ok) {
                    console.error(`API error for ${tokenAddress}: ${response.status}`);
                    return { tokenAddress, lifetimeFees: 0, error: response.statusText };
                }

                const data = await response.json();

                // Log the raw response to debug
                console.log(`API Response for ${tokenAddress}:`, JSON.stringify(data));

                // Try multiple possible field names
                const lifetimeFees = data.totalFees || data.lifetimeFees || data.total || data.fees || 0;

                console.log(`Parsed fees for ${tokenAddress}:`, lifetimeFees);

                return {
                    tokenAddress,
                    lifetimeFees,
                    rawData: data
                };
            } catch (error) {
                console.error(`Error fetching ${tokenAddress}:`, error);
                return { tokenAddress, lifetimeFees: 0, error: error.message };
            }
        });

        const results = await Promise.all(promises);

        // Calculate totals
        const totalRaised = results.reduce((sum, result) => sum + (result.lifetimeFees || 0), 0);
        const tokenCount = addresses.length;

        // Return aggregated data
        res.status(200).json({
            success: true,
            totalRaised,
            tokenCount,
            tokens: results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in serverless function:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Bags.fm data',
            details: error.message
        });
    }
}
