import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Check } from 'lucide-react';
import { useCurrency, CurrencyCode } from './CurrencyContext';

const currencies: { code: CurrencyCode; name: string; symbol: string }[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
];

function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const CurrencySwitcher: React.FC<{ className?: string }> = ({ className }) => {
  const { currency, setCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full bg-slate-50 border border-slate-200 hover:border-[#FF6B35] transition-all shadow-sm flex items-center justify-center"
        aria-label="Switch Currency"
      >
        <DollarSign className="w-5 h-5 text-[#FF6B35]" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-3 w-64 bg-white border border-slate-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-[100] flex flex-col max-h-[70vh] md:max-h-none"
          >
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1 bg-[#FF6B35]/10 rounded-lg">
                  <DollarSign className="w-3.5 h-3.5 text-[#FF6B35]" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Currency Settings</span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 leading-tight">Choose your preferred currency for prices and payments.</p>
            </div>
            <div className="p-2 overflow-y-auto custom-scrollbar">
              {currencies.map((item) => (
                <button
                  key={item.code}
                  onClick={() => {
                    setCurrency(item.code);
                    setIsOpen(false);
                  }}
                  className={`w-full group flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                    currency === item.code 
                      ? 'bg-[#FF6B35]/5 text-[#FF6B35]' 
                      : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-sm transition-all duration-200 ${
                      currency === item.code 
                        ? 'bg-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/20' 
                        : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-md'
                    }`}>
                      {item.symbol}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-black uppercase tracking-wider">{item.code}</span>
                      <span className="text-[10px] font-bold opacity-60">{item.name}</span>
                    </div>
                  </div>
                  {currency === item.code && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 bg-[#FF6B35] rounded-full flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                <span>Auto-Conversion</span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
