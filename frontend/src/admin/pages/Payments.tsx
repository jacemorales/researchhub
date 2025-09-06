import React, { useState, useMemo } from "react";
import { useData, Payment } from "../../hooks/useData";
import { useCUD } from "../../hooks/useCUD";
import { useToast } from "../../hooks/useToast";

const Payments: React.FC = () => {
    const { payments } = useData();
    const { payments: { update }, loading, error } = useCUD();
    const { addToast } = useToast();
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

    const filteredPayments = useMemo(() => {
        if (!payments) return [];
        return payments.filter(p => {
            const statusMatch = statusFilter === "all" || p.status === statusFilter;
            const searchMatch = searchTerm === "" ||
                p.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.customer_email.toLowerCase().includes(searchTerm.toLowerCase());
            return statusMatch && searchMatch;
        });
    }, [payments, statusFilter, searchTerm]);

    const totalRevenue = useMemo(() => {
        if (!payments) return 0;
        return payments.reduce((acc, p) => acc + p.amount, 0);
    }, [payments]);

    const completedPayments = useMemo(() => {
        if (!payments) return 0;
        return payments.filter(p => p.status === "completed").length;
    }, [payments]);

    const pendingPayments = useMemo(() => {
        if (!payments) return 0;
        return payments.filter(p => p.status === "pending").length;
    }, [payments]);

    const handleUpdateStatus = async (id: number, status: string) => {
        await update({ id, status });
        addToast("Payment status updated successfully!", "success");
    };

    const handleViewDetails = (id: number) => {
        const payment = payments?.find(p => p.id === id);
        if (payment) {
            setSelectedPayment(payment);
            setIsModalOpen(true);
        } else {
            addToast("Payment not found", "error");
        }
    };

    const getPaymentIcon = (method: string) => {
        const icons: { [key: string]: string } = {
            'stripe': 'fab fa-cc-stripe',
            'paypal': 'fab fa-paypal',
            'bank_transfer': 'fas fa-university',
            'crypto': 'fab fa-bitcoin'
        };
        return icons[method] ?? 'fas fa-credit-card';
    }

    return (
        <>
            <div className="config-content">
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
                                    {filteredPayments.map((payment: any) => (
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
                                            <td><span className={`status status-${payment.status}`}>{payment.status}</span></td>
                                            <td><span className="date">{new Date(payment.created_at).toLocaleString()}</span></td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button className="btn-action" onClick={() => handleViewDetails(payment.id)} title="View Details">
                                                        <i className="fas fa-eye"></i>
                                                    </button>
                                                    {payment.status === 'pending' && (
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
            {error && <p className="error">{error}</p>}

            {isModalOpen && selectedPayment && (
                <div className="modal" style={{ display: 'flex' }}>
                    <div className="modal-content">
                        <span className="close-modal" onClick={() => setIsModalOpen(false)}>×</span>
                        <div className="modal-header">
                            <h2 className="modal-title">Payment Details</h2>
                        </div>
                        <div className="modal-body">
                            <p><strong>Transaction ID:</strong> {selectedPayment.transaction_id}</p>
                            <p><strong>Customer:</strong> {selectedPayment.customer_name} ({selectedPayment.customer_email})</p>
                            <p><strong>File:</strong> {(selectedPayment as any).file_name || 'Unknown File'}</p>
                            <p><strong>Amount:</strong> ${selectedPayment.amount.toFixed(2)}</p>
                            <p><strong>Payment Method:</strong> {selectedPayment.payment_method}</p>
                            <p><strong>Status:</strong> {selectedPayment.status}</p>
                            <p><strong>Date:</strong> {new Date(selectedPayment.created_at).toLocaleString()}</p>
                            <p><strong>Payment Data:</strong></p>
                            <pre>{JSON.stringify(JSON.parse(selectedPayment.payment_data || '{}'), null, 2)}</pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    );
};

export default Payments;
