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

    // Token addresses - these are public blockchain data
    const TOKEN_ADDRESSES = [
        '9XzKDJ9wP9yqi9G5okp9UFNxFuhqyk5GNyUnnBaRBAGS',
        '71qnmtNQYuSGMi7w8auGEJaStaB1zbJPa5ZZ6mZtBAGS',
        'GZj4qMQFtwPpStknSaisn7shPJJ7Dv7wsuksEborBAGS',
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

        // Fetch lifetime fees for all tokens in parallel
        const promises = TOKEN_ADDRESSES.map(async (tokenAddress) => {
            try {
                const feesLamports = await sdk.state.getTokenLifetimeFees(new PublicKey(tokenAddress));
                const feesSol = feesLamports / LAMPORTS_PER_SOL;

                console.log(`Token ${tokenAddress}: ${feesSol.toLocaleString()} SOL`);

                return {
                    tokenAddress,
                    feesLamports,
                    feesSol,
                };
            } catch (error) {
                console.error(`Error fetching ${tokenAddress}:`, error);
                return {
                    tokenAddress,
                    feesLamports: 0,
                    feesSol: 0,
                    error: error.message
                };
            }
        });

        const results = await Promise.all(promises);

        // Calculate totals in SOL
        const totalSol = results.reduce((sum, result) => sum + (result.feesSol || 0), 0);

        // Convert to USD (assuming a rough SOL price, or you can fetch real-time price)
        // For now, let's just return the SOL amount
        const totalRaisedUSD = totalSol * 100; // Placeholder conversion, adjust based on real SOL price

        console.log(`Total raised: ${totalSol} SOL (~$${totalRaisedUSD.toLocaleString()})`);

        // Return aggregated data
        res.status(200).json({
            success: true,
            totalRaised: Math.round(totalRaisedUSD),
            totalSol: totalSol,
            tokenCount: TOKEN_ADDRESSES.length,
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
