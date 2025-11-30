
import { SUPPORTED_TOKENS, BASE_RPC_URL } from '../constants';
import { TokenData } from '../types';

const BLOCKSCOUT_API_URL = "https://base.blockscout.com/api";

export const truncateAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Retry Helper with improved 429 handling
async function fetchWithRetry(url: string, options?: RequestInit, retries = 3, backoff = 2000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
         if (response.status === 429) {
            // Rate limit, wait longer (exponential + jitter)
            const waitTime = backoff * Math.pow(2, i) + (Math.random() * 1000);
            console.warn(`Rate limited (429). Waiting ${Math.round(waitTime)}ms...`);
            await new Promise(r => setTimeout(r, waitTime));
            continue;
         }
         throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, backoff * (i + 1)));
    }
  }
}

// JSON-RPC Helper
async function jsonRpcCall(method: string, params: any[]) {
  try {
    const response = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });
    const data = await response.json();
    if (data.error) {
        console.error(`RPC Error Body [${method}]:`, data.error);
        return null;
    }
    return data.result;
  } catch (e) {
    console.error(`RPC Error [${method}]:`, e);
    return null;
  }
}

// Fetch Native ETH Balance
async function getNativeBalance(userAddress: string): Promise<number> {
  const result = await jsonRpcCall('eth_getBalance', [userAddress, 'latest']);
  if (!result) return 0;
  return Number(BigInt(result)) / 1e18;
}

// Fetch User's Token List from Blockscout
async function fetchUserTokenList(address: string): Promise<any[]> {
  try {
    const data = await fetchWithRetry(
      `${BLOCKSCOUT_API_URL}?module=account&action=tokenlist&address=${address}`,
      undefined,
      2 
    );
    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result;
    }
    return [];
  } catch (e) {
    console.error("Blockscout API Error:", e);
    return [];
  }
}

// Helper to find supported token info
function findSupportedToken(contractAddress: string) {
    return SUPPORTED_TOKENS.find(t => t.address === contractAddress.toLowerCase());
}

// --- Stage 1: Initial User Assets (Fast, No Prices) ---
export const fetchInitialUserAssets = async (address: string | null): Promise<TokenData[]> => {
    // If no address, return standard Market View list (Supported Tokens with 0 balance)
    if (!address) {
        return SUPPORTED_TOKENS.map(token => ({
            id: token.id,
            symbol: token.symbol,
            name: token.name,
            price: 0,
            balance: 0,
            change24h: 0,
            history: [0, 0],
            imageUrl: (token as any).imageUrl,
            address: (token as any).address, // Include address
        }));
    }

    const tokens: TokenData[] = [];

    // 1. Get Native ETH
    try {
        const ethBal = await getNativeBalance(address);
        if (ethBal > 0) {
            const ethInfo = SUPPORTED_TOKENS.find(t => t.isNative);
            tokens.push({
                id: ethInfo?.id || 'ethereum',
                symbol: ethInfo?.symbol || 'ETH',
                name: ethInfo?.name || 'Ethereum',
                price: 0,
                balance: ethBal,
                change24h: 0,
                history: [0, 0],
                imageUrl: ethInfo?.imageUrl,
                // Native ETH typically uses 0x00... or 0xEee... for display/actions, or explicitly undefined
                address: '0x0000000000000000000000000000000000000000' 
            });
        }
    } catch (e) {
        console.warn("Failed to fetch ETH balance", e);
    }

    // 2. Get ERC-20s from Blockscout
    const userTokensRaw = await fetchUserTokenList(address);

    for (const t of userTokensRaw) {
        if (t.type !== "ERC-20") continue;
        
        const decimals = Number(t.decimals || 18);
        const balance = Number(t.balance) / Math.pow(10, decimals);
        
        if (balance <= 0) continue;

        const contractAddr = t.contractAddress.toLowerCase();
        const supported = findSupportedToken(contractAddr);

        tokens.push({
            id: supported?.id || contractAddr, // Use supported ID or contract address
            symbol: supported?.symbol || t.symbol || truncateAddress(t.contractAddress),
            name: supported?.name || t.name || 'Unknown Token',
            price: 0,
            balance: balance,
            change24h: 0,
            history: [0, 0],
            imageUrl: supported?.imageUrl, // Use supported image if available
            address: contractAddr, // Explicitly set address
        } as TokenData);
    }

    return tokens;
};


// --- Stage 2: Fetch Prices for List (Async) ---
export const fetchTokenPricesForList = async (tokens: TokenData[]): Promise<TokenData[]> => {
    const addressesToFetch: string[] = [];
    const cgIdsToFetch: string[] = [];
    const tokenMap = new Map<string, TokenData>();

    // Classify tokens
    tokens.forEach(t => {
        tokenMap.set(t.id, t);
        
        // Check if it's a supported token with a CoinGecko ID
        const supported = SUPPORTED_TOKENS.find(st => st.id === t.id);
        if (supported) {
            cgIdsToFetch.push(supported.cgId);
        } else {
            // It's a dynamic token, ID is the address
            if (t.id.startsWith('0x')) {
                addressesToFetch.push(t.id);
            }
        }
    });

    const prices: Record<string, { price: number, change: number }> = {};

    // 1. Fetch from CoinGecko Markets (for supported IDs)
    if (cgIdsToFetch.length > 0) {
        try {
            const idsParam = cgIdsToFetch.join(',');
            const data = await fetchWithRetry(
                `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${idsParam}&sparkline=false`,
                undefined, 2
            );
            if (Array.isArray(data)) {
                data.forEach((coin: any) => {
                    // Map back from CG ID to our internal ID
                    const supported = SUPPORTED_TOKENS.find(st => st.cgId === coin.id);
                    if (supported) {
                         prices[supported.id] = { 
                             price: coin.current_price || 0, 
                             change: coin.price_change_percentage_24h || 0 
                         };
                    }
                });
            }
        } catch (e) {
            console.warn("CG Markets fetch failed", e);
        }
    }

    // 2. Fetch from CoinGecko Simple Price (for contract addresses)
    if (addressesToFetch.length > 0) {
        try {
            // Batch in chunks of 20
            const chunk = addressesToFetch.slice(0, 20).join(',');
            const data = await fetchWithRetry(
                `https://api.coingecko.com/api/v3/simple/token_price/base?contract_addresses=${chunk}&vs_currencies=usd&include_24hr_change=true`
            );
            for (const addr in data) {
                const lowerAddr = addr.toLowerCase();
                prices[lowerAddr] = {
                    price: data[addr].usd || 0,
                    change: data[addr].usd_24h_change || 0
                };
            }
        } catch (e) {
            console.warn("CG Simple Price fetch failed", e);
        }
    }

    // 3. Fallback: DexScreener (for anything with 0 price)
    const missingPrices = tokens.filter(t => {
        const p = prices[t.id];
        return !p || p.price === 0;
    }).map(t => {
         // Resolve address
         if (t.id.startsWith('0x')) return t.id;
         const sup = SUPPORTED_TOKENS.find(st => st.id === t.id);
         return sup?.address?.toLowerCase();
    }).filter((addr): addr is string => !!addr);

    if (missingPrices.length > 0) {
        // Use DexScreener fetcher from previous code
        const dexPrices = await fetchDexScreenerPrices(missingPrices);
        for (const addr in dexPrices) {
             // We need to map address back to ID. 
             // If dynamic, ID is address. If supported, look up ID.
             const supported = SUPPORTED_TOKENS.find(st => st.address === addr);
             const id = supported ? supported.id : addr;
             
             if (!prices[id] || prices[id].price === 0) {
                 prices[id] = {
                     price: dexPrices[addr].usd,
                     change: dexPrices[addr].usd_24h_change
                 };
             }
        }
    }

    // Reconstruct token list with prices
    return tokens.map(t => {
        const p = prices[t.id];
        if (p) {
            return {
                ...t,
                price: p.price,
                change24h: p.change,
                history: ensureHistory(p.price, p.change, [])
            };
        }
        return t;
    });
};

// --- Helper Functions ---

// Ensure history exists. If empty, generate from price and change.
function ensureHistory(price: number, change: number, history: number[]): number[] {
    if (history && history.length >= 2) return history;
    if (price === 0) return [0, 0];
    const prevPrice = price / (1 + (change / 100));
    return [prevPrice, price];
}

// Fetch Prices from DexScreener (Fallback)
async function fetchDexScreenerPrices(addresses: string[]): Promise<Record<string, { usd: number, usd_24h_change: number }>> {
  if (addresses.length === 0) return {};
  try {
    const subset = addresses.slice(0, 30).join(',');
    const data = await fetchWithRetry(`https://api.dexscreener.com/latest/dex/tokens/${subset}`);
    const priceMap: Record<string, { usd: number, usd_24h_change: number }> = {};
    if (data.pairs && Array.isArray(data.pairs)) {
      data.pairs.forEach((pair: any) => {
         if (pair.baseToken && pair.baseToken.address) {
            const addr = pair.baseToken.address.toLowerCase();
            if (!priceMap[addr]) {
               priceMap[addr] = {
                 usd: Number(pair.priceUsd) || 0,
                 usd_24h_change: Number(pair.priceChange?.h24) || 0
               };
            }
         }
      });
    }
    return priceMap;
  } catch (e) {
    console.error("DexScreener API Error:", e);
    return {};
  }
}

// Fetch Chart from GeckoTerminal (DEX API - Free, supports Base addresses)
async function fetchGeckoTerminalChart(address: string): Promise<number[] | null> {
    try {
        // GeckoTerminal Endpoint for OHLCV
        const response = await fetchWithRetry(
            `https://api.geckoterminal.com/api/v2/networks/base/tokens/${address}/ohlcv/hour?limit=24`,
            undefined, 
            2
        );
        
        const ohlcvList = response?.data?.attributes?.ohlcv_list;
        if (Array.isArray(ohlcvList)) {
            // GeckoTerminal OHLCV format: [timestamp, open, high, low, close, volume]
            // We want 'close' (index 4) and reverse it because it returns newest first usually
            return ohlcvList.map((item: number[]) => item[4]).reverse();
        }
        return null;
    } catch (e) {
        // console.warn(`GeckoTerminal fetch failed for ${address}`, e);
        return null;
    }
}

// Helper: Get CoinGecko ID from Contract Address
async function getCoinGeckoId(contractAddress: string): Promise<string | null> {
    try {
        const data = await fetchWithRetry(
            `https://api.coingecko.com/api/v3/coins/base/contract/${contractAddress}`
        );
        return data.id || null;
    } catch (e) {
        return null;
    }
}

// --- Stage 3: Fetch Extended Charts (Async, with ID discovery) ---
export const fetchExtendedCharts = async (currentTokens: TokenData[]): Promise<Record<string, number[]>> => {
    const charts: Record<string, number[]> = {};
    const idsToFetch = new Set<string>();
    const addressToIdMap = new Map<string, string>(); 
    const missingChartTokenIds: string[] = [];

    // 1. Try Batch Fetch from Main CoinGecko Market API (Most efficient)
    currentTokens.forEach(t => {
        const supported = SUPPORTED_TOKENS.find(st => st.id === t.id);
        if (supported) {
            idsToFetch.add(supported.cgId);
        }
    });
    
    // Also try to resolve Top dynamic tokens to CG IDs
    const dynamicTokens = currentTokens
        .filter(t => !SUPPORTED_TOKENS.some(st => st.id === t.id) && t.id.startsWith('0x'))
        .slice(0, 3);

    for (const token of dynamicTokens) {
        await new Promise(r => setTimeout(r, 1200)); 
        const cgId = await getCoinGeckoId(token.id);
        if (cgId) {
            idsToFetch.add(cgId);
            addressToIdMap.set(token.id, cgId);
        } else {
            // If no CG ID found, mark for GeckoTerminal fallback
            missingChartTokenIds.push(token.id); 
        }
    }

    // Execute Bulk Fetch
    if (idsToFetch.size > 0) {
        try {
            const idsArray = Array.from(idsToFetch);
            const idsParam = idsArray.join(',');
            const data = await fetchWithRetry(
                `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${idsParam}&sparkline=true`,
                undefined, 1 // Fewer retries on bulk, fail fast to fallback
            );

            if (Array.isArray(data)) {
                data.forEach((coin: any) => {
                    if (coin.sparkline_in_7d?.price) {
                        const sparkline = coin.sparkline_in_7d.price.slice(-24);
                        
                        // Map supported
                        const supported = SUPPORTED_TOKENS.find(st => st.cgId === coin.id);
                        if (supported) charts[supported.id] = sparkline;
                        
                        // Map dynamic
                        for (const [internalId, cgId] of addressToIdMap.entries()) {
                            if (cgId === coin.id) charts[internalId] = sparkline;
                        }
                    }
                });
            }
        } catch (e) {
            console.warn("Bulk chart fetch failed, switching to individual fallbacks.");
        }
    }

    // 2. Identify missing charts (failed bulk or not in bulk)
    // We check which tokens still don't have charts in our `charts` object
    // We prioritize top holdings
    const tokensNeedingCharts = currentTokens
        .filter(t => !charts[t.id])
        .slice(0, 10); // Limit to top 10 to avoid excessive requests

    // 3. Fallback: Fetch individual charts from GeckoTerminal (Free, DEX API)
    for (const token of tokensNeedingCharts) {
        // Resolve address: if dynamic, ID is address. If supported, get address from config.
        let address = token.id.startsWith('0x') ? token.id : token.address;
        
        // Some supported tokens might not have address in TokenData if user logic failed, look it up
        if (!address) {
             const sup = SUPPORTED_TOKENS.find(st => st.id === token.id);
             address = sup?.address;
        }

        if (address) {
            // Delay to respect GeckoTerminal rate limit (~30 req/min => 1 req every 2 sec to be safe)
            await new Promise(r => setTimeout(r, 1500));
            
            const gtChart = await fetchGeckoTerminalChart(address);
            if (gtChart && gtChart.length > 0) {
                charts[token.id] = gtChart;
            }
        }
    }

    return charts;
}
