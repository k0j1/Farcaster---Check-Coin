import { SUPPORTED_TOKENS, CHART_POINTS, BASE_RPC_URL } from '../constants';
import { TokenData } from '../types';

// ERC-20 balanceOf function selector: 0x70a08231
const BALANCE_OF_ID = '0x70a08231';

export const connectWallet = async (): Promise<string | null> => {
  if (!window.ethereum) {
    return null;
  }
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    return accounts && accounts.length > 0 ? accounts[0] : null;
  } catch (error) {
    console.error("User rejected connection", error);
    return null;
  }
};

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
    return data.result;
  } catch (e) {
    console.error(`RPC Error [${method}]:`, e);
    return null;
  }
}

// Fetch Token Balance via RPC
async function getTokenBalance(tokenAddress: string, userAddress: string, decimals: number): Promise<number> {
  // Pad address to 32 bytes (64 chars)
  const paddedAddress = userAddress.replace('0x', '').padStart(64, '0');
  const data = BALANCE_OF_ID + paddedAddress;

  const result = await jsonRpcCall('eth_call', [{
    to: tokenAddress,
    data: data
  }, 'latest']);

  if (!result || result === '0x') return 0;
  
  const hexValue = result;
  const value = BigInt(hexValue);
  return Number(value) / Math.pow(10, decimals);
}

// Fetch Native ETH Balance
async function getNativeBalance(userAddress: string): Promise<number> {
  const result = await jsonRpcCall('eth_getBalance', [userAddress, 'latest']);
  if (!result) return 0;
  return Number(BigInt(result)) / 1e18;
}

// Fetch Prices from CoinGecko
async function fetchPrices(): Promise<Record<string, { price: number, change: number }>> {
  try {
    const ids = SUPPORTED_TOKENS.map(t => t.cgId).join(',');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
    );
    const data = await response.json();
    
    // Normalize data structure
    const prices: Record<string, { price: number, change: number }> = {};
    SUPPORTED_TOKENS.forEach(token => {
      const cgData = data[token.cgId];
      if (cgData) {
        prices[token.id] = {
          price: cgData.usd,
          change: cgData.usd_24h_change
        };
      }
    });
    return prices;
  } catch (e) {
    console.error("Failed to fetch prices:", e);
    // Return empty object, logic below will handle fallbacks
    return {};
  }
}

// Generate realistic chart data based on actual 24h change
function generateTrendChart(startPrice: number, endPrice: number, points: number, volatility: number = 0.02): number[] {
  const history: number[] = [startPrice];
  let current = startPrice;
  const stepSize = (endPrice - startPrice) / points;

  for (let i = 1; i < points; i++) {
    // Add trend component + random noise
    // We want the final point to be close to endPrice, but with some randomness path
    const trend = stepSize;
    const noise = (Math.random() - 0.5) * (startPrice * volatility);
    current += trend + noise;
    history.push(current);
  }
  // Force the last point to be the current price
  history[history.length - 1] = endPrice;
  return history;
}

export const fetchPortfolioData = async (address: string | null): Promise<TokenData[]> => {
  // 1. Fetch Prices
  const priceData = await fetchPrices();

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

    // Get price info or fallback to some defaults if API fails
    const info = priceData[token.id];
    // Default prices if API fails (fallback to avoid broken UI)
    const currentPrice = info ? info.price : (token.id === 'usd-coin' ? 1.0 : 0);
    const change24h = info ? info.change : 0;

    // Calculate start price to generate chart
    // current = start * (1 + change/100)  =>  start = current / (1 + change/100)
    const startPrice = currentPrice / (1 + (change24h / 100));
    
    // Generate simulated chart based on real start/end points
    const history = generateTrendChart(startPrice, currentPrice, CHART_POINTS);

    return {
      id: token.id,
      symbol: token.symbol,
      name: token.name,
      price: currentPrice,
      balance: balance,
      change24h: change24h,
      history: history
    };
  });

  return Promise.all(promises);
};
