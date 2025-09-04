// src/components/ModalPurchase.tsx
import { useEffect, useState } from "react";
import { UseConfig } from "../hooks/UseConfig";

interface ModalProps {
  onClose: () => void;
  data: null;
}

const ModalPurchase = ({ onClose }: ModalProps) => {
  const { config } = UseConfig();
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");


// load external scripts when this modal is mounted
  useEffect(() => {
    const scripts = ["errorStates.js", "main.js"];
    const els: HTMLScriptElement[] = [];

    scripts.forEach((file) => {
      const el = document.createElement("script");
      el.src = `${config?.JS_PATH || ""}${file}`;
      el.async = true;
      document.body.appendChild(el);
      els.push(el);
    });

    return () => {
      // cleanup on unmount
      els.forEach((el) => document.body.removeChild(el));
    };
  }, [config?.JS_PATH]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("processing");

    // fake async process
    setTimeout(() => {
      setStatus("done");
    }, 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <span className="close-modal" onClick={onClose}>
          &times;
        </span>

        {status === "idle" && (
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">
                {config?.PURCHASE_TITLE || "Complete Your Purchase"}
              </h2>
              <p className="modal-subtitle">
                {config?.PURCHASE_SUBTITLE || "Academic Resource"}
              </p>
            </div>

            <form id="checkoutForm" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fullName">
                    {config?.PURCHASE_NAME_LABEL || "Full Name"}
                  </label>
                  <input type="text" id="fullName" name="customer_name" required />
                </div>
                <div className="form-group">
                  <label htmlFor="email">
                    {config?.PURCHASE_EMAIL_LABEL || "Email Address"}
                  </label>
                  <input type="email" id="email" name="customer_email" required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="phone">
                  {config?.PURCHASE_PHONE_LABEL || "Phone Number"}
                </label>
                <input type="tel" id="phone" name="customer_phone" />
              </div>

              <div className="payment-summary">
                <h3>{config?.PURCHASE_SUMMARY_TITLE || "Order Summary"}</h3>
                <div className="summary-row">
                  <span>{config?.PURCHASE_PRODUCT_LABEL || "Product"}:</span>
                  <span id="summaryProduct">-</span>
                </div>
                <div className="summary-row">
                  <span>{config?.PURCHASE_PRICE_LABEL || "Price"}:</span>
                  <span id="summaryPrice">$0.00</span>
                </div>
                <div className="summary-row">
                  <span>{config?.PURCHASE_TAX_LABEL || "Tax"}:</span>
                  <span id="summaryTax">$0.00</span>
                </div>
                <div className="summary-row total">
                  <span>{config?.PURCHASE_TOTAL_LABEL || "Total"}:</span>
                  <span id="summaryTotal">$0.00</span>
                </div>
              </div>

              <div className="payment-methods">
                <h3>{config?.PURCHASE_METHOD_TITLE || "Payment Method"}</h3>
                <div className="payment-options">
                  <label className="payment-option">
                    <input type="radio" name="payment_method" value="stripe" defaultChecked />
                    <div className="payment-card">
                      <i className="fab fa-cc-stripe"></i>
                      <span>{config?.PURCHASE_STRIPE_LABEL || "Credit/Debit Card"}</span>
                    </div>
                  </label>
                  <label className="payment-option">
                    <input type="radio" name="payment_method" value="paypal" />
                    <div className="payment-card">
                      <i className="fab fa-paypal"></i>
                      <span>{config?.PURCHASE_PAYPAL_LABEL || "PayPal"}</span>
                    </div>
                  </label>
                  <label className="payment-option">
                    <input type="radio" name="payment_method" value="bank_transfer" />
                    <div className="payment-card">
                      <i className="fas fa-university"></i>
                      <span>{config?.PURCHASE_BANK_LABEL || "Bank Transfer"}</span>
                    </div>
                  </label>
                  <label className="payment-option">
                    <input type="radio" name="payment_method" value="crypto" />
                    <div className="payment-card">
                      <i className="fab fa-bitcoin"></i>
                      <span>{config?.PURCHASE_CRYPTO_LABEL || "Cryptocurrency"}</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-lock"></i>{" "}
                  {config?.PURCHASE_BUTTON || "Complete Purchase"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  {config?.PURCHASE_CANCEL || "Cancel"}
                </button>
              </div>
            </form>
          </div>
        )}

        {status === "processing" && (
          <div className="payment-status">
            <div className="status-icon">
              <i className="fas fa-spinner fa-spin"></i>
            </div>
            <h3>{config?.PURCHASE_PROCESSING || "Processing Payment..."}</h3>
            <p>{config?.PURCHASE_PROCESSING_MSG || "Please wait while we process your payment."}</p>
          </div>
        )}

        {status === "done" && (
          <div className="notification">
            <div className="notification-icon">
              <i className="fas fa-check"></i>
            </div>
            <div className="notification-content">
              <h4>Purchase Successful!</h4>
              <p>Your file has been sent to your email address.</p>
            </div>
            <button className="close-notification" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalPurchase;
