// src/components/DataProvider.tsx
import React, { useEffect, useState } from "react";
import { DataContext } from "./DataContext";
import type { WebsiteConfig, AcademicFile, Payment } from "./DataContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [website_config, setWebsiteConfig] = useState<WebsiteConfig | null>(null);
  const [academic_files, setAcademicFiles] = useState<AcademicFile[] | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/backend/db_fetch.php`);
        const result = await res.json();
        if (result.success) {
          setWebsiteConfig(result.data.website_config);
          setAcademicFiles(result.data.academic_files);
          setPayments(result.data.payments);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, []);

  return (
    <DataContext.Provider value={{ website_config, academic_files, payments }}>
      {children}
    </DataContext.Provider>
  );
};