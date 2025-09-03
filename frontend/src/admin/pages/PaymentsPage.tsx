import { useState, useEffect } from 'react';
import axios from 'axios';
// import { toast } from 'react-toastify';
// import PaymentDetailsModal from '../components/PaymentDetailsModal';

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
    const [, setPayments] = useState<Payment[]>([]);
    const [, setLoading] = useState(true); // loading is unused for now
    const [, setError] = useState<string | null>(null); // error is unused for now

    // const [statusFilter, setStatusFilter] = useState('all');
    // const [searchTerm, setSearchTerm] = useState('');

    // const [, setSelectedPayment] = useState<Payment | null>(null); // selectedPayment is unused for now
    // const [, setModalOpen] = useState(false); // isModalOpen is unused for now

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

    // const filteredPayments = useMemo(() => {
    //     return payments
    //         .filter(p => statusFilter === 'all' || p.status === statusFilter)
    //         .filter(p =>
    //             p.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    //             p.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    //             p.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
    //         );
    // }, [payments, statusFilter, searchTerm]);

    // const stats = useMemo(() => {
    //     return {
    //         totalRevenue: payments.reduce((acc, p) => p.status === 'completed' ? acc + p.amount : acc, 0),
    //         totalTransactions: payments.length,
    //         completed: payments.filter(p => p.status === 'completed').length,
    //         pending: payments.filter(p => p.status === 'pending').length,
    //     };
    // }, [payments]);

    // const handleUpdateStatus = async (id: number, status: string) => {
    //     // if (!confirm(`Are you sure you want to mark this payment as ${status}?`)) return;
    //     try {
    //         const response = await axios.post(`${API_BASE_URL}/admin/update_payment_status.php`, { payment_id: id, status });
    //         if (response.data.success) {
    //             // toast.success('Status updated!');
    //             fetchPayments(); // Refresh data
    //         } else {
    //             throw new Error(response.data.error);
    //         }
    //     } catch (err: any) {
    //         // toast.error(err.message);
    //     }
    // };

    return (
        <div className="config-content">
            {/* Stats Cards */}
            {/* Table */}
            {/* <PaymentDetailsModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} payment={selectedPayment} /> */}
        </div>
    );
};

export default PaymentsPage;
