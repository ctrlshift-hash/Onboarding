// Vercel Serverless Function to fetch Bags.fm data using REST API
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export default async function handler(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const BAGS_API_KEY = process.env.BAGS_API_KEY;

    // Token data - addresses, names, Twitter handles, images, and Bags.fm links
    const TOKENS = [
        {
            address: '9XzKDJ9wP9yqi9G5okp9UFNxFuhqyk5GNyUnnBaRBAGS',
            name: 'DATABUDDY',
            twitter: 'izadoesdev',
            imageUrl: 'https://static.wixstatic.com/media/e2da02_15d85627525f4cc6ae1c2e21f3e5fa00~mv2.png',
            bagsUrl: 'https://bags.fm/b/databuddy'
        },
        {
            address: '71qnmtNQYuSGMi7w8auGEJaStaB1zbJPa5ZZ6mZtBAGS',
            name: 'GITBRUV',
            twitter: 'bruvimtired',
            imageUrl: 'https://static.wixstatic.com/media/e2da02_294324e2bac24d9d8b6a8381af8b69be~mv2.png',
            bagsUrl: 'https://bags.fm/b/gitbruv'
        },
        {
            address: 'GZj4qMQFtwPpStknSaisn7shPJJ7Dv7wsuksEborBAGS',
            name: 'BOUNTY',
            twitter: 'bountydotnew',
            imageUrl: 'https://static.wixstatic.com/media/e2da02_d997ec21361242b4ad84eff14edd63dc~mv2.png',
            bagsUrl: 'https://bags.fm/b/bounty'
        },
    ];

    if (!BAGS_API_KEY) {
        return res.status(500).json({
            error: 'Server configuration error. Set BAGS_API_KEY in Vercel environment variables.'
        });
    }

    try {
        // Fetch lifetime fees for all tokens
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

                return {
                    tokenAddress: token.address,
                    name: token.name,
                    feesSol: totalSol,
                    twitter: token.twitter,
                    imageUrl: token.imageUrl,
                    bagsUrl: token.bagsUrl,
                };
            } catch (error) {
                console.error(`Error fetching ${token.name}:`, error);
                return {
                    tokenAddress: token.address,
                    name: token.name,
                    feesSol: 0,
                    twitter: token.twitter,
                    imageUrl: token.imageUrl,
                    bagsUrl: token.bagsUrl,
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
                amountUSD: Math.round((r.feesSol || 0) * solPrice)
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
