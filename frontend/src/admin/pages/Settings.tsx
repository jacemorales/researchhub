import React, { useState, useEffect } from "react";
import { useData, WebsiteConfig } from "../../hooks/useData";
import { useCUD } from "../../hooks/useCUD";
import { useToast } from "../../hooks/useToast";

const Settings: React.FC = () => {
    const { website_config } = useData();
    const { website_config: { update }, loading, error } = useCUD();
    const { addToast } = useToast();
    const [localConfig, setLocalConfig] = useState<WebsiteConfig | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<any>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    useEffect(() => {
        setLocalConfig(website_config);
    }, [website_config]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (selectedConfig) {
            setSelectedConfig({ ...selectedConfig, config_value: e.target.value });
        }
    };

    const handleCategoryInputChange = (key: string, value: string) => {
        if (localConfig) {
            setLocalConfig({ ...localConfig, [key]: value });
        }
    };

    const handleUpdate = async () => {
        if (selectedConfig) {
            await update({ [selectedConfig.config_key]: selectedConfig.config_value });
            addToast("Configuration updated successfully!", "success");
            setIsEditModalOpen(false);
        }
    };

    const handleCategoryUpdate = async () => {
        if (localConfig && selectedCategory) {
            const categoryConfigs = Object.keys(localConfig).filter(key => {
                const config = website_config?.[key] as any;
                return config?.config_category === selectedCategory;
            });
            const configsToUpdate: WebsiteConfig = {};
            categoryConfigs.forEach(key => {
                configsToUpdate[key] = localConfig[key];
            });
            await update(configsToUpdate);
            addToast("Configuration updated successfully!", "success");
            setIsCategoryModalOpen(false);
        }
    };

    const openEditModal = (config: any) => {
        setSelectedConfig(config);
        setIsEditModalOpen(true);
    };

    const openCategoryModal = (category: string) => {
        setSelectedCategory(category);
        setIsCategoryModalOpen(true);
    };

    const configCategories: { [key: string]: string } = {
        'site': 'Site Information',
        'author': 'Author Information',
        'contact': 'Contact Information',
        'social': 'Social Media',
        'about': 'About Page',
        'team': 'Team Information',
        'blog': 'Blog Content',
        'footer': 'Footer Information',
        'purchase': 'Purchase Settings',
        'seo': 'SEO Settings',
        'technical': 'Technical Settings'
    };

    const getCategoryIcon = (category: string) => {
        const icons: { [key: string]: string } = {
            'site': 'globe',
            'author': 'user',
            'contact': 'envelope',
            'social': 'share-alt',
            'about': 'info-circle',
            'team': 'users',
            'blog': 'blog',
            'footer': 'footer',
            'purchase': 'credit-card',
            'seo': 'search',
            'technical': 'tools'
        };
        return icons[category] ?? 'cog';
    }

    const formatConfigKey = (key: string) => {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    const truncateValue = (value: string, length = 50) => {
        if (value.length <= length) {
            return value;
        }
        return value.substring(0, length) + '...';
    }

    const renderInput = (config: any, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) => {
        switch (config.config_type) {
            case 'textarea':
                return <textarea value={config.config_value} onChange={onChange} rows={5} />;
            case 'number':
                return <input type="number" value={config.config_value} onChange={onChange} />;
            case 'boolean':
                return <input type="checkbox" checked={config.config_value === '1'} onChange={e => onChange({ ...e, target: { ...e.target, value: e.target.checked ? '1' : '0' } })} />;
            case 'image':
                return (
                    <div>
                        <input type="text" value={config.config_value} onChange={onChange} />
                        <img src={config.config_value} alt="preview" style={{ width: '100px', height: 'auto' }} />
                    </div>
                );
            default:
                return <input type="text" value={config.config_value} onChange={onChange} />;
        }
    };

    return (
        <>
            <div className="config-content">
                <div className="config-header">
                <h1><i className="fas fa-cog"></i> Website Configuration</h1>
                <p>Manage all website settings and content from this centralized admin panel.</p>
            </div>

            <div className="config-grid">
                {Object.entries(configCategories).map(([category, categoryName]) => (
                    <div className="config-category" key={category}>
                        <div className="category-header">
                            <h2><i className={`fas fa-${getCategoryIcon(category)}`}></i> {categoryName}</h2>
                            <button className="btn-edit-category" onClick={() => openCategoryModal(category)}>
                                <i className="fas fa-edit"></i> Edit All
                            </button>
                        </div>

                        <div className="config-items">
                            {website_config && Object.entries(website_config).filter(([key, value]) => (value as any).config_category === category).map(([key, value]) => (
                                <div className="config-item" key={key}>
                                    <div className="config-info">
                                        <h3>{formatConfigKey(key)}</h3>
                                        <div className="config-value">
                                            <strong>Current Value:</strong>
                                            <span className="value-preview">{truncateValue((value as any).config_value)}</span>
                                        </div>
                                    </div>
                                    <div className="config-actions">
                                        <button className="btn-edit-item" onClick={() => openEditModal({ config_key: key, config_value: (value as any).config_value, config_type: (value as any).config_type })}>
                                            <i className="fas fa-edit"></i> Edit
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {isEditModalOpen && selectedConfig && (
                <div className="modal" style={{ display: 'flex' }}>
                    <div className="modal-content">
                        <span className="close-modal" onClick={() => setIsEditModalOpen(false)}>×</span>
                        <div className="modal-header">
                            <h2 className="modal-title">Edit Configuration</h2>
                        </div>
                        <div className="form-group">
                            <label htmlFor="editConfigValue">Value</label>
                            {renderInput(selectedConfig, handleInputChange)}
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-primary" onClick={handleUpdate} disabled={loading}>
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                        </div>
                        {error && <p className="error">{error}</p>}
                    </div>
                </div>
            )}

            {isCategoryModalOpen && selectedCategory && (
                <div className="modal" style={{ display: 'flex' }}>
                    <div className="modal-content large">
                        <span className="close-modal" onClick={() => setIsCategoryModalOpen(false)}>×</span>
                        <div className="modal-header">
                            <h2 className="modal-title">Edit {configCategories[selectedCategory]}</h2>
                        </div>
                        <div className="category-form">
                            {localConfig && Object.entries(localConfig).filter(([key, value]) => (value as any).config_category === selectedCategory).map(([key, value]) => (
                                <div className="form-group" key={key}>
                                    <label htmlFor={key}>{formatConfigKey(key)}</label>
                                    {renderInput({ config_key: key, config_value: (value as any).config_value, config_type: (value as any).config_type }, e => handleCategoryInputChange(key, e.target.value))}
                                </div>
                            ))}
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-primary" onClick={handleCategoryUpdate} disabled={loading}>
                                {loading ? "Saving..." : "Save All Changes"}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => setIsCategoryModalOpen(false)}>Cancel</button>
                        </div>
                        {error && <p className="error">{error}</p>}
                    </div>
                </div>
            )}
        </div>
        </>
    );
};

export default Settings;
