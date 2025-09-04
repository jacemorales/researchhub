import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import PaymentDetailsModal from '../components/PaymentDetailsModal';
import AdminHeader from '../components/AdminHeader';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface Payment {
    id: number;
    transaction_id: string;
    customer_name: string;
    customer_email: string;
    file_name: string;
    amount: number;
    payment_method: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    created_at: string;
}

const PaymentsPage = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/admin/payments.php?action=get_all`);
            if (response.data.success) {
                setPayments(response.data.payments);
            } else {
                throw new Error(response.data.error);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    const filteredPayments = useMemo(() => {
        return payments
            .filter(p => statusFilter === 'all' || p.status === statusFilter)
            .filter(p =>
                p.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [payments, statusFilter, searchTerm]);

    const stats = useMemo(() => {
        return {
            totalRevenue: payments.reduce((acc, p) => p.status === 'completed' ? acc + p.amount : acc, 0),
            totalTransactions: payments.length,
            completed: payments.filter(p => p.status === 'completed').length,
            pending: payments.filter(p => p.status === 'pending').length,
        };
    }, [payments]);

    const handleUpdateStatus = async (id: number, status: string) => {
        if (!confirm(`Are you sure you want to mark this payment as ${status}?`)) return;
        try {
            const response = await axios.post(`${API_BASE_URL}/admin/update_payment_status.php`, { payment_id: id, status });
            if (response.data.success) {
                toast.success('Status updated!');
                fetchPayments(); // Refresh data
            } else {
                throw new Error(response.data.error);
            }
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const viewPaymentDetails = (payment: Payment) => {
        setSelectedPayment(payment);
        setModalOpen(true);
    }

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="admin-container">
            <AdminHeader onLogout={() => { /* handle logout */ }} />
            <div className="config-content">
                <div className="config-header">
                    <h1><i className="fas fa-credit-card"></i> Payment Management</h1>
                <p>View and manage payment transactions from customers.</p>
            </div>

            <div className="payments-container">
                <div className="payments-stats">
                    <div className="stat-card"><h3>Total Revenue</h3><p>${stats.totalRevenue.toFixed(2)}</p></div>
                    <div className="stat-card"><h3>Total Transactions</h3><p>{stats.totalTransactions}</p></div>
                    <div className="stat-card"><h3>Completed</h3><p>{stats.completed}</p></div>
                    <div className="stat-card"><h3>Pending</h3><p>{stats.pending}</p></div>
                </div>

                <div className="payments-table-container">
                    <div className="table-header">
                        <h2>Recent Transactions</h2>
                        <div className="table-filters">
                            <select id="statusFilter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="failed">Failed</option>
                                <option value="refunded">Refunded</option>
                            </select>
                            <input type="text" id="searchPayments" placeholder="Search transactions..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <div className="payments-table-wrapper">
                        <table className="payments-table">
                            <thead>
                                <tr>
                                    <th>Transaction ID</th>
                                    <th>Customer</th>
                                    <th>File</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.map(payment => (
                                    <tr key={payment.id}>
                                        <td>{payment.transaction_id}</td>
                                        <td>{payment.customer_name}</td>
                                        <td>{payment.file_name}</td>
                                        <td>${payment.amount.toFixed(2)}</td>
                                        <td><span className={`status status-${payment.status}`}>{payment.status}</span></td>
                                        <td>{new Date(payment.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <button onClick={() => viewPaymentDetails(payment)}>View</button>
                                            {payment.status === 'pending' && (
                                                <button onClick={() => handleUpdateStatus(payment.id, 'completed')}>Complete</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <PaymentDetailsModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} payment={selectedPayment} />
            </div>
        </div>
    );
};

export default PaymentsPage;
