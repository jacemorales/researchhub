import { useState } from 'react';
import { Outlet } from 'react-router-dom'; // Using Outlet to render child routes
import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './components/Sidebar';
import AuthorModal from './components/AuthorModal';
import AboutModal from './components/AboutModal';
import BlogModal from './components/BlogModal';
import ContactModal from './components/ContactModal';

const UserLayout = () => {
    const [isAuthorModalOpen, setAuthorModalOpen] = useState(false);
    const [isAboutModalOpen, setAboutModalOpen] = useState(false);
    const [isBlogModalOpen, setBlogModalOpen] = useState(false);
    const [isContactModalOpen, setContactModalOpen] = useState(false);

    return (
        <div className="user-layout">
            <Header
                onAboutClick={() => setAboutModalOpen(true)}
                onBlogClick={() => setBlogModalOpen(true)}
                onContactClick={() => setContactModalOpen(true)}
            />
            <main className="container">
                <Sidebar onViewProfileClick={() => setAuthorModalOpen(true)} />
                <div className="main-content">
                    <Outlet /> {/* Child routes will render here */}
                </div>
            </main>
            <Footer />

            {/* Modals */}
            <AuthorModal isOpen={isAuthorModalOpen} onClose={() => setAuthorModalOpen(false)} />
            <AboutModal isOpen={isAboutModalOpen} onClose={() => setAboutModalOpen(false)} />
            <BlogModal isOpen={isBlogModalOpen} onClose={() => setBlogModalOpen(false)} />
            <ContactModal isOpen={isContactModalOpen} onClose={() => setContactModalOpen(false)} />
        </div>
    );
};

export default UserLayout;
