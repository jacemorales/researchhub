import { UseConfig } from "../../hooks/UseConfig";
interface ModalProps {onClose: () => void;}

const ModalAuthor = ({ onClose }: ModalProps) => {
  const { config } = UseConfig();

  return (
    <div className="modal" id="authorModal">
      <div className="modal-content">
        <span className="close-modal" data-modal="authorModal" onClick={onClose}>&times;</span>

        <div className="author-profile-header">
          <img
            src={config?.AUTHOR_IMG}
            alt={config?.AUTHOR_NAME}
            className="author-profile-img"
          />
          <div className="author-profile-info">
            <h2 className="author-profile-name">{config?.AUTHOR_NAME}</h2>
            <p className="author-profile-title">{config?.AUTHOR_TITLE}</p>
            <p className="author-profile-contact">
              <i className="fas fa-university" /> {config?.AUTHOR_UNIVERSITY}
            </p>
            <p className="author-profile-contact">
              <i className="fas fa-envelope" /> {config?.AUTHOR_EMAIL}
            </p>
          </div>
        </div>

        <div className="author-profile-bio">
          <p>{config?.AUTHOR_BIO}</p>
        </div>

        <div className="author-highlights">
          <div className="highlight-item">
            <div className="highlight-icon">
              <i className="fas fa-graduation-cap" />
            </div>
            <div className="highlight-content">
              <h4>{config?.AUTHOR_CREDENTIALS_TITLE}</h4>
              <p dangerouslySetInnerHTML={{ __html: config?.AUTHOR_CREDENTIALS_DESC || "" }} />
            </div>
          </div>

          <div className="highlight-item">
            <div className="highlight-icon">
              <i className="fas fa-chalkboard-teacher" />
            </div>
            <div className="highlight-content">
              <h4>{config?.AUTHOR_MENTORSHIP_TITLE}</h4>
              <p dangerouslySetInnerHTML={{ __html: config?.AUTHOR_MENTORSHIP_DESC || "" }} />
            </div>
          </div>

          <div className="highlight-item">
            <div className="highlight-icon">
              <i className="fas fa-book" />
            </div>
            <div className="highlight-content">
              <h4>{config?.AUTHOR_PUBLICATIONS_TITLE}</h4>
              <p>{config?.AUTHOR_PUBLICATIONS_DESC}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalAuthor;
