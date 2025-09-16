// Toast.tsx
import React, { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type,
  duration = 5000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration, onClose]);

  const getIconClass = () => {
    switch (type) {
      case "success":
        return "fas fa-check-circle";
      case "error":
        return "fas fa-exclamation-circle";
      case "warning":
        return "fas fa-exclamation-triangle";
      case "info":
      default:
        return "fas fa-info-circle";
    }
  };

  return (
    <>
    {/* {Admin Toast Component} */}
      <div className={`toast toast-${type} toast-show`}>
        <div className="toast-content">
          <i className={`toast-icon ${getIconClass()}`}></i>
          <span className="toast-message">{message}</span>
          <button className="toast-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="toast-progress">
          <div className="toast-progress-bar"></div>
        </div>
      </div>


      {/* {User Toast Component} */}
      {/* <div id="toast-container" className="toast-container">
        <div className="toast toast-error toast-show">
          <div className="toast-content">
            <div className="toast-icon">
              <i className="fas fa-times-circle"></i>
            </div>
            <div className="toast-message">
              Payment failed: SQLSTATE[42S22]: Column not found: 1054 Unknown
              column 'status' in 'field list'
            </div>
            <button
              className="toast-close"
            //   onclick="removeToast(this.parentElement.parentElement)"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="toast-progress">
            <div
              className="toast-progress-bar"
            //   style="animation-duration: 5000ms;"
            ></div>
          </div>
        </div>
      </div> */}
    </>
  );
};

export default Toast;
