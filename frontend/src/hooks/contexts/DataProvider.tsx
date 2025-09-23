// src/components/DataProvider.tsx
import React, { useEffect, useState, useCallback } from "react";
import { DataContext } from "./DataContext";
import type { WebsiteConfig, AcademicFile, Payment, DataContextType } from "./DataContext";

type UserLocation = DataContextType['user_location'];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [website_config, setWebsiteConfig] = useState<WebsiteConfig | null>(null);
  const [academic_files, setAcademicFiles] = useState<AcademicFile[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [user_location, setUserLocation] = useState<UserLocation>(null);
  const [currency_code, setCurrencyCode] = useState<'USD' | 'NGN'>('USD');

  // Check if we already have location data cached
  const getCachedLocation = (): UserLocation => {
    try {
      const cached = localStorage.getItem('research_hub_location');
      if (cached) {
        const locationData = JSON.parse(cached) as { data: UserLocation; timestamp: number };
        // Cache location data for 1 hour (3600000 ms)
        if (Date.now() - locationData.timestamp < 3600000) {
          return locationData.data;
        }
      }
    } catch (err) {
      console.error("Error reading cached location:", err);
    }
    return null;
  };

  // Cache location data
  const setCachedLocation = (locationData: UserLocation) => {
    if (!locationData) return;
    try {
      localStorage.setItem('research_hub_location', JSON.stringify({
        data: locationData,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error("Error caching location:", err);
    }
  };

  const fetchInitialData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/backend/db_fetch.php?skip_location=true`);
      const result = await res.json();
      if (result.success) {
        setWebsiteConfig(result.data.website_config);
        setAcademicFiles(result.data.academic_files);
        setPayments(result.data.payments);
      }
    } catch (err) {
      console.error("Error fetching initial data:", err);
    }
  }, []);

  // Fetch initial data (without location) first
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Fetch location silently in background - with caching
  useEffect(() => {
    const fetchLocation = async () => {
      // Check cache first
      const cachedLocation = getCachedLocation();
      if (cachedLocation) {
        setUserLocation(cachedLocation);
        const code = cachedLocation.currency === 'NGN' ? 'NGN' : 'USD';
        setCurrencyCode(code);
        return;
      }

      // Fetch fresh location data silently
      try {
        const res = await fetch(`${API_BASE_URL}/backend/db_fetch.php?location_only=true`);
        const result = await res.json();
        if (result.success && result.data.user_location) {
          setUserLocation(result.data.user_location);
          setCachedLocation(result.data.user_location);
          const code = result.data.user_location.currency === 'NGN' ? 'NGN' : 'USD';
          setCurrencyCode(code);
        }
      } catch {
        // Silent error handling - don't log to avoid noise
      }
    };
    
    // Fetch location after a short delay to allow initial data to render
    const timeoutId = setTimeout(fetchLocation, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  const refreshData = useCallback(() => {
    return fetchInitialData();
  }, [fetchInitialData]);

  return (
    <DataContext.Provider value={{
      website_config,
      academic_files,
      payments,
      user_location,
      currency_code,
      currency_symbol: currency_code === 'NGN' ? '₦' : '$',
      setCurrencyCode,
      refreshData,
    }}>
      {children}
    </DataContext.Provider>
  );
};