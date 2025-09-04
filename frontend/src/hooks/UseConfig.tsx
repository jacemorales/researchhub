import React, { createContext, useContext, useEffect, useState } from "react";

interface Config {
  [key: string]: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ConfigContext = createContext<{ config: Config | null }>({ config: null });

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/backend/config.php`);
        const data = await res.json();
        if (data.success) setConfig(data.config);
      } catch (err) {
        console.error("Error fetching config:", err);
      }
    };
    fetchConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ config }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const UseConfig = () => useContext(ConfigContext);
