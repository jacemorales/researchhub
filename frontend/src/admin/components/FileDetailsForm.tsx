import React, { useState, useEffect } from 'react';
import { formatDate, formatFileSize, getFileTypeDisplay } from '../utils';

interface SelectedFile {
    id: string;
    name: string;
    mimeType: string;
    size: string;
    modifiedTime: string;
}

interface FileDetailsFormProps {
    selectedFile: Partial<SelectedFile> | null;
    onSave: (formData: any) => void;
    onClear: () => void;
}

const FileDetailsForm: React.FC<FileDetailsFormProps> = ({ selectedFile, onSave, onClear }) => {
    const [formData, setFormData] = useState({
        fileName: '',
        fileType: '',
        fileSize: '',
        fileDate: '',
        description: '',
        category: '',
        level: '',
        price: '',
        priceNgn: ''
    });

    useEffect(() => {
        if (selectedFile) {
            setFormData({
                fileName: selectedFile.name || '',
                fileType: getFileTypeDisplay(selectedFile.mimeType || '', selectedFile.name),
                fileSize: formatFileSize(selectedFile.size),
                fileDate: formatDate(selectedFile.modifiedTime || ''),
                description: '',
                category: '',
                level: '',
                price: '',
                priceNgn: ''
            });
        } else {
            // Clear form if no file is selected
            setFormData({
                fileName: '', fileType: '', fileSize: '', fileDate: '',
                description: '', category: '', level: '', price: '', priceNgn: ''
            });
        }
    }, [selectedFile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="file-details-section">
            <div className="section-header">
                <h2><i className="fas fa-edit"></i> File Details</h2>
                {selectedFile && (
                    <div className="selected-file-info">
                        <span>Selected:</span>
                        <span className="selected-name">{selectedFile.name}</span>
                    </div>
                )}
            </div>

            <form className="file-details-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                    <div className="form-group">
                        <label>File Name</label>
                        <input type="text" name="fileName" value={formData.fileName} readOnly />
                    </div>
                    {/* Other read-only fields */}
                    <div className="form-group full-width">
                        <label htmlFor="fileDescription">Description</label>
                        <textarea id="fileDescription" name="description" value={formData.description} onChange={handleChange} rows={3}></textarea>
                    </div>
                    <div className="form-group">
                        <label htmlFor="fileCategory">Category</label>
                        <select id="fileCategory" name="category" value={formData.category} onChange={handleChange} required>
                            <option value="">Select category</option>
                            <option value="research">Research Paper</option>
                            <option value="thesis">Thesis</option>
                            <option value="dissertation">Dissertation</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="fileLevel">Level</label>
                        <select id="fileLevel" name="level" value={formData.level} onChange={handleChange} required>
                            <option value="">Select level</option>
                            <option value="undergraduate">Undergraduate</option>
                            <option value="postgraduate">Postgraduate</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="filePrice">Price (USD)</label>
                        <input type="number" id="filePrice" name="price" value={formData.price} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="filePriceNGN">Price (NGN)</label>
                        <input type="number" id="filePriceNGN" name="priceNgn" value={formData.priceNgn} onChange={handleChange} />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                        <i className="fas fa-save"></i> Save Details
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={onClear}>
                        <i className="fas fa-eraser"></i> Clear Form
                    </button>
                </div>
            </form>
        </div>
    );
};

export default FileDetailsForm;
