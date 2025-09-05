import { useData } from "../../hooks/useData";
interface ModalProps {onClose: () => void;}

const ModalAuthor = ({ onClose }: ModalProps) => {
  const { website_config } = useData();

  return (
    <div className="modal" id="authorModal">
      <div className="modal-content">
        <span className="close-modal" data-modal="authorModal" onClick={onClose}>&times;</span>

        <div className="author-profile-header">
          <img
            src={website_config?.AUTHOR_IMG}
            alt={website_config?.AUTHOR_NAME}
            className="author-profile-img"
          />
          <div className="author-profile-info">
            <h2 className="author-profile-name">{website_config?.AUTHOR_NAME}</h2>
            <p className="author-profile-title">{website_config?.AUTHOR_TITLE}</p>
            <p className="author-profile-contact">
              <i className="fas fa-university" /> {website_config?.AUTHOR_UNIVERSITY}
            </p>
            <p className="author-profile-contact">
              <i className="fas fa-envelope" /> {website_config?.AUTHOR_EMAIL}
            </p>
          </div>
        </div>

        <div className="author-profile-bio">
          <p>{website_config?.AUTHOR_BIO}</p>
        </div>

        <div className="author-highlights">
          <div className="highlight-item">
            <div className="highlight-icon">
              <i className="fas fa-graduation-cap" />
            </div>
            <div className="highlight-content">
              <h4>{website_config?.AUTHOR_CREDENTIALS_TITLE}</h4>
              <p>{website_config?.AUTHOR_CREDENTIALS_DESC}</p>
            </div>
          </div>

          <div className="highlight-item">
            <div className="highlight-icon">
              <i className="fas fa-chalkboard-teacher" />
            </div>
            <div className="highlight-content">
              <h4>{website_config?.AUTHOR_MENTORSHIP_TITLE}</h4>
              <p>{website_config?.AUTHOR_MENTORSHIP_DESC}</p>
            </div>
          </div>

          <div className="highlight-item">
            <div className="highlight-icon">
              <i className="fas fa-book" />
            </div>
            <div className="highlight-content">
              <h4>{website_config?.AUTHOR_PUBLICATIONS_TITLE}</h4>
              <p>{website_config?.AUTHOR_PUBLICATIONS_DESC}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalAuthor;
