const Footer = () => {
    // Use environment variables for footer content
    const copyright = process.env.REACT_APP_FOOTER_COPYRIGHT || `© ${new Date().getFullYear()} Research Hub. All rights reserved.`;
    const description = process.env.REACT_APP_SITE_DESC || 'Your Gateway to Academic Resources';

    const socialLinks = {
        facebook: process.env.REACT_APP_SOCIAL_FACEBOOK,
        twitter: process.env.REACT_APP_SOCIAL_TWITTER,
        linkedin: process.env.REACT_APP_SOCIAL_LINKEDIN,
        instagram: process.env.REACT_APP_SOCIAL_INSTAGRAM,
    };

    return (
        <footer>
            <p>{copyright}</p>
            <p>{description}</p>

            <div className="social-links">
                {socialLinks.facebook && (
                    <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" title="Facebook">
                        <i className="fab fa-facebook"></i>
                    </a>
                )}
                {socialLinks.twitter && (
                    <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" title="Twitter">
                        <i className="fab fa-twitter"></i>
                    </a>
                )}
                {socialLinks.linkedin && (
                    <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn">
                        <i className="fab fa-linkedin"></i>
                    </a>
                )}
                {socialLinks.instagram && (
                    <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" title="Instagram">
                        <i className="fab fa-instagram"></i>
                    </a>
                )}
            </div>
        </footer>
    );
};

export default Footer;
