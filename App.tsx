import React, { useState, useEffect, useCallback } from 'react';
import sdk from '@farcaster/frame-sdk';
import { Header } from './components/Header';
import { TokenRow } from './components/TokenRow';
import { fetchPortfolioData } from './services/web3';
import { TokenData } from './types';

const App: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data Fetching Logic
  const loadPortfolio = useCallback(async (address: string | null) => {
    setLoading(true);
    setError(null);
    try {
      console.log("Loading portfolio for:", address);
      const data = await fetchPortfolioData(address);
      setTokens(data);
      
      // Calculate Total Value
      const total = data.reduce((acc, token) => acc + (token.price * token.balance), 0);
      setTotalValue(total);
    } catch (e) {
      console.error("Failed to load portfolio", e);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper to extract address from Farcaster Context
  // Handles both camelCase and snake_case properties for robustness
  const getFarcasterAddress = useCallback((context: any): string | null => {
    if (!context || !context.user) return null;
    
    const { user } = context;
    console.log("Farcaster User Context:", user);

    // Priority 1: Verified Addresses
    // Check both camelCase (newer SDK) and snake_case (raw JSON)
    const verified = user.verifiedAddresses || user.verified_addresses;
    if (Array.isArray(verified) && verified.length > 0) {
      return verified[0];
    } 
    
    // Priority 2: Custody Address
    const custody = user.custodyAddress || user.custody_address;
    if (custody) {
      return custody;
    }
    
    return null;
  }, []);

  // Initialize Farcaster SDK
  useEffect(() => {
    const initSDK = async () => {
      try {
        const context = await sdk.context;
        const fcAddress = getFarcasterAddress(context);

        if (fcAddress) {
          console.log("Found Farcaster user address:", fcAddress);
          setAccount(fcAddress);
          loadPortfolio(fcAddress);
        } else {
          // If no address found in context, load generic data
          console.log("No Farcaster address found in context. Context:", context);
          loadPortfolio(null);
        }
      } catch (e) {
        console.error("Error initializing SDK:", e);
        loadPortfolio(null);
      } finally {
        // Always call ready() to ensure the app doesn't hang
        sdk.actions.ready();
      }
    };
    
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      initSDK();
    }
  }, [isSDKLoaded, getFarcasterAddress, loadPortfolio]);
  
  // Handle "Refresh"
  const handleRefresh = () => {
      if (account) {
          loadPortfolio(account);
      }
  };

  // Filter tokens logic:
  // If connected: Show only tokens with balance > 0
  // If not connected: Show all supported tokens (as a market view/demo)
  const displayedTokens = account 
    ? tokens.filter(t => t.balance > 0) 
    : tokens;

  return (
    <div className="min-h-screen bg-coincheck-bg text-coincheck-text font-sans">
      <Header totalBalance={totalValue} isConnected={!!account} />

      <main className="max-w-md mx-auto pb-24">
        
        {/* Token List Header */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between text-xs text-gray-500 uppercase font-semibold">
          <span className="w-1/3">Asset</span>
          <span className="w-1/4 text-center">24H Chart</span>
          <span className="w-1/3 text-right">Price / Holdings</span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coincheck-green"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
            <div className="p-4 text-center text-red-500 text-sm">
                {error}
            </div>
        )}

        {/* Token List */}
        {!loading && !error && (
          <div className="bg-white shadow-sm">
            {displayedTokens.length > 0 ? (
              displayedTokens.map((token) => (
                <TokenRow key={token.id} token={token} />
              ))
            ) : (
              <div className="p-10 text-center">
                <p className="text-gray-400 font-medium mb-1">No assets found</p>
                <p className="text-xs text-gray-300">
                  {account ? "We couldn't find any supported Base tokens in this wallet." : "Connect via Farcaster to view your assets."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Status / Footer */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg">
          {!account ? (
             <div className="text-center p-2">
                 <p className="text-sm font-bold text-gray-500">Not Connected</p>
                 <p className="text-xs text-gray-400 mt-1">
                   Could not detect Farcaster wallet. 
                   <br/>Make sure you are opening this in Warpcast.
                 </p>
             </div>
          ) : (
             <div className="text-center">
                 <p className="text-xs text-gray-400 mb-2">
                   Connected: {account.slice(0,6)}...{account.slice(-4)} 
                   <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded text-[10px]">Farcaster</span>
                 </p>
                 <button 
                  onClick={handleRefresh}
                  className="w-full py-3 bg-coincheck-green hover:bg-green-600 text-white rounded-lg font-bold shadow-md transition-all active:scale-95 text-sm"
                >
                  Refresh Balance
                </button>
             </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default App;