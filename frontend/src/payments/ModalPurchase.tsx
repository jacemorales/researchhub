// src/components/ModalPurchase.tsx
import { useEffect } from "react";
import { useData } from "../hooks/useData";
import type { AcademicFile } from "../hooks/contexts/DataContext";

// This type definition is necessary for the initPaymentModal function on the window object
declare global {
  interface Window {
    initPaymentModal?: () => void;
  }
}

interface ModalProps {
  onClose: () => void;
  data: AcademicFile | null;
}

const ModalPurchase = ({ onClose, data }: ModalProps) => {
  const { website_config } = useData();

  // load external scripts when this modal is mounted
  useEffect(() => {
    const scriptMap = [
      {
        id: "payment-error-states-script",
        src: "/src/payments/assets/errorStates.js",
      },
      { id: "payment-main-script", src: "/src/payments/assets/main.js" },
    ];

    const loadScript = (
      scriptInfo: { id: string; src: string },
      callback: () => void
    ) => {
      if (document.getElementById(scriptInfo.id)) {
        if (callback) callback();
        return;
      }
      const el = document.createElement("script");
      el.id = scriptInfo.id;
      el.src = scriptInfo.src;
      el.async = true;
      el.onload = callback;
      document.body.appendChild(el);
    };

    // Load scripts sequentially and then initialize the modal
    loadScript(scriptMap[0], () => {
      loadScript(scriptMap[1], () => {
        if (window.initPaymentModal) {
          window.initPaymentModal();
        }
      });
    });
  }, [data]);

  return (
    <div className="modal">
      <div className="modal-content">
        <span className="close-modal" onClick={onClose}>
          &times;
        </span>
        <div className="modal-header">
          <h2 className="modal-title">{website_config?.PURCHASE_TITLE}</h2>
          <p className="modal-subtitle">{website_config?.PURCHASE_SUBTITLE}</p>
        </div>

        <div className="modal-body">
          <div className="payment-form-container">
            <form id="payment-form" data-file-id={data?.id}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fullName">
                    {website_config?.PURCHASE_NAME_LABEL}
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="customer_name"
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
                />
              </div>

              <div className="payment-summary">
                <h3>{website_config?.PURCHASE_SUMMARY_TITLE}</h3>
                <div className="summary-row">
                  <span>{website_config?.PURCHASE_PRODUCT_LABEL}:</span>
                  <span id="summaryProduct">{data?.file_name}</span>
                </div>
                <div className="summary-row">
                  <span>{website_config?.PURCHASE_PRICE_LABEL}:</span>
                  <span className="amount" id="summaryPrice">
                    ${Number(data?.price).toFixed(2)}
                  </span>
                </div>
                <div className="summary-row">
                  <span>{website_config?.PURCHASE_TAX_LABEL}:</span>
                  <span id="fee-amount">$0.00</span>
                </div>
                <div className="summary-row total">
                  <span>{website_config?.PURCHASE_TOTAL_LABEL}:</span>
                  <span id="total-amount">
                    ${Number(data?.price).toFixed(2)}
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
                <button type="submit" className="btn btn-primary" id="pay-btn">
                  <i className="fas fa-lock"></i>
                  {website_config?.PURCHASE_BUTTON}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  {website_config?.PURCHASE_CANCEL}
                </button>
              </div>
            </form>
            <div id="notification" className="slide-notification"></div>
          </div>

          <div className="payment-status loader-container">
            <div className="status-icon">
              <i className="fas fa-spinner fa-spin"></i>
            </div>
            <p className="status-text">Processing... please wait</p>
          </div>

          <div id="payment-result"></div>
          
        </div>
      </div>
    </div>
  );
};

export default ModalPurchase;
