import { useState } from "react";
import type { AcademicFile, Payment, WebsiteConfig } from "./useData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ApiResponse {
    success: boolean;
    message: string;
    file_id?: number;
    error?: string;
}

interface CUDOperations {
  academic_files: {
    create: (file: Partial<AcademicFile>) => Promise<ApiResponse | undefined>;
    update: (file: Partial<AcademicFile>) => Promise<ApiResponse | undefined>;
    delete: (id: number) => Promise<ApiResponse | undefined>;
  };
  payments: {
    update: (payment: Partial<Payment>) => Promise<ApiResponse | undefined>;
  };
  website_config: {
    update: (config: Partial<WebsiteConfig>) => Promise<ApiResponse | undefined>;
  };
}

export const useCUD = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const academic_files = {
    create: async (file: Partial<AcademicFile>): Promise<ApiResponse | undefined> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/backend/admin/C_U_D.php?action=save_academic_file`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(file),
        });
        const result: ApiResponse = await res.json();
        if (!result.success) {
          throw new Error(result.error);
        }
        return result;
      } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    },
    update: async (file: Partial<AcademicFile>): Promise<ApiResponse | undefined> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/backend/admin/C_U_D.php?action=save_academic_file`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(file),
        });
        const result: ApiResponse = await res.json();
        if (!result.success) {
          throw new Error(result.error);
        }
        return result;
      } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    },
    delete: async (id: number): Promise<ApiResponse | undefined> => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/backend/admin/C_U_D.php?action=delete_academic_file`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id }),
            });
            const result: ApiResponse = await res.json();
            if (!result.success) {
                throw new Error(result.error);
            }
            return result;
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    },
  };

  const payments = {
    update: async (payment: Partial<Payment>): Promise<ApiResponse | undefined> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/backend/admin/C_U_D.php?action=update_payment_status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payment),
        });
        const result: ApiResponse = await res.json();
        if (!result.success) {
          throw new Error(result.error);
        }
        return result;
      } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    },
  };

  const website_config = {
    update: async (config: Partial<WebsiteConfig>): Promise<ApiResponse | undefined> => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/backend/admin/C_U_D.php?action=update_config`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(config),
            });
            const result: ApiResponse = await res.json();
            if (!result.success) {
                throw new Error(result.error);
            }
            return result;
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    },
  };

  return { loading, error, academic_files, payments, website_config };
};
