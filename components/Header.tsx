import React from 'react';

interface HeaderProps {
  totalBalance: number;
  isConnected: boolean;
  onConnect: () => void;
}

export const Header: React.FC<HeaderProps> = ({ totalBalance, isConnected, onConnect }) => {
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
        
        {/* Right Side: Status or Connect Button */}
        <div>
          {isConnected ? (
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-xs text-gray-400 font-medium">Active</span>
              <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(46,204,113,0.6)]" />
            </div>
          ) : (
            <button 
              onClick={onConnect}
              className="mt-1 px-4 py-2 bg-coincheck-green hover:bg-green-600 text-white text-xs font-bold rounded-full shadow-sm transition-all active:scale-95"
            >
              Connect
            </button>
          )}
        </div>
      </div>
    </div>
  );
};