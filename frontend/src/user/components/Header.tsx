import React from 'react';
import { Link } from 'react-router-dom';
import '../assets/css/style.css'; // Import the stylesheet

interface HeaderProps {
    onBlogClick: () => void;
    onAboutClick: () => void;
    onContactClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onBlogClick, onAboutClick, onContactClick }) => {
    // Use environment variables for site name and description
    const siteName = process.env.REACT_APP_SITE_NAME || 'Research Hub';
    const siteDesc = process.env.REACT_APP_SITE_DESC || 'Your Gateway to Academic Resources';

    const scrollToResources = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const resourcesSection = document.getElementById('levelCards');
        if (resourcesSection) {
            resourcesSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <header>
            <div className="logo">
                <div className="logo-icon">
                    <i className="fas fa-book-open"></i>
                </div>
                <div className="logo-text">
                    <h1>{siteName}</h1>
                    <p>{siteDesc}</p>
                </div>
            </div>
            <nav>
                <ul>
                    <li><Link to="/user"><i className="fas fa-home"></i> Home</Link></li>
                    <li><a href="#levelCards" onClick={scrollToResources}><i className="fas fa-book"></i> Resources</a></li>
                    <li><a id="blogLink" onClick={onBlogClick}><i className="fas fa-blog"></i> Blog</a></li>
                    <li><a id="aboutLink" onClick={onAboutClick}><i className="fas fa-info-circle"></i> About</a></li>
                    <li><a id="contactLink" onClick={onContactClick}><i className="fas fa-envelope"></i> Contact</a></li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;
