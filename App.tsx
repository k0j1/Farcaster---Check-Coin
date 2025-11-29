import React, { useState, useEffect, useCallback } from 'react';
import sdk, { type Context } from '@farcaster/frame-sdk';
import { Header } from './components/Header';
import { TokenRow } from './components/TokenRow';
import { connectWallet, fetchPortfolioData } from './services/web3';
import { TokenData } from './types';

const App: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(false);

  // Data Fetching Logic
  const loadData = useCallback(async (address: string | null) => {
    setLoading(true);
    try {
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

  // Initialize Farcaster SDK and get Context
  useEffect(() => {
    const load = async () => {
      try {
        const context = await sdk.context;
        
        // Try to get address from Farcaster Context
        let userAddress: string | null = null;
        
        if (context?.user) {
          // Priority 1: Verified Addresses (usually their main wallet)
          if (context.user.verifiedAddresses && context.user.verifiedAddresses.length > 0) {
            userAddress = context.user.verifiedAddresses[0];
          } 
          // Priority 2: Custody Address (their Farcaster recovery address)
          else if (context.user.custodyAddress) {
            userAddress = context.user.custodyAddress;
          }
        }

        if (userAddress) {
          console.log("Found Farcaster user address:", userAddress);
          setAccount(userAddress);
          loadData(userAddress);
        } else {
          // If no address found in context, just load generic data
          loadData(null);
        }

        sdk.actions.ready();
      } catch (e) {
        console.error("Error initializing SDK:", e);
        loadData(null);
      }
    };
    
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded, loadData]);
  
  // Connect Metamask handler (Override Farcaster address)
  const handleConnect = async () => {
    const address = await connectWallet();
    if (address) {
      setAccount(address);
      loadData(address);
    }
  };

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
            {tokens.map((token) => (
              <TokenRow key={token.id} token={token} />
            ))}
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
                 <p className="text-xs text-gray-400 mb-2">Connected: {account.slice(0,6)}...{account.slice(-4)}</p>
                 <div className="flex space-x-2">
                   <button 
                    onClick={() => loadData(account)}
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
