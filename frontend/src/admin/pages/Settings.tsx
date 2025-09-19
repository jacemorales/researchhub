// Settings.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../hooks/useData';
import { useCUD } from '../../hooks/useCUD';
import {AdminToast} from '../../hooks/Toast';
import Header from '../components/Header';

// Define a type for the full config object
interface FullConfigItem {
    config_key: string;
    config_value: string;
    config_type: 'text' | 'textarea' | 'image' | 'number' | 'boolean';
    config_category: string;
    config_description: string;
}

const Settings: React.FC = () => {
    const { website_config: initialWebsiteConfig } = useData(); // Get initial data from hook
    const { execute, loading, error, success } = useCUD();
    // Create local state to manage config data for instant UI updates
    const [configData, setConfigData] = useState<{ [key: string]: FullConfigItem }>({});
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [currentEditConfig, setCurrentEditConfig] = useState<FullConfigItem | null>(null);
    const [currentCategory, setCurrentCategory] = useState<string>('');
    const [categoryConfigs, setCategoryConfigs] = useState<FullConfigItem[]>([]);
    const [toast, setToast] = useState<{
        show: boolean;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
    } | null>(null);

    // Configuration categories
    const configCategories = React.useMemo(() => ({
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
    }), []);

    // Helper function to get icon class based on category
    const getCategoryIcon = (category: string): string => {
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
        return icons[category] || 'cog';
    };

    // Helper function to format config key for display
    const formatConfigKey = (key: string): string => {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    // Helper function to truncate long values
    const truncateValue = (value: string, length: number = 50): string => {
        if (value.length <= length) {
            return value;
        }
        return value.substring(0, length) + '...';
    };

    // Mock function to determine config type based on key (temporary)
    const getMockConfigType = (key: string): FullConfigItem['config_type'] => {
        if (key.includes('DESC') || key.includes('BIO') || key.includes('CONTENT') || key.includes('EXCERPT')) {
            return 'textarea';
        } else if (key.includes('IMG')) {
            return 'image';
        } else if (key === 'TECHNICAL_MAINTENANCE_MODE') {
            return 'boolean';
        } else if (key === 'TECHNICAL_MAX_FILE_SIZE') {
            return 'number';
        } else {
            return 'text';
        }
    };

    // Mock function to determine config category based on key (temporary)
    const getMockConfigCategory = useCallback((key: string): string => {
        for (const [cat] of Object.entries(configCategories)) {
            if (key.toUpperCase().startsWith(cat.toUpperCase() + '_')) {
                return cat;
            }
        }
        return 'site'; // Default category
    }, [configCategories]);


// Initialize config data from the hook
useEffect(() => {
    if (initialWebsiteConfig) {
        const fullData: { [key: string]: FullConfigItem } = {};
        Object.keys(initialWebsiteConfig).forEach(key => {
            // ✅ Skip description keys
            if (key.endsWith('_DESC')) {
                return;
            }
            
            // ✅ Get the description using the _DESC suffix
            const descKey = key + '_DESC';
            const description = initialWebsiteConfig[descKey] || `Description for ${formatConfigKey(key)}`;
            
            fullData[key] = {
                config_key: key,
                config_value: initialWebsiteConfig[key],
                config_type: getMockConfigType(key),
                config_category: getMockConfigCategory(key),
                config_description: description // ✅ Use real description
            };
        });
        setConfigData(fullData);
    }
}, [initialWebsiteConfig, getMockConfigCategory]);


    // Helper function to show toast
    const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success', duration: number = 5000) => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast(null);
        }, duration);
    };

    // Show toast if useCUD hook reports success or error
    useEffect(() => {
        if (success) {
            showToast(success, 'success');
        }
        if (error) {
            showToast(error, 'error');
        }
    }, [success, error]);

    // Function to open the edit single config modal
    const openEditModal = useCallback((configKey: string) => {
        const config = configData[configKey];
        if (config) {
            setCurrentEditConfig(config);
            setIsEditModalOpen(true);
        }
    }, [configData]);

    // Function to open the edit category modal
    const openCategoryModal = useCallback((category: string) => {
        setCurrentCategory(category);
        const configs = Object.values(configData).filter(c => c.config_category === category);
        setCategoryConfigs(configs);
        setIsCategoryModalOpen(true);
    }, [configData]);

    // Function to close all modals
    const closeModal = useCallback(() => {
        setIsEditModalOpen(false);
        setIsCategoryModalOpen(false);
        setCurrentEditConfig(null);
        setCurrentCategory('');
        setCategoryConfigs([]);
    }, []);

    // Function to handle saving a single config
    const handleSaveSingleConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentEditConfig) return;

        const result = await execute(
            { table: 'website_config', action: 'update' },
            {
                config_key: currentEditConfig.config_key,
                config_value: currentEditConfig.config_value
            }
        );

        if (result.success) {
            // ✅ Update local state IMMEDIATELY for instant UI feedback
            setConfigData(prev => ({
                ...prev,
                [currentEditConfig.config_key]: {
                    ...currentEditConfig
                }
            }));
            closeModal();
        }
        // Toast is handled by the useEffect above
    };

    // Function to handle saving all configs in a category
    const handleSaveCategoryConfigs = async (e: React.FormEvent) => {
        e.preventDefault();

        const formData = new FormData(e.target as HTMLFormElement);
        const updates: { [key: string]: string } = {};

        for (const [key, value] of formData.entries()) {
            if (key.startsWith('config_updates[')) {
                const configKey = key.match(/config_updates\[(.+)\]/)?.[1];
                if (configKey) {
                    updates[configKey] = value as string;
                }
            }
        }

        let successCount = 0;
        let errorCount = 0;
        const updatedConfigs: { [key: string]: FullConfigItem } = {};

        // Update each config individually using your useCUD hook
        for (const [configKey, configValue] of Object.entries(updates)) {
            const result = await execute(
                { table: 'website_config', action: 'update' },
                {
                    config_key: configKey,
                    config_value: configValue
                }
            );

            if (result.success) {
                successCount++;
                // Store the updated config for local state update
                if (configData[configKey]) {
                    updatedConfigs[configKey] = {
                        ...configData[configKey],
                        config_value: configValue
                    };
                }
            } else {
                errorCount++;
            }
        }

        // ✅ Update local state with all successful changes
        if (successCount > 0) {
            setConfigData(prev => ({
                ...prev,
                ...updatedConfigs
            }));
        }

        // Show appropriate toast message
        if (errorCount === 0) {
            showToast(`All ${currentCategory} settings updated successfully!`, 'success');
        } else if (successCount > 0) {
            showToast(`Updated ${successCount} settings successfully. ${errorCount} failed.`, 'success');
        } else {
            showToast('Failed to update any settings.', 'error');
        }

        closeModal();
    };

    // Function to handle input changes for single config edit
    const handleSingleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (currentEditConfig) {
            setCurrentEditConfig({
                ...currentEditConfig,
                config_value: e.target.value
            });
        }
    };

    // Function to handle checkbox changes for boolean configs
    const handleBooleanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (currentEditConfig) {
            setCurrentEditConfig({
                ...currentEditConfig,
                config_value: e.target.checked ? '1' : '0'
            });
        }
    };

    // Render the input field based on config type (for single edit modal)
    const renderSingleEditInput = () => {
        if (!currentEditConfig) return null;

        switch (currentEditConfig.config_type) {
            case 'textarea':
                return (
                    <textarea
                        name="config_value"
                        id="editConfigValue"
                        rows={5}
                        value={currentEditConfig.config_value}
                        onChange={handleSingleConfigChange}
                        required
                    />
                );
            case 'number':
                return (
                    <input
                        type="number"
                        name="config_value"
                        id="editConfigValue"
                        value={currentEditConfig.config_value}
                        onChange={handleSingleConfigChange}
                        required
                    />
                );
            case 'boolean':
                return (
                    <div className="boolean-input">
                        <label className="switch">
                            <input
                                type="checkbox"
                                name="config_value"
                                id="editConfigValue"
                                checked={currentEditConfig.config_value === '1'}
                                onChange={handleBooleanChange}
                            />
                            <span className="slider"></span>
                        </label>
                        <span className="boolean-label">
                            {currentEditConfig.config_value === '1' ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                );
            case 'image':
                return (
                    <div className="image-input">
                        <input
                            type="text"
                            name="config_value"
                            id="editConfigValue"
                            value={currentEditConfig.config_value}
                            onChange={handleSingleConfigChange}
                            placeholder="Enter image URL or path"
                            required
                        />
                        <div className="image-preview">
                            <img
                                src={currentEditConfig.config_value}
                                alt="Preview"
                                onError={(e) => {
                                  e.currentTarget.src = '/no_img.png';
                                }}
                            />
                        </div>
                    </div>
                );
            default:
                return (
                    <input
                        type="text"
                        name="config_value"
                        id="editConfigValue"
                        value={currentEditConfig.config_value}
                        onChange={handleSingleConfigChange}
                        required
                    />
                );
        }
    };

    // Render the input field for category edit
    const renderCategoryEditInput = (config: FullConfigItem) => {
        switch (config.config_type) {
            case 'textarea':
                return (
                    <div className="form-group" key={config.config_key}>
                        <label htmlFor={config.config_key}>{formatConfigKey(config.config_key)}</label>
                        <p className="config-description">{config.config_description}</p>
                        <textarea
                            name={`config_updates[${config.config_key}]`}
                            id={config.config_key}
                            rows={3}
                            defaultValue={config.config_value}
                            required
                        />
                    </div>
                );
            case 'number':
                return (
                    <div className="form-group" key={config.config_key}>
                        <label htmlFor={config.config_key}>{formatConfigKey(config.config_key)}</label>
                        <p className="config-description">{config.config_description}</p>
                        <input
                            type="number"
                            name={`config_updates[${config.config_key}]`}
                            id={config.config_key}
                            defaultValue={config.config_value}
                            required
                        />
                    </div>
                );
            case 'boolean':
                return (
                    <div className="form-group" key={config.config_key}>
                        <label htmlFor={config.config_key}>{formatConfigKey(config.config_key)}</label>
                        <p className="config-description">{config.config_description}</p>
                        <div className="boolean-input">
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    name={`config_updates[${config.config_key}]`}
                                    id={config.config_key}
                                    defaultChecked={config.config_value === '1'}
                                    value="1"
                                />
                                <span className="slider"></span>
                            </label>
                            <span className="boolean-label">
                                {config.config_value === '1' ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                    </div>
                );
            case 'image':
                return (
                    <div className="form-group" key={config.config_key}>
                        <label htmlFor={config.config_key}>{formatConfigKey(config.config_key)}</label>
                        <p className="config-description">{config.config_description}</p>
                        <div className="image-input">
                            <input
                                type="text"
                                name={`config_updates[${config.config_key}]`}
                                id={config.config_key}
                                defaultValue={config.config_value}
                                placeholder="Enter image URL or path"
                                required
                            />
                            <div className="image-preview">
                                <img
                                    src={config.config_value}
                                    alt="Preview"
                                    onError={(e) => {
                                      e.currentTarget.src = '/no_img.png';
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="form-group" key={config.config_key}>
                        <label htmlFor={config.config_key}>{formatConfigKey(config.config_key)}</label>
                        <p className="config-description">{config.config_description}</p>
                        <input
                            type="text"
                            name={`config_updates[${config.config_key}]`}
                            id={config.config_key}
                            defaultValue={config.config_value}
                            required
                        />
                    </div>
                );
        }
    };

    return (
        <>
            <Header />
            <div className="config-content">
                <div className="config-header">
                    <h1><i className="fas fa-cog"></i> Website Configuration</h1>
                    <p>Manage all website settings and content from this centralized admin panel.</p>
                </div>

                {toast && (
                    <div className="toast-container">
                        <AdminToast
                            message={toast.message}
                            type={toast.type}
                            duration={5000}
                            onClose={() => setToast(null)}
                        />
                    </div>
                )}

                <div className="config-grid">
                    {Object.entries(configCategories).map(([category, categoryName]) => {
                        const categoryConfigs = Object.values(configData).filter(c => c.config_category === category);
                        return (
                            <div className="config-category" key={category}>
                                <div className="category-header">
                                    <h2><i className={`fas fa-${getCategoryIcon(category)}`}></i> {categoryName}</h2>
                                    <button
                                        className="btn-edit-category"
                                        onClick={() => openCategoryModal(category)}
                                    >
                                        <i className="fas fa-edit"></i> Edit All
                                    </button>
                                </div>
                                <div className="config-items">
                                    {categoryConfigs.map(config => (
                                        <div className="config-item" key={config.config_key}>
                                            <div className="config-info">
                                                <h3>{formatConfigKey(config.config_key)}</h3>
                                                <p className="config-description">{config.config_description}</p>
                                                <div className="config-value">
                                                    <strong>Current Value:</strong>
                                                    <span className="value-preview">
                                                        {truncateValue(config.config_value, 50)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="config-actions">
                                                <button
                                                    className="btn-edit-item"
                                                    onClick={() => openEditModal(config.config_key)}
                                                >
                                                    <i className="fas fa-edit"></i> Edit
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Edit Single Config Modal */}
                {isEditModalOpen && currentEditConfig && (
                    <div className="modal" onClick={closeModal}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <span className="close-modal" onClick={closeModal}>&times;</span>
                            <div className="modal-header">
                                <h2 className="modal-title">Edit Configuration</h2>
                                <p className="modal-subtitle">{currentEditConfig.config_description}</p>
                            </div>
                            <form className="config-form" onSubmit={handleSaveSingleConfig}>
                                <input type="hidden" name="update_config" value="1" />
                                <input type="hidden" name="config_key" id="editConfigKey" value={currentEditConfig.config_key} />
                                <div className="form-group">
                                    <label htmlFor="editConfigValue">Value</label>
                                    <div id="editConfigInputContainer">
                                        {renderSingleEditInput()}
                                    </div>
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? (
                                            <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                                        ) : (
                                            <><i className="fas fa-save"></i> Save Changes</>
                                        )}
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                        <i className="fas fa-times"></i> Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Category Modal */}
                {isCategoryModalOpen && (
                    <div className="modal" onClick={closeModal}>
                        <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                            <span className="close-modal" onClick={closeModal}>&times;</span>
                            <div className="modal-header">
                                <h2 className="modal-title">Edit {configCategories[currentCategory as keyof typeof configCategories]}</h2>
                                <p className="modal-subtitle">Edit all settings in this category at once</p>
                            </div>
                            <form className="category-form" onSubmit={handleSaveCategoryConfigs}>
                                <input type="hidden" name="update_category" value="1" />
                                <input type="hidden" name="category" id="editCategory" value={currentCategory} />
                                <div id="categoryConfigContainer">
                                    {categoryConfigs.map(config => renderCategoryEditInput(config))}
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? (
                                            <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                                        ) : (
                                            <><i className="fas fa-save"></i> Save All Changes</>
                                        )}
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                        <i className="fas fa-times"></i> Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Settings;