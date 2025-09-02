<div class="modal" id="previewModal">
    <div class="modal-content">
        <span class="close-modal" data-modal="previewModal">&times;</span>
        
        <div class="modal-header">
            <h2 class="modal-title" id="previewTitle">Resource Preview</h2>
            <p class="modal-subtitle">Preview academic resource details</p>
        </div>
        
        <div class="modal-body">
            <div class="preview-content">
                <div class="preview-info">
                    <h3>Description</h3>
                    <p id="previewDescription">Resource description will appear here...</p>
                </div>
                
                <div class="preview-note">
                    <i class="fas fa-info-circle"></i>
                    <p>This is a preview of the academic resource. To access the full content, please complete your purchase.</p>
                </div>
            </div>
        </div>
        
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal('previewModal')">
                Close Preview
            </button>
        </div>
    </div>
</div>

<style>
.preview-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.preview-info h3 {
    color: var(--primary);
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--primary);
    padding-bottom: 0.5rem;
}

.preview-info p {
    line-height: 1.6;
    color: var(--gray);
}

.preview-note {
    background: rgba(96, 165, 250, 0.1);
    border: 1px solid rgba(96, 165, 250, 0.3);
    border-radius: 10px;
    padding: 1.5rem;
    display: flex;
    gap: 1rem;
    align-items: flex-start;
}

.preview-note i {
    color: #60a5fa;
    font-size: 1.25rem;
    margin-top: 0.25rem;
}

.preview-note p {
    margin: 0;
    color: #1e40af;
    font-size: 0.9rem;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
}
</style>