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
  const progressBarRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Reset progress animation
    if (progressBarRef.current) {
      progressBarRef.current.style.animation = 'none';
      progressBarRef.current.offsetHeight; // Trigger reflow
      progressBarRef.current.style.animation = `toast-progress ${duration}ms linear forwards`;
    }

    // Set new timer
    timerRef.current = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, onClose, message, type]);

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
        <div 
          ref={progressBarRef} 
          className="toast-progress-bar"
        ></div>
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Reset progress animation
    if (progressBarRef.current) {
      progressBarRef.current.style.animation = 'none';
      progressBarRef.current.offsetHeight; // Trigger reflow
      progressBarRef.current.style.animation = `toast-progress ${duration}ms linear forwards`;
    }

    // Set new timer
    timerRef.current = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, onClose, message, type]);

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
          ></div>
        </div>
      </div>
    </div>
  );
};