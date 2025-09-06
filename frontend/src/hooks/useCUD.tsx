import { useState } from "react";
import { AcademicFile, Payment, WebsiteConfig } from "./useData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface CUDOperations {
  academic_files: {
    create: (file: Partial<AcademicFile>) => Promise<any>;
    update: (file: Partial<AcademicFile>) => Promise<any>;
    delete: (id: number) => Promise<any>;
  };
  payments: {
    update: (payment: Partial<Payment>) => Promise<any>;
  };
  website_config: {
    update: (config: Partial<WebsiteConfig>) => Promise<any>;
  };
}

export const useCUD = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const academic_files = {
    create: async (file: Partial<AcademicFile>) => {
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
        const result = await res.json();
        if (!result.success) {
          throw new Error(result.error);
        }
        return result;
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    update: async (file: Partial<AcademicFile>) => {
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
        const result = await res.json();
        if (!result.success) {
          throw new Error(result.error);
        }
        return result;
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    delete: async (id: number) => {
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
            const result = await res.json();
            if (!result.success) {
                throw new Error(result.error);
            }
            return result;
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    },
  };

  const payments = {
    update: async (payment: Partial<Payment>) => {
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
        const result = await res.json();
        if (!result.success) {
          throw new Error(result.error);
        }
        return result;
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
  };

  const website_config = {
    update: async (config: Partial<WebsiteConfig>) => {
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
            const result = await res.json();
            if (!result.success) {
                throw new Error(result.error);
            }
            return result;
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    },
  };

  return { loading, error, academic_files, payments, website_config };
};
