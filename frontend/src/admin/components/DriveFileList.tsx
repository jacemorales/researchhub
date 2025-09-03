import React from 'react';
import { formatDate, formatFileSize, getFileTypeDisplay } from '../utils';

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    size: string;
    modifiedTime: string;
    webViewLink: string;
}

interface DriveFileListProps {
    files: DriveFile[];
    onFileSelect: (file: DriveFile) => void;
    onRefresh: () => void;
    selectedFileId: string | null;
}

const DriveFileList: React.FC<DriveFileListProps> = ({ files, onFileSelect, onRefresh, selectedFileId }) => {
    const [searchTerm, setSearchTerm] = React.useState('');

    const filteredFiles = files.filter(file =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="file-selection-section">
            <div className="section-header">
                <h2><i className="fab fa-google-drive"></i> Your Drive Files</h2>
                <div className="header-actions">
                    <div className="search-box">
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            id="fileSearch"
                            placeholder="Search files..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button id="refreshDrive" className="btn-icon" title="Refresh files" onClick={onRefresh}>
                        <i className="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>

            <div className="drive-file-list" id="fileList">
                {filteredFiles.length > 0 ? (
                    filteredFiles.map(file => (
                        <div
                            className={`drive-file ${selectedFileId === file.id ? 'selected' : ''}`}
                            key={file.id}
                            data-file-id={file.id}
                        >
                            <div className="file-details">
                                <h3>{file.name}</h3>
                                <div className="file-meta">
                                    <span><i className="fas fa-calendar"></i> {formatDate(file.modifiedTime)}</span>
                                    <span><i className="fas fa-weight-hanging"></i> {formatFileSize(file.size)}</span>
                                    <span><i className="fas fa-file"></i> {getFileTypeDisplay(file.mimeType, file.name)}</span>
                                </div>
                            </div>
                            <div className="file-actions">
                                <button className="btn-select-file" onClick={() => onFileSelect(file)}>
                                    <i className="fas fa-check"></i> Select
                                </button>
                                <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="btn-view" title="View in Drive">
                                    <i className="fas fa-external-link-alt"></i>
                                </a>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state">
                        <h3>No files found</h3>
                        <p>Try adjusting your search terms or refreshing.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriveFileList;
