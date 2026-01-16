// Vercel Serverless Function to fetch Bags.fm data using the SDK
import { BagsSDK } from "@bagsfm/bags-sdk";
import { LAMPORTS_PER_SOL, PublicKey, Connection } from "@solana/web3.js";

export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const BAGS_API_KEY = process.env.BAGS_API_KEY;
    const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

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
        // Initialize SDK
        const connection = new Connection(SOLANA_RPC_URL);
        const sdk = new BagsSDK(BAGS_API_KEY, connection, "processed");

        // Fetch both unclaimed fees and claimed stats for all tokens
        const promises = TOKENS.map(async (token) => {
            try {
                // Get unclaimed fees from SDK
                const feesLamports = await sdk.state.getTokenLifetimeFees(new PublicKey(token.address));
                const unclaimedSol = feesLamports / LAMPORTS_PER_SOL;

                // Get claimed stats from REST API
                let claimedSol = 0;
                try {
                    const claimStatsResponse = await fetch(
                        `https://api.bags.fm/api/token-launch/claim-stats?tokenMint=${token.address}`,
                        { headers: { 'x-api-key': BAGS_API_KEY } }
                    );
                    if (claimStatsResponse.ok) {
                        const claimStats = await claimStatsResponse.json();
                        // Sum up all claimed amounts (totalClaimed is in lamports as string)
                        if (Array.isArray(claimStats)) {
                            claimedSol = claimStats.reduce((sum, claimer) => {
                                const claimed = parseInt(claimer.totalClaimed || '0', 10);
                                return sum + (claimed / LAMPORTS_PER_SOL);
                            }, 0);
                        }
                    }
                } catch (claimError) {
                    console.error(`Error fetching claim stats for ${token.name}:`, claimError);
                }

                // Total = unclaimed + claimed
                const totalSol = unclaimedSol + claimedSol;

                console.log(`Token ${token.name}: ${unclaimedSol.toFixed(2)} unclaimed + ${claimedSol.toFixed(2)} claimed = ${totalSol.toFixed(2)} SOL total`);

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
