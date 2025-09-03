import React from 'react';

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

interface PaymentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: Payment | null;
}

const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({ isOpen, onClose, payment }) => {
    if (!isOpen || !payment) {
        return null;
    }

    return (
        <div className="modal" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <span className="close-modal" onClick={onClose}>&times;</span>
                <div className="modal-header">
                    <h2 className="modal-title">Payment Details</h2>
                </div>
                <div className="modal-body">
                    <p><strong>Transaction ID:</strong> {payment.transaction_id}</p>
                    <p><strong>Customer:</strong> {payment.customer_name} ({payment.customer_email})</p>
                    <p><strong>Amount:</strong> ${payment.amount.toFixed(2)}</p>
                    <p><strong>Status:</strong> {payment.status}</p>
                </div>
            </div>
        </div>
    );
};

export default PaymentDetailsModal;
