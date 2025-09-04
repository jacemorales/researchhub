interface ModalProps {onClose: () => void;data:null}


const ModalPreview = ({ onClose }: ModalProps) => {
  return (
    <div className="modal" id="previewModal">
      <div className="modal-content">
        <span className="close-modal" data-modal="previewModal" onClick={onClose} >&times;</span>

        <div className="modal-header">
          <h2 className="modal-title" id="previewTitle">Resource Preview</h2>
          <p className="modal-subtitle">Preview academic resource details</p>
        </div>

        <div className="modal-body">
          <div className="preview-content">
            <div className="preview-info">
              <h3>Description</h3>
              <p id="previewDescription">Resource description will appear here...</p>
            </div>

            <div className="preview-note">
              <i className="fas fa-info-circle" />
              <p>This is a preview of the academic resource. To access the full content, please complete your purchase.</p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={() => (window as any).closeModal?.("previewModal")}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalPreview;
