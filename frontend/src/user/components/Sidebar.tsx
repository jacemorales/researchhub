// src/components/Sidebar.tsx
import { useState } from "react";
import { useData } from "../../hooks/useData";
import ModalAuthor from "./ModalAuthor";

const Sidebar = () => {
  const { website_config } = useData();
  const [showAuthor, setShowAuthor] = useState(false);

  return (
    <>
      <aside className="sidebar">
        <div className="author-header">
          <img
            src={website_config?.AUTHOR_IMG}
            alt={website_config?.AUTHOR_NAME}
            className="author-img"
            onError={(e) => {
              e.currentTarget.src = "/no_img.png";
            }}
          />
          <h2 className="author-name">{website_config?.AUTHOR_NAME}</h2>
          <p className="author-title">{website_config?.AUTHOR_TITLE}</p>
          <p className="author-bio">{website_config?.AUTHOR_BIO}</p>
          <button
            className="btn btn-outline"
            id="viewProfileBtn"
            onClick={() => setShowAuthor(true)}
          >
            View Full Profile
          </button>
        </div>

        <div className="social-links">
          <a href="#"><i className="fab fa-twitter" /></a>
          <a href="#"><i className="fab fa-linkedin-in" /></a>
          <a href="#"><i className="fab fa-google-scholar" /></a>
          <a href="#"><i className="fab fa-researchgate" /></a>
        </div>

        <div className="stats">
          <div className="stat-item">
            <div className="stat-number">47</div>
            <div className="stat-label">Products</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">12K+</div>
            <div className="stat-label">Customers</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">4.9</div>
            <div className="stat-label">Rating</div>
          </div>
        </div>
      </aside>

      {/* Mount modal when state is true */}
      {showAuthor && <ModalAuthor onClose={() => setShowAuthor(false)} />}
    </>
  );
};

export default Sidebar;
