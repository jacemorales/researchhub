import { useState, useCallback } from 'react';

interface CryptoPrice {
  bitcoin: number;
  solana: number;
  tron: number;
}

interface CryptoPricingHook {
  prices: CryptoPrice | null;
  loading: boolean;
  error: string | null;
  getCryptoPrices: () => Promise<void>;
  convertUSDToCrypto: (usdAmount: number, cryptoType: 'bitcoin' | 'solana' | 'tron') => number;
}

const CACHE_KEY = 'cryptoPricesCache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useCryptoPricing = (): CryptoPricingHook => {
  const [prices, setPrices] = useState<CryptoPrice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCryptoPrices = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Check cache first
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setPrices(data);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error("Error reading crypto cache", e);
    }

    // If cache is invalid or missing, fetch new data
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,solana,tron&vs_currencies=usd',
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const newPrices = {
        bitcoin: data.bitcoin?.usd || 0,
        solana: data.solana?.usd || 0,
        tron: data.tron?.usd || 0,
      };
      
      setPrices(newPrices);
      // Cache the new data
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: newPrices, timestamp: Date.now() }));

    } catch (err) {
      console.error('Error fetching crypto prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch crypto prices');
    } finally {
      setLoading(false);
    }
  }, []);

  const convertUSDToCrypto = (usdAmount: number, cryptoType: 'bitcoin' | 'solana' | 'tron'): number => {
    if (!prices || !prices[cryptoType]) {
      return 0;
    }
    return usdAmount / prices[cryptoType];
  };

  return {
    prices,
    loading,
    error,
    getCryptoPrices,
    convertUSDToCrypto,
  };
};