import { useState, useEffect } from 'react';

interface CryptoPrice {
  bitcoin: number;
  solana: number;
  tron: number;
}

interface CryptoPricingHook {
  prices: CryptoPrice | null;
  loading: boolean;
  error: string | null;
  convertUSDToCrypto: (usdAmount: number, cryptoType: 'bitcoin' | 'solana' | 'tron') => number;
}

export const useCryptoPricing = (): CryptoPricingHook => {
  const [prices, setPrices] = useState<CryptoPrice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCryptoPrices = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Using CoinGecko API (free tier)
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,solana,tron&vs_currencies=usd',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setPrices({
        bitcoin: data.bitcoin?.usd || 0,
        solana: data.solana?.usd || 0,
        tron: data.tron?.usd || 0,
      });
    } catch (err) {
      console.error('Error fetching crypto prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch crypto prices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCryptoPrices();
    
    // Refresh prices every 5 minutes
    const interval = setInterval(fetchCryptoPrices, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
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
    convertUSDToCrypto,
  };
};
