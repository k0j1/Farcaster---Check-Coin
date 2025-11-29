
import React, { useState, useEffect, useRef } from 'react';
import { TokenData } from '../types';
import { Sparkline } from './Sparkline';

interface TokenRowProps {
  token: TokenData;
  onClick?: (token: TokenData) => void;
}

export const TokenRow: React.FC<TokenRowProps> = ({ token, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const [isChartVisible, setIsChartVisible] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  // Lazy load chart visibility logic
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsChartVisible(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '200px', // Load before it comes into view
        threshold: 0.01 
      }
    );

    if (rowRef.current) {
      observer.observe(rowRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);
  
  // Safely handle potentially null/undefined change24h
  const changeValue = token.change24h ?? 0;
  const isPositive = changeValue >= 0;
  const color = isPositive ? '#2ecc71' : '#ff4d4d'; // Green or Red
  
  // Format price
  const formatPrice = (price: number) => {
    if (price === 0) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: price < 1 ? 4 : 2,
      maximumFractionDigits: price < 1 ? 4 : 2
    }).format(price);
  };

  // Format balance
  const formatBalance = (balance: number) => {
    if (balance > 0 && balance < 0.0001) {
       return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 8
       }).format(balance);
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    }).format(balance);
  };

  return (
    <div 
      ref={rowRef} 
      onClick={() => onClick && onClick(token)}
      className="flex items-center justify-between p-4 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer active:bg-gray-100"
    >
      
      {/* Left: Icon & Symbol & Unit Price */}
      <div className="flex items-center space-x-3 w-1/3">
        <div className="w-10 h-10 flex-shrink-0">
          {token.imageUrl && !imageError ? (
            <img 
              src={token.imageUrl} 
              alt={token.symbol} 
              className="w-10 h-10 rounded-full object-cover shadow-sm bg-white"
              onError={() => setImageError(true)}
            />
          ) : (
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm" 
              style={{ backgroundColor: getIconColor(token.symbol) }}
            >
              {token.symbol[0]}
            </div>
          )}
        </div>
        <div>
          <div className="font-bold text-gray-800 break-words line-clamp-1" title={token.symbol}>{token.symbol}</div>
          {/* Display Unit Price under the name */}
          <div className="text-xs text-gray-500 font-medium">{formatPrice(token.price)}</div>
        </div>
      </div>

      {/* Middle: Chart (Lazy Loaded) */}
      <div className="w-1/4 flex justify-center">
        {isChartVisible ? (
           <Sparkline data={token.history} color={color} width={60} height={30} />
        ) : (
           <div style={{ width: 60, height: 30 }} /> 
        )}
      </div>

      {/* Right: Holding Value & Change */}
      <div className="w-1/3 text-right">
        <div className="font-mono font-medium text-gray-900">
            {/* Show Holding Value if balance exists, else show Unit Price (for demo view) */}
            {token.balance > 0 
                ? formatPrice(token.price * token.balance) 
                : formatPrice(token.price)
            }
        </div>
        <div className={`text-xs font-medium ${isPositive ? 'text-coincheck-green' : 'text-coincheck-red'}`}>
          {isPositive ? '+' : ''}{changeValue.toFixed(2)}%
        </div>
        {token.balance > 0 && (
          <div className="text-xs text-gray-400 mt-1">
            Bal: {formatBalance(token.balance)}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper for icon colors fallback
function getIconColor(symbol: string): string {
  switch (symbol) {
    case 'ETH': return '#627EEA';
    case 'USDC': return '#2775CA';
    case 'DEGEN': return '#7C3AED';
    case 'BRETT': return '#2ecc71';
    case 'HIGHER': return '#16a34a';
    default: return '#999';
  }
}
