
import React from 'react';
import sdk from '@farcaster/frame-sdk';
import { Share } from 'lucide-react';
import { TokenData } from '../types';

interface HeaderProps {
  totalBalance: number;
  isConnected: boolean;
  isUpdating?: boolean;
  selectedToken: TokenData | null;
  onConnect: () => void;
}

export const Header: React.FC<HeaderProps> = ({ totalBalance, isConnected, isUpdating, selectedToken, onConnect }) => {
  
  const handleShare = () => {
    let text = "Checking my onchain assets on Base. 🔵📉📈 \n\n#Base #Farcaster";
    
    // Construct a clean base URL without query params or hash
    const baseUrl = window.location.origin + window.location.pathname;
    const urlObj = new URL(baseUrl);

    // If a token is selected, share that specific token page
    if (selectedToken && selectedToken.address) {
       text = `Check out $${selectedToken.symbol} on Base! 🔵🚀 \n\n#Base #Farcaster #${selectedToken.symbol}`;
       urlObj.searchParams.set("token", selectedToken.address);
    }
    
    const embedUrl = encodeURIComponent(urlObj.toString());
    const encodedText = encodeURIComponent(text);
    const warpcastUrl = `https://warpcast.com/~/compose?text=${encodedText}&embeds[]=${embedUrl}`;
    
    sdk.actions.openUrl(warpcastUrl);
  };

  return (
    <div className="bg-white px-6 py-6 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-1">Total Balance</h1>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-bold text-gray-800">
              {isConnected ? 
                new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalBalance) 
                : '$0.00'
              }
            </span>
            <span className="text-sm text-gray-400">USD</span>
          </div>
        </div>
        
        {/* Right Side: Status, Share, Connect */}
        <div className="flex flex-col items-end gap-2">
          
          <div className="flex items-center gap-2">
            {/* Share Button */}
            <button 
              onClick={handleShare}
              className="p-2 text-gray-400 hover:text-coincheck-green hover:bg-green-50 rounded-full transition-colors"
              aria-label="Share on Warpcast"
            >
              <Share size={20} />
            </button>

            {isConnected ? (
              <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full">
                <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(46,204,113,0.6)]" />
                <span className="text-xs text-gray-500 font-medium">Active</span>
              </div>
            ) : (
              <button 
                onClick={onConnect}
                className="px-4 py-2 bg-coincheck-green hover:bg-green-600 text-white text-xs font-bold rounded-full shadow-sm transition-all active:scale-95"
              >
                Connect
              </button>
            )}
          </div>

          {/* Background Update Indicator */}
          {isConnected && isUpdating && (
             <div className="text-[10px] text-amber-500 animate-pulse font-bold tracking-wide mr-1">
                Updating...
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
