import React, { useState, useMemo } from "react";
import { useData } from "../../hooks/useData";
import type { Payment } from "../../hooks/useData";
import { useCUD } from "../../hooks/useCUD";
import { useToast } from "../../hooks/useToast";

const Payments: React.FC = () => {
    const { payments, academic_files } = useData();
    const { payments: { update }, loading } = useCUD();
    const { addToast } = useToast();
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

    const paymentsWithFileNames = useMemo(() => {
        if (!payments || !academic_files) return [];
        return payments.map(p => {
            const file = academic_files.find(f => f.id === p.file_id);
            return { ...p, file_name: file?.file_name };
        });
    }, [payments, academic_files]);

    const filteredPayments = useMemo(() => {
        return paymentsWithFileNames.filter(p => {
            const statusMatch = statusFilter === "all" || p.admin_status === statusFilter;
            const searchMatch = searchTerm === "" ||
                p.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.file_name?.toLowerCase().includes(searchTerm.toLowerCase());
            return statusMatch && searchMatch;
        });
    }, [paymentsWithFileNames, statusFilter, searchTerm]);

    const totalRevenue = useMemo(() => {
        if (!payments) return 0;
        return payments.reduce((acc, p) => p.admin_status === 'completed' ? acc + p.amount : acc, 0);
    }, [payments]);

    const completedPayments = useMemo(() => {
        if (!payments) return 0;
        return payments.filter(p => p.admin_status === "completed").length;
    }, [payments]);

    const pendingPayments = useMemo(() => {
        if (!payments) return 0;
        return payments.filter(p => p.admin_status === "pending").length;
    }, [payments]);

    const handleUpdateStatus = async (id: number, status: Payment['admin_status']) => {
        const response = await update({ id, admin_status: status });
        if (response?.success) {
            addToast("Payment status updated successfully!", "success");
            // Here you would ideally refetch the data or update the state locally
        } else {
            addToast(response?.error || "Failed to update status.", "error");
        }
    };

    const handleViewDetails = (payment: Payment) => {
        setSelectedPayment(payment);
        setIsModalOpen(true);
    };

    const getPaymentIcon = (method: string) => {
        const icons: { [key: string]: string } = {
            'stripe': 'fab fa-cc-stripe',
            'paypal': 'fab fa-paypal',
            'bank_transfer': 'fas fa-university',
            'crypto': 'fab fa-bitcoin'
        };
        return icons[method] ?? 'fas fa-credit-card';
    };

    const parsePaymentData = (data: string | null) => {
        if (!data) return "No additional data.";
        try {
            const parsed = JSON.parse(data);
            return JSON.stringify(parsed, null, 2);
        } catch (e) {
            return "Invalid JSON data in payment record.";
        }
    };

    return (
        <>
            <div className="payments-content">
                <div className="config-header">
                    <h1><i className="fas fa-credit-card"></i> Payment Management</h1>
                    <p>View and manage payment transactions from customers.</p>
                </div>

                <div className="payments-container">
                    <div className="payments-stats">
                        <div className="stat-card">
                            <div className="stat-icon"><i className="fas fa-dollar-sign"></i></div>
                            <div className="stat-info">
                                <h3>Total Revenue</h3>
                                <p className="stat-value">${totalRevenue.toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><i className="fas fa-shopping-cart"></i></div>
                            <div className="stat-info">
                                <h3>Total Transactions</h3>
                                <p className="stat-value">{payments?.length || 0}</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><i className="fas fa-check-circle"></i></div>
                            <div className="stat-info">
                                <h3>Completed</h3>
                                <p className="stat-value">{completedPayments}</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon"><i className="fas fa-clock"></i></div>
                            <div className="stat-info">
                                <h3>Pending</h3>
                                <p className="stat-value">{pendingPayments}</p>
                            </div>
                        </div>
                    </div>

                    <div className="payments-table-container">
                        <div className="table-header">
                            <h2>Recent Transactions</h2>
                            <div className="table-filters">
                                <select id="statusFilter" onChange={e => setStatusFilter(e.target.value)}>
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                    <option value="failed">Failed</option>
                                    <option value="refunded">Refunded</option>
                                </select>
                                <input type="text" id="searchPayments" placeholder="Search transactions..." onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                        </div>

                        {filteredPayments.length === 0 ? (
                            <div className="no-payments">
                                <i className="fas fa-credit-card"></i>
                                <h3>No payments found</h3>
                                <p>No payment transactions have been made yet.</p>
                            </div>
                        ) : (
                            <div className="payments-table-wrapper">
                                <table className="payments-table">
                                    <thead>
                                        <tr>
                                            <th>Transaction ID</th>
                                            <th>Customer</th>
                                            <th>File</th>
                                            <th>Amount</th>
                                            <th>Payment Method</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPayments.map((payment) => (
                                            <tr key={payment.id}>
                                                <td><span className="transaction-id">{payment.transaction_id}</span></td>
                                                <td>
                                                    <div className="customer-info">
                                                        <strong>{payment.customer_name}</strong>
                                                        <small>{payment.customer_email}</small>
                                                    </div>
                                                </td>
                                                <td><span className="file-name">{payment.file_name || 'Unknown File'}</span></td>
                                                <td><span className="amount">${payment.amount.toFixed(2)}</span></td>
                                                <td>
                                                    <span className="payment-method">
                                                        <i className={getPaymentIcon(payment.payment_method)}></i>
                                                        {payment.payment_method}
                                                    </span>
                                                </td>
                                                <td><span className={`status status-${payment.admin_status}`}>{payment.admin_status}</span></td>
                                                <td><span className="date">{new Date(payment.created_at).toLocaleString()}</span></td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button className="btn-action" onClick={() => handleViewDetails(payment)} title="View Details">
                                                            <i className="fas fa-eye"></i>
                                                        </button>
                                                        {payment.admin_status === 'pending' && (
                                                            <button className="btn-action" onClick={() => handleUpdateStatus(payment.id, 'completed')} title="Mark as Completed" disabled={loading}>
                                                                <i className="fas fa-check"></i>
                                                            </button>
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

                {isModalOpen && selectedPayment && (
                    <div className="modal" style={{ display: 'flex' }}>
                        <div className="modal-content payments-modal">
                            <span className="close-modal" onClick={() => setIsModalOpen(false)}>×</span>
                            <div className="modal-header">
                                <h2 className="modal-title">Payment Details</h2>
                            </div>
                            <div className="modal-body">
                                <div className="payment-details">
                                    <div className="detail-section">
                                        <h3>Transaction Information</h3>
                                        <div className="detail-grid">
                                            <div className="detail-item"><label>Transaction ID:</label><span>{selectedPayment.transaction_id}</span></div>
                                            <div className="detail-item"><label>Status:</label><span className={`status status-${selectedPayment.admin_status}`}>{selectedPayment.admin_status}</span></div>
                                            <div className="detail-item"><label>Amount:</label><span className="amount">${selectedPayment.amount.toFixed(2)}</span></div>
                                            <div className="detail-item"><label>Currency:</label><span>{selectedPayment.currency}</span></div>
                                            <div className="detail-item"><label>Payment Method:</label><span>{selectedPayment.payment_method}</span></div>
                                            <div className="detail-item"><label>Date:</label><span>{new Date(selectedPayment.created_at).toLocaleString()}</span></div>
                                        </div>
                                    </div>
                                    <div className="detail-section">
                                        <h3>Customer Information</h3>
                                        <div className="detail-grid">
                                            <div className="detail-item"><label>Name:</label><span>{selectedPayment.customer_name}</span></div>
                                            <div className="detail-item"><label>Email:</label><span>{selectedPayment.customer_email}</span></div>
                                        </div>
                                    </div>
                                    <div className="detail-section">
                                        <h3>File Information</h3>
                                        <div className="detail-grid">
                                            <div className="detail-item"><label>File Name:</label><span>{(selectedPayment as any).file_name || 'Unknown File'}</span></div>
                                            <div className="detail-item"><label>File ID:</label><span>{selectedPayment.file_id}</span></div>
                                        </div>
                                    </div>
                                    <div className="detail-section">
                                        <h3>Additional Information</h3>
                                        <pre>{parsePaymentData(selectedPayment.payment_data)}</pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Payments;
