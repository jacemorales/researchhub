import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminHeader from '../components/AdminHeader';
// import { toast } from 'react-toastify';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface ConfigItem {
    config_key: string;
    config_value: string;
    config_description: string;
    config_category: string;
    config_type: string;
}

const WebsiteConfigPage = () => {
    const [configData, setConfigData] = useState<ConfigItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API_BASE_URL}/admin/get_google_config.php?action=get_all_config`);
                if (response.data.success) {
                    setConfigData(response.data.config);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, []);

    const configCategories = {
        site: 'Site Information',
        author: 'Author Information',
        // ... other categories
    };

    const groupedConfig = Object.entries(configCategories).map(([categoryKey, categoryName]) => ({
        key: categoryKey,
        name: categoryName,
        items: configData.filter(item => item.config_category === categoryKey),
    }));

    if (loading) return <div>Loading...</div>;

    return (
        <div className="admin-container">
            <AdminHeader onLogout={() => { /* handle logout */ }} />
            <div className="config-content">
                <div className="config-header">
                    <h1><i className="fas fa-cog"></i> Website Configuration</h1>
                <p>Manage all website settings and content.</p>
            </div>
            <div className="config-grid">
                {groupedConfig.map(category => (
                    <div className="config-category" key={category.key}>
                        <div className="category-header">
                            <h2>{category.name}</h2>
                            <button className="btn-edit-category">
                                <i className="fas fa-edit"></i> Edit All
                            </button>
                        </div>
                        <div className="config-items">
                            {category.items.map(item => (
                                <div className="config-item" key={item.config_key}>
                                    <div className="config-info">
                                        <h3>{item.config_key.replace(/_/g, ' ')}</h3>
                                        <p>{item.config_description}</p>
                                        <div className="config-value">
                                            <strong>Current Value:</strong>
                                            <span>{item.config_value.substring(0, 50)}...</span>
                                        </div>
                                    </div>
                                    <div className="config-actions">
                                        <button className="btn-edit-item">
                                            <i className="fas fa-edit"></i> Edit
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {/* Modals for editing would go here */}
            </div>
        </div>
    );
};

export default WebsiteConfigPage;
