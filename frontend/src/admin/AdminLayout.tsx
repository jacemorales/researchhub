import { Outlet, useNavigate } from 'react-router-dom';
import AdminHeader from './components/AdminHeader';
// import { ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

const AdminLayout = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        // In a real app, this would clear tokens and state
        console.log('Logging out...');
        // toast.info('You have been logged out.');
        navigate('/user'); // Redirect to a public page after logout
    };

    return (
        <div className="admin-layout">
            <AdminHeader onLogout={handleLogout} />
            <main className="admin-main-content">
                <Outlet /> {/* Admin child routes will render here */}
            </main>
            {/* <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} /> */}
        </div>
    );
};

export default AdminLayout;
