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
    };
  }, [popupWindow]);

  // Basic utilities
  const fmt = (n: number) => Number(n).toFixed(2);

  const hideErrorState = () => {
    setShowErrorState(false);
    setErrorStateData(null);
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

  // Form validation
  const validateForm = useCallback(() => {
    if (!formRef.current || !data) return false;

    const formData = new FormData(formRef.current);
    const email = (formData.get("customer_email") as string)?.trim();
    const customerName = (formData.get("customer_name") as string)?.trim();
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

    if (!amount || amount <= 0) {
      showToast("Invalid product price. Please refresh and try again.", "error");
      return false;
    }

    return true;
  }, [data, showToast]);
  const showError = (type: string, message: string, details: string = '') => {
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
    localStorage.removeItem('paystack_reference');
    
    if (formRef.current) {
      formRef.current.reset();
    }
  }, []);

  // VERIFY PAYMENT - Enhanced version with unmount resilience
  const verifyPayment = useCallback(async (reference: string) => {
    console.log("[verifyPayment] Starting verification for reference:", reference, "isMounted:", isMounted.current);
    
    // Always try to verify, even if component unmounted
    // This ensures payment status is captured in backend
    
    if (isMounted.current) {
      setIsVerifying(true);
      setIsProcessing(false); // Turn off processing, turn on verifying
      hideErrorState();
    }

    const online = await hasInternet();
    if (!online) {
      console.log("[verifyPayment] No internet connection");
      if (isMounted.current) {
        setIsVerifying(false);
        showError('user', 'No internet connection', 'Cannot verify payment status without internet');
      } else {
        // Store for later retry even if component is unmounted
        localStorage.setItem('pending_verification_ref', reference);
      }
      return;
    }

    try {
      const url = `${BASE_URI}/backend/payments/verify.php?reference=${encodeURIComponent(reference)}`;
      console.log("[verifyPayment] Fetching verification from:", url);
      
      const response = await fetch(url, {
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
      
      // Always clean up localStorage regardless of mount status
      localStorage.removeItem('paystack_reference');
      localStorage.removeItem('pending_verification_ref');

      // Handle the verification response - Use payment_status for display
      const status = parsedData.payment_status || parsedData.status || 'failed';
      const amount = parsedData.data?.amount ? (parsedData.data.amount / 100) : null;
      const paidAt = parsedData.data?.paid_at ? new Date(parsedData.data.paid_at).toLocaleString() : null;

      // Check for file fetch errors and show developer error
      if (parsedData.file_error || parsedData.download_error) {
        if (isMounted.current) {
          setIsVerifying(false);
          showError('developer', 'File processing error', 
            parsedData.file_error || parsedData.download_error || 'Failed to process payment file');
        }
        return;
      }

      // Only update UI if component is still mounted
      if (isMounted.current) {
        setIsVerifying(false);
        setResultData({
          status,
          reference,
          amount: amount || undefined,
          paidAt: paidAt || undefined,
          data: parsedData.data
        });
        setShowResult(true);

        // Show appropriate toast
        if (status === 'success') {
          showToast("Payment successful!", "success");
          // Don't auto-close modal - let user manually close
        } else if (status === 'pending') {
          showToast('Payment is being processed. We\'ll notify you when complete.', 'info');
        } else if (status === 'failed') {
          showToast('Payment failed. Please try again.', 'error');
        } else if (status === 'abandoned') {
          showToast('Payment was abandoned.', 'warning');
        }
      } else {
        console.log("[verifyPayment] Component unmounted, verification complete but UI not updated");
        console.log("[verifyPayment] Payment status:", status);
        
        // Even if unmounted, we can show a basic notification to the user
        if (typeof window !== 'undefined' && window.alert) {
          if (status === 'success') {
            window.alert('Payment successful!');
          } else if (status === 'failed') {
            window.alert('Payment failed. Please check your account or contact support.');
          }
        }
      }

    } catch (error) {
      console.error("[verifyPayment] Verification failed:", error);
      
      if (isMounted.current) {
        setIsVerifying(false);
        showError('paystack', 'Verification failed', error instanceof Error ? error.message : 'Unknown error');
      } else {
        console.log("[verifyPayment] Component unmounted, verification failed:", error);
        // Store failed reference for potential manual retry
        localStorage.setItem('failed_verification_ref', reference);
      }
    }
  }, [showToast]);

  // WATCH POPUP CLOSE - Fixed version with better reference handling
  const watchPopupClose = useCallback((reference: string, popup: Window) => {
    console.log("[watchPopupClose] Starting to monitor popup for reference:", reference);
    
    let checkCount = 0;
    const maxChecks = 1200; // 10 minutes at 500ms intervals
    let popupRef = popup; // Keep local reference
    
    const checkInterval = setInterval(async () => {
      checkCount++;
      
      if (checkCount >= maxChecks) {
        clearInterval(checkInterval);
        console.log("[watchPopupClose] Timeout reached, stopping popup monitoring");
        return;
      }

      if (!popupRef) {
        console.log("[watchPopupClose] Popup reference is null");
        clearInterval(checkInterval);
        return;
      }

      try {
        // Check if popup is closed
        if (popupRef.closed) {
          clearInterval(checkInterval);
          console.log("[watchPopupClose] Popup closed detected, starting verification");
          
          if (!isMounted.current) {
            console.log("[watchPopupClose] Component unmounted, skipping verification");
            return;
          }
          
          // Add a small delay to ensure any final redirects are complete
          setTimeout(async () => {
            console.log("[watchPopupClose] Starting delayed verification, isMounted:", isMounted.current);
            
            // Even if component unmounts, we should still try to verify
            // This ensures payment status is captured
            const online = await hasInternet();
            if (!online) {
              console.log("[watchPopupClose] No internet, storing reference for later");
              // Store reference in localStorage for potential retry
              localStorage.setItem('pending_verification_ref', reference);
              
              if (isMounted.current) {
                showError('user', 'No internet connection', 'Cannot verify payment status. Retrying automatically...');
                // Set up auto-retry when connection is restored
                const retryInterval = setInterval(async () => {
                  const isOnline = await hasInternet();
                  if (isOnline) {
                    clearInterval(retryInterval);
                    localStorage.removeItem('pending_verification_ref');
                    verifyPayment(reference);
                  }
                }, 5000);
                
                // Clear retry interval after 5 minutes
                setTimeout(() => clearInterval(retryInterval), 300000);
              }
              return;
            }

            console.log("[watchPopupClose] Internet available, proceeding with verification");
            // Clear any pending verification reference
            localStorage.removeItem('pending_verification_ref');
            
            // Proceed with verification even if component unmounted
            // The verification will still complete and update localStorage/backend
            verifyPayment(reference);
          }, 1000);
        }
      } catch (error) {
        // Handle cross-origin access errors or other popup issues
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log("[watchPopupClose] Error checking popup status (likely closed):", errorMessage);
        clearInterval(checkInterval);
        
        if (!isMounted.current) return;
        
        setTimeout(async () => {
          if (!isMounted.current) return;
          const online = await hasInternet();
          if (online) {
            verifyPayment(reference);
          } else {
            showError('user', 'No internet connection', 'Cannot verify payment status');
          }
        }, 1000);
      }
    }, 500); // Check every 500ms for more responsive detection

    // Cleanup function
    return () => {
      clearInterval(checkInterval);
      popupRef = window;
    };
  }, [verifyPayment]);

  // Initialize payment
  const initializePayment = useCallback(async () => {
    if (!data || !formRef.current) {
      console.error("[initializePayment] Missing data or form reference");
      return;
    }

    // Validate form before proceeding
    if (!validateForm()) {
      return;
    }

    const formData = new FormData(formRef.current);
    const email = (formData.get("customer_email") as string)?.trim();
    const customerName = (formData.get("customer_name") as string)?.trim();
    const amount = parseFloat(data.price ?? "") || 0;
    const fileId = data.id;

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
      const paystackRef = `PS_${Date.now()}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      setCurrentPaystackRef(paystackRef);
      localStorage.setItem('paystack_reference', paystackRef);

      const payload = { 
        email, 
        amount, 
        reference: paystackRef,
        file_id: fileId,
        customer_name: customerName,
        reference_stat: `RESEARCH_HUB_${Math.random().toString(36).substr(2, 8).toUpperCase()}`
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

      console.log("[initializePayment] Initialization successful, opening popup");

      // Open Paystack popup
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
        // Start watching for popup close with direct popup reference
        watchPopupClose(paystackRef, popup);
        console.log("[initializePayment] Popup opened successfully, monitoring started");
      } else {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }

    } catch (error) {
      console.error("[initializePayment] Payment initialization failed:", error);
      setIsProcessing(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError('paystack', 'Payment initialization failed', errorMessage);
    }
  }, [data, validateForm, watchPopupClose]);

  // Handle form submit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    console.log("[handleSubmit] Form submitted");
    initializePayment();
  }, [initializePayment]);

  // Manual retry function
  const handleRetryPayment = useCallback(async () => {
    if (!currentPaystackRef) {
      resetToInitialState();
      return;
    }

    const online = await hasInternet();
    if (!online) {
      const errorData = {
        type: 'user',
        title: 'Connection Issue',
        icon: '🌐',
        message: 'Still no internet connection. Please check your connection and try again.',
        details: ''
      };
      setErrorStateData(errorData);
      setShowErrorState(true);
      setShowResult(false);
      setIsProcessing(false);
      return;
    }

    setShowErrorState(false);
    setErrorStateData(null);
    setIsProcessing(true);
    verifyPayment(currentPaystackRef);
  }, [currentPaystackRef, resetToInitialState, verifyPayment]);

  // Result action handlers
  const handleTryAgain = useCallback(() => {
    setShowResult(false);
    setCurrentPaystackRef(null);
    localStorage.removeItem('paystack_reference');
  }, []);

  const handleNewPayment = useCallback(() => {
    setShowResult(false);
    if (formRef.current) {
      formRef.current.reset();
    }
    setCurrentPaystackRef(null);
    localStorage.removeItem('paystack_reference');
  }, []);

  const handleCheckStatus = useCallback(() => {
    if (currentPaystackRef) {
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
          {/* Processing/Verifying Loader */}
          {(isProcessing || isVerifying) && (
            <div className="payment-status loader-container" style={{ display: 'flex' }}>
              <div className="status-icon">
                <i className="fas fa-spinner fa-spin"></i>
              </div>
              <p className="status-text">
                {isVerifying ? 'Verifying... please wait' : 'Processing... please wait'}
              </p>
            </div>
          )}

          {/* Error State */}
          {showErrorState && errorStateData && (
            <div className={`error-state ${errorStateData.type}`}>
              <div className="error-content">
                <div className="error-icon">{errorStateData.icon}</div>
                <h3>{errorStateData.title}</h3>
                <p className="error-message">{errorStateData.message}</p>
                {errorStateData.details && (
                  <p className="error-details">
                    <small>{errorStateData.details}</small>
                  </p>
                )}
                {errorStateData.type === 'user' ? (
                  <button onClick={handleRetryPayment} className="btn btn-retry">
                    Retry
                  </button>
                ) : (
                  <button onClick={resetToInitialState} className="btn btn-try-again">
                    Try Again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Payment Result */}
          {showResult && resultData && (
            <div id="payment-result" style={{ display: 'block' }}>
              <div className={`payment-result ${resultData.status}`}>
                <h3 style={{ 
                  color: resultData.status === 'success' ? '#47c363' : 
                        resultData.status === 'pending' ? '#007bff' :
                        resultData.status === 'abandoned' ? '#fd7e14' : '#fc544b'
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
                <div className="action-buttons">
                  {resultData.status === 'pending' && (
                    <button onClick={handleCheckStatus} className="btn check-status">
                      Check Status
                    </button>
                  )}
                  {resultData.status !== 'success' && (
                    <button onClick={handleTryAgain} className="btn try-again">
                      Try Again
                    </button>
                  )}
                  {resultData.status === 'success' && (
                    <button onClick={handleNewPayment} className="btn btn-primary">
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
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="fullName">
                      {website_config?.PURCHASE_NAME_LABEL}
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="customer_name"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">
                      {website_config?.PURCHASE_EMAIL_LABEL}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="customer_email"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="phone">
                    {website_config?.PURCHASE_PHONE_LABEL}
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="customer_phone"
                    placeholder="Optional"
                  />
                </div>

                <div className="payment-summary">
                  <h3>{website_config?.PURCHASE_SUMMARY_TITLE}</h3>
                  <div className="summary-row">
                    <span>{website_config?.PURCHASE_PRODUCT_LABEL}:</span>
                    <span id="summaryProduct">{data.file_name}</span>
                  </div>
                  <div className="summary-row">
                    <span>{website_config?.PURCHASE_PRICE_LABEL}:</span>
                    <span className="amount" id="summaryPrice">
                      ${fmt(parseFloat(data.price ?? ""))}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span>{website_config?.PURCHASE_TAX_LABEL}:</span>
                    <span id="fee-amount">
                      ${fmt(parseFloat(data.price ?? "") * PAYSTACK_PERCENTAGE_FEE)}
                    </span>
                  </div>
                  <div className="summary-row total">
                    <span>{website_config?.PURCHASE_TOTAL_LABEL}:</span>
                    <span id="total-amount">
                      ${fmt(parseFloat(data.price ?? "") * (1 + PAYSTACK_PERCENTAGE_FEE))}
                    </span>
                  </div>
                </div>

                <div className="payment-methods">
                  <h3>{website_config?.PURCHASE_METHOD_TITLE}</h3>
                  <div className="payment-options">
                    <label className="payment-option">
                      <input
                        type="radio"
                        name="payment_method"
                        value="stripe"
                        defaultChecked
                      />
                      <div className="payment-card">
                        <i className="fab fa-cc-stripe"></i>
                        <span>{website_config?.PURCHASE_STRIPE_LABEL}</span>
                      </div>
                    </label>
                    <label className="payment-option">
                      <input type="radio" name="payment_method" value="paypal" />
                      <div className="payment-card">
                        <i className="fab fa-paypal"></i>
                        <span>{website_config?.PURCHASE_PAYPAL_LABEL}</span>
                      </div>
                    </label>
                    <label className="payment-option">
                      <input
                        type="radio"
                        name="payment_method"
                        value="bank_transfer"
                      />
                      <div className="payment-card">
                        <i className="fas fa-university"></i>
                        <span>{website_config?.PURCHASE_BANK_LABEL}</span>
                      </div>
                    </label>
                    <label className="payment-option">
                      <input type="radio" name="payment_method" value="crypto" />
                      <div className="payment-card">
                        <i className="fab fa-bitcoin"></i>
                        <span>{website_config?.PURCHASE_CRYPTO_LABEL}</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    id="pay-btn"
                    disabled={isProcessing || isVerifying}
                  >
                    <i className="fas fa-lock"></i> {website_config?.PURCHASE_BUTTON}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onClose}
                    disabled={isProcessing || isVerifying}
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