import React, { useState, useEffect } from "react";
import gapi from "gapi-script";
import { initGoogleClient, signInToGoogle, signOutFromGoogle, fetchDriveFiles } from "./utils/googleApi";
import { useCUD } from "../hooks/useCUD";
import { AcademicFile } from "../hooks/useData";

interface Price {
    usd: number;
    ngn: number;
}

const AdminHome: React.FC = () => {
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [driveFiles, setDriveFiles] = useState<any[]>([]);
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [fileDetails, setFileDetails] = useState<Partial<AcademicFile>>({});
    const { academic_files, loading, error } = useCUD();

    useEffect(() => {
        initGoogleClient(() => {
            const authInstance = gapi.auth2.getAuthInstance();
            setIsSignedIn(authInstance.isSignedIn.get());
            if (authInstance.isSignedIn.get()) {
                loadDriveFiles();
            }
        });
    }, []);

    const loadDriveFiles = async () => {
        const files = await fetchDriveFiles();
        setDriveFiles(files);
    };

    const handleSignIn = async () => {
        await signInToGoogle();
        setIsSignedIn(true);
        loadDriveFiles();
    };

    const handleSignOut = async () => {
        await signOutFromGoogle();
        setIsSignedIn(false);
    };

    const handleFileSelect = (file: any) => {
        setSelectedFile(file);
        setFileDetails({
            drive_file_id: file.id,
            file_name: file.name,
            file_type: file.mimeType,
            file_size: file.size,
            modified_date: file.modifiedTime,
            price: { usd: 0, ngn: 0 }
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFileDetails({ ...fileDetails, [name]: value });
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFileDetails({
            ...fileDetails,
            price: {
                ...(fileDetails.price as Price),
                [name]: value,
            },
        });
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await academic_files.create(fileDetails);
    };

    const clearForm = () => {
        setSelectedFile(null);
        setFileDetails({});
    };

    return (
        <>
            <div className="drive-content">
                {!isSignedIn ? (
                    <div className="auth-prompt">
                    <div className="auth-card">
                        <div className="auth-icon">
                            <i className="fab fa-google-drive"></i>
                        </div>
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
                                <div className="search-box">
                                    <i className="fas fa-search"></i>
                                    <input type="text" id="fileSearch" placeholder="Search files..." />
                                </div>
                                <button id="refreshDrive" className="btn-icon" title="Refresh files" onClick={loadDriveFiles}>
                                    <i className="fas fa-sync-alt"></i>
                                </button>
                            </div>
                        </div>

                        <div className="drive-file-list" id="fileList">
                            {driveFiles.map((file) => (
                                <div className="drive-file" key={file.id} data-file-id={file.id} data-file-name={file.name}>
                                    <div className="file-icon">
                                        <i className={`fas fa-file`}></i>
                                    </div>
                                    <div className="file-details">
                                        <h3>{file.name}</h3>
                                        <div className="file-meta">
                                            <span><i className="fas fa-calendar"></i> {new Date(file.modifiedTime).toLocaleDateString()}</span>
                                            <span><i className="fas fa-weight-hanging"></i> {file.size}</span>
                                            <span><i className="fas fa-file"></i> {file.mimeType}</span>
                                        </div>
                                    </div>
                                    <div className="file-actions">
                                        <button className="btn-select-file" onClick={() => handleFileSelect(file)}>
                                            <i className="fas fa-check"></i> Select
                                        </button>
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
                            {selectedFile && (
                                <div className="selected-file-info" id="selectedFileInfo">
                                    <span className="selected-label">Selected:</span>
                                    <span className="selected-name" id="selectedFileName">{selectedFile.name}</span>
                                </div>
                            )}
                        </div>

                        <form className="file-details-form" id="fileDetailsForm" onSubmit={handleFormSubmit}>
                            <input type="hidden" id="fileId" name="id" value={fileDetails.id || ""} />
                            <input type="hidden" id="fileDriveId" name="drive_file_id" value={fileDetails.drive_file_id || ""} />
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="fileName"><i className="fas fa-file"></i> File Name</label>
                                    <input type="text" id="fileName" name="file_name" placeholder="Enter file name" required readOnly value={fileDetails.file_name || ""} />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="fileType"><i className="fas fa-tag"></i> File Type</label>
                                    <input type="text" id="fileType" name="file_type" placeholder="File type" readOnly value={fileDetails.file_type || ""} />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="fileSize"><i className="fas fa-weight-hanging"></i> File Size</label>
                                    <input type="text" id="fileSize" name="file_size" placeholder="File size" readOnly value={fileDetails.file_size || ""} />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="fileDate"><i className="fas fa-calendar"></i> Modified Date</label>
                                    <input type="text" id="fileDate" name="modified_date" placeholder="Modified date" readOnly value={fileDetails.modified_date || ""} />
                                 </div>

                                <div className="form-group full-width">
                                    <label htmlFor="fileDescription"><i className="fas fa-align-left"></i> Description</label>
                                    <textarea id="fileDescription" name="description" placeholder="Enter file description" rows={3} onChange={handleInputChange} value={fileDetails.description || ""}></textarea>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="fileCategory"><i className="fas fa-folder"></i> Category</label>
                                    <select id="fileCategory" name="category" required onChange={handleInputChange} value={fileDetails.category || ""}>
                                        <option value="">Select category</option>
                                        <option value="research">Research Paper</option>
                                        <option value="thesis">Thesis</option>
                                        <option value="dissertation">Dissertation</option>
                                        <option value="assignment">Assignment</option>
                                        <option value="project">Project</option>
                                        <option value="presentation">Presentation</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="fileLevel"><i className="fas fa-graduation-cap"></i> Level</label>
                                    <select id="fileLevel" name="level" required onChange={handleInputChange} value={fileDetails.level || ""}>
                                        <option value="">Select level</option>
                                        <option value="undergraduate">Undergraduate</option>
                                        <option value="postgraduate">Postgraduate</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="filePrice"><i className="fas fa-dollar-sign"></i> Price (USD)</label>
                                    <div className="price-input">
                                        <span>$</span>
                                        <input type="number" id="filePrice" name="usd" placeholder="0.00" step="0.01" min="0" onChange={handlePriceChange} value={(fileDetails.price as Price)?.usd || ""} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="filePriceNGN"><i className="fas fa-naira-sign"></i> Price (NGN)</label>
                                    <div className="price-input">
                                        <span>₦</span>
                                        <input type="number" id="filePriceNGN" name="ngn" placeholder="0.00" step="0.01" min="0" onChange={handlePriceChange} value={(fileDetails.price as Price)?.ngn || ""} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? "Saving..." : <><i className="fas fa-save"></i> Save Details</>}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={clearForm}>
                                    <i className="fas fa-eraser"></i> Clear Form
                                </button>
                            </div>
                            {error && <p className="error">{error}</p>}
                        </form>
                    </div>
                </div>
            )}
        </div>
        </>
    );
};

export default AdminHome;
