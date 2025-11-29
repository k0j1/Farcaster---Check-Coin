import { SUPPORTED_TOKENS, BASE_RPC_URL } from '../constants';
import { TokenData } from '../types';

// ERC-20 balanceOf function selector: 0x70a08231
const BALANCE_OF_ID = '0x70a08231';
const BLOCKSCOUT_API_URL = "https://base.blockscout.com/api";

export const truncateAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

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
    const response = await fetch(
      `${BLOCKSCOUT_API_URL}?module=account&action=tokenlist&address=${address}`
    );
    const data = await response.json();
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
    // Taking top 20 unknown tokens to be safe.
    const subset = addresses.slice(0, 20).join(',');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/base?contract_addresses=${subset}&vs_currencies=usd&include_24hr_change=true`
    );
    const data = await response.json();
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
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${subset}`);
    const data = await response.json();

    const priceMap: Record<string, { usd: number, usd_24h_change: number }> = {};

    if (data.pairs && Array.isArray(data.pairs)) {
      data.pairs.forEach((pair: any) => {
         if (pair.baseToken && pair.baseToken.address) {
            const addr = pair.baseToken.address.toLowerCase();
            // Use the pair with highest liquidity (DexScreener usually sorts by liquidity/relevance)
            // Only set if not already set (or could compare liquidity)
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
    // sparkline=true returns 7d hourly data
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true`
    );
    const data = await response.json();
    
    if (!Array.isArray(data)) {
        console.error("CoinGecko Market API Error:", data);
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

export const fetchPortfolioData = async (address: string | null): Promise<TokenData[]> => {
  // 1. Fetch Market Data for SUPPORTED tokens (High quality data)
  const marketData = await fetchCoinGeckoMarketData();
  
  // If no address, return standard Market View using only supported tokens
  if (!address) {
     return SUPPORTED_TOKENS.map(token => {
        const info = marketData[token.cgId];
        const currentPrice = (info && info.price != null) ? info.price : 0;
        const change24h = (info && info.change != null) ? info.change : 0;
        let history = (info && info.sparkline) ? info.sparkline.slice(-24) : [currentPrice, currentPrice];

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
  
  // 3. Process Supported Tokens (using RPC for accurate balance)
  const knownTokensPromises = SUPPORTED_TOKENS.map(async (token) => {
    let balance = 0;
    if (token.isNative) {
      balance = await getNativeBalance(address);
    } else if (token.address) {
      balance = await getTokenBalance(token.address, address, token.decimals);
    }
    
    const info = marketData[token.cgId];
    const currentPrice = (info && info.price != null) ? info.price : 0;
    const change24h = (info && info.change != null) ? info.change : 0;
    let history = (info && info.sparkline) ? info.sparkline.slice(-24) : [currentPrice, currentPrice];

    return {
      id: token.id,
      symbol: token.symbol,
      name: token.name,
      price: currentPrice,
      balance: balance,
      change24h: change24h,
      history: history,
      imageUrl: (token as any).imageUrl
    };
  });
  
  const knownTokens = await Promise.all(knownTokensPromises);

  // 4. Identify Unknown Tokens
  const unknownTokens: any[] = [];
  const unknownAddresses: string[] = [];

  for (const t of userTokensRaw) {
    if (t.type !== "ERC-20") continue; // Skip NFTs if Blockscout returns them mixed
    const contractAddr = t.contractAddress.toLowerCase();
    
    // Check if it's already in our supported list
    const isKnown = SUPPORTED_TOKENS.some(st => st.address === contractAddr);
    
    // Check if it's actually held (balance > 0)
    const balVal = Number(t.balance);
    
    if (!isKnown && balVal > 0) {
       unknownTokens.push(t);
       unknownAddresses.push(contractAddr);
    }
  }

  // 5. Fetch Dynamic Prices: Try CoinGecko First
  let dynamicPrices = await fetchDynamicTokenPrices(unknownAddresses);

  // 6. Find tokens that missed CoinGecko prices and try DexScreener
  const missingPriceAddresses = unknownAddresses.filter(addr => {
     return !dynamicPrices[addr] || dynamicPrices[addr].usd === 0;
  });

  if (missingPriceAddresses.length > 0) {
      console.log(`Fetching ${missingPriceAddresses.length} tokens from DexScreener...`);
      const dexPrices = await fetchDexScreenerPrices(missingPriceAddresses);
      // Merge results
      dynamicPrices = { ...dynamicPrices, ...dexPrices };
  }

  // 7. Construct Dynamic Tokens
  const dynamicTokens: TokenData[] = unknownTokens.map((t): TokenData => {
      const addr = t.contractAddress.toLowerCase();
      const priceData = dynamicPrices[addr];
      
      const decimals = Number(t.decimals || 18);
      const balance = Number(t.balance) / Math.pow(10, decimals);
      
      // Even if no price data found, show the token with 0 price
      const price = priceData?.usd || 0;
      const change = priceData?.usd_24h_change || 0;

      return {
          id: addr, // use address as ID for dynamic tokens
          symbol: t.symbol || truncateAddress(t.contractAddress), // Fallback symbol
          name: t.name || 'Unknown Token',
          price: price,
          balance: balance,
          change24h: change,
          history: [price, price], // Flat line for dynamic tokens
          imageUrl: undefined // No image available from this flow
      };
  });

  // 8. Merge and Return
  return [...knownTokens, ...dynamicTokens];
};
