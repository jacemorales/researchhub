import React from 'react';

interface AuthorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthorModal: React.FC<AuthorModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) {
        return null;
    }

    const author = {
        name: process.env.REACT_APP_AUTHOR_NAME || 'Dr. Chikwe Chikwe',
        title: process.env.REACT_APP_AUTHOR_TITLE || 'Senior Lecturer & Research Consultant',
        university: process.env.REACT_APP_AUTHOR_UNIVERSITY || 'University of Port Harcourt',
        email: process.env.REACT_APP_AUTHOR_EMAIL || 'chikwe@researchhub.edu',
        bio: process.env.REACT_APP_AUTHOR_BIO || 'An experienced educator and researcher with a passion for hospitality management and tourism marketing.',
        img: process.env.REACT_APP_AUTHOR_IMG || 'https://via.placeholder.com/150',
        credentialsTitle: process.env.REACT_APP_AUTHOR_CREDENTIALS_TITLE || 'Academic Credentials',
        credentialsDesc: process.env.REACT_APP_AUTHOR_CREDENTIALS_DESC || 'B.Sc & M.Sc in Hospitality Management (University of Port Harcourt)<br>Currently pursuing Ph.D in Hospitality & Tourism Marketing',
        mentorshipTitle: process.env.REACT_APP_AUTHOR_MENTORSHIP_TITLE || 'Mentorship Achievements',
        mentorshipDesc: process.env.REACT_APP_AUTHOR_MENTORSHIP_DESC || 'Mentored 100+ students with 90% distinction rate<br>Guided research across multiple disciplines',
        publicationsTitle: process.env.REACT_APP_AUTHOR_PUBLICATIONS_TITLE || 'Publications',
        publicationsDesc: process.env.REACT_APP_AUTHOR_PUBLICATIONS_DESC || '5 published international articles in peer-reviewed journals',
    };

    return (
        <div className="modal" id="authorModal" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <span className="close-modal" onClick={onClose}>&times;</span>

                <div className="author-profile-header">
                    <img src={author.img} alt={author.name} className="author-profile-img" />
                    <div className="author-profile-info">
                        <h2 className="author-profile-name">{author.name}</h2>
                        <p className="author-profile-title">{author.title}</p>
                        <p className="author-profile-contact"><i className="fas fa-university"></i> {author.university}</p>
                        <p className="author-profile-contact"><i className="fas fa-envelope"></i> {author.email}</p>
                    </div>
                </div>

                <div className="author-profile-bio">
                    <p>{author.bio}</p>
                </div>

                <div className="author-highlights">
                    <div className="highlight-item">
                        <div className="highlight-icon"><i className="fas fa-graduation-cap"></i></div>
                        <div className="highlight-content">
                            <h4>{author.credentialsTitle}</h4>
                            <p dangerouslySetInnerHTML={{ __html: author.credentialsDesc }} />
                        </div>
                    </div>
                    <div className="highlight-item">
                        <div className="highlight-icon"><i className="fas fa-chalkboard-teacher"></i></div>
                        <div className="highlight-content">
                            <h4>{author.mentorshipTitle}</h4>
                            <p dangerouslySetInnerHTML={{ __html: author.mentorshipDesc }} />
                        </div>
                    </div>
                    <div className="highlight-item">
                        <div className="highlight-icon"><i className="fas fa-book"></i></div>
                        <div className="highlight-content">
                            <h4>{author.publicationsTitle}</h4>
                            <p>{author.publicationsDesc}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthorModal;
