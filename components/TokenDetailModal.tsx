import React, { useEffect, useState } from 'react';
import { mintclub } from 'mint.club-v2-sdk';
import { TokenData } from '../types';
import { X, Copy, ExternalLink, TrendingUp, DollarSign, Wallet } from 'lucide-react';

interface TokenDetailModalProps {
  token: TokenData | null;
  onClose: () => void;
}

export const TokenDetailModal: React.FC<TokenDetailModalProps> = ({ token, onClose }) => {
  const [mcDetails, setMcDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!token || !token.address) return;
    
    const fetchDetails = async () => {
      setLoadingDetails(true);
      try {
        // Attempt to fetch Mint Club specific details (Max Supply, Current Supply, etc.)
        // This is most effective for tokens created via Mint Club protocol.
        // Cast to any to bypass potential type mismatches in the SDK version.
        const details = await (mintclub.network('base').token(token.address!) as any).getDetail();
        setMcDetails(details);
      } catch (e) {
        // Silently fail if not a Mint Club token or API error
        setMcDetails(null);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
    
    // Lock body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [token]);

  if (!token) return null;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 6 }).format(val);

  const formatNumber = (val: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(val);

  const handleCopy = () => {
    if (token.address) {
       navigator.clipboard.writeText(token.address);
    }
  };

  const isMintClubToken = !!mcDetails;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 flex-shrink-0">
               {token.imageUrl ? (
                 <img src={token.imageUrl} alt={token.symbol} className="w-10 h-10 rounded-full bg-white shadow-sm object-cover" />
               ) : (
                 <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">{token.symbol[0]}</div>
               )}
             </div>
             <div>
               <h3 className="font-bold text-gray-900 leading-tight">{token.name}</h3>
               <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                 {token.address?.slice(0, 6)}...{token.address?.slice(-4)}
                 <button onClick={handleCopy} className="p-1 hover:bg-gray-200 rounded transition-colors" aria-label="Copy Address">
                   <Copy size={12} />
                 </button>
               </div>
             </div>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
           
           {/* Price Section */}
           <div className="text-center">
             <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Current Price</div>
             <div className="text-4xl font-extrabold text-gray-900 tracking-tight">{formatCurrency(token.price)}</div>
             <div className={`flex items-center justify-center gap-1 mt-2 font-bold text-sm ${token.change24h >= 0 ? 'text-[#2ecc71]' : 'text-[#ff4d4d]'}`}>
                <TrendingUp size={16} className={token.change24h < 0 ? 'rotate-180' : ''} />
                <span>{Math.abs(token.change24h).toFixed(2)}% (24h)</span>
             </div>
           </div>

           {/* Holdings Grid */}
           <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                 <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold uppercase mb-2">
                    <Wallet size={14} className="text-gray-400" /> Balance
                 </div>
                 <div className="text-lg font-bold text-gray-800 break-words leading-none">
                    {formatNumber(token.balance)}
                 </div>
                 <div className="text-xs text-gray-400 mt-1">{token.symbol}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                 <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold uppercase mb-2">
                    <DollarSign size={14} className="text-gray-400" /> Value
                 </div>
                 <div className="text-lg font-bold text-gray-800 leading-none">
                    {formatCurrency(token.price * token.balance)}
                 </div>
                 <div className="text-xs text-gray-400 mt-1">USD</div>
              </div>
           </div>

           {/* Mint Club Details (Only if available) */}
           {mcDetails && mcDetails.info && (
             <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  Token Info
                </h4>
                <div className="space-y-2 text-sm">
                   {mcDetails.info.maxSupply && (
                     <div className="flex justify-between">
                        <span className="text-indigo-600/80">Max Supply</span>
                        <span className="font-mono font-medium text-indigo-900">{formatNumber(Number(mcDetails.info.maxSupply) / 10 ** 18)}</span>
                     </div>
                   )}
                   {mcDetails.info.currentSupply && (
                     <div className="flex justify-between">
                        <span className="text-indigo-600/80">Current Supply</span>
                        <span className="font-mono font-medium text-indigo-900">{formatNumber(Number(mcDetails.info.currentSupply) / 10 ** 18)}</span>
                     </div>
                   )}
                </div>
             </div>
           )}

           {/* Actions */}
           <div className="grid grid-cols-2 gap-3 pt-2">
              <a 
                href={`https://base.blockscout.com/token/${token.address}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all active:scale-95"
              >
                 <ExternalLink size={18} /> Explorer
              </a>
              <a 
                href={`https://mint.club/token/base/${token.symbol}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-bold rounded-xl shadow-sm transition-all active:scale-95"
              >
                 Trade
              </a>
           </div>

        </div>

      </div>
    </div>
  );
};
