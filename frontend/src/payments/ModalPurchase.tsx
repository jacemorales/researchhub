// src/payments/ModalPurchase.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useData } from "../hooks/useData";
import type { AcademicFile } from "../hooks/contexts/DataContext";

// Extend window interface
declare global {
  interface Window {
    retryPayment?: () => void;
    resetToInitialState?: () => void;
  }
}

interface ModalProps {
  onClose: () => void;
  data: AcademicFile | null;
  showToast: (message: string, type: "success" | "error" | "warning" | "info") => void;
}

interface ResultData {
  status: string;
  reference: string;
  amount?: number;
  paidAt?: string;
  data?: Record<string, unknown>;
}

interface ErrorData {
  type: string;
  title: string;
  icon: string;
  message: string;
  details?: string;
}

const PAYSTACK_PERCENTAGE_FEE = 0.015;

const ModalPurchase = ({ onClose, data, showToast }: ModalProps) => {
  const BASE_URI = import.meta.env.VITE_API_BASE_URL;
  const { website_config } = useData();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentPaystackRef, setCurrentPaystackRef] = useState<string | null>(null);
  const [popupWindow, setPopupWindow] = useState<Window | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [showErrorState, setShowErrorState] = useState(false);
  const [errorStateData, setErrorStateData] = useState<ErrorData | null>(null);
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [autoRetryTimer, setAutoRetryTimer] = useState<NodeJS.Timeout | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isMounted = useRef(true);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  // Cleanup on unmount
  useEffect(() => {
    console.log("[ModalPurchase] Component mounted");
    isMounted.current = true;
    
    return () => {
      console.log("[ModalPurchase] Component unmounting");
      isMounted.current = false;
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
      }
      if (autoRetryTimer) {
        clearTimeout(autoRetryTimer);
      }
    };
  }, [popupWindow, autoRetryTimer]);

  // Basic utilities
  const fmt = (n: number) => Number(n).toFixed(2);

  const hideErrorState = () => {
    setShowErrorState(false);
    setErrorStateData(null);
    setAutoRetryCount(0);
    if (autoRetryTimer) {
      clearTimeout(autoRetryTimer);
      setAutoRetryTimer(null);
    }
  };

  // Internet check
  const hasInternet = async () => {
    try {
      const endpoints = [
        'https://httpbin.org/ip',
        'https://jsonplaceholder.typicode.com/posts/1',
        'https://api.github.com'
      ];
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(endpoints[0], {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  };

  // Phone number validation
  const validatePhoneNumber = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, ''); // Remove non-digits
    return cleanPhone.length >= 11;
  };

  // Form validation
  const validateForm = useCallback(() => {
    if (!formRef.current || !data) return false;

    const formData = new FormData(formRef.current);
    const email = (formData.get("customer_email") as string)?.trim();
    const customerName = (formData.get("customer_name") as string)?.trim();
    const customerPhone = (formData.get("customer_phone") as string)?.trim();
    const amount = parseFloat(data.price ?? "") || 0;

    if (!customerName) {
      showToast("Please enter your full name.", "error");
      return false;
    }

    if (!email) {
      showToast("Please enter your email address.", "error");
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast("Please enter a valid email address.", "error");
      return false;
    }

    // Phone number validation
    if (!customerPhone) {
      showToast("Please enter your phone number.", "error");
      return false;
    }

    if (!validatePhoneNumber(customerPhone)) {
      showToast("Invalid phone number. Must be at least 11 digits.", "error");
      return false;
    }

    if (!amount || amount <= 0) {
      showToast("Invalid product price. Please refresh and try again.", "error");
      return false;
    }

    return true;
  }, [data, showToast]);

  const showError = (type: string, message: string, details: string = '', isRetryableError: boolean = false) => {
    const labels: Record<string, { title: string; icon: string }> = {
      developer: { title: 'Developer Error', icon: '🔧' },
      paystack: { title: 'Payment Service Error', icon: '⚡' },
      user: { title: 'Connection Issue', icon: '🌐' }
    };

    const { title, icon } = labels[type] || { title: 'Error', icon: '⚠️' };
    
    setErrorStateData({
      type,
      title,
      icon,
      message,
      details
    });
    setShowErrorState(true);
    setShowResult(false);
    setIsProcessing(false);
    setIsVerifying(false); // Stop loading when showing error
    
    // Start auto-retry for network issues OR retryable Paystack errors
    if ((type === 'user' || (type === 'paystack' && isRetryableError)) && autoRetryCount < 3) {
      startAutoRetry();
    }
  };

  // Helper function to check if error is retryable
  const isRetryablePaystackError = (errorMessage: string, errorDetails: string = '') => {
    const retryablePatterns = [
      'Failed to connect',
      'Couldn\'t connect to server',
      'timeout',
      'connection timed out',
      'network error',
      'Unable to verify payment status',
      'cURL failed',
      'Connection refused',
      'No route to host',
      'Temporary failure in name resolution'
    ];
    
    const fullErrorText = `${errorMessage} ${errorDetails}`.toLowerCase();
    return retryablePatterns.some(pattern => fullErrorText.includes(pattern.toLowerCase()));
  };
  const startAutoRetry = () => {
    if (autoRetryTimer) {
      clearTimeout(autoRetryTimer);
    }
    
    const timer = setTimeout(async () => {
      console.log(`[AutoRetry] Attempt ${autoRetryCount + 1} - Checking network and retrying...`);
      
      if (currentPaystackRef) {
        setAutoRetryCount(prev => prev + 1);
        hideErrorState();
        setIsVerifying(true);
        verifyPayment(currentPaystackRef);
      } else if (autoRetryCount < 2) {
        console.log(`[AutoRetry] No payment reference, retrying initialization...`);
        setAutoRetryCount(prev => prev + 1);
        hideErrorState();
        initializePayment();
      }
    }, 5000);
    
    setAutoRetryTimer(timer);
  };

  // Reset to initial state
  const resetToInitialState = useCallback(() => {
    setIsProcessing(false);
    setIsVerifying(false);
    setShowResult(false);
    setResultData(null);
    setShowErrorState(false);
    setErrorStateData(null);
    setCurrentPaystackRef(null);
    setAutoRetryCount(0);
    if (autoRetryTimer) {
      clearTimeout(autoRetryTimer);
      setAutoRetryTimer(null);
    }
    localStorage.removeItem('masterRef');
    localStorage.removeItem('platformRef');
    
    if (formRef.current) {
      formRef.current.reset();
    }
  }, [autoRetryTimer]);

  // VERIFY PAYMENT
  const verifyPayment = useCallback(async (masterRef: string) => {
    console.log("[verifyPayment] Starting verification for masterRef:", masterRef);
    setIsVerifying(true);

    const platformRef = localStorage.getItem('platformRef');
    if (!platformRef) {
      showError('developer', 'Platform reference missing', 'Please try again');
      return;
    }

    const online = await hasInternet();
    if (!online) {
      showError('user', 'No internet connection', 'Cannot verify payment status');
      return;
    }

    try {
      // ✅ Send BOTH masterRef and platformRef to verify.php
      const verifyUrl = `${BASE_URI}/backend/payments/verify.php?master_reference=${encodeURIComponent(masterRef)}&platform_reference=${encodeURIComponent(platformRef)}`;
      console.log("[verifyPayment] Calling verify URL:", verifyUrl);

      const response = await fetch(verifyUrl, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      const responseText = await response.text();
      console.log("[verifyPayment] Raw response:", responseText.substring(0, 500));

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch {
        console.error("[verifyPayment] JSON parse error");
        throw new Error('Invalid server response format');
      }
      
      console.log("[verifyPayment] Parsed verification result:", parsedData);
      
      const status = parsedData.payment_status || parsedData.status || 'failed';
      const amount = parsedData.data?.amount ? (parsedData.data.amount / 100) : null;
      const paidAt = parsedData.data?.paid_at ? new Date(parsedData.data.paid_at).toLocaleString() : null;

      // Clear masterRef and platformRef ONLY on success
      if (status === 'success') {
        localStorage.removeItem('masterRef');
        localStorage.removeItem('platformRef');
      }

      if (parsedData.file_error || parsedData.download_error) {
        const errorMsg = parsedData.file_error || parsedData.download_error || 'Failed to process payment file';
        showError('developer', 'File processing error', errorMsg);
        return;
      }

      // Stop loading states before showing result
      setIsProcessing(false);
      setIsVerifying(false);

      setResultData({
        status,
        reference: masterRef,
        amount: amount || undefined,
        paidAt: paidAt || undefined,
        data: parsedData.data
      });
      setShowResult(true);

      // Show appropriate toast
      if (status === 'success') {
        showToast("Payment successful!", "success");
      } else if (status === 'pending') {
        showToast('Payment is being processed. We\'ll notify you when complete.', 'info');
      } else if (status === 'failed') {
        showToast('Payment failed. Please try again.', 'error');
      } else if (status === 'abandoned') {
        showToast('Payment was abandoned.', 'warning');
      }

    } catch (error) {
      console.error("[verifyPayment] Verification failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRetryable = isRetryablePaystackError(errorMessage);
      showError('paystack', 'Verification failed', errorMessage, isRetryable);
    }
  }, [showToast, BASE_URI]);

  // WATCH POPUP CLOSE
  const watchPopupClose = useCallback((masterRef: string, popup: Window) => {
    console.log("[watchPopupClose] Starting to monitor popup for masterRef:", masterRef);
    
    let checkCount = 0;
    const maxChecks = 1200;
    const popupRef = popup;

    const checkInterval = setInterval(async () => {
      checkCount++;
      
      if (checkCount >= maxChecks) {
        clearInterval(checkInterval);
        return;
      }

      if (!popupRef || popupRef.closed) {
        clearInterval(checkInterval);
        console.log("[watchPopupClose] Popup closed, starting verification");
        
        setTimeout(() => {
          verifyPayment(masterRef);
        }, 1000);
      }
    }, 500);

    return () => {
      clearInterval(checkInterval);
    };
  }, [verifyPayment]);

  // Initialize payment
  const initializePayment = useCallback(async () => {
    if (!data || !formRef.current) {
      console.error("[initializePayment] Missing data or form reference");
      return;
    }

    if (!validateForm()) {
      return;
    }

    const formData = new FormData(formRef.current);
    const email = (formData.get("customer_email") as string)?.trim();
    const customerName = (formData.get("customer_name") as string)?.trim();
    const customerPhone = (formData.get("customer_phone") as string)?.trim();
    const amount = parseFloat(data.price ?? "") || 0;
    const fileId = data.drive_file_id;

    setIsProcessing(true);
    setIsVerifying(false);
    hideErrorState();
    setShowResult(false);
    console.log("[initializePayment] Starting payment initialization...");

    const online = await hasInternet();
    if (!online) {
      setIsProcessing(false);
      showError('user', 'No internet connection', 'Please check your connection and try again');
      return;
    }

    try {
      // ✅ Get or generate masterRef
      let masterRef = localStorage.getItem('masterRef');
      if (!masterRef) {
        masterRef = `RESEARCH_HUB_${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
        localStorage.setItem('masterRef', masterRef);
        console.log("[initializePayment] Generated new masterRef:", masterRef);
      } else {
        console.log("[initializePayment] Reusing existing masterRef:", masterRef);
      }

      // ✅ Generate NEW platformRef every time
      const platformRef = `PS_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      localStorage.setItem('platformRef', platformRef);
      console.log("[initializePayment] Generated new platformRef:", platformRef);

      const payload = { 
        email, 
        amount, 
        current_payment_platform_reference: platformRef,
        drive_file_id: fileId,
        customer_name: customerName,
        customer_phone: customerPhone, // ✅ Added phone number to payload
        reference_stat: masterRef
      };

      console.log("[initializePayment] Sending payload:", payload);

      const response = await fetch(`${BASE_URI}/backend/payments/initialize.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      console.log("[initializePayment] Response:", responseText.substring(0, 200));
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error('Invalid server response format');
      }
      
      if (result.status !== 'success' || !result.data?.authorization_url) {
        throw new Error(result.message || 'Initialization failed');
      }

      // ✅ Store masterRef for verification ONLY after successful initialization
      console.log("[initializePayment] Initialization successful, opening popup");
      setCurrentPaystackRef(masterRef);

      const url = result.data.authorization_url;
      const w = 600, h = 700;
      const left = (screen.width / 2) - (w / 2);
      const top = (screen.height / 2) - (h / 2);
      const popup = window.open(
        url,
        'pay_popup',
        `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${w},height=${h},top=${top},left=${left}`
      );

      if (popup) {
        setPopupWindow(popup);
        watchPopupClose(masterRef, popup);
        console.log("[initializePayment] Popup opened successfully, monitoring started");
      } else {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }

    } catch (error) {
      console.error("[initializePayment] Payment initialization failed:", error);
      setIsProcessing(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const isRetryable = isRetryablePaystackError(errorMessage);
      showError('paystack', 'Payment initialization failed', errorMessage, isRetryable);
    }
  }, [data, validateForm, watchPopupClose, BASE_URI]);

  // Handle form submit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    console.log("[handleSubmit] Form submitted");
    initializePayment();
  }, [initializePayment]);

  // Manual retry function - intelligently retry based on current state
  const handleRetryPayment = useCallback(async () => {
    console.log("[handleRetryPayment] Manual retry triggered");
    
    setShowErrorState(false);
    setErrorStateData(null);
    setAutoRetryCount(0);
    if (autoRetryTimer) {
      clearTimeout(autoRetryTimer);
      setAutoRetryTimer(null);
    }

    // Determine what to retry based on current state
    if (currentPaystackRef && localStorage.getItem('platformRef')) {
      // We have both references, payment was initialized successfully, retry verification
      console.log("[handleRetryPayment] Retrying verification for:", currentPaystackRef);
      setIsVerifying(true);
      verifyPayment(currentPaystackRef);
    } else {
      // Payment initialization failed or incomplete, retry initialization
      console.log("[handleRetryPayment] Retrying initialization");
      initializePayment();
    }
  }, [currentPaystackRef, verifyPayment, initializePayment, autoRetryTimer]);

  // Result action handlers
  const handleTryAgain = useCallback(() => {
    // This is the "Try Again" from payment results - reset to original state
    console.log("[handleTryAgain] Resetting to original state from payment results");
    setShowResult(false);
    setIsProcessing(false);
    setIsVerifying(false);
    setShowErrorState(false);
    setErrorStateData(null);
    setCurrentPaystackRef(null);
    setAutoRetryCount(0);
    if (autoRetryTimer) {
      clearTimeout(autoRetryTimer);
      setAutoRetryTimer(null);
    }
    // Only clear platformRef, keep masterRef for potential retry
    localStorage.removeItem('platformRef');
    
    if (formRef.current) {
      formRef.current.reset();
    }
  }, [autoRetryTimer]);

  const handleNewPayment = useCallback(() => {
    setShowResult(false);
    if (formRef.current) {
      formRef.current.reset();
    }
    setCurrentPaystackRef(null);
    localStorage.removeItem('masterRef');
    localStorage.removeItem('platformRef');
  }, []);

  const handleCheckStatus = useCallback(() => {
    if (currentPaystackRef) {
      setIsVerifying(true);
      verifyPayment(currentPaystackRef);
    }
  }, [currentPaystackRef, verifyPayment]);

  // Expose functions to window for error state buttons
  useEffect(() => {
    window.retryPayment = handleRetryPayment;
    window.resetToInitialState = resetToInitialState;

    return () => {
      delete window.retryPayment;
      delete window.resetToInitialState;
    };
  }, [handleRetryPayment, resetToInitialState]);

  if (!data) return null;

  return (
    <div className="modal" id="purchaseModal">
      <div className="modal-content">
        <span className="close-modal" onClick={onClose}>
          &times;
        </span>
        <div className="modal-header">
          <h2 className="modal-title">{website_config?.PURCHASE_TITLE}</h2>
          <p className="modal-subtitle">{website_config?.PURCHASE_SUBTITLE}</p>
        </div>

        <div className="modal-body" ref={modalBodyRef}>
          {/* Processing/Verifying Loader - Only show when not showing result or error */}
          {(isProcessing || isVerifying) && !showResult && !showErrorState && (
            <div className="payment-status loader-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
              <div className="status-icon">
                <i className="fas fa-spinner fa-spin"></i>
              </div>
              <p className="status-text" style={{ marginLeft: '10px' }}>
                {isVerifying ? 'Verifying... please wait' : 'Processing... please wait'}
              </p>
            </div>
          )}

          {/* Error State with Auto-retry info */}
          {showErrorState && errorStateData && (
            <div className={`error-state ${errorStateData.type}`} style={{ padding: '20px', margin: '20px 0', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#fff' }}>
              <div className="error-content">
                <div className="error-icon">{errorStateData.icon}</div>
                <h3>{errorStateData.title}</h3>
                <p className="error-message">{errorStateData.message}</p>
                {errorStateData.details && (
                  <p className="error-details">
                    <small>{errorStateData.details}</small>
                  </p>
                )}
                {errorStateData.type === 'user' && autoRetryCount < 3 && (
                  <p className="auto-retry-info" style={{ fontSize: '0.9em', color: '#6c757d', marginTop: '10px' }}>
                    Auto-retrying in 5 seconds... (Attempt {autoRetryCount + 1}/3)
                  </p>
                )}
                {errorStateData.type === 'paystack' && autoRetryCount < 3 && (
                  <p className="auto-retry-info" style={{ fontSize: '0.9em', color: '#6c757d', marginTop: '10px' }}>
                    Auto-retrying in 5 seconds... (Attempt {autoRetryCount + 1}/3)
                  </p>
                )}
                <button 
                  onClick={handleRetryPayment} 
                  className="btn btn-retry" 
                  style={{ 
                    marginTop: '15px', 
                    padding: '10px 20px', 
                    backgroundColor: '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: 'pointer' 
                  }}
                >
                  {errorStateData.type === 'user' ? 'Retry Now' : 'Retry Payment'}
                </button>
              </div>
            </div>
          )}

          {/* Payment Result */}
          {showResult && resultData && (
            <div id="payment-result" style={{ display: 'block', padding: '20px', margin: '20px 0', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#fff' }}>
              <div className={`payment-result ${resultData.status}`} style={{ textAlign: 'center' }}>
                <h3 style={{ 
                  color: resultData.status === 'success' ? '#47c363' : 
                        resultData.status === 'pending' ? '#007bff' :
                        resultData.status === 'abandoned' ? '#fd7e14' : '#fc544b',
                  marginBottom: '15px'
                }}>
                  {resultData.status === 'success' ? 'Payment successful!' :
                   resultData.status === 'pending' ? 'Payment is being processed...' :
                   resultData.status === 'abandoned' ? 'Payment was abandoned.' :
                   'Payment failed. Please try again.'}
                </h3>
                <p><strong>Reference:</strong> {resultData.reference}</p>
                {resultData.amount && (
                  <p><strong>Amount:</strong> ${resultData.amount.toFixed(2)}</p>
                )}
                {resultData.paidAt && (
                  <p><small>Paid: {resultData.paidAt}</small></p>
                )}
                <div className="action-buttons" style={{ marginTop: '20px' }}>
                  {resultData.status === 'pending' && (
                    <button onClick={handleCheckStatus} className="btn check-status" style={{ margin: '0 10px', padding: '10px 20px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Check Status
                    </button>
                  )}
                  {resultData.status !== 'success' && (
                    <button onClick={handleTryAgain} className="btn try-again" style={{ margin: '0 10px', padding: '10px 20px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Try Again
                    </button>
                  )}
                  {resultData.status === 'success' && (
                    <button onClick={handleNewPayment} className="btn btn-primary" style={{ margin: '0 10px', padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      New Payment
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Payment Form */}
          {!isProcessing && !isVerifying && !showErrorState && !showResult && (
            <div className="payment-form-container">
              <form ref={formRef} onSubmit={handleSubmit} id="payment-form" data-file-id={data.id}>
                <div className="form-row" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="fullName">
                      {website_config?.PURCHASE_NAME_LABEL}
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="customer_name"
                      placeholder="Enter your name"
                      required
                      style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label htmlFor="email">
                      {website_config?.PURCHASE_EMAIL_LABEL}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="customer_email"
                      placeholder="Enter your email"
                      required
                      style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label htmlFor="phone">
                    {website_config?.PURCHASE_PHONE_LABEL} <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="customer_phone"
                    placeholder="Enter your phone number (e.g., +1234567890)"
                    required
                    minLength={11}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}
                  />
                  <small style={{ color: '#6c757d', fontSize: '0.875em' }}>
                    Phone number must be at least 11 digits
                  </small>
                </div>

                <div className="payment-summary" style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                  <h3>{website_config?.PURCHASE_SUMMARY_TITLE}</h3>
                  <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0' }}>
                    <span>{website_config?.PURCHASE_PRODUCT_LABEL}:</span>
                    <span id="summaryProduct">{data.file_name}</span>
                  </div>
                  <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0' }}>
                    <span>{website_config?.PURCHASE_PRICE_LABEL}:</span>
                    <span className="amount" id="summaryPrice">
                      ${fmt(parseFloat(data.price ?? ""))}
                    </span>
                  </div>
                  <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0' }}>
                    <span>{website_config?.PURCHASE_TAX_LABEL}:</span>
                    <span id="fee-amount">
                      ${fmt(parseFloat(data.price ?? "") * PAYSTACK_PERCENTAGE_FEE)}
                    </span>
                  </div>
                  <div className="summary-row total" style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0', fontWeight: 'bold', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <span>{website_config?.PURCHASE_TOTAL_LABEL}:</span>
                    <span id="total-amount">
                      ${fmt(parseFloat(data.price ?? "") * (1 + PAYSTACK_PERCENTAGE_FEE))}
                    </span>
                  </div>
                </div>

                <div className="payment-methods" style={{ marginBottom: '20px' }}>
                  <h3>{website_config?.PURCHASE_METHOD_TITLE}</h3>
                  <div className="payment-options" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <label className="payment-option" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="stripe"
                        defaultChecked
                      />
                      <div className="payment-card" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fab fa-cc-stripe"></i>
                        <span>{website_config?.PURCHASE_STRIPE_LABEL}</span>
                      </div>
                    </label>
                    <label className="payment-option" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}>
                      <input type="radio" name="payment_method" value="paypal" />
                      <div className="payment-card" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fab fa-paypal"></i>
                        <span>{website_config?.PURCHASE_PAYPAL_LABEL}</span>
                      </div>
                    </label>
                    <label className="payment-option" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="bank_transfer"
                      />
                      <div className="payment-card" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-university"></i>
                        <span>{website_config?.PURCHASE_BANK_LABEL}</span>
                      </div>
                    </label>
                    <label className="payment-option" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}>
                      <input type="radio" name="payment_method" value="crypto" />
                      <div className="payment-card" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fab fa-bitcoin"></i>
                        <span>{website_config?.PURCHASE_CRYPTO_LABEL}</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="form-actions" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    id="pay-btn"
                    disabled={isProcessing || isVerifying}
                    style={{ 
                      padding: '12px 30px', 
                      background: '#6777ef', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px',
                      cursor: (isProcessing || isVerifying) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <i className="fas fa-lock"></i> {website_config?.PURCHASE_BUTTON}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onClose}
                    disabled={isProcessing || isVerifying}
                    style={{ 
                      padding: '12px 30px', 
                      background: '#6c757d', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px',
                      cursor: (isProcessing || isVerifying) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {website_config?.PURCHASE_CANCEL}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div id="notification" className="slide-notification"></div>
        </div>
      </div>
    </div>
  );
};

export default ModalPurchase;