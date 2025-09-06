import { useState } from "react";
import type { Payment, WebsiteConfig, AcademicFile } from "./useData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ApiResponse {
    success: boolean;
    message: string;
    error?: string;
}

const post = async (action: string, data: unknown): Promise<ApiResponse | undefined> => {
    try {
        const res = await fetch(`${API_BASE_URL}/backend/admin/C_U_D.php?action=${action}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        const result: ApiResponse = await res.json();
        if (!result.success) {
            throw new Error(result.error);
        }
        return result;
    } catch (err: unknown) {
        if (err instanceof Error) {
            // Re-throw or handle error as needed
            throw err;
        }
    }
};

export const useCUD = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const performCUD = async <T,>(action: string, data: T) => {
        setLoading(true);
        setError(null);
        try {
            return await post(action, data);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        payments: {
            update: (data: Partial<Payment>) => performCUD('update_payment', data)
        },
        website_config: {
            update: (data: Partial<WebsiteConfig>) => performCUD('update_settings', data)
        },
        academic_files: {
            save: (data: Partial<AcademicFile>) => performCUD('save_file', data)
        }
    };
};
