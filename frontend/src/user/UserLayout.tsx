import { useState } from 'react';
import { Outlet } from 'react-router-dom'; // Using Outlet to render child routes
import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import AuthorModal from './components/AuthorModal';
// import AboutModal from './components/AboutModal';
// import BlogModal from './components/BlogModal';
// import ContactModal from './components/ContactModal';

const UserLayout = () => {
    const [isAuthorModalOpen, setAuthorModalOpen] = useState(false);
    // Add states for other modals

    return (
        <div className="user-layout">
            <Header />
            <main className="main-content">
                <Sidebar onViewProfileClick={() => setAuthorModalOpen(true)} />
                <div className="page-content">
                    <Outlet /> {/* Child routes will render here */}
                </div>
            </main>
            <Footer />

            {/* Modals */}
            <AuthorModal isOpen={isAuthorModalOpen} onClose={() => setAuthorModalOpen(false)} />
            {/* Other modals would be rendered here, managed by state */}
        </div>
    );
};

export default UserLayout;
