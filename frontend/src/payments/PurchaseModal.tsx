import { useState, useEffect } from 'react';
import axios from 'axios';
// import { toast } from 'react-toastify';
import type { AcademicFile } from './types'; // Assuming a types file for shared interfaces

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const PAYSTACK_PERCENTAGE_FEE = 0.015;

interface PurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: AcademicFile | null;
}

type PaymentStatus = 'idle' | 'initializing' | 'verifying' | 'success' | 'error' | 'pending_verification';

const PurchaseModal: React.FC<PurchaseModalProps> = ({ isOpen, onClose, file }) => {
    const [status, setStatus] = useState<PaymentStatus>('idle');
    const [customer, setCustomer] = useState({ name: '', email: '' });
    const [paystackRef, setPaystackRef] = useState<string | null>(null);
    const [errorDetails, setErrorDetails] = useState({ message: '', details: '' });
    const [summary, setSummary] = useState({ price: 0, tax: 0, total: 0, fee: 0 });

    // Re-implement hasInternet check
    const hasInternet = async (): Promise<boolean> => {
        try {
            await fetch('https://httpbin.org/get', { method: 'GET', cache: 'no-cache', signal: AbortSignal.timeout(3000) });
            return true;
        } catch {
            return false;
        }
    };

    useEffect(() => {
        if (file) {
            const price = file.price;
            const tax = price * 0.10; // 10% tax
            const fee = (price + tax) * PAYSTACK_PERCENTAGE_FEE;
            const total = price + tax + fee;
            setSummary({ price, tax, total, fee });
        }
    }, [file]);

    const handleInitializePayment = async () => {
        if (!file || !customer.email) {
            // toast.error('Please enter your email address.');
            return;
        }

        setStatus('initializing');

        if (!await hasInternet()) {
            setErrorDetails({ message: 'No internet connection.', details: 'Please check your connection.' });
            setStatus('error');
            return;
        }

        try {
            const ref = `RHUB_${Date.now()}`;
            const response = await axios.post(`${API_BASE_URL}/payments/initialize.php`, {
                email: customer.email,
                amount: summary.total,
                reference: ref,
                file_id: file.id,
                customer_name: customer.name,
            });

            if (response.data.status === 'success') {
                setPaystackRef(ref);
                // In a real app, we'd open the auth_url in a popup
                // window.open(response.data.data.authorization_url);
                setStatus('pending_verification'); // Simulate popup closing and waiting for verification
            } else {
                throw new Error(response.data.message || 'Initialization failed.');
            }
        } catch (err: any) {
            setErrorDetails({ message: 'Initialization Failed', details: err.message });
            setStatus('error');
        }
    };

    // Polling for verification
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (status === 'pending_verification' && paystackRef) {
            interval = setInterval(async () => {
                try {
                    const response = await axios.get(`${API_BASE_URL}/payments/verify.php?reference=${paystackRef}`);
                    if (response.data.status === 'success') {
                        setStatus('success');
                        clearInterval(interval);
                    } else if (response.data.status === 'failed') {
                         setErrorDetails({ message: 'Payment Failed', details: response.data.message });
                         setStatus('error');
                         clearInterval(interval);
                    }
                    // if pending, do nothing and let it poll again
                } catch (err) {
                    // Stop polling on network error
                    setErrorDetails({ message: 'Verification Error', details: 'Could not connect to server.' });
                    setStatus('error');
                    clearInterval(interval);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [status, paystackRef]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleInitializePayment();
    };

    const handleClose = () => {
        setStatus('idle');
        setCustomer({ name: '', email: '' });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal" id="purchaseModal" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <span className="close-modal" onClick={handleClose}>&times;</span>
                <div className="modal-header">
                    <h2 className="modal-title">Complete Your Purchase</h2>
                    <p className="modal-subtitle">{file?.file_name}</p>
                </div>
                <div className="modal-body">
                    {status === 'idle' && (
                        <form id="checkoutForm" onSubmit={handleSubmit}>
                            <input type="hidden" id="fileId" name="file_id" value={file?.id} />
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="fullName">Full Name</label>
                                    <input type="text" id="fullName" name="customer_name" required value={customer.name} onChange={(e) => setCustomer(c => ({...c, name: e.target.value}))}/>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="email">Email Address</label>
                                    <input type="email" id="email" name="customer_email" required value={customer.email} onChange={(e) => setCustomer(c => ({...c, email: e.target.value}))}/>
                                </div>
                            </div>
                            <div className="payment-summary">
                                <h3>Order Summary</h3>
                                <div className="summary-row"><span>Product:</span><span id="summaryProduct">{file?.file_name}</span></div>
                                <div className="summary-row"><span>Price:</span><span id="summaryPrice">${summary.price.toFixed(2)}</span></div>
                                <div className="summary-row"><span>Tax (10%):</span><span id="summaryTax">${summary.tax.toFixed(2)}</span></div>
                                <div className="summary-row"><span>Fee (1.5%):</span><span>${summary.fee.toFixed(2)}</span></div>
                                <div className="summary-row total"><span>Total:</span><span id="summaryTotal">${summary.total.toFixed(2)}</span></div>
                            </div>
                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary"><i className="fas fa-lock"></i> Complete Purchase</button>
                            </div>
                        </form>
                    )}
                    {status === 'initializing' && <div className="payment-status"><div>Initializing...</div></div>}
                    {status === 'pending_verification' && <div className="payment-status"><div>Verifying Payment... Please do not close this window.</div></div>}
                    {status === 'success' && <div className="payment-status"><div>Payment Successful! Your file has been sent to your email.</div></div>}
                    {status === 'error' && (
                        <div className="payment-status">
                            <h3>{errorDetails.message}</h3>
                            <p>{errorDetails.details}</p>
                            <button onClick={handleInitializePayment} className="btn btn-primary">Try Again</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PurchaseModal;
