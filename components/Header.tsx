import React from 'react';

interface HeaderProps {
  totalBalance: number;
  isConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ totalBalance, isConnected }) => {
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
        
        {/* Simple Status Indicator */}
        <div className={`h-2 w-2 rounded-full mt-2 ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(46,204,113,0.6)]' : 'bg-red-300'}`} />
      </div>
    </div>
  );
};