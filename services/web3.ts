
import { SUPPORTED_TOKENS, BASE_RPC_URL } from '../constants';
import { TokenData } from '../types';

const BLOCKSCOUT_API_URL = "https://base.blockscout.com/api";

export const truncateAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Retry Helper
async function fetchWithRetry(url: string, options?: RequestInit, retries = 3, backoff = 1000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
         if (response.status === 429) {
            // Rate limit, wait longer
            await new Promise(r => setTimeout(r, backoff * (i + 1) * 2));
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
            // Store cgId internally if needed for next steps, but TokenData doesn't strictly need it public
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
                imageUrl: ethInfo?.imageUrl
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
            // Store raw address for price fetching later
            // We can treat 'id' as address if it's not a supported token ID, 
            // but for supported tokens 'id' is like 'usd-coin'. 
            // We need a way to link back to address in Stage 2. 
            // We'll rely on SUPPORTED_TOKENS lookup or the ID being an address.
        } as TokenData & { _address?: string, _cgId?: string }); // internal properties
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

export const fetchSupportedCharts = async (): Promise<Record<string, number[]>> => {
    try {
        const ids = SUPPORTED_TOKENS.map(t => t.cgId).join(',');
        const data = await fetchWithRetry(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true`,
          undefined, 2
        );
        const charts: Record<string, number[]> = {};
        if (Array.isArray(data)) {
            data.forEach((coin: any) => {
                const supported = SUPPORTED_TOKENS.find(st => st.cgId === coin.id);
                if (supported && coin.sparkline_in_7d?.price) {
                    charts[supported.id] = coin.sparkline_in_7d.price.slice(-24);
                }
            });
        }
        return charts;
    } catch (e) {
        console.error("Chart fetch failed", e);
        return {};
    }
}
