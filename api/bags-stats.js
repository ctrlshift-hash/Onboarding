// Vercel Serverless Function to fetch Bags.fm data using REST API
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const BAGS_API_KEY = process.env.BAGS_API_KEY;

    // Token data - addresses and names
    const TOKENS = [
        { address: '9XzKDJ9wP9yqi9G5okp9UFNxFuhqyk5GNyUnnBaRBAGS', name: 'DATABUDDY' },
        { address: '71qnmtNQYuSGMi7w8auGEJaStaB1zbJPa5ZZ6mZtBAGS', name: 'GITBRUV' },
        { address: 'GZj4qMQFtwPpStknSaisn7shPJJ7Dv7wsuksEborBAGS', name: 'BOUNTY' },
    ];

    if (!BAGS_API_KEY) {
        return res.status(500).json({
            error: 'Server configuration error. Set BAGS_API_KEY in Vercel environment variables.'
        });
    }

    try {
        // Fetch lifetime fees and claimed amounts for all tokens
        const promises = TOKENS.map(async (token) => {
            try {
                // Fetch both endpoints in parallel
                const [lifetimeFeesResponse, claimStatsResponse] = await Promise.all([
                    fetch(
                        `https://public-api-v2.bags.fm/api/v1/token-launch/lifetime-fees?tokenMint=${token.address}`,
                        { headers: { 'x-api-key': BAGS_API_KEY } }
                    ),
                    fetch(
                        `https://public-api-v2.bags.fm/api/v1/token-launch/claim-stats?tokenMint=${token.address}`,
                        { headers: { 'x-api-key': BAGS_API_KEY } }
                    )
                ]);

                // Get unclaimed fees (lifetime-fees = currently unclaimed)
                let unclaimedSol = 0;
                if (lifetimeFeesResponse.ok) {
                    const lifetimeFeesData = await lifetimeFeesResponse.json();
                    console.log(`Token ${token.name} lifetime fees response:`, JSON.stringify(lifetimeFeesData));
                    if (lifetimeFeesData.success && lifetimeFeesData.response) {
                        const lamports = BigInt(lifetimeFeesData.response);
                        unclaimedSol = Number(lamports) / LAMPORTS_PER_SOL;
                    }
                }

                // Get total claimed amounts from all users
                let claimedSol = 0;
                if (claimStatsResponse.ok) {
                    const claimStatsData = await claimStatsResponse.json();
                    console.log(`Token ${token.name} claim stats response:`, JSON.stringify(claimStatsData));
                    // Response is { success: true, response: [{ totalClaimed: "lamports", ... }, ...] }
                    if (claimStatsData.success && Array.isArray(claimStatsData.response)) {
                        claimedSol = claimStatsData.response.reduce((sum, claimer) => {
                            const claimed = BigInt(claimer.totalClaimed || '0');
                            return sum + Number(claimed) / LAMPORTS_PER_SOL;
                        }, 0);
                    }
                }

                // Total earnings = unclaimed + claimed
                const totalSol = unclaimedSol + claimedSol;

                console.log(`Token ${token.name}: ${unclaimedSol.toFixed(4)} unclaimed + ${claimedSol.toFixed(4)} claimed = ${totalSol.toFixed(4)} SOL total`);

                return {
                    tokenAddress: token.address,
                    name: token.name,
                    unclaimedSol,
                    claimedSol,
                    feesSol: totalSol,
                };
            } catch (error) {
                console.error(`Error fetching ${token.name}:`, error);
                return {
                    tokenAddress: token.address,
                    name: token.name,
                    feesSol: 0,
                    error: error.message
                };
            }
        });

        const results = await Promise.all(promises);

        // Calculate totals in SOL
        const totalSol = results.reduce((sum, result) => sum + (result.feesSol || 0), 0);

        // Fetch real-time SOL price from CoinGecko
        let solPrice = 180; // Fallback price
        try {
            const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            const priceData = await priceResponse.json();
            if (priceData.solana && priceData.solana.usd) {
                solPrice = priceData.solana.usd;
            }
            console.log(`Current SOL price: $${solPrice}`);
        } catch (priceError) {
            console.error('Error fetching SOL price, using fallback:', priceError);
        }

        // Convert to USD using real-time price
        const totalRaisedUSD = totalSol * solPrice;

        console.log(`Total raised: ${totalSol} SOL (~$${totalRaisedUSD.toLocaleString()})`);

        // Return aggregated data
        res.status(200).json({
            success: true,
            totalRaised: Math.round(totalRaisedUSD),
            totalSol: totalSol,
            solPrice: solPrice,
            tokenCount: TOKENS.length,
            tokens: results.map(r => ({
                ...r,
                amountUSD: Math.round((r.feesSol || 0) * solPrice) // Individual USD amounts with real SOL price
            })),
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
