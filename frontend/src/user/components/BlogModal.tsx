import React, { useState } from 'react';

interface BlogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const BlogModal: React.FC<BlogModalProps> = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        // Add newsletter subscription logic here
        console.log(`Subscribing ${email}`);
        // showToast('Successfully subscribed!', 'success');
        setEmail('');
    };

    // Placeholder content, to be moved to .env
    const content = {
        title: 'Academic Insights & Research Updates',
        description: 'Stay updated with the latest academic research, study tips, and educational insights from our team of experts.',
        latestTitle: 'Latest Articles',
        latestDesc: 'Explore our collection of articles designed to help you get the most from our resources and stay ahead in your academic work.',
        newsletterTitle: 'Subscribe to Our Newsletter',
        newsletterDesc: 'Get the latest articles and resources delivered straight to your inbox every week.',
        newsletterPlaceholder: 'Your email address',
        newsletterButton: 'Subscribe',
    };

    const articles = [
        { img: '/author.png', title: 'Research Methodology Guide', date: 'June 15, 2023', readTime: '8 min read', excerpt: 'Learn how to implement effective research methodologies...' },
        { img: '/author.png', title: 'Academic Writing Tips', date: 'June 5, 2023', readTime: '12 min read', excerpt: 'Explore the most useful academic writing techniques...' },
        { img: '/author.png', title: 'Study Techniques', date: 'May 28, 2023', readTime: '6 min read', excerpt: 'Discover the emerging study techniques that will dominate...' },
    ];

    return (
        <div className="modal" id="blogModal" style={{ display: isOpen ? 'flex' : 'none' }} onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <span className="close-modal" onClick={onClose}>×</span>

                <div className="modal-header">
                    <h2 className="modal-title">{content.title}</h2>
                    <p className="modal-subtitle">{content.description}</p>
                </div>

                <div className="modal-body">
                    <h3>{content.latestTitle}</h3>
                    <p>{content.latestDesc}</p>

                    <div className="blog-grid">
                        {articles.map((article, index) => (
                            <div className="blog-card" key={index}>
                                <img src={article.img} alt={article.title} className="blog-img" />
                                <div className="blog-content">
                                    <h4 className="blog-title">{article.title}</h4>
                                    <div className="blog-meta">
                                        <span><i className="far fa-calendar"></i> {article.date}</span>
                                        <span><i className="far fa-clock"></i> {article.readTime}</span>
                                    </div>
                                    <p className="blog-excerpt">{article.excerpt}</p>
                                    <a href="#" className="read-more">Read More <i className="fas fa-arrow-right"></i></a>
                                </div>
                            </div>
                        ))}
                    </div>

                    <h3>{content.newsletterTitle}</h3>
                    <p>{content.newsletterDesc}</p>
                    <form style={{ marginTop: '20px' }} onSubmit={handleSubscribe}>
                        <input
                            type="email"
                            placeholder={content.newsletterPlaceholder}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ padding: '12px 15px', width: '100%', maxWidth: '400px', border: '2px solid #ddd', borderRadius: '5px', marginRight: '10px' }}
                            required
                        />
                        <button type="submit" style={{ padding: '12px 25px', background: '#333', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 600, marginTop: '10px', cursor: 'pointer' }}>
                            {content.newsletterButton}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BlogModal;
