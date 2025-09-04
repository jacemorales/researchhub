import React from 'react';

interface SidebarProps {
    onViewProfileClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onViewProfileClick }) => {
    const author = {
        name: process.env.REACT_APP_AUTHOR_NAME || 'Dr. Chikwe Chikwe',
        title: process.env.REACT_APP_AUTHOR_TITLE || 'Senior Lecturer & Research Consultant',
        img: '/author.png',
        bio: process.env.REACT_APP_AUTHOR_BIO_SHORT || 'An experienced educator and researcher.',
    };

    const stats = {
        products: '47',
        customers: '12K+',
        rating: '4.9',
    };

    const social = {
        twitter: '#',
        linkedin: '#',
        googleScholar: '#',
        researchGate: '#',
    }

    return (
        <aside className="sidebar">
            <div className="author-header">
                <img src={author.img} alt={author.name} className="author-img" />
                <h2 className="author-name">{author.name}</h2>
                <p className="author-title">{author.title}</p>
                <p className="author-bio">{author.bio}</p>
                <button className="btn btn-outline" onClick={onViewProfileClick}>
                    View Full Profile
                </button>
            </div>

            <div className="social-links">
                <a href={social.twitter}><i className="fab fa-twitter"></i></a>
                <a href={social.linkedin}><i className="fab fa-linkedin-in"></i></a>
                <a href={social.googleScholar}><i className="fab fa-google-scholar"></i></a>
                <a href={social.researchGate}><i className="fab fa-researchgate"></i></a>
            </div>

            <div className="stats">
                <div className="stat-item">
                    <div className="stat-number">{stats.products}</div>
                    <div className="stat-label">Products</div>
                </div>
                <div className="stat-item">
                    <div className="stat-number">{stats.customers}</div>
                    <div className="stat-label">Customers</div>
                </div>
                <div className="stat-item">
                    <div className="stat-number">{stats.rating}</div>
                    <div className="stat-label">Rating</div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
