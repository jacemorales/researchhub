import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminDashboard from './pages/Dashboard';
import './assets/css/admin.css';

const container = document.getElementById('root');
if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(
        <React.StrictMode>
            <AdminDashboard />
        </React.StrictMode>
    );
}
