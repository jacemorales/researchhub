// Toast.tsx
import React, { useEffect, useRef } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose: () => void;
}

// ========================
// ADMIN TOAST COMPONENT
// ========================
export const AdminToast: React.FC<ToastProps> = ({
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
  );
};




// ========================
// USER TOAST COMPONENT
// ========================
export const UserToast: React.FC<ToastProps> = ({
  message,
  type,
  duration = 5000,
  onClose,
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    // ✅ Set animation duration dynamically
    if (progressBarRef.current) {
      progressBarRef.current.style.animationDuration = `${duration}ms`;
    }

    return () => {
      clearTimeout(timer);
    };
  }, [duration, onClose]);

  const getIconClass = () => {
    switch (type) {
      case "success":
        return "fas fa-check-circle";
      case "error":
        return "fas fa-times-circle";
      case "warning":
        return "fas fa-exclamation-triangle";
      case "info":
      default:
        return "fas fa-info-circle";
    }
  };

  return (
    <div className="toast-container">
      <div className={`toast toast-${type} toast-show`}>
        <div className="toast-content">
          <div className="toast-icon">
            <i className={getIconClass()}></i>
          </div>
          <div className="toast-message">{message}</div>
          <button className="toast-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="toast-progress">
          <div 
            ref={progressBarRef} 
            className="toast-progress-bar"
            style={{ animationDuration: `${duration}ms` }}
          ></div>
        </div>
      </div>
    </div>
  );
};