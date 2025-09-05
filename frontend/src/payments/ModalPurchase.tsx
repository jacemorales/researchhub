// src/components/ModalPurchase.tsx
import { useEffect, useState } from "react";
import { useData } from "../hooks/useData";
import type { AcademicFile } from "../hooks/useData";

interface ModalProps {
  onClose: () => void;
  data: AcademicFile | null;
}

const ModalPurchase = ({ onClose, data }: ModalProps) => {
  const { website_config } = useData();
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");

  // load external scripts when this modal is mounted
  useEffect(() => {
    const scripts = ["errorStates.js", "main.js"];
    const els: HTMLScriptElement[] = [];

    scripts.forEach((file) => {
      const el = document.createElement("script");
      el.src = `/payments/assets/${file}`;
      el.async = true;
      document.body.appendChild(el);
      els.push(el);
    });

    return () => {
      // cleanup on unmount
      els.forEach((el) => document.body.removeChild(el));
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("processing");

    // fake async process
    setTimeout(() => {
      setStatus("done");
    }, 2000);
  };

  return (
      <div className="modal">

          <div className="modal-content">
            <span className="close-modal" onClick={onClose}>&times;</span>
            <div className="modal-header">
              <h2 className="modal-title">
                {website_config?.PURCHASE_TITLE}
              </h2>
              <p className="modal-subtitle">
                {website_config?.PURCHASE_SUBTITLE}
              </p>
            </div>

          <div className="modal-body">
        {status === "idle" && (
            <form id="checkoutForm" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fullName">
                    {website_config?.PURCHASE_NAME_LABEL}
                  </label>
                  <input type="text" id="fullName" name="customer_name" required />
                </div>
                <div className="form-group">
                  <label htmlFor="email">
                    {website_config?.PURCHASE_EMAIL_LABEL}
                  </label>
                  <input type="email" id="email" name="customer_email" required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="phone">
                  {website_config?.PURCHASE_PHONE_LABEL}
                </label>
                <input type="tel" id="phone" name="customer_phone" />
              </div>

              <div className="payment-summary">
                <h3>{website_config?.PURCHASE_SUMMARY_TITLE}</h3>
                <div className="summary-row">
                  <span>{website_config?.PURCHASE_PRODUCT_LABEL}:</span>
                  <span id="summaryProduct">{data?.file_name}</span>
                </div>
                <div className="summary-row">
                  <span>{website_config?.PURCHASE_PRICE_LABEL}:</span>
                  <span id="summaryPrice">${Number(data?.price).toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>{website_config?.PURCHASE_TAX_LABEL}:</span>
                  <span id="summaryTax">$0.00</span>
                </div>
                <div className="summary-row total">
                  <span>{website_config?.PURCHASE_TOTAL_LABEL}:</span>
                  <span id="summaryTotal">${Number(data?.price).toFixed(2)}</span>
                </div>
              </div>

              <div className="payment-methods">
                <h3>{website_config?.PURCHASE_METHOD_TITLE}</h3>
                <div className="payment-options">
                  <label className="payment-option">
                    <input type="radio" name="payment_method" value="stripe" defaultChecked />
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
                    <input type="radio" name="payment_method" value="bank_transfer" />
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
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-lock"></i>{" "}
                  {website_config?.PURCHASE_BUTTON}
                </button>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  {website_config?.PURCHASE_CANCEL}
                </button>
              </div>
            
            

              <div className="payment-card">
    <div className="payment-header">
      <h2>Research Hub — Payment</h2>
      <p className="sub">Enter your email and amount. Fee (1.5%) shown for reference.</p>
    </div>

    <div className="payment-body" id="payment-form-container">
      <form id="payment-form">
        <div className="form-group">
          <label>Email</label>
          <input id="email" name="email" type="email" className="form-control" placeholder="you@example.com" required />
        </div>

        <div className="form-group">
          <label>Amount (₦)</label>
          <input id="amount" name="amount" type="number" step="0.01" min="0.01" className="form-control" placeholder="1000.00" required/>
          <div className="fee-info"><i>i</i> Fee (1.5% displayed): ₦<span id="fee-amount">0.00</span></div>
          <div className="fee-info"><i>i</i> Total (display): ₦<span id="total-amount">0.00</span></div>
        </div>

        <button type="submit" id="pay-btn" className="btn btn-primary">Pay ₦0.00</button>
      </form>

      <div id="notification" className="slide-notification"></div>
    </div>

    <div id="loader-container" className="loader-container" >
      <div className="loader"></div>
      <div className="status-text">Processing... please wait</div>
    </div>

    <div id="payment-result"></div>
  </div>
            </form>
           
        )}

        {status === "processing" && (
          <div className="payment-status">
            <div className="status-icon">
              <i className="fas fa-spinner fa-spin"></i>
            </div>
            <h3>{website_config?.PURCHASE_PROCESSING}</h3>
            <p>{website_config?.PURCHASE_PROCESSING_MSG}</p>
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
          </div>
  );
};

export default ModalPurchase;
