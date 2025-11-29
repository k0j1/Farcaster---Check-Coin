
import { SUPPORTED_TOKENS, BASE_RPC_URL } from '../constants';
import { TokenData } from '../types';

// ERC-20 balanceOf function selector: 0x70a08231
const BALANCE_OF_ID = '0x70a08231';
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

// Fetch Token Balance via RPC
async function getTokenBalance(tokenAddress: string, userAddress: string, decimals: number): Promise<number> {
  // Normalize address: remove 0x, lowercase, pad to 64 chars (32 bytes)
  const cleanAddress = userAddress.toLowerCase().replace(/^0x/, '');
  const paddedAddress = cleanAddress.padStart(64, '0');
  const data = BALANCE_OF_ID + paddedAddress;

  const result = await jsonRpcCall('eth_call', [{
    to: tokenAddress,
    data: data
  }, 'latest']);

  if (!result || result === '0x') return 0;
  
  try {
      const hexValue = result;
      const value = BigInt(hexValue);
      return Number(value) / Math.pow(10, decimals);
  } catch (e) {
      console.error(`Error parsing balance for ${tokenAddress}:`, e);
      return 0;
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
      2 // Fewer retries for Blockscout as it can be slow
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

// Fetch Dynamic Prices for Unknown Tokens from CoinGecko (Simple Price by Contract)
async function fetchDynamicTokenPrices(addresses: string[]): Promise<Record<string, { usd: number, usd_24h_change: number }>> {
  if (addresses.length === 0) return {};
  
  try {
    // CoinGecko allows comma separated addresses. Limit to prevent URL overflow.
    const subset = addresses.slice(0, 20).join(',');
    const data = await fetchWithRetry(
      `https://api.coingecko.com/api/v3/simple/token_price/base?contract_addresses=${subset}&vs_currencies=usd&include_24hr_change=true`
    );
    return data;
  } catch (e) {
    console.error("CoinGecko Simple Price Error:", e);
    return {};
  }
}

// Fetch Prices from DexScreener (Fallback for tokens not on CoinGecko)
async function fetchDexScreenerPrices(addresses: string[]): Promise<Record<string, { usd: number, usd_24h_change: number }>> {
  if (addresses.length === 0) return {};

  try {
    // DexScreener supports up to 30 addresses
    const subset = addresses.slice(0, 30).join(',');
    const data = await fetchWithRetry(`https://api.dexscreener.com/latest/dex/tokens/${subset}`);

    const priceMap: Record<string, { usd: number, usd_24h_change: number }> = {};

    if (data.pairs && Array.isArray(data.pairs)) {
      data.pairs.forEach((pair: any) => {
         if (pair.baseToken && pair.baseToken.address) {
            const addr = pair.baseToken.address.toLowerCase();
            // DexScreener returns multiple pairs. We prioritize the one with highest liquidity (usually first)
            // or simply the first valid one we find for that token.
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

// Fetch Market Data from CoinGecko (Prices + Sparkline) for Supported Tokens
async function fetchCoinGeckoMarketData(): Promise<Record<string, { price: number, change: number, sparkline: number[] }>> {
  try {
    const ids = SUPPORTED_TOKENS.map(t => t.cgId).join(',');
    const data = await fetchWithRetry(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true`,
      undefined, 
      2
    );
    
    if (!Array.isArray(data)) {
        return {};
    }

    const marketData: Record<string, { price: number, change: number, sparkline: number[] }> = {};
    data.forEach((coin: any) => {
      marketData[coin.id] = {
        price: coin.current_price,
        change: coin.price_change_percentage_24h,
        sparkline: coin.sparkline_in_7d?.price || []
      };
    });
    return marketData;
  } catch (e) {
    console.error("Failed to fetch market data:", e);
    return {};
  }
}

// Ensure history exists. If empty, generate from price and change.
function ensureHistory(price: number, change: number, history: number[]): number[] {
    if (history && history.length >= 2) return history;
    if (price === 0) return [0, 0];
    
    // Calculate previous price based on change
    // price = prev * (1 + change/100)
    // prev = price / (1 + change/100)
    const prevPrice = price / (1 + (change / 100));
    return [prevPrice, price];
}

export const fetchPortfolioData = async (address: string | null): Promise<TokenData[]> => {
  // 1. Fetch Market Data for SUPPORTED tokens (High quality data)
  const marketData = await fetchCoinGeckoMarketData();
  
  // If no address, return standard Market View
  if (!address) {
     return SUPPORTED_TOKENS.map(token => {
        const info = marketData[token.cgId];
        const currentPrice = (info && info.price != null) ? info.price : 0;
        const change24h = (info && info.change != null) ? info.change : 0;
        let history = (info && info.sparkline) ? info.sparkline.slice(-24) : [];
        history = ensureHistory(currentPrice, change24h, history);

        return {
          id: token.id,
          symbol: token.symbol,
          name: token.name,
          price: currentPrice,
          balance: 0,
          change24h: change24h,
          history: history,
          imageUrl: (token as any).imageUrl
        };
     });
  }

  // 2. Fetch User's Raw Token List from Blockscout
  const userTokensRaw = await fetchUserTokenList(address);
  
  // Addresses that need price fetching (either supported but failed CG, or unknown)
  const addressesToFetchPrice: string[] = [];

  // 3. Process Supported Tokens (using RPC for accurate balance)
  const knownTokensPromises = SUPPORTED_TOKENS.map(async (token) => {
    let balance = 0;
    if (token.isNative) {
      balance = await getNativeBalance(address);
    } else if (token.address) {
      balance = await getTokenBalance(token.address, address, token.decimals);
    }
    
    const info = marketData[token.cgId];
    
    // If info is missing but we have balance, we should try to fetch price via fallback
    if (!info && balance > 0 && token.address) {
        addressesToFetchPrice.push(token.address.toLowerCase());
    }

    const currentPrice = (info && info.price != null) ? info.price : 0;
    const change24h = (info && info.change != null) ? info.change : 0;
    const history = (info && info.sparkline) ? info.sparkline.slice(-24) : [];

    return {
      id: token.id,
      address: token.address?.toLowerCase(),
      symbol: token.symbol,
      name: token.name,
      price: currentPrice,
      balance: balance,
      change24h: change24h,
      history: history,
      imageUrl: (token as any).imageUrl
    };
  });
  
  let knownTokens = await Promise.all(knownTokensPromises);

  // 4. Identify Unknown Tokens
  const unknownTokens: any[] = [];

  for (const t of userTokensRaw) {
    if (t.type !== "ERC-20") continue; 
    const contractAddr = t.contractAddress.toLowerCase();
    
    // Check if it's already in our supported list
    const isKnown = SUPPORTED_TOKENS.some(st => st.address === contractAddr);
    
    // Check if it's actually held (balance > 0)
    const balVal = Number(t.balance);
    
    if (!isKnown && balVal > 0) {
       unknownTokens.push(t);
       addressesToFetchPrice.push(contractAddr);
    }
  }

  // 5. Fetch Dynamic Prices: Try CoinGecko First for all missing prices
  // Remove duplicates
  const uniqueAddressesToFetch = [...new Set(addressesToFetchPrice)];
  let dynamicPrices = await fetchDynamicTokenPrices(uniqueAddressesToFetch);

  // 6. Fallback: DexScreener for any that are still missing or zero
  const stillMissing = uniqueAddressesToFetch.filter(addr => 
      !dynamicPrices[addr] || dynamicPrices[addr].usd === 0
  );

  if (stillMissing.length > 0) {
      console.log(`Fetching ${stillMissing.length} tokens from DexScreener...`);
      const dexPrices = await fetchDexScreenerPrices(stillMissing);
      dynamicPrices = { ...dynamicPrices, ...dexPrices };
  }

  // 7. Update Known Tokens with fallback prices if needed
  knownTokens = knownTokens.map(token => {
      if (token.price === 0 && token.balance > 0 && token.address) {
          const fallback = dynamicPrices[token.address];
          if (fallback) {
              return {
                  ...token,
                  price: fallback.usd,
                  change24h: fallback.usd_24h_change,
                  history: ensureHistory(fallback.usd, fallback.usd_24h_change, [])
              };
          }
      }
      // Ensure history even for supported tokens if sparkline failed
      return {
          ...token,
          history: ensureHistory(token.price, token.change24h, token.history)
      };
  });

  // 8. Construct Dynamic Tokens
  const dynamicTokens: TokenData[] = unknownTokens.map((t): TokenData => {
      const addr = t.contractAddress.toLowerCase();
      const priceData = dynamicPrices[addr];
      
      const decimals = Number(t.decimals || 18);
      const balance = Number(t.balance) / Math.pow(10, decimals);
      
      const price = priceData?.usd || 0;
      const change = priceData?.usd_24h_change || 0;

      return {
          id: addr, 
          symbol: t.symbol || truncateAddress(t.contractAddress),
          name: t.name || 'Unknown Token',
          price: price,
          balance: balance,
          change24h: change,
          history: ensureHistory(price, change, []), // Generate synthetic history
          imageUrl: undefined 
      };
  });

  // 9. Merge and Return
  return [...knownTokens, ...dynamicTokens];
};
