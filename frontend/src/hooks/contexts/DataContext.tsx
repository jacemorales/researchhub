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
  transaction_id: string;
  file_id: number;
  customer_name: string;
  customer_email: string;
  payment_method: 'paypal' | 'stripe' | 'bank_transfer' | 'crypto';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_data: string | null; // JSON string
  created_at: string;
  updated_at: string;
}

export interface DataContextType {
  website_config: WebsiteConfig | null;
  academic_files: AcademicFile[] | null;
  payments: Payment[] | null;
}

export const DataContext = createContext<DataContextType>({
  website_config: null,
  academic_files: null,
  payments: null,
});