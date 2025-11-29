
export interface TokenData {
  id: string;
  symbol: string;
  name: string;
  price: number;
  balance: number;
  change24h: number; // Percentage
  history: number[]; // Array of prices for chart
  imageUrl?: string;
  address?: string; // Contract address for viewToken action
}

export interface PortfolioState {
  totalValueUsd: number;
  tokens: TokenData[];
  isLoading: boolean;
}
