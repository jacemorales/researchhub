// src/components/ModalPurchase.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useData } from "../hooks/useData";
import { useCryptoPricing } from "../hooks/useCryptoPricing";
import type { AcademicFile } from "../hooks/contexts/DataContext";

// Handle webhook response
interface WebhookResponseData {
  payment_status: 'success' | 'failed' | 'abandoned' | 'pending';
  reference?: string;
  data?: {
    reference?: string;
    amount?: number;
    paid_at?: string;
    paidAt?: string;
  };
}

// Extend window interface
declare global {
  interface Window {
    retryPayment?: () => void;
    resetToInitialState?: () => void;
    handleWebhookResponse?: (arg: WebhookResponseData) => void;
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
  isRetryable?: boolean;
}

const PAYSTACK_PERCENTAGE_FEE = 0.015;

// New component for Crypto Payment Options
const CryptoPaymentOptions = ({ getPrice, getCurrencySymbol, fmt }: { getPrice: () => number, getCurrencySymbol: () => string, fmt: (n: number) => string }) => {
  const { loading: cryptoLoading, getCryptoPrices, convertUSDToCrypto } = useCryptoPricing();

  useEffect(() => {
    getCryptoPrices();
  }, [getCryptoPrices]);

  const formatCryptoAmount = (usdAmount: number, cryptoType: 'bitcoin' | 'solana' | 'tron'): string => {
    const cryptoAmount = convertUSDToCrypto(usdAmount, cryptoType);
    if (cryptoType === 'bitcoin') return cryptoAmount.toFixed(8);
    if (cryptoType === 'solana') return cryptoAmount.toFixed(4);
    if (cryptoType === 'tron') return cryptoAmount.toFixed(2);
    return cryptoAmount.toFixed(6);
  };

  const getCryptoSymbol = (cryptoType: 'bitcoin' | 'solana' | 'tron'): string => {
    switch (cryptoType) {
      case 'bitcoin': return 'BTC';
      case 'solana': return 'SOL';
      case 'tron': return 'TRX';
      default: return '';
    }
  };

  const totalAmount = getPrice() * (1 + PAYSTACK_PERCENTAGE_FEE);

  return (
    <>
      <label className="payment-option crypto-option">
        <input type="radio" name="payment_method" value="bitcoin" defaultChecked={true} />
        <div className="payment-card">
          <div className="flex">
            <i className="fab fa-bitcoin bitcoin-icon"></i>
            <span>Bitcoin (BTC)</span>
          </div>
          <div className="crypto-info">
            {cryptoLoading ? (<small>Loading price...</small>) : (
              <small>
                {formatCryptoAmount(totalAmount, 'bitcoin')} {getCryptoSymbol('bitcoin')}
                <br /><span style={{ color: '#666' }}> ({getCurrencySymbol()}{fmt(totalAmount)})</span>
              </small>
            )}
          </div>
        </div>
      </label>
      <label className="payment-option crypto-option">
        <input type="radio" name="payment_method" value="solana" />
        <div className="payment-card">
          <div className="flex">
            <i className="fas fa-coins solana-icon"></i>
            <span>Solana (SOL)</span>
          </div>
          <div className="crypto-info">
            {cryptoLoading ? (<small>Loading price...</small>) : (
              <small>
                {formatCryptoAmount(totalAmount, 'solana')} {getCryptoSymbol('solana')}
                <br /><span style={{ color: '#666' }}> ({getCurrencySymbol()}{fmt(totalAmount)})</span>
              </small>
            )}
          </div>
        </div>
      </label>
      <label className="payment-option crypto-option">
        <input type="radio" name="payment_method" value="tron" />
        <div className="payment-card">
          <div className="flex">
            <i className="fas fa-coins tron-icon"></i>
            <span>Tron (TRX)</span>
          </div>
          <div className="crypto-info">
            {cryptoLoading ? (<small>Loading price...</small>) : (
              <small>
                {formatCryptoAmount(totalAmount, 'tron')} {getCryptoSymbol('tron')}
                <br /><span style={{ color: '#666' }}> ({getCurrencySymbol()}{fmt(totalAmount)})</span>
              </small>
            )}
          </div>
        </div>
      </label>
    </>
  );
};


const ModalPurchase = ({ onClose, data, showToast }: ModalProps) => {
  const BASE_URI = import.meta.env.VITE_API_BASE_URL;
  const { website_config, currency_code } = useData();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false); // New state for fallback polling
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [showErrorState, setShowErrorState] = useState(false);
  const [errorStateData, setErrorStateData] = useState<ErrorData | null>(null);
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [autoRetryTimer, setAutoRetryTimer] = useState<NodeJS.Timeout | null>(null);

  // State for payment type and location
  const [paymentType, setPaymentType] = useState<'dollar' | 'naira' | 'crypto'>(() => currency_code === 'NGN' ? 'naira' : 'dollar');
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<string[]>(() => currency_code === 'NGN' ? ['paystack'] : ['stripe', 'paypal']);

  const formRef = useRef<HTMLFormElement>(null);
  const isMounted = useRef(true);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  // Clear form data when payment is successful
  const clearFormData = useCallback(() => {
    localStorage.removeItem('paymentFormData');
  }, []);

  // Get price based on payment type and file data
  const getPriceForPaymentType = useCallback(() => {
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
  }, [data, paymentType]);

  const hideErrorState = useCallback(() => {
    setShowErrorState(false);
    setErrorStateData(null);
    setAutoRetryCount(0);
    if (autoRetryTimer) {
      clearTimeout(autoRetryTimer);
      setAutoRetryTimer(null);
    }
  }, [autoRetryTimer]);

  const showError = useCallback((type: string, message: string, details: string = '', isRetryableError: boolean = false) => {
    const labels: Record<string, { title: string; icon: string }> = {
      developer: { title: 'Developer Error', icon: '🔧' },
      paystack: { title: 'Paystack Error', icon: '⚡' },
      stripe: { title: 'Stripe Error', icon: '💳' },
      paypal: { title: 'PayPal Error', icon: '🅿️' },
      nowpayments: { title: 'NOWPayments Error', icon: '🪙' },
      user: { title: 'Connection Issue', icon: '🌐' }
    };
    const { title, icon } = labels[type] || { title: 'Error', icon: '⚠️' };

    setErrorStateData({
      type,
      title,
      icon,
      message,
      details,
      isRetryable: isRetryableError
    });
    setShowErrorState(true);
    setShowResult(false);

    // Defer setting isProcessing to next tick to avoid UI race condition
    setTimeout(() => {
      if (isMounted.current) {
        setIsProcessing(false);
      }
    }, 0);

    // Start auto-retry for network issues OR any retryable error
    if (isRetryableError && autoRetryCount < 3) {
      startAutoRetry();
    }
  }, [autoRetryCount]);

  // ✅ SHARED ERROR HANDLER — used by both initializePayment and handleWebhookResponse
  const handlePaymentError = useCallback((
    errorType: string,
    message: string,
    details: string = '',
    isRetryable: boolean = false
  ) => {
    showError(errorType, message, details, isRetryable);
  }, [showError]);


  // Effect to run once on mount for form restoration
  useEffect(() => {
    const savedFormData = localStorage.getItem('paymentFormData');
    if (savedFormData && formRef.current) {
      try {
        const formData = JSON.parse(savedFormData);
        const form = formRef.current;
        if (formData.customer_name) form.customer_name.value = formData.customer_name;
        if (formData.customer_email) form.customer_email.value = formData.customer_email;
        if (formData.customer_phone) form.customer_phone.value = formData.customer_phone;
        // Restore payment method only if it's valid for the current payment type
        if (formData.payment_method && availablePaymentMethods.includes(formData.payment_method)) {
          setPaymentMethod(formData.payment_method);
          const paymentMethodRadio = form.querySelector(`input[name="payment_method"][value="${formData.payment_method}"]`) as HTMLInputElement;
          if (paymentMethodRadio) paymentMethodRadio.checked = true;
        }
      } catch (error) {
        console.error('Error restoring form ', error);
      }
    }
  }, [availablePaymentMethods]); // Depend on available methods to ensure we don't set an invalid one

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (autoRetryTimer) {
        clearTimeout(autoRetryTimer);
      }
    };
  }, [autoRetryTimer]);

  // Update localStorage on form input change
  useEffect(() => {
    if (!formRef.current) return;

    const handleInputChange = () => {
      if (!formRef.current) return;
      const formData = new FormData(formRef.current);
      const formDataObj = {
        customer_name: (formData.get("customer_name") as string)?.trim(),
        customer_email: (formData.get("customer_email") as string)?.trim(),
        customer_phone: (formData.get("customer_phone") as string)?.trim(),
        payment_method: formData.get("payment_method") as string
      };
      localStorage.setItem('paymentFormData', JSON.stringify(formDataObj));
    };

    const form = formRef.current;
    const inputs = form.querySelectorAll('input, select');

    inputs.forEach(input => {
      input.addEventListener('input', handleInputChange);
      input.addEventListener('change', handleInputChange);
    });

    return () => {
      inputs.forEach(input => {
        input.removeEventListener('input', handleInputChange);
        input.removeEventListener('change', handleInputChange);
      });
    };
  }, []);

  // Basic utilities
  const fmt = (n: number) => Number(n).toFixed(2);

  // Handle payment type change
  const handlePaymentTypeChange = (type: 'dollar' | 'naira' | 'crypto') => {
    setPaymentType(type);
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

  // Get currency symbol for display
  const getCurrencySymbol = () => {
    if (paymentType === 'crypto') return '$';
    if (paymentType === 'naira') return '₦';
    return '$';
  };

  // Get effective currency code for payment processing
  const getEffectiveCurrencyCode = useCallback(() => {
    if (paymentType === 'naira') return 'NGN';
    if (paymentType === 'crypto') return 'USD';
    return 'USD';
  }, [paymentType]);

  // Internet check
  const hasInternet = useCallback(async () => {
    const endpoints = [
      'https://corsproxy.io/?https://www.google.com/generate_204',      // Google’s CORS-Friendly Endpoint
      'https://corsproxy.io/?https://httpbin.org/ip',      // Primary
      'https://corsproxy.io/?https://icanhazip.com',       // Fallback — CORS enabled, very lightweight
      'https://corsproxy.io/?https://api.ipify.org?format=json' // Another fallback
    ];

    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, {
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

        if (response.ok) {
          return true;
        }
      } catch (err) {
        console.warn(`[hasInternet] Failed to reach ${url}:`, err);
        continue;
      }
    }

    return false;
  }, []);

  // Phone number validation
  const validatePhoneNumber = (phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 11;
  };

  // Save form data to localStorage
  const saveFormData = useCallback(() => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const formDataObj = {
      customer_name: (formData.get("customer_name") as string)?.trim(),
      customer_email: (formData.get("customer_email") as string)?.trim(),
      customer_phone: (formData.get("customer_phone") as string)?.trim(),
      payment_method: formData.get("payment_method") as string
    };
    localStorage.setItem('paymentFormData', JSON.stringify(formDataObj));
  }, []);

  // Form validation
  const validateForm = useCallback(() => {
    if (!formRef.current || !data) return false;
    const formData = new FormData(formRef.current);
    const email = (formData.get("customer_email") as string)?.trim();
    const customerName = (formData.get("customer_name") as string)?.trim();
    const customerPhone = (formData.get("customer_phone") as string)?.trim();
    const amount = getPriceForPaymentType();

    if (!customerName) {
      showToast("Please enter your full name.", "error");
      return false;
    }
    if (!email) {
      showToast("Please enter your email address.", "error");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast("Please enter a valid email address.", "error");
      return false;
    }
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
    saveFormData();
    return true;
  }, [data, showToast, saveFormData, getPriceForPaymentType]);

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
      const masterRef = localStorage.getItem('masterRef');
      if (masterRef) {
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
    setShowResult(false);
    setResultData(null);
    setShowErrorState(false);
    setErrorStateData(null);
    setAutoRetryCount(0);
    if (autoRetryTimer) {
      clearTimeout(autoRetryTimer);
      setAutoRetryTimer(null);
    }
    localStorage.removeItem('platformRef');
    if (formRef.current) {
      formRef.current.reset();
    }
  }, [autoRetryTimer]);

  // Get payment URL based on payment type
  const getPaymentUrl = useCallback(() => {
    switch (paymentType) {
      case 'naira':
        return `${BASE_URI}/payments/naira/paystack.php?action=initialize`;
      case 'dollar':
        if (paymentMethod === 'paypal') {
          return `${BASE_URI}/payments/dollars/paypal_integration.php?action=initialize`;
        }
        return `${BASE_URI}/payments/dollars/stripe_integration.php?action=initialize`;
      case 'crypto':
        return `${BASE_URI}/payments/crypto/nowpayments_integration.php?action=initialize`;
      default:
        return `${BASE_URI}/payments/dollars/stripe_integration.php?action=initialize`;
    }
  }, [BASE_URI, paymentType, paymentMethod]);

  // Get verification URL based on payment type
  const getVerifyUrl = useCallback((reference: string) => {
    // We determine the payment method used from the reference prefix or local state
    const method = localStorage.getItem('paymentMethod') || paymentMethod;
    
    if (method === 'paystack' || reference.startsWith('RESEARCH_HUB_')) { // Paystack uses the master ref
        return `${BASE_URI}/payments/naira/paystack.php?action=poll_verify&reference=${reference}`;
    }
    if (method === 'stripe' || reference.startsWith('STRIPE_')) {
        return `${BASE_URI}/payments/dollars/stripe_integration.php?action=verify&reference=${reference}`;
    }
    if (method === 'paypal' || reference.startsWith('PAYPAL_')) {
        return `${BASE_URI}/payments/dollars/paypal_integration.php?action=verify&reference=${reference}`;
    }
    if (method === 'nowpayments' || reference.startsWith('NOWPAY_')) {
        return `${BASE_URI}/payments/crypto/nowpayments_integration.php?action=verify&reference=${reference}`;
    }
    // Default fallback
    return `${BASE_URI}/payments/naira/paystack.php?action=poll_verify&reference=${reference}`;
  }, [BASE_URI, paymentMethod]);

  // Initialize payment with comprehensive tracking
  const initializePayment = useCallback(async () => {
    if (!data || !formRef.current) {
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
    setIsProcessing(true);
    hideErrorState();
    setShowResult(false);

    const hasNetwork = await hasInternet();
    if (!hasNetwork) {
      handlePaymentError('user', 'No internet connection', 'Please check your connection and try again');
      return;
    }

    try {
      let masterRef = localStorage.getItem('masterRef');
      if (!masterRef) {
        masterRef = `RESEARCH_HUB_${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
        localStorage.setItem('masterRef', masterRef);
      }

      const platformRef = `PS_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      localStorage.setItem('platformRef', platformRef);

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

      const paymentUrl = getPaymentUrl();

      const response = await fetch(paymentUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();

      // Always try to parse JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        handlePaymentError('developer', 'Invalid server response format', 'Response was not valid JSON');
        return;
      }

      // Handle HTTP errors
      if (!response.ok) {
        handlePaymentError(
          paymentMethod,
          `Server responded with ${response.status}`,
          response.statusText,
          response.status >= 500
        );
        return;
      }

      // Handle logical errors in response
      if (
        result.status === 'error' ||
        result.status === 'failed' ||
        result.success === false ||
        !result.data?.authorization_url
      ) {

        const errorMessage = result.message || result.error || 'Payment initialization failed';
        const errorDetails = result.details || result.description || '';
        const errorType = paymentMethod === 'stripe' ? 'stripe' :
          paymentMethod === 'paypal' ? 'paypal' :
            paymentMethod === 'nowpayments' ? 'nowpayments' : 'paystack';
        const isRetryable = isRetryablePaystackError(errorMessage, errorDetails);

        handlePaymentError(errorType, errorMessage, errorDetails, isRetryable);
        return;
      }

      const url = result.data.authorization_url;
      const w = 600, h = 700;
      const left = (screen.width / 2) - (w / 2);
      const top = (screen.height / 2) - (h / 2);
      const popup = window.open(
        url,
        'pay_popup',
        `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${w},height=${h},top=${top},left=${left}`
      );

      if (!popup) {
        handlePaymentError('user', 'Popup was blocked', 'Please allow popups for this site.');
      }
    } catch (error) {

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const currentFormData = new FormData(formRef.current as HTMLFormElement);
      const paymentMethod = (currentFormData.get("payment_method") as string) || 'developer';
      const errorType = ['paystack', 'stripe', 'paypal', 'nowpayments'].includes(paymentMethod)
        ? paymentMethod
        : 'developer';
      const isRetryable = isRetryablePaystackError(errorMessage);

      handlePaymentError(errorType, 'Payment initialization failed', errorMessage, isRetryable);
    }
  }, [data, validateForm, getPaymentUrl, getEffectiveCurrencyCode, hasInternet, handlePaymentError, paymentMethod, hideErrorState, getPriceForPaymentType]);

  // Handle form submit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    initializePayment();
  }, [initializePayment]);

  // Manual retry function
  const handleRetryPayment = useCallback(async () => {
    setShowErrorState(false);
    setErrorStateData(null);
    setAutoRetryCount(0);
    if (autoRetryTimer) {
      clearTimeout(autoRetryTimer);
      setAutoRetryTimer(null);
    }
    initializePayment();
  }, [initializePayment, autoRetryTimer]);

  // ✅ FIXED: Renamed parameter to webhookData to avoid shadowing
  const handleWebhookResponse = useCallback((webhookData: WebhookResponseData) => {

    if (webhookData.payment_status === 'success') {
      setResultData({
        status: 'success',
        reference: webhookData.data?.reference || webhookData.reference || 'Unknown',
        amount: webhookData.data?.amount || 0,
        paidAt: webhookData.data?.paid_at || webhookData.data?.paidAt || new Date().toISOString()
      });
      setShowResult(true);
      // Clear all payment-related localStorage items
      clearFormData();
      localStorage.removeItem('masterRef');
      localStorage.removeItem('platformRef');

      setTimeout(() => {
        if (isMounted.current) {
          setIsProcessing(false);
        }
      }, 0);
    } else {
      let message = 'Payment failed';
      let details = '';
      let isRetryable = false;

      switch (webhookData.payment_status) {
        case 'failed':
          message = 'Payment failed';
          details = 'Please try again or contact support.';
          isRetryable = true;
          break;
        case 'abandoned':
          message = 'Payment abandoned';
          details = 'You closed the payment window.';
          isRetryable = false;
          break;
        case 'pending':
          message = 'Payment pending';
          details = 'Payment is being processed. Check back later.';
          isRetryable = false;
          break;
        default:
          message = 'Unknown payment status';
          details = JSON.stringify(webhookData);
          isRetryable = false;
      }

      handlePaymentError('user', message, details, isRetryable);
    }
  }, [clearFormData, handlePaymentError]);

  // Result action handlers
  const handleTryAgain = useCallback(() => {
    setShowResult(false);
    setIsProcessing(false);
    setShowErrorState(false);
    setErrorStateData(null);
    setAutoRetryCount(0);
    if (autoRetryTimer) {
      clearTimeout(autoRetryTimer);
      setAutoRetryTimer(null);
    }
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
    localStorage.removeItem('masterRef');
    localStorage.removeItem('platformRef');
  }, []);

  // Expose functions to window & listen for popup messages
  useEffect(() => {
    window.retryPayment = handleRetryPayment;
    window.resetToInitialState = resetToInitialState;
    window.handleWebhookResponse = handleWebhookResponse;

    const handleMessage = (event: MessageEvent) => {
      const backendOrigin = new URL(BASE_URI).origin;
      if (event.origin !== backendOrigin) {
        return;
      }

      if (event.data && event.data.type === 'payment_response' && event.data.payload) {
        handleWebhookResponse(event.data.payload);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      delete window.retryPayment;
      delete window.resetToInitialState;
      delete window.handleWebhookResponse;
      window.removeEventListener('message', handleMessage);
    };
  }, [handleRetryPayment, resetToInitialState, handleWebhookResponse, BASE_URI]);

  // Polling function for post-closing verification
  const startFallbackPolling = useCallback((reference: string) => {
    setIsVerifying(true);

    const pollUrl = getVerifyUrl(reference);

    const intervalId = setInterval(async () => {
        try {
            const response = await fetch(pollUrl);
            const result = await response.json();

            if (result.success && result.data) {
                const status = result.data.payment_status;
                if (status === 'completed' || status === 'failed' || status === 'abandoned') {
                    clearInterval(intervalId);
                    setIsVerifying(false);

                    // Use the existing webhook handler to display the result
                    handleWebhookResponse({ payment_status: status === 'completed' ? 'success' : status, reference });
                }
            }
        } catch {
            // Don't stop polling on network error, it might recover
        }
    }, 3000); // Poll every 3 seconds

    // Stop polling after 2 minutes as a safeguard
    setTimeout(() => {
        clearInterval(intervalId);
        if (isVerifying) {
            setIsVerifying(false);
            // If still verifying, show a gentle failure/timeout message
            handlePaymentError('user', 'Verification Timed Out', 'Could not confirm payment status. Please check your email or contact support.', false);
        }
    }, 120000);

  }, [ handleWebhookResponse, handlePaymentError, isVerifying, getVerifyUrl]);


  const handleClose = useCallback(() => {
    const masterRef = localStorage.getItem('masterRef');
    // If a payment was initiated but we haven't confirmed its status, start polling
    if (masterRef && !showResult && !showErrorState) {
        startFallbackPolling(masterRef);
    } else {
        onClose(); // Close immediately if no payment was started
    }
  }, [onClose, showResult, showErrorState, startFallbackPolling]);

  // ✅ EARLY RETURN IF data IS NULL
  if (!data) return null;

  return (
    <div className="modal" id="purchaseModal">
      <div className="modal-content">

        <div className="modal-header">
          <div className="flex reverse">
            <span className="close-modal" onClick={handleClose}>&times;</span>
            <h2 className="modal-title">{website_config?.PURCHASE_TITLE}</h2>
          </div>
          <p className="modal-subtitle">{website_config?.PURCHASE_SUBTITLE}</p>
        </div>
        <div className="modal-body" ref={modalBodyRef}>
          {/* Fallback Verifying Loader */}
          {isVerifying && (
            <div className="payment-status loader-container">
                <div className="status-icon">
                    <i className="fas fa-spinner fa-spin"></i>
                </div>
                <p className="status-text">
                    Verifying payment... please wait
                </p>
                <p className="status-subtext">
                    Do not close this window.
                </p>
            </div>
          )}

          {/* Processing Loader */}
          {isProcessing && !isVerifying && !showResult && !showErrorState && (
            <div className="payment-status loader-container">
              <div className="status-icon">
                <i className="fas fa-spinner fa-spin"></i>
              </div>
              <p className="status-text">
                Processing payment... please wait
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
                {errorStateData.isRetryable && autoRetryCount < 3 && (
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
                  <p><strong>Amount:</strong> {getCurrencySymbol()}{resultData.amount.toFixed(2)}</p>
                )}
                {resultData.paidAt && (
                  <p><small>Paid: {resultData.paidAt}</small></p>
                )}
                <div className="action-buttons">
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
          {!isProcessing && !showErrorState && !showResult && (
            <div className="payment-form-container">
              {/* ✅ GUARD: Only render form if data is not null */}
              {data && (
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
                  <div className="form-group">
                    <label htmlFor="paymentType">
                      Payment Type <span className="required">*</span>
                    </label>
                    <div className="select-wrapper">
                      <i className="fa fa-chevron-down select_arrow"></i>
                      <select
                        id="paymentType"
                        value={paymentType}
                        onChange={(e) => handlePaymentTypeChange(e.target.value as 'dollar' | 'naira' | 'crypto')}
                      >
                        <option value="dollar">Dollar (USD)</option>
                        <option value="naira">Naira (NGN)</option>
                        <option value="crypto">Crypto (USD)</option>
                      </select>
                    </div>
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
                            checked={paymentMethod === 'stripe'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
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
                            checked={paymentMethod === 'paypal'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
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
                      {paymentType === 'crypto' && (
                        <CryptoPaymentOptions getPrice={getPriceForPaymentType} getCurrencySymbol={getCurrencySymbol} fmt={fmt} />
                      )}
                    </div>
                  </div>
                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      id="pay-btn"
                      disabled={isProcessing}
                    >
                      <i className="fas fa-lock"></i> {website_config?.PURCHASE_BUTTON}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={onClose}
                      disabled={isProcessing}
                    >
                      {website_config?.PURCHASE_CANCEL}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
          <div id="notification" className="slide-notification"></div>
        </div>
      </div>
    </div>
  );
};

export default ModalPurchase;