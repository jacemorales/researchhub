import { UseConfig } from "../../hooks/UseConfig";
interface ModalProps {onClose: () => void;}

const ModalBlog = ({ onClose }: ModalProps) => {
  const { config } = UseConfig();

  return (
    <div className="modal" id="blogModal">
      <div className="modal-content">
        <span className="close-modal" onClick={onClose}>×</span>

        <div className="modal-header">
          <h2 className="modal-title">{config?.BLOG_TITLE}</h2>
          <p className="modal-subtitle">{config?.BLOG_DESCRIPTION}</p>
        </div>

        <div className="modal-body">
          <h3>{config?.BLOG_LATEST_TITLE}</h3>
          <p>{config?.BLOG_LATEST_DESC}</p>

          <div className="blog-grid">
            <div className="blog-card">
              <img src={config?.BLOG_ARTICLE_1_IMG} alt={config?.BLOG_ARTICLE_1_TITLE} className="blog-img" />
              <div className="blog-content">
                <h4 className="blog-title">{config?.BLOG_ARTICLE_1_TITLE}</h4>
                <div className="blog-meta">
                  <span><i className="far fa-calendar" /> {config?.BLOG_ARTICLE_1_DATE}</span>
                  <span><i className="far fa-clock" /> {config?.BLOG_ARTICLE_1_READ_TIME}</span>
                </div>
                <p className="blog-excerpt">{config?.BLOG_ARTICLE_1_EXCERPT}</p>
                <a href="#" className="read-more">Read More <i className="fas fa-arrow-right" /></a>
              </div>
            </div>

            <div className="blog-card">
              <img src={config?.BLOG_ARTICLE_2_IMG} alt={config?.BLOG_ARTICLE_2_TITLE} className="blog-img" />
              <div className="blog-content">
                <h4 className="blog-title">{config?.BLOG_ARTICLE_2_TITLE}</h4>
                <div className="blog-meta">
                  <span><i className="far fa-calendar" /> {config?.BLOG_ARTICLE_2_DATE}</span>
                  <span><i className="far fa-clock" /> {config?.BLOG_ARTICLE_2_READ_TIME}</span>
                </div>
                <p className="blog-excerpt">{config?.BLOG_ARTICLE_2_EXCERPT}</p>
                <a href="#" className="read-more">Read More <i className="fas fa-arrow-right" /></a>
              </div>
            </div>

            <div className="blog-card">
              <img src={config?.BLOG_ARTICLE_3_IMG} alt={config?.BLOG_ARTICLE_3_TITLE} className="blog-img" />
              <div className="blog-content">
                <h4 className="blog-title">{config?.BLOG_ARTICLE_3_TITLE}</h4>
                <div className="blog-meta">
                  <span><i className="far fa-calendar" /> {config?.BLOG_ARTICLE_3_DATE}</span>
                  <span><i className="far fa-clock" /> {config?.BLOG_ARTICLE_3_READ_TIME}</span>
                </div>
                <p className="blog-excerpt">{config?.BLOG_ARTICLE_3_EXCERPT}</p>
                <a href="#" className="read-more">Read More <i className="fas fa-arrow-right" /></a>
              </div>
            </div>
          </div>

          <h3>{config?.BLOG_CATEGORIES_TITLE}</h3>
          <ul>
            <li><strong>{config?.BLOG_CAT_1_TITLE}:</strong> {config?.BLOG_CAT_1_DESC}</li>
            <li><strong>{config?.BLOG_CAT_2_TITLE}:</strong> {config?.BLOG_CAT_2_DESC}</li>
            <li><strong>{config?.BLOG_CAT_3_TITLE}:</strong> {config?.BLOG_CAT_3_DESC}</li>
            <li><strong>{config?.BLOG_CAT_4_TITLE}:</strong> {config?.BLOG_CAT_4_DESC}</li>
            <li><strong>{config?.BLOG_CAT_5_TITLE}:</strong> {config?.BLOG_CAT_5_DESC}</li>
          </ul>

          <h3>{config?.BLOG_NEWSLETTER_TITLE}</h3>
          <p>{config?.BLOG_NEWSLETTER_DESC}</p>
          <form style={{ marginTop: 20 }}>
            <input
              type="email"
              placeholder={config?.BLOG_NEWSLETTER_PLACEHOLDER}
              style={{ padding: "12px 15px", width: "100%", maxWidth: 400, border: "2px solid var(--light-gray)", borderRadius: "var(--border-radius)", marginRight: 10 }}
            />
            <button
              type="submit"
              style={{ padding: "12px 25px", background: "var(--primary)", color: "white", border: "none", borderRadius: "var(--border-radius)", fontWeight: 600, marginTop: 10, cursor: "pointer" }}
            >
              {config?.BLOG_NEWSLETTER_BUTTON}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModalBlog;
