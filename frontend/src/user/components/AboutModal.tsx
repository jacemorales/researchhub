import React from 'react';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    // All content is driven by environment variables for easy customization
    const siteName = process.env.REACT_APP_SITE_NAME || 'Research Hub';
    const about = {
        subtitle: process.env.REACT_APP_ABOUT_SUBTITLE || 'Learn more about our mission and team.',
        storyTitle: process.env.REACT_APP_ABOUT_STORY_TITLE || 'Our Story',
        storyContent: process.env.REACT_APP_ABOUT_STORY_CONTENT || 'Founded by a group of passionate academics, Research Hub aims to bridge the gap between knowledge creation and accessibility.',
        missionTitle: process.env.REACT_APP_ABOUT_MISSION_TITLE || 'Our Mission',
        missionContent: process.env.REACT_APP_ABOUT_MISSION_CONTENT || 'To empower students and researchers by providing a centralized, high-quality platform for academic resources.',
        teamTitle: process.env.REACT_APP_ABOUT_TEAM_TITLE || 'Meet the Team',
        teamIntro: process.env.REACT_APP_ABOUT_TEAM_INTRO || 'We are a diverse team of educators, developers, and designers dedicated to making academic work more accessible.',
        valuesTitle: process.env.REACT_APP_ABOUT_VALUES_TITLE || 'Our Core Values',
    };

    const teamMembers = [
        { name: process.env.REACT_APP_TEAM_MEMBER_1_NAME || 'Dr. Evelyn Reed', role: process.env.REACT_APP_TEAM_MEMBER_1_ROLE || 'Founder & Lead Researcher', img: '/author.png' },
        { name: process.env.REACT_APP_TEAM_MEMBER_2_NAME || 'Mark Chen', role: process.env.REACT_APP_TEAM_MEMBER_2_ROLE || 'Lead Developer', img: '/author.png' },
        { name: process.env.REACT_APP_TEAM_MEMBER_3_NAME || 'Aisha Khan', role: process.env.REACT_APP_TEAM_MEMBER_3_ROLE || 'UX/UI Designer', img: '/author.png' },
        { name: process.env.REACT_APP_TEAM_MEMBER_4_NAME || 'Ben Carter', role: process.env.REACT_APP_TEAM_MEMBER_4_ROLE || 'Community Manager', img: '/author.png' },
    ];

    const values = [
        { title: process.env.REACT_APP_ABOUT_VALUE_1_TITLE || 'Accessibility', description: process.env.REACT_APP_ABOUT_VALUE_1_DESC || 'Knowledge should be available to everyone, everywhere.' },
        { title: process.env.REACT_APP_ABOUT_VALUE_2_TITLE || 'Quality', description: process.env.REACT_APP_ABOUT_VALUE_2_DESC || 'We are committed to maintaining a high standard for all our resources.' },
        { title: process.env.REACT_APP_ABOUT_VALUE_3_TITLE || 'Integrity', description: process.env.REACT_APP_ABOUT_VALUE_3_DESC || 'Promoting academic honesty and ethical research practices.' },
        { title: process.env.REACT_APP_ABOUT_VALUE_4_TITLE || 'Community', description: process.env.REACT_APP_ABOUT_VALUE_4_DESC || 'Fostering a collaborative environment for learning and growth.' },
    ];

    return (
        <div className="modal" id="aboutModal" style={{ display: isOpen ? 'flex' : 'none' }} onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <span className="close-modal" onClick={onClose}>×</span>

                <div className="modal-header">
                    <h2 className="modal-title">About {siteName}</h2>
                    <p className="modal-subtitle">{about.subtitle}</p>
                </div>

                <div className="modal-body">
                    <h3>{about.storyTitle}</h3>
                    <p>{about.storyContent}</p>

                    <h3>{about.missionTitle}</h3>
                    <p>{about.missionContent}</p>

                    <h3>{about.teamTitle}</h3>
                    <p>{about.teamIntro}</p>

                    <div className="team-grid">
                        {teamMembers.map((member, index) => (
                            <div className="team-member" key={index}>
                                <img src={member.img} alt={member.name} className="team-img" />
                                <h4 className="team-name">{member.name}</h4>
                                <p className="team-role">{member.role}</p>
                            </div>
                        ))}
                    </div>

                    <h3>{about.valuesTitle}</h3>
                    <ul>
                        {values.map((value, index) => (
                            <li key={index}>
                                <strong>{value.title}:</strong> {value.description}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AboutModal;
