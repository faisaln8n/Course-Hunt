import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsService } from '../services/settingsService';

export type CurrencyCode = 'USD' | 'INR' | 'PKR' | 'BDT';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  formatPrice: (priceStr: string | number) => string;
}

const defaultRates: Record<CurrencyCode, number> = {
  USD: 1,
  INR: 83.5,
  PKR: 278.5,
  BDT: 110.2,
};

const symbols: Record<CurrencyCode, string> = {
  USD: '$',
  INR: '₹',
  PKR: 'Rs',
  BDT: '৳',
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('app_currency');
    return (saved as CurrencyCode) || 'USD';
  });

  const [rates, setRates] = useState<Record<CurrencyCode, number>>(defaultRates);

  useEffect(() => {
    const loadRates = async () => {
      const settings = await settingsService.getSettings();
      if (settings.currencyRates) {
        setRates({
          USD: 1,
          INR: settings.currencyRates.INR,
          PKR: settings.currencyRates.PKR,
          BDT: settings.currencyRates.BDT,
        });
      }
    };
    loadRates();

    const handleSettingsUpdate = () => {
      loadRates();
    };

    window.addEventListener('settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('settings-updated', handleSettingsUpdate);
  }, []);

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyState(code);
    localStorage.setItem('app_currency', code);
    window.dispatchEvent(new CustomEvent('currency-changed', { detail: code }));
  };

  const formatPrice = (priceInput: string | number) => {
    let usdPrice = 0;
    if (typeof priceInput === 'string') {
      usdPrice = parseFloat(priceInput.replace(/[^0-9.]/g, '')) || 0;
    } else {
      usdPrice = priceInput;
    }

    if (usdPrice === 0) return currency === 'USD' ? 'FREE' : 'FREE';

    const convertedPrice = usdPrice * rates[currency];
    const symbol = symbols[currency];

    if (currency === 'USD') {
      return `${symbol}${convertedPrice.toFixed(2)}`;
    }
    
    return `${symbol} ${Math.round(convertedPrice).toLocaleString()}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
