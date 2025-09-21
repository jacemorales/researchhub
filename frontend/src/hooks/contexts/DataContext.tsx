// src/contexts/DataContext.tsx
import { createContext } from "react";

export interface WebsiteConfig {
  [key: string]: string;
}

export interface AcademicFile {
  id: number;
  drive_file_id: string;
  file_name: string;
  file_type: string;
  file_size: string;
  modified_date: string;
  description: string | null;
  category: 'research' | 'thesis' | 'dissertation' | 'assignment' | 'project' | 'presentation' | 'other';
  level: 'undergraduate' | 'postgraduate';
  price: string | null; // JSON string
  r2_key: string | null;
  r2_url: string | null;
  r2_upload_status: 'pending' | 'uploading' | 'success' | 'failed';
  r2_upload_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
    id: number;
    drive_file_id: number; // ✅ was file_id
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    amount: number;
    currency: string;
    payment_method: 'paypal' | 'stripe' | 'bank_transfer' | 'crypto' | 'nowpayments' | 'paystack' | 'manual'; // ✅ added paystack, manual
    reference: string | null; // ✅ was transaction_id
    payment_status: 'pending' | 'completed' | 'failed' | 'refunded' | 'abandoned'; // ✅ was status
    admin_status: 'pending' | 'approved' | 'rejected'; // ✅ new field
    started_at: string; // ✅ new field (ISO string)
    updated_at: string;
    completed_at: string | null; // ✅ new field
    transaction_logs: string | null; // ✅ new field (JSON string)
}

export interface DataContextType {
  website_config: WebsiteConfig | null;
  academic_files: AcademicFile[] | null;
  payments: Payment[] | null;
  user_location: {
    country: string;
    state: string;
    city?: string;
    ip?: string | null;
    currency: string;
    currency_symbol: string;
    api_status?: string;
    raw_response?: Record<string, unknown>;
    ip_type?: string;
  } | null;
  currency_code: 'USD' | 'NGN';
  currency_symbol: string; // derived from currency_code
  setCurrencyCode: (code: 'USD' | 'NGN') => void;
}

export const DataContext = createContext<DataContextType>({
  website_config: null,
  academic_files: null,
  payments: null,
  user_location: null,
  currency_code: 'USD',
  currency_symbol: '$',
  setCurrencyCode: () => {},
});