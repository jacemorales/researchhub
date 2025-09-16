// src/pages/Payments.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useData } from '../../hooks/useData';
import { useCUD } from '../../hooks/useCUD';
import type { Payment } from '../../hooks/contexts/DataContext';
import Toast from '../../hooks/Toast';
import Header from '../components/Header';

const Payments: React.FC = () => {
    const { payments, academic_files } = useData();
    const { execute, loading } = useCUD();
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

// Helper: Format status for display (handles undefined/null)
const formatStatus = (status: string | null | undefined): string => {
    if (!status) return 'Pending';
    return status.charAt(0).toUpperCase() + status.slice(1);
};


    // Helper: Get file name by ID
    const getFileNameById = useCallback((fileId: number) => {
        if (!academic_files) return 'Unknown File';
        const file = academic_files.find(f => f.id === fileId);
        return file ? file.file_name : 'Unknown File';
    }, [academic_files]);

    // Helper: Get payment icon
    const getPaymentIcon = (method: string) => {
        const icons: Record<string, string> = {
            stripe: 'fab fa-cc-stripe',
            paypal: 'fab fa-paypal',
            bank_transfer: 'fas fa-university',
            crypto: 'fab fa-bitcoin',
            paystack: 'fas fa-money-bill-wave',
            manual: 'fas fa-hand-holding-usd',
        };
        return icons[method] || 'fas fa-credit-card';
    };

    // Helper: Show toast
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Filter and search payments
    const filteredPayments = useMemo(() => {
        if (!payments) return [];

        return payments.filter(payment => {
            const matchesStatus = statusFilter === 'all' || payment.payment_status === statusFilter;
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                (payment.reference?.toLowerCase() || '').includes(searchLower) ||
                payment.customer_name.toLowerCase().includes(searchLower) ||
                payment.customer_email.toLowerCase().includes(searchLower) ||
                getFileNameById(payment.drive_file_id).toLowerCase().includes(searchLower);

            return matchesStatus && matchesSearch;
        });
    }, [payments, statusFilter, searchTerm, getFileNameById]);

    // Stats
    const stats = useMemo(() => {
        if (!payments || payments.length === 0) {
            return { totalRevenue: 0, totalTransactions: 0, completed: 0, pending: 0 };
        }

        const totalRevenue = payments.reduce((sum, p) => {
            // Ensure p.amount is a number
            const amount = typeof p.amount === 'number' ? p.amount : parseFloat(p.amount as any) || 0;
            return sum + amount;
        }, 0);

        const totalTransactions = payments.length;
        const completed = payments.filter(p => p.payment_status === 'completed').length;
        const pending = payments.filter(p => p.payment_status === 'pending').length;

        return { 
            totalRevenue: Number(totalRevenue),
            totalTransactions, 
            completed, 
            pending 
        };
    }, [payments]);

    // Open payment details modal
    const openPaymentDetails = (payment: any) => {
        setSelectedPayment(payment);
        setIsModalOpen(true);
    };

    // Open transaction logs modal
    const openTransactionLogs = (payment: any) => {
        setSelectedPayment(payment);
        setIsLogsModalOpen(true);
    };

    // Update payment status (admin_status)
    const updateAdminStatus = async (paymentId: number, status: 'approved' | 'rejected') => {
        if (!window.confirm(`Are you sure you want to mark this payment as ${status}?`)) {
            return;
        }

        const result = await execute(
            { table: 'payments', action: 'update' },
            {
                id: paymentId,
                admin_status: status,
            }
        );

        if (result.success) {
            showToast(`Payment marked as ${status}!`, 'success');
        } else {
            showToast(result.error || 'Failed to update payment status.', 'error');
        }
    };

    // Close modals
    const closeModal = () => {
        setIsModalOpen(false);
        setIsLogsModalOpen(false);
        setSelectedPayment(null);
    };

    if (!payments) {
        return (
            <div className="loading">
                <i className="fas fa-spinner fa-spin"></i> Loading payments...
            </div>
        );
    }

    return (
        <>
            <Header />
            <div className="config-content">
                <div className="config-header">
                    <h1><i className="fas fa-credit-card"></i> Payment Management</h1>
                    <p>View and manage payment transactions from customers.</p>
                </div>

                <div className="payments-container">
                    {/* Stats Cards */}
                    <div className="payments-stats">
                        <div className="stat-card">
                            <div className="stat-icon">
                                <i className="fas fa-dollar-sign"></i>
                            </div>
                            <div className="stat-info">
                                <h3>Total Revenue</h3>
                                <p className="stat-value">${isNaN(stats.totalRevenue) ? '0.00' : stats.totalRevenue.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">
                                <i className="fas fa-shopping-cart"></i>
                            </div>
                            <div className="stat-info">
                                <h3>Total Transactions</h3>
                                <p className="stat-value">{stats.totalTransactions}</p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">
                                <i className="fas fa-check-circle"></i>
                            </div>
                            <div className="stat-info">
                                <h3>Completed</h3>
                                <p className="stat-value">{stats.completed}</p>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">
                                <i className="fas fa-clock"></i>
                            </div>
                            <div className="stat-info">
                                <h3>Pending</h3>
                                <p className="stat-value">{stats.pending}</p>
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
                                        <th>Customer</th>
                                        <th>File</th>
                                        <th>Amount</th>
                                        <th>Method</th>
                                        <th>Status</th>
                                        <th>Admin</th>
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
                                                <div className="customer-info">
                                                    <strong>{payment.customer_name}</strong>
                                                    <small>{payment.customer_email}</small>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="file-name">{getFileNameById(payment.drive_file_id)}</span>
                                            </td>
                                            <td>
                                                <span className="amount">
                                                    ${typeof payment.amount === 'number' ? payment.amount.toFixed(2) : '0.00'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="payment-method">
                                                    <i className={getPaymentIcon(payment.payment_method)}></i>
                                                    {payment.payment_method.charAt(0).toUpperCase() + payment.payment_method.slice(1)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status status-${payment.admin_status || 'pending'}`}>
    {formatStatus(payment.admin_status)}
</span>
                                            </td>
                                            <td>
                                                <span className={`status status-${payment.admin_status || 'pending'}`}>
    {formatStatus(payment.admin_status)}
</span>
                                            </td>
                                            <td>
                                                <span className="date">
                                                    {payment.started_at ? 
                                                        new Date(payment.started_at).toLocaleString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        }) : 'N/A'
                                                    }
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="btn-action"
                                                        onClick={() => openPaymentDetails(payment)}
                                                        title="View Details"
                                                    >
                                                        <i className="fas fa-eye"></i>
                                                    </button>
                                                    {payment.transaction_logs && (
                                                        <button
                                                            className="btn-action"
                                                            onClick={() => openTransactionLogs(payment)}
                                                            title="View Transaction Logs"
                                                        >
                                                            <i className="fas fa-list"></i>
                                                        </button>
                                                    )}
                                                    {payment.admin_status === 'pending' && payment.payment_status === 'completed' && (
                                                        <>
                                                            <button
                                                                className="btn-action"
                                                                onClick={() => updateAdminStatus(payment.id, 'approved')}
                                                                title="Approve Payment"
                                                                disabled={loading}
                                                            >
                                                                {loading ? (
                                                                    <i className="fas fa-spinner fa-spin"></i>
                                                                ) : (
                                                                    <i className="fas fa-check"></i>
                                                                )}
                                                            </button>
                                                            <button
                                                                className="btn-action"
                                                                onClick={() => updateAdminStatus(payment.id, 'rejected')}
                                                                title="Reject Payment"
                                                                disabled={loading}
                                                            >
                                                                <i className="fas fa-times"></i>
                                                            </button>
                                                        </>
                                                    )}
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
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        duration={3000}
                        onClose={() => setToast(null)}
                    />
                </div>
            )}

            {/* Payment Details Modal */}
            {isModalOpen && selectedPayment && (
                <div className="modal" onClick={closeModal}>
                    <div className="modal-content payments-modal" onClick={(e) => e.stopPropagation()}>
                        <span className="close-modal" onClick={closeModal}>
                            &times;
                        </span>
                        <div className="modal-header">
                            <h2 className="modal-title">Payment Details</h2>
                        </div>
                        <div className="modal-body">
                            {selectedPayment && (
                                <>
                                    <div className="payment-detail-row">
                                        <strong>Reference ID:</strong>
                                        <span>{selectedPayment.reference || 'N/A'}</span>
                                    </div>
                                    <div className="payment-detail-row">
                                        <strong>Customer Name:</strong>
                                        <span>{selectedPayment.customer_name}</span>
                                    </div>
                                    <div className="payment-detail-row">
                                        <strong>Customer Email:</strong>
                                        <span>{selectedPayment.customer_email}</span>
                                    </div>
                                    <div className="payment-detail-row">
                                        <strong>File:</strong>
                                        <span>{getFileNameById(selectedPayment.drive_file_id)}</span>
                                    </div>
                                    <div className="payment-detail-row">
                                        <strong>Amount:</strong>
                                        <span>
                                            ${typeof selectedPayment.amount === 'number' ? 
                                                selectedPayment.amount.toFixed(2) : '0.00'} {selectedPayment.currency || 'USD'}
                                        </span>
                                    </div>
                                    <div className="payment-detail-row">
                                        <strong>Payment Method:</strong>
                                        <span>
                                            <i className={getPaymentIcon(selectedPayment.payment_method)}></i>{' '}
                                            {selectedPayment.payment_method.charAt(0).toUpperCase() + selectedPayment.payment_method.slice(1)}
                                        </span>
                                    </div>
                                    <div className="payment-detail-row">
                                        <strong>Payment Status:</strong>
                                        <span className={`status status-${selectedPayment.payment_status}`}>
                                            {formatStatus(selectedPayment.payment_status)}
                                        </span>
                                    </div>
                                    <div className="payment-detail-row">
                                        <strong>Admin Status:</strong>
                                        <span className={`status status-${selectedPayment.admin_status}`}>
                                            {formatStatus(selectedPayment.admin_status)}
                                        </span>
                                    </div>
                                    <div className="payment-detail-row">
                                        <strong>Started At:</strong>
                                        <span>
                                            {selectedPayment.started_at ? 
                                                new Date(selectedPayment.started_at).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                }) : 'N/A'
                                            }
                                        </span>
                                    </div>
                                    {selectedPayment.completed_at && (
                                        <div className="payment-detail-row">
                                            <strong>Completed At:</strong>
                                            <span>
                                                {new Date(selectedPayment.completed_at).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                    )}
                                    {/* 
                                    TODO: Once admin_status is set to 'approved', trigger email sending with file access.
                                    Example: 
                                    if (selectedPayment.admin_status === 'approved') {
                                        sendFileToUserEmail(selectedPayment.customer_email, selectedPayment.drive_file_id);
                                    }
                                    */}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction Logs Modal */}
            {isLogsModalOpen && selectedPayment && selectedPayment.transaction_logs && (
                <div className="modal" onClick={closeModal}>
                    <div className="modal-content logs-modal" onClick={(e) => e.stopPropagation()}>
                        <span className="close-modal" onClick={closeModal}>
                            &times;
                        </span>
                        <div className="modal-header">
                            <h2 className="modal-title">Transaction Logs</h2>
                        </div>
                        <div className="modal-body">
                            <pre className="logs-content">
                                {(() => {
                                    try {
                                        return JSON.stringify(JSON.parse(selectedPayment.transaction_logs), null, 2);
                                    } catch{
                                        return selectedPayment.transaction_logs;
                                    }
                                })()}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Payments;