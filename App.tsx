import React, { useState, useEffect, useCallback } from 'react';
import sdk from '@farcaster/frame-sdk';
import { Header } from './components/Header';
import { TokenRow } from './components/TokenRow';
import { connectWallet, fetchPortfolioData } from './services/web3';
import { TokenData } from './types';

const App: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [connectionType, setConnectionType] = useState<'farcaster' | 'external' | null>(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(false);

  // Data Fetching Logic
  const loadPortfolio = useCallback(async (address: string | null) => {
    setLoading(true);
    try {
      console.log("Loading portfolio for:", address);
      const data = await fetchPortfolioData(address);
      setTokens(data);
      
      // Calculate Total Value
      const total = data.reduce((acc, token) => acc + (token.price * token.balance), 0);
      setTotalValue(total);
    } catch (e) {
      console.error("Failed to load portfolio", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper to extract address from Farcaster Context
  const getFarcasterAddress = useCallback((context: any): string | null => {
    const user = context?.user as any;
    if (!user) return null;

    // Priority 1: Verified Addresses (connected wallet)
    if (user.verifiedAddresses && user.verifiedAddresses.length > 0) {
      return user.verifiedAddresses[0];
    } 
    // Priority 2: Custody Address (farcaster recovery)
    if (user.custodyAddress) {
      return user.custodyAddress;
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
          setConnectionType('farcaster');
          loadPortfolio(fcAddress);
        } else {
          // If no address found in context, load generic data
          loadPortfolio(null);
        }

        sdk.actions.ready();
      } catch (e) {
        console.error("Error initializing SDK:", e);
        loadPortfolio(null);
      }
    };
    
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      initSDK();
    }
  }, [isSDKLoaded, getFarcasterAddress, loadPortfolio]);
  
  // Handle "Connect Wallet" button click
  // PRIORITIZE: Farcaster Context -> Then External Wallet
  const handleConnect = async () => {
    setLoading(true);
    try {
      // 1. Try to get Farcaster Context again (in case it wasn't ready initially)
      const context = await sdk.context;
      const fcAddress = getFarcasterAddress(context);

      if (fcAddress) {
        console.log("Connected via Farcaster Context:", fcAddress);
        setAccount(fcAddress);
        setConnectionType('farcaster');
        loadPortfolio(fcAddress);
        return; // Stop here, do not open MetaMask
      }

      // 2. If no Farcaster address, try External Wallet (MetaMask)
      console.log("No Farcaster address found, trying external wallet...");
      const address = await connectWallet();
      if (address) {
        console.log("Connected via External Wallet:", address);
        setAccount(address);
        setConnectionType('external');
        loadPortfolio(address);
      }
    } catch (e) {
      console.error("Connection failed:", e);
    } finally {
      setLoading(false);
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

        {/* Token List */}
        {!loading && (
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

        {/* Action Area */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-lg">
          {!account ? (
            <button 
              onClick={handleConnect}
              className="w-full py-3.5 bg-coincheck-green hover:bg-green-600 text-white rounded-lg font-bold shadow-md transition-all active:scale-95 text-sm"
            >
              Connect Wallet
            </button>
          ) : (
             <div className="text-center">
                 <p className="text-xs text-gray-400 mb-2">
                   Connected: {account.slice(0,6)}...{account.slice(-4)} 
                   {connectionType === 'farcaster' && <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded text-[10px]">Farcaster</span>}
                 </p>
                 <div className="flex space-x-2">
                   <button 
                    onClick={() => loadPortfolio(account)}
                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-lg font-bold border border-gray-300 text-sm active:bg-gray-200"
                  >
                    Refresh
                  </button>
                  {/* Allow connecting a different wallet even if logged in via Farcaster */}
                  <button 
                    onClick={handleConnect}
                    className="flex-1 py-3 bg-white text-coincheck-green border border-coincheck-green rounded-lg font-bold text-sm active:bg-gray-50"
                  >
                    Switch Wallet
                  </button>
                 </div>
             </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default App;