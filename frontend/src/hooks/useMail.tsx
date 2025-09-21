// src/hooks/useMail.tsx
import { useState } from 'react';

interface MailOptions {
  email: 'receipt' | 'file';
  recipient_email: string;
  recipient_name?: string;
  // For receipt emails
  payment_id?: string;
  amount?: number;
  currency?: string;
  payment_method?: string;
  // For file emails
  file_name?: string;
  file_link?: string;
  link_expires?: string;
  customer_name?: string;
}

interface MailResponse {
  success: boolean;
  message?: string;
  error?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const useMail = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sendMail = async (options: MailOptions): Promise<MailResponse> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const url = `${API_BASE_URL}/backend/send_mail.php?email=${options.email}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: MailResponse = await response.json();

      if (result.success) {
        setSuccess(result.message || "Email sent successfully");
      } else {
        setError(result.error || "Failed to send email");
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
    sendMail,
    loading,
    error,
    success,
  };
};
