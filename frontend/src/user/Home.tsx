import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Config {
    [key: string]: string;
}

const Home = () => {
    const [config, setConfig] = useState<Config | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/backend/config.php`);
                const data = await response.json();
                if (data.success) {
                    setConfig(data.config);
                }
            } catch (error) {
                console.error("Error fetching config:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <main className="container">
            <div className="main-resources" id="levelCards">
                <h2 className="section-title">{config?.RESOURCES_TITLE || 'Academic Resources'}</h2>
                <p className="section-subtitle">{config?.RESOURCE_BIO || 'Explore resources...'}</p>
                {/* The rest of the original Home.php content would go here, converted to JSX */}
            </div>
        </main>
    );
};

export default Home;
