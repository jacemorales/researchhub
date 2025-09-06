import React, { useState, useEffect } from "react";
import { googleApiService } from "../utils/googleApi";
import { useCUD } from "../../hooks/useCUD";
import type { AcademicFile } from "../../hooks/useData";
import { useToast } from "../../hooks/useToast";

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    size: string;
    modifiedTime: string;
    webViewLink: string;
}

interface Price {
    usd: number;
    ngn: number;
}

const AdminHome: React.FC = () => {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
    const [fileDetails, setFileDetails] = useState<Partial<AcademicFile>>({});
    const { academic_files: { save }, loading } = useCUD();
    const { addToast } = useToast();

    useEffect(() => {
        googleApiService.onAuthenticated(() => {
            setIsSignedIn(true);
            loadDriveFiles();
        });
        if (googleApiService.isUserSignedIn()) {
            setIsSignedIn(true);
            loadDriveFiles();
        }
    }, []);

    const loadDriveFiles = async () => {
        const files = await googleApiService.listFiles();
        setDriveFiles(files);
    };

    const handleSignIn = () => {
        googleApiService.signIn();
    };

    const handleSignOut = () => {
        googleApiService.signOut();
        setIsSignedIn(false);
        setDriveFiles([]);
    };

    const handleFileSelect = (file: DriveFile) => {
        setSelectedFile(file);
        setFileDetails({
            drive_file_id: file.id,
            file_name: file.name,
            file_type: file.mimeType,
            file_size: file.size,
            modified_date: file.modifiedTime,
            price: JSON.stringify({ usd: 0, ngn: 0 })
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFileDetails({ ...fileDetails, [name]: value });
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const currentPrice: Price = fileDetails.price ? JSON.parse(fileDetails.price) : { usd: 0, ngn: 0 };
        const newPrice = {
            ...currentPrice,
            [name]: parseFloat(value) || 0,
        };
        setFileDetails({
            ...fileDetails,
            price: JSON.stringify(newPrice),
        });
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const response = await save(fileDetails);
        if (response?.success) {
            addToast("File details saved successfully!", "success");
            clearForm();
        } else {
            addToast(response?.error || "Failed to save file details.", "error");
        }
    };

    const clearForm = () => {
        setSelectedFile(null);
        setFileDetails({});
    };

    const getPriceValue = (currency: 'usd' | 'ngn'): number => {
        if (!fileDetails.price) return 0;
        try {
            const price: Price = JSON.parse(fileDetails.price);
            return price[currency];
        } catch (e) {
            return 0;
        }
    };

    return (
        <>
            <div className="drive-content">
                {!isSignedIn ? (
                    <div className="auth-prompt">
                        <div className="auth-card">
                            <div className="auth-icon"><i className="fab fa-google-drive"></i></div>
                            <h2>Connect to Google Drive</h2>
                            <p>Sign in to access your documents and automatically fill file details</p>
                            <button onClick={handleSignIn} className="btn-auth">
                                <i className="fab fa-google"></i> Sign in with Google
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="content-grid">
                        <div className="file-selection-section">
                            <div className="section-header">
                                <h2><i className="fab fa-google-drive"></i> Your Drive Files</h2>
                                <div className="header-actions">
                                    <button onClick={handleSignOut} className="btn-logout">Sign Out</button>
                                    <button id="refreshDrive" className="btn-icon" title="Refresh files" onClick={loadDriveFiles}>
                                        <i className="fas fa-sync-alt"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="drive-file-list">
                                {driveFiles.map((file) => (
                                    <div className={`drive-file ${selectedFile?.id === file.id ? 'selected' : ''}`} key={file.id} onClick={() => handleFileSelect(file)}>
                                        <div className="file-icon"><i className="fas fa-file"></i></div>
                                        <div className="file-details">
                                            <h3>{file.name}</h3>
                                            <div className="file-meta">
                                                <span><i className="fas fa-calendar"></i> {new Date(file.modifiedTime).toLocaleDateString()}</span>
                                                <span><i className="fas fa-weight-hanging"></i> {file.size}</span>
                                            </div>
                                        </div>
                                        <div className="file-actions">
                                            <a href={file.webViewLink} target="_blank" rel="noreferrer" className="btn-view" title="View in Drive">
                                                <i className="fas fa-external-link-alt"></i>
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="file-details-section">
                            <div className="section-header">
                                <h2><i className="fas fa-edit"></i> File Details</h2>
                                {selectedFile && <div className="selected-file-info">Selected: <span id="selectedFileName">{selectedFile.name}</span></div>}
                            </div>
                            <form className="file-details-form" onSubmit={handleFormSubmit}>
                                <div className="form-grid">
                                    <div className="form-group"><label>File Name</label><input type="text" readOnly value={fileDetails.file_name || ""} /></div>
                                    <div className="form-group"><label>File Type</label><input type="text" readOnly value={fileDetails.file_type || ""} /></div>
                                    <div className="form-group"><label>File Size</label><input type="text" readOnly value={fileDetails.file_size || ""} /></div>
                                    <div className="form-group"><label>Modified Date</label><input type="text" readOnly value={fileDetails.modified_date || ""} /></div>
                                    <div className="form-group full-width"><label>Description</label><textarea name="description" value={fileDetails.description || ""} onChange={handleInputChange} rows={3}></textarea></div>
                                    <div className="form-group"><label>Category</label><select name="category" value={fileDetails.category || ""} onChange={handleInputChange} required><option value="">Select...</option><option value="research">Research</option><option value="thesis">Thesis</option></select></div>
                                    <div className="form-group"><label>Level</label><select name="level" value={fileDetails.level || ""} onChange={handleInputChange} required><option value="">Select...</option><option value="undergraduate">Undergraduate</option><option value="postgraduate">Postgraduate</option></select></div>
                                    <div className="form-group"><label>Price (USD)</label><input type="number" name="usd" value={getPriceValue('usd')} onChange={handlePriceChange} step="0.01" /></div>
                                    <div className="form-group"><label>Price (NGN)</label><input type="number" name="ngn" value={getPriceValue('ngn')} onChange={handlePriceChange} step="0.01" /></div>
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn btn-primary" disabled={loading || !selectedFile}>
                                        {loading ? "Saving..." : "Save Details"}
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={clearForm}>Clear</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default AdminHome;
