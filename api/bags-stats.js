// Vercel Serverless Function to fetch Bags.fm data using REST API
import { LAMPORTS_PER_SOL, Connection, PublicKey } from "@solana/web3.js";

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
        // Initialize Solana connection for metadata
        const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');

        // Fetch lifetime fees and creator info for all tokens
        const promises = TOKENS.map(async (token) => {
            try {
                // Fetch lifetime fees
                const lifetimeFeesResponse = await fetch(
                    `https://public-api-v2.bags.fm/api/v1/token-launch/lifetime-fees?tokenMint=${token.address}`,
                    { headers: { 'x-api-key': BAGS_API_KEY } }
                );

                if (!lifetimeFeesResponse.ok) {
                    throw new Error(`API returned ${lifetimeFeesResponse.status}`);
                }

                const lifetimeFeesData = await lifetimeFeesResponse.json();

                let totalSol = 0;
                if (lifetimeFeesData.success && lifetimeFeesData.response) {
                    const lamports = BigInt(lifetimeFeesData.response);
                    totalSol = Number(lamports) / LAMPORTS_PER_SOL;
                }

                // Fetch creator info to get Twitter handle
                let creatorUsername = null;
                let creatorProvider = null;
                try {
                    const creatorsResponse = await fetch(
                        `https://public-api-v2.bags.fm/api/v1/token-launch/creators?tokenMint=${token.address}`,
                        { headers: { 'x-api-key': BAGS_API_KEY } }
                    );
                    if (creatorsResponse.ok) {
                        const creatorsData = await creatorsResponse.json();
                        if (creatorsData.success && creatorsData.response && creatorsData.response.length > 0) {
                            const creator = creatorsData.response[0];
                            creatorUsername = creator.providerUsername || null;
                            creatorProvider = creator.provider || null;
                        }
                    }
                } catch (creatorError) {
                    console.error(`Error fetching creator for ${token.name}:`, creatorError);
                }

                // Try to fetch token metadata from Solana
                let iconUrl = null;
                try {
                    const mintPubkey = new PublicKey(token.address);
                    const accountInfo = await connection.getParsedAccountInfo(mintPubkey);

                    // Try to get metadata from token extensions or metaplex
                    if (accountInfo.value?.data && typeof accountInfo.value.data === 'object' && 'parsed' in accountInfo.value.data) {
                        const metadata = accountInfo.value.data.parsed?.info?.extensions?.metadata;
                        if (metadata?.uri) {
                            // Fetch metadata JSON
                            const metadataResponse = await fetch(metadata.uri);
                            if (metadataResponse.ok) {
                                const metadataJson = await metadataResponse.json();
                                iconUrl = metadataJson.image || null;
                            }
                        }
                    }
                } catch (metadataError) {
                    console.error(`Error fetching metadata for ${token.name}:`, metadataError);
                }

                return {
                    tokenAddress: token.address,
                    name: token.name,
                    feesSol: totalSol,
                    iconUrl,
                    creatorUsername,
                    creatorProvider,
                };
            } catch (error) {
                console.error(`Error fetching ${token.name}:`, error);
                return {
                    tokenAddress: token.address,
                    name: token.name,
                    feesSol: 0,
                    iconUrl: null,
                    creatorUsername: null,
                    creatorProvider: null,
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
                amountUSD: Math.round((r.feesSol || 0) * solPrice), // Individual USD amounts with real SOL price
                iconUrl: r.iconUrl // Token icon URL from metadata
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
