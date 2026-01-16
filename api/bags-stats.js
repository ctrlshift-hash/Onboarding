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

        // Fetch lifetime fees for all tokens in parallel
        const promises = TOKENS.map(async (token) => {
            try {
                const feesLamports = await sdk.state.getTokenLifetimeFees(new PublicKey(token.address));
                const feesSol = feesLamports / LAMPORTS_PER_SOL;

                console.log(`Token ${token.name} (${token.address}): ${feesSol.toLocaleString()} SOL`);

                return {
                    tokenAddress: token.address,
                    name: token.name,
                    feesLamports,
                    feesSol,
                };
            } catch (error) {
                console.error(`Error fetching ${token.name}:`, error);
                return {
                    tokenAddress: token.address,
                    name: token.name,
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
            tokenCount: TOKENS.length,
            tokens: results.map(r => ({
                ...r,
                amountUSD: Math.round((r.feesSol || 0) * 100) // Individual USD amounts
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
