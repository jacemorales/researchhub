// src/hooks/useCUD.tsx
import { useState } from 'react';

interface CUDOptions {
  table: string; // e.g., 'website_config', 'academic_files', 'payments'
  action: 'insert' | 'update' | 'delete';
}

interface CUDResponse<T = null> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  inserted_id?: number | string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const useCUD = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const execute = async <P = unknown, R = null>(
    options: CUDOptions,
    payload: P
  ): Promise<CUDResponse<R>> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const url = `${API_BASE_URL}/backend/cud.php?table=${options.table}&action=${options.action}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: CUDResponse<R> = await response.json();

      if (result.success) {
        setSuccess(result.message || "Operation completed successfully");
      } else {
        setError(result.error || "Operation failed");
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    execute,
    loading,
    error,
    success,
  };
};