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
  const [loading, setLoading] = useState(true);
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
  const getFarcasterAddress = useCallback((context: any): string | null => {
    if (!context || !context.user) return null;
    
    const { user } = context;
    // Priority 1: Verified Addresses
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

  // Manual Wallet Connection (Fallback per Farcaster Wallets Guide)
  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      // Use the injected Ethereum provider from the SDK
      // This is the recommended way to get the active wallet in a Frame
      const addresses = await sdk.wallet.ethProvider.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];

      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        console.log("Wallet connected via provider:", address);
        setAccount(address);
        await loadPortfolio(address);
      } else {
        setError("No accounts found.");
        setLoading(false);
      }
    } catch (e) {
      console.error("Wallet connection failed:", e);
      setError("Failed to connect wallet.");
      setLoading(false);
    }
  }, [loadPortfolio]);

  // Initialize Farcaster SDK
  useEffect(() => {
    const initSDK = async () => {
      if (isSDKLoaded) return;
      
      try {
        setIsSDKLoaded(true);
        // Call ready() immediately to optimize performance
        sdk.actions.ready();
        
        // Try to get Context for Auto-Login
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("SDK Context Timeout")), 2000)
        );

        try {
            console.log("Attempting to fetch context...");
            const context: any = await Promise.race([sdk.context, timeout]);
            console.log("Context received:", context);

            const fcAddress = getFarcasterAddress(context);

            if (fcAddress) {
              console.log("Found address in context:", fcAddress);
              setAccount(fcAddress);
              await loadPortfolio(fcAddress);
            } else {
              // Context loaded but no address found -> Load demo view
              console.log("No address in context, waiting for manual connection.");
              await loadPortfolio(null);
            }
        } catch (contextError) {
            console.warn("Context fetch failed or timed out:", contextError);
            // On context failure, we don't block the app. 
            // We just load the "Not Connected" view and let the user click Connect.
            await loadPortfolio(null);
        }

      } catch (e) {
        console.error("Critical SDK Error:", e);
        await loadPortfolio(null);
      }
    };
    
    initSDK();
  }, [isSDKLoaded, getFarcasterAddress, loadPortfolio]);
  
  // Handle "Refresh"
  const handleRefresh = () => {
      if (account) {
          loadPortfolio(account);
      }
  };

  // Display logic
  const displayedTokens = account 
    ? tokens.filter(t => t.balance > 0) 
    : tokens;

  return (
    <div className="min-h-screen bg-coincheck-bg text-coincheck-text font-sans">
      <Header 
        totalBalance={totalValue} 
        isConnected={!!account} 
        onConnect={connectWallet}
      />

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
                  {account ? "We couldn't find any supported Base tokens in this wallet." : "Connect wallet to view your assets."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer for Connected Users (Refresh Button) */}
        {account && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg">
             <div className="text-center">
                 <p className="text-xs text-gray-400 mb-2">
                   Connected: {account.slice(0,6)}...{account.slice(-4)} 
                 </p>
                 <button 
                  onClick={handleRefresh}
                  className="w-full py-3 bg-white border border-coincheck-green text-coincheck-green hover:bg-gray-50 rounded-lg font-bold shadow-sm transition-all active:scale-95 text-sm"
                >
                  Refresh Balance
                </button>
             </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;