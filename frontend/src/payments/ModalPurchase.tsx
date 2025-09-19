import { useEffect, useRef, useState, useCallback } from "react";
import { useData } from "../hooks/useData";
import { useCryptoPricing } from "../hooks/useCryptoPricing";
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
  const { website_config, currency_code, setCurrencyCode } = useData();
  const { loading: cryptoLoading, convertUSDToCrypto } = useCryptoPricing();
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
  
  // New state for payment type and location
  const [paymentType, setPaymentType] = useState<'dollar' | 'naira' | 'crypto'>('dollar');
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<string[]>(['stripe', 'paypal']);
  const [originalCurrencyCode, setOriginalCurrencyCode] = useState<'USD' | 'NGN'>('USD');
  
  
  const formRef = useRef<HTMLFormElement>(null);
  const isMounted = useRef(true);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  // Use centrally provided user location and currency
  useEffect(() => {
    // Store the original currency code when modal opens
    setOriginalCurrencyCode(currency_code);
    
    if (currency_code === 'NGN') {
      setPaymentType('naira');
      setAvailablePaymentMethods(['paystack']);
    } else {
      setPaymentType('dollar');
      setAvailablePaymentMethods(['stripe', 'paypal']);
    }
  }, [currency_code]);

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
      // Restore original currency when modal closes
      setCurrencyCode(originalCurrencyCode);
    };
  }, [popupWindow, autoRetryTimer, originalCurrencyCode, setCurrencyCode]);

  // Basic utilities
  const fmt = (n: number) => Number(n).toFixed(2);

  // Handle payment type change
  const handlePaymentTypeChange = (type: 'dollar' | 'naira' | 'crypto') => {
    setPaymentType(type);
    
    // Update available payment methods based on type
    switch (type) {
      case 'dollar':
        setAvailablePaymentMethods(['stripe', 'paypal']);
        break;
      case 'naira':
        setAvailablePaymentMethods(['paystack']);
        break;
      case 'crypto':
        setAvailablePaymentMethods(['nowpayments']);
        break;
      default:
        setAvailablePaymentMethods(['stripe', 'paypal']);
    }
  };

  // Get price based on payment type and file data
  const getPriceForPaymentType = () => {
    if (!data?.price) return 0;
    
    const priceObj = typeof data.price === 'string' ? JSON.parse(data.price) : data.price;
    
    switch (paymentType) {
      case 'naira':
        return priceObj.ngn || 0;
      case 'dollar':
      case 'crypto':
        return priceObj.usd || 0;
      default:
        return priceObj.usd || 0;
    }
  };

  // Get currency symbol for display
  const getCurrencySymbol = () => {
    if (paymentType === 'crypto') return '$';
    if (paymentType === 'naira') return '₦';
    return '$';
  };

  // Get effective currency code for payment processing
  const getEffectiveCurrencyCode = () => {
    if (paymentType === 'naira') return 'NGN';
    if (paymentType === 'crypto') return 'USD'; // Crypto amounts are in USD
    return 'USD';
  };

  // Format crypto amount for display
  const formatCryptoAmount = (usdAmount: number, cryptoType: 'bitcoin' | 'solana' | 'tron'): string => {
    const cryptoAmount = convertUSDToCrypto(usdAmount, cryptoType);
    
    if (cryptoType === 'bitcoin') {
      return cryptoAmount.toFixed(8); // Bitcoin: 8 decimal places
    } else if (cryptoType === 'solana') {
      return cryptoAmount.toFixed(4); // Solana: 4 decimal places
    } else if (cryptoType === 'tron') {
      return cryptoAmount.toFixed(2); // Tron: 2 decimal places
    }
    
    return cryptoAmount.toFixed(6); // Default: 6 decimal places
  };

  // Get crypto symbol
  const getCryptoSymbol = (cryptoType: 'bitcoin' | 'solana' | 'tron'): string => {
    switch (cryptoType) {
      case 'bitcoin': return 'BTC';
      case 'solana': return 'SOL';
      case 'tron': return 'TRX';
      default: return '';
    }
  };

  const hideErrorState = () => {
    setShowErrorState(false);
    setErrorStateData(null);
    setAutoRetryCount(0);
    if (autoRetryTimer) {
      clearTimeout(autoRetryTimer);
      setAutoRetryTimer(null);
    }
    // ✅ DON'T reset request tracking here to maintain state consistency
  };

  // Internet check - using our own backend endpoint to avoid CORS issues
  const hasInternet = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(`${BASE_URI}/backend/db_fetch.php?ping=true`, {
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
    // Get price based on current payment type
    const amount = getPriceForPaymentType();

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

  // Reset to initial state - ONLY called from payment results "Try Again"
  const resetToInitialState = useCallback(() => {
    console.log("[resetToInitialState] Resetting to initial modal state");
    setIsProcessing(false);
    setIsVerifying(false);
    setShowResult(false);
    setResultData(null);
    setShowErrorState(false);
    setErrorStateData(null);
    setAutoRetryCount(0);
    if (autoRetryTimer) {
      clearTimeout(autoRetryTimer);
      setAutoRetryTimer(null);
    }
    
    
    // ✅ Only clear platformRef as requested
    localStorage.removeItem('platformRef');
    
    if (formRef.current) {
      formRef.current.reset();
    }
  }, [autoRetryTimer]);

  // VERIFY PAYMENT with enhanced error handling
  const verifyPayment = useCallback(async (masterRef: string) => {
    console.log("[verifyPayment] Starting verification for masterRef:", masterRef);
    setIsVerifying(true);

    const platformRef = localStorage.getItem('platformRef');
    if (!platformRef) {
      console.error("[verifyPayment] Missing platformRef - initialize tracking issue");
      showError('developer', 'Platform reference missing', 'Payment tracking error - will retry from initialization');
      return;
    }

    // Double-check network before proceeding
    const hasNetwork = await hasInternet();
    if (!hasNetwork) {
      showError('user', 'No internet connection', 'Cannot verify payment status');
      return;
    }

    try {
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

      // 🔍 ENHANCED PAYSTACK ERROR HANDLING
      if (parsedData.status === 'error' && parsedData.type === 'paystack') {
        const errorMessage = parsedData.message || 'Unknown Paystack error';
        const errorDetails = parsedData.details || '';
        
        console.log("[verifyPayment] Paystack error detected:", errorMessage);
        
        // Handle specific Paystack errors
        if (errorMessage.includes('Transaction reference not found')) {
          console.log("[verifyPayment] Transaction not found - initialization may have failed");
          const isRetryable = true;
          showError('paystack', 'Transaction not found - will retry initialization', errorDetails, isRetryable);
          return;
        } else if (errorMessage.includes('reference already used') || errorMessage.includes('already processed')) {
          console.log("[verifyPayment] Reference already used - clearing platformRef and retrying");
          localStorage.removeItem('platformRef');
          const isRetryable = true;
          showError('paystack', 'Payment reference expired - generating new reference', errorDetails, isRetryable);
          return;
        } else {
          // Other retryable Paystack errors
          const isRetryable = isRetryablePaystackError(errorMessage, errorDetails);
          showError('paystack', 'Verification failed', errorDetails, isRetryable);
          return;
        }
      }
      
      const status = parsedData.payment_status || parsedData.status || 'failed';
      const amount = parsedData.data?.amount ? (parsedData.data.amount / 100) : null;
      const paidAt = parsedData.data?.paid_at ? new Date(parsedData.data.paid_at).toLocaleString() : null;

      // Clear localStorage ONLY on success
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

  // Initialize payment with comprehensive tracking
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
    const amount = getPriceForPaymentType();
    const fileId = data.drive_file_id;

    console.log("[initializePayment] Starting payment initialization...");
    setIsProcessing(true);
    setIsVerifying(false);
    hideErrorState();
    setShowResult(false);

    // First check network
    const hasNetwork = await hasInternet();
    if (!hasNetwork) {
      setIsProcessing(false);
      showError('user', 'No internet connection', 'Please check your connection and try again');
      return;
    }

    try {
      // Get or generate masterRef
      let masterRef = localStorage.getItem('masterRef');
      if (!masterRef) {
        masterRef = `RESEARCH_HUB_${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
        localStorage.setItem('masterRef', masterRef);
        console.log("[initializePayment] Generated new masterRef:", masterRef);
      } else {
        console.log("[initializePayment] Reusing existing masterRef:", masterRef);
      }

      // Generate NEW platformRef every time
      const platformRef = `PS_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      localStorage.setItem('platformRef', platformRef);
      console.log("[initializePayment] Generated new platformRef:", platformRef);

      const payload = { 
        email, 
        amount, 
        currency: getEffectiveCurrencyCode(),
        current_payment_platform_reference: platformRef,
        drive_file_id: fileId,
        customer_name: customerName,
        customer_phone: customerPhone,
        reference_stat: masterRef
      };

      console.log("[initializePayment] Sending payload to initialize.php:", payload);

      const response = await fetch(`${BASE_URI}/backend/payments/initialize.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      console.log("[initializePayment] Raw response:", responseText.substring(0, 200));
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error('Invalid server response format');
      }

      // Check for Paystack-specific errors in response
      if (result.status === 'error' && result.type === 'paystack') {
        console.log("[initializePayment] Paystack error in response:", result.message);
        const isRetryable = isRetryablePaystackError(result.message, result.details || '');
        showError('paystack', result.message || 'Payment initialization failed', result.details || '', isRetryable);
        return;
      }
      
      if (result.status !== 'success' || !result.data?.authorization_url) {
        throw new Error(result.message || 'Initialization failed');
      }

      // ✅ SUCCESSFUL INITIALIZATION - Update tracking
      console.log("[initializePayment] ✅ Initialization successful!");
      setCurrentPaystackRef(masterRef);

      console.log("[initializePayment] Opening popup with URL:", result.data.authorization_url);

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
            <div className="payment-status loader-container">
              <div className="status-icon">
                <i className="fas fa-spinner fa-spin"></i>
              </div>
              <p className="status-text">
                {isVerifying ? 'Verifying... please wait' : 'Processing... please wait'}
              </p>
            </div>
          )}

          {/* Error State with Auto-retry info */}
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
                {errorStateData.type === 'user' && autoRetryCount < 3 && (
                  <p className="auto-retry-info">
                    Auto-retrying in 5 seconds... (Attempt {autoRetryCount + 1}/3)
                  </p>
                )}
                {errorStateData.type === 'paystack' && autoRetryCount < 3 && (
                  <p className="auto-retry-info">
                    Auto-retrying in 5 seconds... (Attempt {autoRetryCount + 1}/3)
                  </p>
                )}
                <button 
                  onClick={handleRetryPayment} 
                  className="btn btn-retry"
                >
                  {errorStateData.type === 'user' ? 'Retry Now' : 'Retry Payment'}
                </button>
              </div>
            </div>
          )}

          {/* Payment Result */}
          {showResult && resultData && (
            <div id="payment-result" className="payment-result-container">
              <div className={`payment-result ${resultData.status}`}>
                <h3 className={`result-title status-${resultData.status}`}>
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
                      {website_config?.PURCHASE_NAME_LABEL} <span className="required">*</span>
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
                      {website_config?.PURCHASE_EMAIL_LABEL} <span className="required">*</span>
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
                    {website_config?.PURCHASE_PHONE_LABEL} <span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="customer_phone"
                    placeholder="Enter your phone number (e.g., +1234567890)"
                  />
                  <small className="form-help">
                    Phone number must be at least 11 digits
                  </small>
                </div>

                {/* Payment Type Selection */}
                <div className="form-group">
                  <label htmlFor="paymentType">
                    Payment Type <span className="required">*</span>
                  </label>
                  <select
                    id="paymentType"
                    value={paymentType}
                    onChange={(e) => handlePaymentTypeChange(e.target.value as 'dollar' | 'naira' | 'crypto')}
                  >
                    <option value="dollar">Dollar (USD)</option>
                    <option value="naira">Naira (NGN)</option>
                    <option value="crypto">Crypto</option>
                  </select>
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
                      {getCurrencySymbol()}{fmt(getPriceForPaymentType())}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span>{website_config?.PURCHASE_TAX_LABEL}:</span>
                    <span id="fee-amount">
                      {getCurrencySymbol()}{fmt(getPriceForPaymentType() * PAYSTACK_PERCENTAGE_FEE)}
                    </span>
                  </div>
                  <div className="summary-row total">
                    <span>{website_config?.PURCHASE_TOTAL_LABEL}:</span>
                    <span id="total-amount">
                      {getCurrencySymbol()}{fmt(getPriceForPaymentType() * (1 + PAYSTACK_PERCENTAGE_FEE))}
                    </span>
                  </div>
                </div>

                <div className="payment-methods">
                  <h3>{website_config?.PURCHASE_METHOD_TITLE}</h3>
                  <div className="payment-options">
                    {availablePaymentMethods.includes('stripe') && (
                      <label className="payment-option">
                        <input
                          type="radio"
                          name="payment_method"
                          value="stripe"
                          defaultChecked={availablePaymentMethods[0] === 'stripe'}
                        />
                        <div className="payment-card">
                          <i className="fab fa-cc-stripe"></i>
                          <span>{website_config?.PURCHASE_STRIPE_LABEL || 'Stripe'}</span>
                        </div>
                      </label>
                    )}
                    {availablePaymentMethods.includes('paypal') && (
                      <label className="payment-option">
                        <input 
                          type="radio" 
                          name="payment_method" 
                          value="paypal"
                          defaultChecked={availablePaymentMethods[0] === 'paypal'}
                        />
                        <div className="payment-card">
                          <i className="fab fa-paypal"></i>
                          <span>{website_config?.PURCHASE_PAYPAL_LABEL || 'PayPal'}</span>
                        </div>
                      </label>
                    )}
                    {availablePaymentMethods.includes('paystack') && (
                      <label className="payment-option">
                        <input 
                          type="radio" 
                          name="payment_method" 
                          value="paystack"
                          defaultChecked={availablePaymentMethods[0] === 'paystack'}
                        />
                        <div className="payment-card">
                          <i className="fas fa-money-bill-wave"></i>
                          <span>{website_config?.PURCHASE_PAYSTACK_LABEL || 'Paystack'}</span>
                        </div>
                      </label>
                    )}
                    {availablePaymentMethods.includes('nowpayments') && (
                      <div className="crypto-payment-options">
                        <label className="payment-option crypto-option">
                          <input 
                            type="radio" 
                            name="payment_method" 
                            value="bitcoin"
                            defaultChecked={true}
                          />
                          <div className="payment-card">
                            <i className="fab fa-bitcoin bitcoin-icon"></i>
                            <div className="crypto-info">
                              <span>Bitcoin (BTC)</span>
                              {cryptoLoading ? (
                                <small>Loading price...</small>
                              ) : (
                                <small>
                                  {formatCryptoAmount(getPriceForPaymentType() * (1 + PAYSTACK_PERCENTAGE_FEE), 'bitcoin')} {getCryptoSymbol('bitcoin')} 
                                  <span style={{ color: '#666' }}> (${fmt(getPriceForPaymentType() * (1 + PAYSTACK_PERCENTAGE_FEE))})</span>
                                </small>
                              )}
                            </div>
                          </div>
                        </label>
                        <label className="payment-option crypto-option">
                          <input 
                            type="radio" 
                            name="payment_method" 
                            value="solana"
                          />
                          <div className="payment-card">
                            <i className="fas fa-coins solana-icon"></i>
                            <div className="crypto-info">
                              <span>Solana (SOL)</span>
                              {cryptoLoading ? (
                                <small>Loading price...</small>
                              ) : (
                                <small>
                                  {formatCryptoAmount(getPriceForPaymentType() * (1 + PAYSTACK_PERCENTAGE_FEE), 'solana')} {getCryptoSymbol('solana')} 
                                  <span style={{ color: '#666' }}> (${fmt(getPriceForPaymentType() * (1 + PAYSTACK_PERCENTAGE_FEE))})</span>
                                </small>
                              )}
                            </div>
                          </div>
                        </label>
                        <label className="payment-option crypto-option">
                          <input 
                            type="radio" 
                            name="payment_method" 
                            value="tron"
                          />
                          <div className="payment-card">
                            <i className="fas fa-coins tron-icon"></i>
                            <div className="crypto-info">
                              <span>Tron (TRX)</span>
                              {cryptoLoading ? (
                                <small>Loading price...</small>
                              ) : (
                                <small>
                                  {formatCryptoAmount(getPriceForPaymentType() * (1 + PAYSTACK_PERCENTAGE_FEE), 'tron')} {getCryptoSymbol('tron')} 
                                  <span style={{ color: '#666' }}> (${fmt(getPriceForPaymentType() * (1 + PAYSTACK_PERCENTAGE_FEE))})</span>
                                </small>
                              )}
                            </div>
                          </div>
                        </label>
                      </div>
                    )}
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