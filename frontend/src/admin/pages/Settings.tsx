import React, { useState, useEffect } from "react";
import { useData } from "../../hooks/useData";
import type { WebsiteConfig } from "../../hooks/useData";
import { useCUD } from "../../hooks/useCUD";
import { useToast } from "../../hooks/useToast";

interface ConfigItem {
    config_key: string;
    config_value: string;
    config_type: string;
    config_category: string;
    config_description: string;
}

const Settings: React.FC = () => {
    const { website_config } = useData();
    const { website_config: { update }, loading } = useCUD();
    const { addToast } = useToast();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    const [selectedConfig, setSelectedConfig] = useState<ConfigItem | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const [categoryModalState, setCategoryModalState] = useState<WebsiteConfig>({});

    const handleUpdate = async () => {
        if (selectedConfig) {
            const response = await update({ [selectedConfig.config_key]: selectedConfig.config_value });
            if (response?.success) {
                addToast("Configuration updated successfully!", "success");
            } else {
                addToast(response?.error || "Failed to update setting.", "error");
            }
            setIsEditModalOpen(false);
        }
    };

    const handleCategoryUpdate = async () => {
        if (selectedCategory) {
            const configsToUpdate = Object.fromEntries(
                Object.entries(categoryModalState).map(([key, value]) => [key, (value as unknown as ConfigItem).config_value])
            );
            const response = await update(configsToUpdate);
            if (response?.success) {
                addToast("All settings in category updated successfully!", "success");
            } else {
                addToast(response?.error || "Failed to update settings.", "error");
            }
            setIsCategoryModalOpen(false);
        }
    };

    const openEditModal = (config: ConfigItem) => {
        setSelectedConfig(config);
        setIsEditModalOpen(true);
    };

    const openCategoryModal = (category: string) => {
        if (!website_config) return;
        const initialStateForModal = Object.fromEntries(
            Object.entries(website_config).filter(([, value]) => (value as unknown as ConfigItem).config_category === category)
        );
        setCategoryModalState(initialStateForModal);
        setSelectedCategory(category);
        setIsCategoryModalOpen(true);
    };

    const handleModalInputChange = (key: string, value: string) => {
        setCategoryModalState(prev => ({
            ...prev,
            [key]: {
                ...(prev[key] as unknown as object),
                config_value: value,
            } as unknown as string,
        }));
    };

    const handleSingleInputChange = (value: string) => {
        if (selectedConfig) {
            setSelectedConfig({ ...selectedConfig, config_value: value });
        }
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
        return 'cog'; // Simplified for now
    }

    const formatConfigKey = (key: string) => {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    const truncateValue = (value: string, length = 50) => {
        return value.length > length ? value.substring(0, length) + '...' : value;
    }

    const renderInput = (config: ConfigItem, onChange: (value: string) => void) => {
        switch (config.config_type) {
            case 'textarea':
                return <textarea className="form-input" value={config.config_value} onChange={(e) => onChange(e.target.value)} rows={5} />;
            case 'number':
                return <input className="form-input" type="number" value={config.config_value} onChange={(e) => onChange(e.target.value)} />;
            case 'boolean':
                return <input type="checkbox" checked={config.config_value === '1'} onChange={(e) => onChange(e.target.checked ? '1' : '0')} />;
            default:
                return <input className="form-input" type="text" value={config.config_value} onChange={(e) => onChange(e.target.value)} />;
        }
    };

    const allConfigs = website_config ? Object.values(website_config) as unknown as ConfigItem[] : [];

    return (
        <>
            <div className="config-content">
                <div className="config-header">
                    <h1><i className="fas fa-cog"></i> Website Configuration</h1>
                    <p>Manage all website settings and content from this centralized admin panel.</p>
                </div>

                <div className="config-grid">
                    {Object.entries(configCategories).map(([categoryKey, categoryName]) => (
                        <div className="config-category" key={categoryKey}>
                            <div className="category-header">
                                <h2><i className={`fas fa-${getCategoryIcon(categoryKey)}`}></i> {categoryName}</h2>
                                <button className="btn-edit-category" onClick={() => openCategoryModal(categoryKey)}>
                                    <i className="fas fa-edit"></i> Edit All
                                </button>
                            </div>
                            <div className="config-items">
                                {allConfigs.filter(c => c.config_category === categoryKey).map(config => (
                                    <div className="config-item" key={config.config_key}>
                                        <div className="config-info">
                                            <h3>{formatConfigKey(config.config_key)}</h3>
                                            <p className="config-description">{config.config_description}</p>
                                            <div className="config-value">
                                                <strong>Current Value:</strong>
                                                <span className="value-preview">{truncateValue(config.config_value)}</span>
                                            </div>
                                        </div>
                                        <div className="config-actions">
                                            <button className="btn-edit-item" onClick={() => openEditModal(config)}>
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
                                <h2 className="modal-title">Edit: {formatConfigKey(selectedConfig.config_key)}</h2>
                                <p className="modal-subtitle">{selectedConfig.config_description}</p>
                            </div>
                            <div className="form-group">
                                {renderInput(selectedConfig, handleSingleInputChange)}
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn btn-primary" onClick={handleUpdate} disabled={loading}>
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                            </div>
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
                                {Object.values(categoryModalState).map((config) => (
                                    <div className="form-group" key={(config as unknown as ConfigItem).config_key}>
                                        <label htmlFor={(config as unknown as ConfigItem).config_key}>{formatConfigKey((config as unknown as ConfigItem).config_key)}</label>
                                        {renderInput(config as unknown as ConfigItem, (newValue) => handleModalInputChange((config as unknown as ConfigItem).config_key, newValue))}
                                    </div>
                                ))}
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn btn-primary" onClick={handleCategoryUpdate} disabled={loading}>
                                    {loading ? "Saving..." : "Save All Changes"}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsCategoryModalOpen(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Settings;
