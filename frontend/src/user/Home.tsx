import { Link } from 'react-router-dom';

const Home = () => {
    const resourcesTitle = process.env.REACT_APP_RESOURCES_TITLE || 'Academic Resources';
    const resourceBio = process.env.REACT_APP_RESOURCE_BIO || 'Explore resources for all academic levels.';

    return (
        <div className="main-resources" id="levelCards">
            <h2 className="section-title">{resourcesTitle}</h2>
            <p className="section-subtitle">{resourceBio}</p>
            
            <div className="level-cards">
                {/* Undergraduate Card */}
                <Link to="/user/marketplace?level=undergraduate" className="level-card">
                    <div className="level-icon undergraduate">
                        <i className="fas fa-user-graduate"></i>
                    </div>
                    <h3>Undergraduate</h3>
                    <p>Access projects, research papers, and study materials for undergraduate programs</p>
                    <div className="btn">Explore Resources</div>
                </Link>

                {/* Postgraduate Card */}
                <Link to="/user/marketplace?level=postgraduate" className="level-card">
                    <div className="level-icon postgraduate">
                        <i className="fas fa-graduation-cap"></i>
                    </div>
                    <h3>Postgraduate</h3>
                    <p>Discover thesis papers, advanced research materials, and academic publications</p>
                    <div className="btn">Explore Resources</div>
                </Link>
            </div>
        </div>
    );
};

export default Home;
