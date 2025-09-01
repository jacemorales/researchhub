// === Enhanced Internet Connection Check ===
async function hasInternet() {
    try {
        // Use multiple endpoints for better reliability
        const endpoints = [
            'https://httpbin.org/ip',
            'https://jsonplaceholder.typicode.com/posts/1',
            'https://api.github.com'
        ];
        
        // Try the first endpoint with a shorter timeout
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
        
        if (response.ok) {
            console.log('Internet connection confirmed');
            return { online: true, status: true };
        } else {
            throw new Error('Bad response');
        }
    } catch (err) {
        console.log('Internet check failed:', err.message);
        return { online: false, status: false };
    }
}

const paymentFormContainer = document.getElementById('payment-form-container');
const loaderContainer = document.getElementById('loader-container');
const statusText = document.querySelector('.status-text');
const notification = document.getElementById('notification');
const paymentResult = document.getElementById('payment-result');
function showLoader(msg = 'Processing... please wait') {
        console.log('Showing loader:', msg);
        if (statusText) statusText.textContent = msg;
        paymentFormContainer.style.display = 'none';
        loaderContainer.style.display = 'flex';
        paymentResult.style.display = 'none';
        hideErrorState();
    }

    function hideLoader() {
        console.log('Hiding loader');
        loaderContainer.style.display = 'none';
    }

    
    function showNotification(msg, type = 'error') {
        console.log('Showing notification:', msg, type);
        notification.textContent = msg;
        notification.className = `slide-notification ${type}`;
        notification.classList.add('show');
        setTimeout(() => notification.classList.remove('show'), 4000);
    }


// === Auto-retry mechanism ===
async function autoRetryWhenOnline(action, onSuccess, onError, context = 'general') {
    console.log(`Starting auto-retry for context: ${context}`);
    
    const retry = async () => {
        console.log(`Checking internet connection for retry...`);
        const { status } = await hasInternet();
        
        if (!status) {
            console.log('Still offline, retrying in 5 seconds...');
            setTimeout(retry, 5000);
            return;
        }

        console.log('Internet restored, executing action...');
        showLoader('Reconnected! Processing...');
        
        try {
            const result = await action();
            hideErrorState();
            onSuccess(result);
        } catch (err) {
            console.error('Action failed after internet restored:', err);
            onError(err);
        }
    };

    retry();
}

// === Global retry function for manual retry button ===
window.retryPayment = async function () {
    console.log('Manual retry triggered');
    const { status } = await hasInternet();
    
    if (!status) {
        showNotification('Still no internet connection. Please check your connection and try again.', 'error');
        return;
    }

    hideErrorState();
    showLoader('Retrying...');
    
    // Determine what action to retry based on current state
    const activeSession = getActiveReferenceSession();
    const paystackRef = getStoredPaystackRef();
    const currentState = getCurrentState();
    
    console.log('Current state for retry:', currentState);
    
    switch(currentState) {
        case 'verification':
            if (paystackRef) {
                console.log('Retrying payment verification');
                pollVerification(paystackRef);
            } else {
                hideLoader();
                showForm();
            }
            break;
        case 'initialization':
            console.log('Retrying payment initialization');
            initializePayment();
            break;
        default:
            console.log('Showing payment form');
            hideLoader();
            showForm();
            break;
    }
};

// === State management ===
function getCurrentState() {
    const formVisible = document.getElementById('payment-form-container').style.display !== 'none';
    const loaderVisible = document.getElementById('loader-container').style.display !== 'none';
    const resultVisible = document.getElementById('payment-result').style.display !== 'none';
    const errorVisible = document.getElementById('payment-error-state')?.style.display !== 'none';
    
    if (loaderVisible) {
        const statusText = document.querySelector('.status-text')?.textContent || '';
        if (statusText.includes('Verifying') || statusText.includes('Checking')) {
            return 'verification';
        } else if (statusText.includes('Initializing') || statusText.includes('Processing')) {
            return 'initialization';
        }
    }
    
    if (errorVisible) return 'error';
    return formVisible ? 'form' : (resultVisible ? 'result' : 'unknown');
}

function showForm() {
    document.getElementById('payment-form-container').style.display = 'block';
    document.getElementById('loader-container').style.display = 'none';
    document.getElementById('payment-result').style.display = 'none';
    hideErrorState();
    enablePayButton();
}

function enablePayButton() {
    const payBtn = document.getElementById('pay-btn');
    if (payBtn) {
        payBtn.disabled = false;
        payBtn.classList.remove('processing');
    }
}

function disablePayButton() {
    const payBtn = document.getElementById('pay-btn');
    if (payBtn) {
        payBtn.disabled = true;
        payBtn.classList.add('processing');
    }
}

// === Reference management with simplified format ===
function getActiveReferenceSession() {
    let id = localStorage.getItem('activeReferenceSession');
    if (!id) {
        // Simplified format: RESEARCH_HUB_RANDOM
        const random = Math.random().toString(36).substr(2, 8).toUpperCase();
        id = `RESEARCH_HUB_${random}`;
        localStorage.setItem('activeReferenceSession', id);
    }
    return id;
}

function generatePaystackRef() {
    // Simplified format: PS_TIMESTAMP_RANDOM
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 8).toUpperCase();
    return `PS_${timestamp}_${random}`;
}

function getStoredPaystackRef() {
    return localStorage.getItem('paystack_reference');
}

function setPaystackRef(ref) {
    localStorage.setItem('paystack_reference', ref);
}

function clearPaystackRef() {
    localStorage.removeItem('paystack_reference');
}

// === Request deduplication ===
let activeRequest = null;

async function makeUniqueRequest(requestFunction) {
    // If there's already an active request, return it instead of making a new one
    if (activeRequest) {
        console.log('Request already in progress, returning existing promise');
        return activeRequest;
    }
    
    try {
        activeRequest = requestFunction();
        const result = await activeRequest;
        return result;
    } finally {
        activeRequest = null;
    }
}

// === Constants ===
const PAYSTACK_PERCENTAGE_FEE = 0.015;
const POLL_INTERVAL = 2000;
const POLL_TIMEOUT = 1000 * 60 * 3;

document.addEventListener('DOMContentLoaded', () => {
    const paymentForm = document.getElementById('payment-form');
    const amountInput = document.getElementById('amount');
    const emailInput = document.getElementById('email');
    const feeAmount = document.getElementById('fee-amount');
    const totalAmount = document.getElementById('total-amount');
    const payBtn = document.getElementById('pay-btn');

    
    
    
    
    

    let currentPaystackRef = null;
    let popupWindow = null;
    let pollTimer = null;

    function fmt(n) { return Number(n).toFixed(2); }

    function updatePaymentDetails() {
        const amount = parseFloat(amountInput.value) || 0;
        const fee = amount * PAYSTACK_PERCENTAGE_FEE;
        const total = amount + fee;
        feeAmount.textContent = fmt(fee);
        totalAmount.textContent = fmt(total);
        payBtn.textContent = `Pay ₦${fmt(total)}`;
    }

    amountInput.addEventListener('input', updatePaymentDetails);
    updatePaymentDetails();

    


    // === Enhanced error handling for different response types ===
    async function parseErrorResponse(response, responseText) {
        const contentType = response.headers.get('content-type') || '';
        
        // Check for HTML error pages (PHP errors)
        if (contentType.includes('text/html') || responseText.includes('<html>') || 
            responseText.includes('Parse error') || responseText.includes('Fatal error') ||
            responseText.includes('<b>Fatal error</b>') || responseText.includes('<?php')) {
            return {
                type: 'developer',
                message: 'Server configuration error',
                details: 'PHP file has syntax errors or server misconfiguration'
            };
        }
        
        // Try to parse as JSON
        try {
            const data = JSON.parse(responseText);
            return {
                type: data.type || 'paystack',
                message: data.message || 'Unknown error occurred',
                details: data.details || null
            };
        } catch (e) {
            // Not valid JSON, treat as network/server error
            if (response.status >= 500) {
                return {
                    type: 'developer',
                    message: 'Server error',
                    details: `HTTP ${response.status}: ${responseText.substring(0, 100)}`
                };
            } else if (response.status >= 400) {
                return {
                    type: 'paystack',
                    message: 'Client error occurred',
                    details: responseText.substring(0, 100)
                };
            } else {
                return {
                    type: 'paystack',
                    message: 'Invalid server response',
                    details: responseText.substring(0, 100)
                };
            }
        }
    }

    async function initializePayment() {
        const email = emailInput.value.trim();
        const amount = parseFloat(amountInput.value);

        if (!email || !amount || amount <= 0) {
            showNotification('Please enter a valid email and amount', 'error');
            return null;
        }

        console.log('Starting payment initialization...');

        // Disable pay button immediately and show loader
        disablePayButton();
        showLoader('Initializing payment...');

        // First check internet connection
        const { status: online } = await hasInternet();
        if (!online) {
            console.log('No internet connection detected');
            hideLoader();
            showErrorState('user', 'No internet connection', 'Please check your connection. Retrying automatically when restored...');
            
            // Auto-retry when internet is restored
            const requestAction = async () => {
                return await makeInitializeRequest(email, amount);
            };
            
            autoRetryWhenOnline(requestAction, handleInitializeSuccess, handleInitializeError, 'initialization');
            return;
        }
        
        try {
            const result = await makeUniqueRequest(() => makeInitializeRequest(email, amount));
            handleInitializeSuccess(result);
        } catch (error) {
            console.error('Initialize payment error:', error);
            handleInitializeError(error);
        }
    }

    async function makeInitializeRequest(email, amount) {
        const activeSession = getActiveReferenceSession();
        const paystackRef = generatePaystackRef();
        currentPaystackRef = paystackRef;
        setPaystackRef(paystackRef);

        console.log('Making initialize request with:', { email, amount, paystackRef, activeSession });

        const response = await fetch('initialize.php', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                email, 
                amount, 
                reference: paystackRef, 
                reference_stat: activeSession 
            })
        });

        const responseText = await response.text();
        console.log('Initialize response:', response.status, responseText);

        if (!response.ok) {
            const errorInfo = await parseErrorResponse(response, responseText);
            throw new Error(JSON.stringify(errorInfo));
        }

        // Parse JSON response
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error(JSON.stringify({
                type: 'developer',
                message: 'Invalid JSON response from server',
                details: responseText.substring(0, 100)
            }));
        }
        
        if (data.status === 'success') {
            return data.data;
        } else {
            const errorInfo = {
                type: data.type || 'paystack',
                message: data.message || 'Initialization failed',
                details: data.details || null
            };
            throw new Error(JSON.stringify(errorInfo));
        }
    }

    function handleInitializeSuccess(result) {
        console.log('Payment initialization successful:', result);
        
        // Keep loader showing and open Paystack popup
        showLoader('Opening payment window...');
        popupWindow = openCenterPopup(result.authorization_url);
        watchPopupClose();
    }

    function handleInitializeError(error) {
        console.error('Payment initialization failed:', error);
        hideLoader();
        enablePayButton();
        
        try {
            const errorInfo = JSON.parse(error.message);
            showErrorState(errorInfo.type, errorInfo.message, errorInfo.details);
        } catch (e) {
            // Fallback for non-JSON errors
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                showErrorState('user', 'No internet connection', 'Please check your connection and try again');
                
                // Auto-retry for network errors
                const requestAction = async () => {
                    const email = emailInput.value.trim();
                    const amount = parseFloat(amountInput.value);
                    return await makeInitializeRequest(email, amount);
                };
                
                autoRetryWhenOnline(requestAction, handleInitializeSuccess, handleInitializeError, 'initialization');
            } else {
                showErrorState('paystack', 'Payment initialization failed', error.message);
            }
        }
    }

    function openCenterPopup(url, w = 600, h = 700) {
        const left = (screen.width / 2) - (w / 2);
        const top = (screen.height / 2) - (h / 2);
        return window.open(
            url,
            'pay_popup',
            `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${w},height=${h},top=${top},left=${left}`
        );
    }

    async function pollVerification(reference) {
        currentPaystackRef = reference;
        console.log('Starting payment verification for:', reference);
        
        // Check internet before starting verification
        const { status: online } = await hasInternet();
        if (!online) {
            console.log('No internet for verification');
            showErrorState('user', 'No internet connection', 'Cannot verify payment without internet. Retrying automatically...');
            
            const requestAction = async () => {
                return await makeVerificationRequest(reference);
            };
            
            autoRetryWhenOnline(requestAction, handleVerificationSuccess, handleVerificationError, 'verification');
            return;
        }

        showLoader('Verifying payment...');
        
        try {
            const result = await makeVerificationRequest(reference);
            handleVerificationSuccess(result);
        } catch (error) {
            console.error('Verification error:', error);
            handleVerificationError(error);
        }
    }

    async function makeVerificationRequest(reference) {
        console.log('Making verification request for:', reference);
        
        const response = await fetch(`verify.php?reference=${encodeURIComponent(reference)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        const responseText = await response.text();
        console.log('Verification response:', response.status, responseText);

        if (!response.ok) {
            const errorInfo = await parseErrorResponse(response, responseText);
            throw new Error(JSON.stringify(errorInfo));
        }

        // Parse JSON response
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error(JSON.stringify({
                type: 'developer',
                message: 'Invalid JSON response from verification',
                details: responseText.substring(0, 100)
            }));
        }
        
        if (data.status === 'success') {
            return data;
        } else if (data.status === 'pending') {
            // For pending status, we might want to retry after some time
            throw new Error(JSON.stringify({
                type: 'pending',
                message: 'Payment is still being processed',
                details: 'Please wait while we verify your payment'
            }));
        } else {
            throw new Error(JSON.stringify({
                type: data.type || 'paystack',
                message: data.message || 'Verification failed',
                details: data.details || null
            }));
        }
    }

    function handleVerificationSuccess(payload) {
        console.log('Payment verification successful:', payload);
        hideLoader();
        enablePayButton();
        clearPaystackRef();
        
        // Check the actual payment status from the response
        const paymentStatus = payload.payment_status || 'success';
        renderResult(paymentStatus, currentPaystackRef, payload.data);
    }

    function handleVerificationError(error) {
        console.error('Payment verification failed:', error);
        hideLoader();
        enablePayButton();
        
        try {
            const errorInfo = JSON.parse(error.message);
            
            if (errorInfo.type === 'pending') {
                // For pending payments, show pending result instead of error
                renderResult('pending', currentPaystackRef);
            } else if (errorInfo.type === 'user' || error.message.includes('Failed to fetch')) {
                showErrorState('user', 'No internet connection', 'Cannot verify payment status. Retrying automatically...');
                
                // Auto-retry for network errors
                const requestAction = async () => {
                    return await makeVerificationRequest(currentPaystackRef);
                };
                
                autoRetryWhenOnline(requestAction, handleVerificationSuccess, handleVerificationError, 'verification');
            } else {
                showErrorState('paystack', errorInfo.message, errorInfo.details);
            }
        } catch (e) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                showErrorState('user', 'No internet connection', 'Cannot verify payment status without internet');
                
                // Auto-retry for network errors
                const requestAction = async () => {
                    return await makeVerificationRequest(currentPaystackRef);
                };
                
                autoRetryWhenOnline(requestAction, handleVerificationSuccess, handleVerificationError, 'verification');
            } else {
                showErrorState('paystack', 'Payment verification failed', error.message);
            }
        }
    }

    function renderResult(status, reference, data = null) {
        console.log('Rendering result:', status, reference, data);
        
        const statusMap = {
            success: { color: '#47c363', msg: 'Payment successful!' },
            failed: { color: '#fc544b', msg: 'Payment failed. Please try again.' },
            abandoned: { color: '#fd7e14', msg: 'Payment was abandoned.' },
            pending: { color: '#007bff', msg: 'Payment is being processed...' }
        };
        
        const cfg = statusMap[status] || { color: '#fc544b', msg: 'An error occurred.' };
        const amountNaira = data && data.amount ? (data.amount / 100).toFixed(2) : '';

        paymentFormContainer.style.display = 'none';
        loaderContainer.style.display = 'none';
        paymentResult.style.display = 'block';
        hideErrorState();
        
        paymentResult.innerHTML = `
            <div class="payment-result ${status}">
                <h3 style="color:${cfg.color}">${cfg.msg}</h3>
                <p><strong>Reference:</strong> ${reference}</p>
                ${amountNaira ? `<p><strong>Amount:</strong> ₦${Number(amountNaira).toFixed(2)}</p>` : ''}
                ${data && data.paid_at ? `<p><small>Paid: ${new Date(data.paid_at).toLocaleString()}</small></p>` : ''}
                <div class="action-buttons">
                    ${status === 'pending' ? `<button id="check-status" class="btn check-status">Check Status</button>` : ''}
                    ${status !== 'success' ? `<button id="try-again" class="btn try-again">Try Again</button>` : ''}
                    ${status === 'success' ? `<button id="new-payment" class="btn btn-primary">New Payment</button>` : ''}
                </div>
            </div>
        `;

        // Event listeners for action buttons
        const checkBtn = document.getElementById('check-status');
        if (checkBtn) {
            checkBtn.addEventListener('click', async () => {
                const { status: online } = await hasInternet();
                if (!online) {
                    showNotification('No internet connection. Please check your connection.', 'error');
                    return;
                }
                pollVerification(reference);
            });
        }

        const tryBtn = document.getElementById('try-again');
        if (tryBtn) {
            tryBtn.addEventListener('click', () => {
                paymentResult.style.display = 'none';
                paymentFormContainer.style.display = 'block';
                clearPaystackRef(); // Clear reference for new payment
                enablePayButton();
            });
        }

        const newPaymentBtn = document.getElementById('new-payment');
        if (newPaymentBtn) {
            newPaymentBtn.addEventListener('click', () => {
                paymentResult.style.display = 'none';
                paymentFormContainer.style.display = 'block';
                amountInput.value = '';
                emailInput.value = '';
                updatePaymentDetails();
                clearPaystackRef();
                enablePayButton();
            });
        }

        // Auto-hide success message and reset form after 15 seconds
        if (status === 'success') {
            setTimeout(() => {
                if (paymentResult.style.display !== 'none') {
                    paymentResult.style.display = 'none';
                    paymentFormContainer.style.display = 'block';
                    amountInput.value = '';
                    emailInput.value = '';
                    updatePaymentDetails();
                    enablePayButton();
                }
            }, 15000);
        }
    }

    function watchPopupClose() {
        console.log('Watching popup close...');
        
        const popupWatch = setInterval(async () => {
            if (popupWindow && popupWindow.closed) {
                clearInterval(popupWatch);
                console.log('Popup closed, starting verification...');
                
                // Check internet before verifying
                const { status: online } = await hasInternet();
                if (!online) {
                    hideLoader();
                    showErrorState('user', 'No internet connection', 'Cannot verify payment status. Retrying automatically when connection is restored...');
                    
                    const requestAction = async () => {
                        return await makeVerificationRequest(currentPaystackRef);
                    };
                    
                    autoRetryWhenOnline(requestAction, handleVerificationSuccess, handleVerificationError, 'verification');
                } else {
                    pollVerification(currentPaystackRef);
                }
            }
        }, 700);
        
        // Clean up after 10 minutes to prevent memory leaks
        setTimeout(() => {
            clearInterval(popupWatch);
        }, 600000);
    }

    // === Form submission ===
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Prevent multiple submissions
        if (payBtn.disabled) {
            console.log('Payment already in progress, ignoring submission');
            return;
        }
        
        await initializePayment();
    });

    // === Check URL for reference parameter ===
    (function checkUrlRef() {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('reference');
        if (ref) {
            console.log('Found reference in URL:', ref);
            setPaystackRef(ref);
            pollVerification(ref);
            history.replaceState({}, '', location.pathname);
        }
    })();

    // === Cleanup on page unload ===
    window.addEventListener('beforeunload', () => {
        if (popupWindow && !popupWindow.closed) {
            popupWindow.close();
        }
    });
});