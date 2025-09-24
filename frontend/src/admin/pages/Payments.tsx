// src/pages/Payments.tsx
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useData } from '../../hooks/useData';
import { useCUD } from '../../hooks/useCUD';
import { useMail } from '../../hooks/useMail';
import type { Payment, AcademicFile } from '../../hooks/contexts/DataContext';
import { AdminToast } from '../../hooks/Toast';
import Header from '../components/Header';
import Loading from '../../hooks/Loading';

// Define types for stats
interface CurrencyStats {
    naira: number;
    dollar: number;
    crypto: number;
}

interface TransactionStats {
    total: number;
    abandoned: number;
    success: number;
    refunded: number;
}

interface AdminStatusStats {
    pending: number;
    approved: number;
    rejected: number;
}


const Payments: React.FC = () => {
    const { payments, academic_files, refreshData } = useData();
    const { execute, loading } = useCUD();
    const { sendMail } = useMail();
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [isLogsModalOpen, setIsLogsModalOpen] = useState<boolean>(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
    const [isFileModalOpen, setIsFileModalOpen] = useState<boolean>(false);
    const [isSendFileModalOpen, setIsSendFileModalOpen] = useState<boolean>(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState<number | null>(null);
    const [activeLogTab, setActiveLogTab] = useState<'filtered' | 'raw'>('filtered');
    const [linkExpires, setLinkExpires] = useState<string>('');
    const [maxDownloads, setMaxDownloads] = useState<number>(1);

    // Helper: Format status for display
    const formatStatus = useCallback((status: string | null | undefined): string => {
        if (!status) return 'Pending';
        return status.charAt(0).toUpperCase() + status.slice(1);
    }, []);

    // Helper to parse price JSON
    const parsePrice = (price: string | null | undefined): { ngn: number; usd: number } | null => {
        if (!price) return null;
        try {
            const parsed = JSON.parse(price);
            return {
                ngn: parsed.ngn || 0,
                usd: parsed.usd || 0,
            };
        } catch {
            // Fallback for non-JSON prices
            const numericPrice = parseFloat(price);
            return isNaN(numericPrice) ? null : { ngn: 0, usd: numericPrice };
        }
    };


    // Helper: Get file name by Drive File ID
    const getFileNameByDriveFileId = useCallback((driveFileId: string): string => {
        if (!academic_files) return 'Unknown File';
        const file = academic_files.find(f => f.drive_file_id === driveFileId);
        return file ? file.file_name : 'Unknown File';
    }, [academic_files]);

    // Helper: Get file info by Drive File ID
    const getFileInfoByDriveFileId = useCallback((driveFileId: string): AcademicFile | null => {
        if (!academic_files) return null;
        return academic_files.find(f => f.drive_file_id === driveFileId) || null;
    }, [academic_files]);

    // Helper: Get payment icon
    const getPaymentIcon = useCallback((method: string): string => {
        const icons: Record<string, string> = {
            stripe: 'fab fa-cc-stripe',
            paypal: 'fab fa-paypal',
            bank_transfer: 'fas fa-university',
            crypto: 'fab fa-bitcoin',
            paystack: 'fas fa-money-bill-wave',
            manual: 'fas fa-hand-holding-usd',
            nowpayments: 'fas fa-coins', // Added nowpayments icon
        };
        return icons[method] || 'fas fa-credit-card';
    }, []);


    // Helper: Show toast
    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // Close modals
    const closeModal = useCallback(() => {
        setIsLogsModalOpen(false);
        setIsCustomerModalOpen(false);
        setIsFileModalOpen(false);
        setIsActionMenuOpen(null);
        setSelectedPayment(null);
    }, []);

    // Helper: Handle send file button click with validation
    const handleSendFileClick = useCallback((payment: Payment) => {
        if (payment.payment_status !== 'completed') {
            showToast("Can't send file due to incomplete payment", 'error');
            return;
        }

        if (payment.admin_status !== 'approved') {
            showToast("Please confirm the payment first", 'error');
            return;
        }

        const fileInfo = getFileInfoByDriveFileId(String(payment.drive_file_id));
        if (fileInfo?.r2_upload_status !== 'success') {
            showToast('File is not uploaded to R2 yet. Please re-upload.', 'error');
            return;
        }

        setSelectedPayment(payment);
        setIsSendFileModalOpen(true);
    }, [getFileInfoByDriveFileId, showToast]);

    // Helper: Handle send file
    const handleSendFile = useCallback(async () => {
        if (!selectedPayment) return;

        // --- Input Validation ---
        if (!linkExpires) {
            showToast("Please set a link expiration date.", 'error');
            return;
        }
        if (maxDownloads < 1) {
            showToast("Max downloads must be at least 1.", 'error');
            return;
        }

        const fileInfo = getFileInfoByDriveFileId(String(selectedPayment.drive_file_id));
        if (!fileInfo) {
            showToast("File information not found", 'error');
            return;
        }

        showToast("Sending email...", 'success');
        try {
            const result = await sendMail({
                email: 'file',
                payment_id: selectedPayment.id,
                recipient_email: selectedPayment.customer_email,
                customer_name: selectedPayment.customer_name,
                file_name: fileInfo.file_name,
                link_expires: linkExpires,
                max_downloads: maxDownloads,
            });

            if (result.success) {
                showToast("File email sent successfully", 'success');
                setIsSendFileModalOpen(false);
                setLinkExpires('');
                setMaxDownloads(1);
                refreshData(); // Refresh data to show updated download info if needed
            } else {
                showToast(result.error || "Failed to send file email", 'error');
            }
        } catch {
            showToast("Failed to send file email", 'error');
        }
    }, [selectedPayment, linkExpires, maxDownloads, getFileInfoByDriveFileId, sendMail, refreshData, showToast]);

    // Helper: Format date to social media style
    const formatSocialDate = useCallback((dateString: string): string => {
        try {
            // Parse the date string format: "Thu, 18th Sep 2025 at 03:33:10 AM"
            const cleanDateString = dateString
                .replace(/(\d+)(st|nd|rd|th)/, '$1') // Remove ordinal suffixes
                .replace(' at ', ' '); // Remove ' at '

            const date = new Date(cleanDateString);

            if (isNaN(date.getTime())) {
                return dateString; // Return original if parsing fails
            }

            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            // Less than 60 seconds
            if (diffInSeconds < 60) {
                return 'just now';
            }

            // Less than 60 minutes
            if (diffInSeconds < 3600) {
                const minutes = Math.floor(diffInSeconds / 60);
                return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
            }

            // Less than 24 hours
            if (diffInSeconds < 86400) {
                const hours = Math.floor(diffInSeconds / 3600);
                return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
            }

            // Less than 7 days
            if (diffInSeconds < 604800) {
                const days = Math.floor(diffInSeconds / 86400);
                return days === 1 ? '1 day ago' : `${days} days ago`;
            }

            // More than 7 days - format as "7th Jan, 2025"
            const options: Intl.DateTimeFormatOptions = {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            };
            return date.toLocaleDateString('en-US', options);

        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }, []);

    // Filter and search payments
    const filteredPayments = useMemo(() => {
        if (!payments) return [];

        return payments.filter(payment => {
            const matchesStatus = statusFilter === 'all' || payment.payment_status === statusFilter;
            const searchLower = searchTerm.toLowerCase();

            // Search across all columns
            const matchesSearch =
                (payment.reference?.toLowerCase() || '').includes(searchLower) ||
                payment.customer_name.toLowerCase().includes(searchLower) ||
                payment.customer_email.toLowerCase().includes(searchLower) ||
                (payment.customer_phone?.toLowerCase() || '').includes(searchLower) ||
                payment.payment_method.toLowerCase().includes(searchLower) ||
                payment.payment_status.toLowerCase().includes(searchLower) ||
                payment.admin_status.toLowerCase().includes(searchLower) ||
                getFileNameByDriveFileId(String(payment.drive_file_id)).toLowerCase().includes(searchLower) ||
                payment.currency.toLowerCase().includes(searchLower) ||
                payment.amount.toString().includes(searchLower);

            return matchesStatus && matchesSearch;
        });
    }, [payments, statusFilter, searchTerm, getFileNameByDriveFileId]);

    // ✅ FIXED: Total revenue calculation based on your exact specifications
    const currencyStats = useMemo((): CurrencyStats => {
        if (!payments || payments.length === 0) {
            return { naira: 0, dollar: 0, crypto: 0 };
        }

        // Calculate Naira revenue (Paystack + NGN currency + completed payments)
        const nairaRevenue = payments
            .filter(p =>
                p.payment_method === 'paystack' &&
                (p.currency?.toLowerCase().includes('ngn') || p.currency?.toLowerCase().includes('naira')) &&
                p.payment_status === 'completed'
            )
            .reduce((sum, p) => sum + (typeof p.amount === 'number' ? p.amount : parseFloat(p.amount as unknown as string) || 0), 0);

        // Calculate Dollar revenue (Stripe/PayPal + USD currency + completed payments)
        const dollarRevenue = payments
            .filter(p =>
                (p.payment_method === 'stripe' || p.payment_method === 'paypal') &&
                (p.currency?.toLowerCase().includes('usd') || p.currency?.toLowerCase().includes('dollar')) &&
                p.payment_status === 'completed'
            )
            .reduce((sum, p) => sum + (typeof p.amount === 'number' ? p.amount : parseFloat(p.amount as unknown as string) || 0), 0);

        // Calculate Crypto revenue (NowPayments + USD currency + completed payments)
        const cryptoRevenue = payments
            .filter(p =>
                p.payment_method === 'nowpayments' &&
                (p.currency?.toLowerCase().includes('usd') || p.currency?.toLowerCase().includes('dollar')) &&
                p.payment_status === 'completed'
            )
            .reduce((sum, p) => sum + (typeof p.amount === 'number' ? p.amount : parseFloat(p.amount as unknown as string) || 0), 0);

        return {
            naira: nairaRevenue,
            dollar: dollarRevenue,
            crypto: cryptoRevenue
        };
    }, [payments]);

    // Stats - Transaction Stats (including total)
    const transactionStats = useMemo((): TransactionStats => {
        if (!payments || payments.length === 0) {
            return { total: 0, abandoned: 0, success: 0, refunded: 0 };
        }

        return payments.reduce((acc, payment) => {
            acc.total += 1;

            switch (payment.payment_status) {
                case 'abandoned':
                    acc.abandoned += 1;
                    break;
                case 'completed':
                    acc.success += 1;
                    break;
                case 'refunded':
                    acc.refunded += 1;
                    break;
                default:
                    break;
            }
            return acc;
        }, { total: 0, abandoned: 0, success: 0, refunded: 0 });
    }, [payments]);

    // Stats - Admin Status
    const adminStatusStats = useMemo((): AdminStatusStats => {
        if (!payments || payments.length === 0) {
            return { pending: 0, approved: 0, rejected: 0 };
        }

        return payments.reduce((acc, payment) => {
            switch (payment.admin_status) {
                case 'pending':
                    acc.pending += 1;
                    break;
                case 'approved':
                    acc.approved += 1;
                    break;
                case 'rejected':
                    acc.rejected += 1;
                    break;
                default:
                    acc.pending += 1;
                    break;
            }
            return acc;
        }, { pending: 0, approved: 0, rejected: 0 });
    }, [payments]);

    // Open transaction logs modal
    const openTransactionLogs = useCallback((payment: Payment) => {
        setSelectedPayment(payment);
        setActiveLogTab('filtered');
        setIsLogsModalOpen(true);
    }, []);

    // Open customer info modal
    const openCustomerInfo = useCallback((payment: Payment) => {
        setSelectedPayment(payment);
        setIsCustomerModalOpen(true);
        setIsActionMenuOpen(null);
    }, []);

    // Open file info modal
    const openFileInfo = useCallback((payment: Payment) => {
        setSelectedPayment(payment);
        setIsFileModalOpen(true);
        setIsActionMenuOpen(null);
    }, []);

    // Update payment status (admin_status) - SAFER IMPLEMENTATION
    const updateAdminStatus = useCallback(async (payment: Payment, status: 'approved' | 'rejected') => {
        let confirmationMessage = '';
        if (status === 'rejected') {
            confirmationMessage = 'Are you sure you want to reject this payment? This action cannot be undone.';
        } else {
            confirmationMessage = `Are you sure you want to mark this payment as ${status}?`;
        }

        if (!window.confirm(confirmationMessage)) {
            return;
        }

        try {
            const result = await execute(
                { table: 'payments', action: 'update' },
                {
                    id: payment.id,
                    admin_status: status,
                }
            );

            if (result.success) {
                showToast(`Payment marked as ${status}!`, 'success');
                refreshData(); // Refresh data to reflect the change
                closeModal(); // Close the current modal, forcing admin to re-evaluate
            } else {
                showToast(result.error || 'Failed to update payment status.', 'error');
            }
        } catch {
            showToast('Failed to update payment status.', 'error');
        }
    }, [execute, refreshData, showToast, closeModal]);

    // Toggle action menu
    const toggleActionMenu = useCallback((paymentId: number) => {
        setIsActionMenuOpen(prev => prev === paymentId ? null : paymentId);
    }, []);

    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    // Effect for real-time updates using short polling
    useEffect(() => {
        const startPolling = () => {
            // Clear any existing interval
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
            // Start a new one
            pollingRef.current = setInterval(() => {
                console.log('Admin Payments Page: Refreshing data...');
                refreshData();
            }, 10000); // Refresh every 10 seconds
        };

        const stopPolling = () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                stopPolling();
            } else {
                startPolling();
            }
        };

        // Initial fetch
        refreshData();
        // Start polling
        startPolling();

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [refreshData]);

    if (!payments) { return (<Loading />); }

    return (
        <>
            <Header />
            <div className="config-content">
                <div className="config-header">
                    <h1><i className="fas fa-credit-card"></i> Payment Management</h1>
                    <p>View and manage payment transactions from customers.</p>
                </div>

                <div className="payments-container">
                    {/* 3 stat cards as requested */}
                    <div className="payments-stats">
                        {/* Stat Card 1: Total Revenue (only successful payments) */}
                        <div className="stat-card">
                            <div className="stat-icon">
                                <i className="fas fa-dollar-sign"></i>
                            </div>
                            <div className="stat-info">
                                <h3>Total Revenue</h3>
                                <div className="stat-details">
                                    <p><strong>Naira:</strong> ₦{currencyStats.naira.toFixed(2)}</p>
                                    <p><strong>Dollar:</strong> ${currencyStats.dollar.toFixed(2)}</p>
                                    <p><strong>Crypto:</strong> ${currencyStats.crypto.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Stat Card 2: Transaction Stats */}
                        <div className="stat-card">
                            <div className="stat-icon">
                                <i className="fas fa-exchange-alt"></i>
                            </div>
                            <div className="stat-info">
                                <h3>Transaction Stats</h3>
                                <div className="transaction stat-details">
                                    <p><strong>Success:</strong> {transactionStats.success}</p>
                                    <p><strong>Abandoned:</strong> {transactionStats.abandoned}</p>
                                    <p><strong>Refunded:</strong> {transactionStats.refunded}</p>
                                    <p><strong>Total:</strong> {transactionStats.total}</p>
                                </div>
                            </div>
                        </div>

                        {/* Stat Card 3: Admin Status */}
                        <div className="stat-card">
                            <div className="stat-icon">
                                <i className="fas fa-user-shield"></i>
                            </div>
                            <div className="stat-info">
                                <h3>Admin Status</h3>
                                <div className="stat-details">
                                    <p><strong>Pending:</strong> {adminStatusStats.pending}</p>
                                    <p><strong>Approved:</strong> {adminStatusStats.approved}</p>
                                    <p><strong>Rejected:</strong> {adminStatusStats.rejected}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters & Search */}
                    <div className="table-header">
                        <h2>Recent Transactions</h2>
                        <div className="table-filters">
                            <select
                                id="statusFilter"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                                <option value="refunded">Refunded</option>
                                <option value="abandoned">Abandoned</option>
                            </select>
                            <input
                                type="text"
                                id="searchPayments"
                                placeholder="Search transactions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Payments Table */}
                    {filteredPayments.length === 0 ? (
                        <div className="no-payments">
                            <i className="fas fa-credit-card"></i>
                            <h3>No payments found</h3>
                            <p>No payment transactions match your filters.</p>
                        </div>
                    ) : (
                        <div className="payments-table-wrapper">
                            <table className="payments-table">
                                <thead>
                                    <tr>
                                        <th>Reference ID</th>
                                        <th>Drive File ID</th>
                                        <th>Amount</th>
                                        <th>Method</th>
                                        <th>Status</th>
                                        <th>Admin</th>
                                        <th>Upload</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPayments.map((payment) => (
                                        <tr key={payment.id} data-status={payment.payment_status}>
                                            <td>
                                                <span className="transaction-id">{payment.reference || 'N/A'}</span>
                                            </td>
                                            <td>
                                                <span className="file-id">{payment.drive_file_id}</span>
                                            </td>
                                            <td>
                                                <span className={`amount status ${payment.payment_status}`}>
                                                    {payment.currency?.includes('NGN') ? '₦' : '$'}
                                                    {payment.amount ? payment.amount : '0.00'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="payment-method">
                                                    <i className={getPaymentIcon(payment.payment_method)}></i>
                                                    {payment.payment_method.charAt(0).toUpperCase() + payment.payment_method.slice(1)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status ${payment.payment_status}`}>
                                                    {formatStatus(payment.payment_status)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status ${payment.admin_status || 'pending'}`}>
                                                    {formatStatus(payment.admin_status)}
                                                </span>
                                            </td>
                                            <td>
                                                {filteredPayments.map((payment) => {
                                                    const fileInfo = getFileInfoByDriveFileId(String(payment.drive_file_id));
                                                    return (
                                                        <span className={`status ${fileInfo ? (fileInfo.r2_upload_status || '') : ''}`}>
                                                            {/* {fileInfo ? formatStatus(fileInfo.r2_upload_status) : ''} */}
                                                        </span>
                                                    );
                                                })}
                                            </td>
                                            <td>
                                                <span className="date">
                                                    {payment.started_at ?
                                                        formatSocialDate(payment.started_at) : 'N/A'
                                                    }
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <div className="dropdown">
                                                        <button
                                                            className="btn btn-action dropdown-toggle"
                                                            onClick={() => toggleActionMenu(payment.id)}
                                                            title="More Actions"
                                                        >
                                                            <i className="fas fa-bars"></i>
                                                        </button>
                                                        {isActionMenuOpen === payment.id && (
                                                            <div className="dropdown-menu show">
                                                                <button
                                                                    className="dropdown-item"
                                                                    onClick={() => openCustomerInfo(payment)}
                                                                >
                                                                    <i className="fas fa-user"></i> Customer Info
                                                                </button>
                                                                <button
                                                                    className="dropdown-item"
                                                                    onClick={() => openFileInfo(payment)}
                                                                >
                                                                    <i className="fas fa-file"></i> File Info
                                                                </button>
                                                                {payment.transaction_logs && (
                                                                    <button
                                                                        className="dropdown-item"
                                                                        onClick={() => openTransactionLogs(payment)}
                                                                    >
                                                                        <i className="fas fa-list"></i> Payment Logs
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className="toast-container">
                    <AdminToast
                        message={toast.message}
                        type={toast.type}
                        duration={3000}
                        onClose={() => setToast(null)}
                    />
                </div>
            )}

            {/* Transaction Logs Modal */}
            {isLogsModalOpen && selectedPayment && selectedPayment.transaction_logs && (
                <div className="modal" onClick={closeModal}>
                    <div className="modal-content logs-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="flex reverse">
                                <span className="close-modal" onClick={closeModal}>&times;</span>
                                <h2 className="modal-title">Transaction Logs</h2>
                            </div>
                        </div>
                        <div className="modal-body">
                            {/* Tab Navigation */}
                            <div className="logs-tabs">
                                <button
                                    className={`tab-button ${activeLogTab === 'filtered' ? 'active' : ''}`}
                                    onClick={() => setActiveLogTab('filtered')}
                                >
                                    <i className="fas fa-filter"></i> Filtered Data
                                </button>
                                <button
                                    className={`tab-button ${activeLogTab === 'raw' ? 'active' : ''}`}
                                    onClick={() => setActiveLogTab('raw')}
                                >
                                    <i className="fas fa-code"></i> Raw Data
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="logs-content">
                                {activeLogTab === 'filtered' ? (
                                    <div className="filtered-logs">
                                        <p>Filtered view is not yet implemented. Please view raw data.</p>
                                    </div>
                                ) : (
                                    <pre className="raw-logs">
                                        {(() => {
                                            try {
                                                return JSON.stringify(JSON.parse(selectedPayment.transaction_logs), null, 2);
                                            } catch {
                                                return selectedPayment.transaction_logs;
                                            }
                                        })()}
                                    </pre>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Info Modal - ✅ WITH ACCEPT/REJECT BUTTONS */}
            {isCustomerModalOpen && selectedPayment && (
                <div className="modal" onClick={closeModal}>
                    <div className="modal-content customer-modal" onClick={(e) => e.stopPropagation()}>

                        <div className="modal-header">
                            <div className="flex reverse">
                                <span className="close-modal" onClick={closeModal}>&times;</span>
                                <h2 className="modal-title">Customer Information</h2>
                            </div>
                        </div>
                        <div className="modal-body">
                            <div className="customer-detail-row">
                                <strong>Name:</strong>
                                <span>{selectedPayment.customer_name}</span>
                            </div>
                            <div className="customer-detail-row">
                                <strong>Email:</strong>
                                <span>{selectedPayment.customer_email}</span>
                            </div>
                            <div className="customer-detail-row">
                                <strong>Phone:</strong>
                                <span>{selectedPayment.customer_phone || 'N/A'}</span>
                            </div>
                            <div className="customer-detail-row">
                                <strong>Payment Reference:</strong>
                                <span>{selectedPayment.reference || 'N/A'}</span>
                            </div>
                            <div className="customer-detail-row">
                                <strong>Amount to Pay:</strong>
                                <span>
                                    {selectedPayment.currency?.includes('NGN') ? '₦' : '$'}
                                    {selectedPayment.amount ? selectedPayment.amount : '0.00'}
                                </span>
                            </div>
                            <div className="customer-detail-row">
                                <strong>Amount Paid:</strong>
                                <span>
                                    {selectedPayment.payment_status === 'completed' ? (
                                        <>
                                            {selectedPayment.currency?.includes('NGN') ? '₦' : '$'}
                                            {selectedPayment.amount ? selectedPayment.amount : '0.00'}
                                        </>
                                    ) : (
                                        '$0.00'
                                    )}
                                </span>
                            </div>
                            <div className="customer-detail-row">
                                <strong>Payment Method:</strong>
                                <span>
                                    <i className={getPaymentIcon(selectedPayment.payment_method)}></i>{' '}
                                    {selectedPayment.payment_method.charAt(0).toUpperCase() + selectedPayment.payment_method.slice(1)}
                                </span>
                            </div>
                            <div className="customer-detail-row">
                                <strong>Payment Status:</strong>
                                <span className={`status ${selectedPayment.payment_status}`}>
                                    {formatStatus(selectedPayment.payment_status)}
                                </span>
                            </div>
                            <div className="customer-detail-row">
                                <strong>Admin Status:</strong>
                                <span className={`status ${selectedPayment.admin_status}`}>
                                    {formatStatus(selectedPayment.admin_status)}
                                </span>
                            </div>
                            <div className="customer-detail-row">
                                <strong>Date:</strong>
                                <span>
                                    {selectedPayment.started_at ?
                                        formatSocialDate(selectedPayment.started_at) : 'N/A'
                                    }
                                </span>
                            </div>

                            {/* ✅ ADDED: Accept and Reject buttons inside Customer Info modal */}
                            {selectedPayment.admin_status === 'pending' && selectedPayment.payment_status === 'completed' && (
                                <div className="modal-actions">
                                    <button
                                        className="btn btn-action success"
                                        onClick={() => updateAdminStatus(selectedPayment, 'approved')}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <i className="fas fa-spinner fa-spin"></i>
                                        ) : (
                                            <i className="fas fa-check"></i>
                                        )}
                                        Accept Payment
                                    </button>
                                    <button
                                        className="btn btn-action danger"
                                        onClick={() => updateAdminStatus(selectedPayment, 'rejected')}
                                        disabled={loading}
                                    >
                                        <i className="fas fa-times"></i> Reject Payment
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* File Info Modal */}
            {isFileModalOpen && selectedPayment && (
                <div className="modal" onClick={closeModal}>
                    <div className="modal-content file-modal" onClick={(e) => e.stopPropagation()}>

                        <div className="modal-header">
                            <div className="flex reverse">
                                <span className="close-modal" onClick={closeModal}>&times;</span>
                                <h2 className="modal-title">File Information</h2>
                            </div>
                        </div>
                        <div className="modal-body">
                            {(() => {
                                const fileInfo = getFileInfoByDriveFileId(String(selectedPayment.drive_file_id));
                                if (!fileInfo) {
                                    return <div>File information not found for Drive File ID: {selectedPayment.drive_file_id}</div>;
                                }

                                const price = parsePrice(fileInfo.price);

                                return (
                                    <>
                                        <div className="file-detail-row">
                                            <strong>File Name:</strong>
                                            <span>{fileInfo.file_name}</span>
                                        </div>
                                        <div className="file-detail-row">
                                            <strong>File ID:</strong>
                                            <span>{fileInfo.id}</span>
                                        </div>
                                        <div className="file-detail-row">
                                            <strong>Drive File ID:</strong>
                                            <span>{fileInfo.drive_file_id}</span>
                                        </div>
                                        <div className="file-detail-row">
                                            <strong>File Type:</strong>
                                            <span>{fileInfo.file_type}</span>
                                        </div>
                                        <div className="file-detail-row">
                                            <strong>File Size:</strong>
                                            <span>{fileInfo.file_size}</span>
                                        </div>
                                        <div className="file-detail-row">
                                            <strong>Category:</strong>
                                            <span>{fileInfo.category}</span>
                                        </div>
                                        <div className="file-detail-row">
                                            <strong>Level:</strong>
                                            <span>{fileInfo.level}</span>
                                        </div>
                                        <div className="file-detail-row">
                                            <strong>Price:</strong>
                                            {price ? (
                                                <span>
                                                    NGN: ₦{price.ngn.toFixed(2)}<br />
                                                    USD: ${price.usd.toFixed(2)}
                                                </span>
                                            ) : (
                                                <span>Not available</span>
                                            )}
                                        </div>
                                        <div className="file-detail-row">
                                            <strong>Description:</strong>
                                            <span>{fileInfo.description || 'No description available'}</span>
                                        </div>
                                        <div className="file-detail-row">
                                            <strong>Modified Date:</strong>
                                            <span>{fileInfo.modified_date}</span>
                                        </div>
                                        {fileInfo.r2_url && (
                                            <div className="file-detail-row">
                                                <strong>R2 URL:</strong>
                                                <span><a href={fileInfo.r2_url} target="_blank" rel="noopener noreferrer">{fileInfo.r2_url}</a></span>
                                            </div>
                                        )}
                                        {fileInfo.r2_upload_status && (
                                            <div className="file-detail-row">
                                                <strong>R2 Upload Status:</strong>
                                                <span className={`status ${fileInfo.r2_upload_status}`}>
                                                    {formatStatus(fileInfo.r2_upload_status)}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            <div className="modal-actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleSendFileClick(selectedPayment)}
                                >
                                    <i className="fas fa-paper-plane" /> Send File
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Send File Modal */}
            {isSendFileModalOpen && selectedPayment && (
                <div className="modal send-file-modal" onClick={(e) => e.target === e.currentTarget && setIsSendFileModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <span className="close-modal" onClick={() => setIsSendFileModalOpen(false)}>
                            &times;
                        </span>
                        <div className="modal-header">
                            <h2 className="modal-title">Send File to Customer</h2>
                        </div>
                        <div className="modal-body">
                            {(() => {
                                const fileInfo = getFileInfoByDriveFileId(String(selectedPayment.drive_file_id));
                                if (!fileInfo) {
                                    return <div>File information not found</div>;
                                }

                                return (
                                    <>
                                        <div className="form-group">
                                            <label>Customer Email:</label>
                                            <input
                                                type="email"
                                                value={selectedPayment.customer_email}
                                                disabled
                                                className="form-control"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Customer Name:</label>
                                            <input
                                                type="text"
                                                value={selectedPayment.customer_name}
                                                disabled
                                                className="form-control"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>File Name:</label>
                                            <input
                                                type="text"
                                                value={fileInfo.file_name}
                                                disabled
                                                className="form-control"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="maxDownloads">Max Downloads:</label>
                                            <input
                                                type="number"
                                                id="maxDownloads"
                                                value={maxDownloads}
                                                onChange={(e) => setMaxDownloads(parseInt(e.target.value, 10))}
                                                min="1"
                                                className="form-control"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="linkExpires">Link Expires:</label>
                                            <input
                                                type="datetime-local"
                                                id="linkExpires"
                                                value={linkExpires}
                                                onChange={(e) => setLinkExpires(e.target.value)}
                                                className="form-control"
                                                min={new Date().toISOString().slice(0, 16)}
                                            />
                                        </div>

                                        <div className="modal-actions">
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setIsSendFileModalOpen(false);
                                                    setLinkExpires('');
                                                    setMaxDownloads(1);
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleSendFile}
                                            >
                                                <i className="fas fa-paper-plane" /> Send File
                                            </button>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Payments;