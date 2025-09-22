import React from 'react';

const Loading = () => {
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(255, 255, 255, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  };

  const spinnerStyle: React.CSSProperties = {
    width: '50px',
    height: '50px',
    border: '5px solid rgba(0, 0, 0, 0.1)',
    borderLeftColor: 'var(--primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  };

  return (
    <div style={overlayStyle}>
      <div style={spinnerStyle}></div>
      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Loading;