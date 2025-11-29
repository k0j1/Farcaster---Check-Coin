
import { SUPPORTED_TOKENS, BASE_RPC_URL } from '../constants';
import { TokenData } from '../types';

// ERC-20 balanceOf function selector: 0x70a08231
const BALANCE_OF_ID = '0x70a08231';

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

// Fetch Market Data from CoinGecko (Prices + Sparkline)
async function fetchCoinGeckoMarketData(): Promise<Record<string, { price: number, change: number, sparkline: number[] }>> {
  try {
    const ids = SUPPORTED_TOKENS.map(t => t.cgId).join(',');
    // sparkline=true returns 7d hourly data
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true`
    );
    const data = await response.json();
    
    if (!Array.isArray(data)) {
        console.error("CoinGecko API Error:", data);
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
  // 1. Fetch Market Data
  const marketData = await fetchCoinGeckoMarketData();

  // 2. Map through tokens and fetch balances (if address exists)
  const promises = SUPPORTED_TOKENS.map(async (token) => {
    let balance = 0;
    
    // Only fetch balance if we have an address
    if (address) {
      if (token.isNative) {
        balance = await getNativeBalance(address);
      } else if (token.address) {
        balance = await getTokenBalance(token.address, address, token.decimals);
      }
    }

    // Get price info
    const info = marketData[token.cgId];
    
    // Fallback logic with safe checks for null values
    const currentPrice = (info && info.price != null) ? info.price : (token.id === 'usd-coin' ? 1.0 : 0);
    const change24h = (info && info.change != null) ? info.change : 0;
    
    // Process Chart Data
    // CoinGecko returns 7 days of hourly data (~168 points).
    // We want the last 24 hours (~24 points).
    let history: number[] = [];
    if (info && info.sparkline && info.sparkline.length > 0) {
        // Take the last 24 points
        history = info.sparkline.slice(-24);
    } else {
        // Flat line fallback
        history = [currentPrice, currentPrice];
    }

    return {
      id: token.id,
      symbol: token.symbol,
      name: token.name,
      price: currentPrice,
      balance: balance,
      change24h: change24h,
      history: history,
      imageUrl: (token as any).imageUrl // Pass image URL
    };
  });

  return Promise.all(promises);
};
