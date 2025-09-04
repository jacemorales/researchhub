import React from 'react';

interface AcademicFile {
    id: number;
    file_name: string;
    description: string;
    // other file properties
}

interface PreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: AcademicFile | null;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ isOpen, onClose, file }) => {
    return (
        <div className="modal" id="previewModal" style={{ display: isOpen ? 'flex' : 'none' }} onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <span className="close-modal" onClick={onClose}>&times;</span>

                {file && <>
                    <div className="modal-header">
                        <h2 className="modal-title">{file.file_name}</h2>
                        <p className="modal-subtitle">Resource Preview</p>
                    </div>

                    <div className="modal-body">
                        <div className="preview-content">
                            <div className="preview-info">
                                <h3>Description</h3>
                                <p>{file.description || 'No description available.'}</p>
                            </div>

                            <div className="preview-note">
                            <i className="fas fa-info-circle"></i>
                            <p>This is a preview of the academic resource. To access the full content, please complete your purchase.</p>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Close Preview
                    </button>
                </div>
                </>}
            </div>
        </div>
    );
};

export default PreviewModal;
