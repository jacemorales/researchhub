// src/components/Footer.tsx
import { useEffect } from "react";
import { useData } from "../../hooks/useData";

const Footer = () => {
  const { website_config } = useData();

  // Load the project-wide script like PHP footer did
  useEffect(() => {
    if (!website_config?.JS_PATH) return;
    const el = document.createElement("script");
    el.src = `${website_config.JS_PATH}script.js`;
    el.async = true;
    document.body.appendChild(el);
    return () => {
      document.body.removeChild(el);
    };
  }, [website_config?.JS_PATH]);

  return (
    <footer>
      <p>{website_config?.FOOTER_COPYRIGHT}</p>
      <p>{website_config?.FOOTER_DESCRIPTION}</p>

      <div className="social-links">
        {website_config?.SOCIAL_FACEBOOK && (
          <a href={website_config.SOCIAL_FACEBOOK} target="_blank" title="Facebook" rel="noreferrer">
            <i className="fab fa-facebook" />
          </a>
        )}
        {website_config?.SOCIAL_TWITTER && (
          <a href={website_config.SOCIAL_TWITTER} target="_blank" title="Twitter" rel="noreferrer">
            <i className="fab fa-twitter" />
          </a>
        )}
        {website_config?.SOCIAL_LINKEDIN && (
          <a href={website_config.SOCIAL_LINKEDIN} target="_blank" title="LinkedIn" rel="noreferrer">
            <i className="fab fa-linkedin" />
          </a>
        )}
        {website_config?.SOCIAL_INSTAGRAM && (
          <a href={website_config.SOCIAL_INSTAGRAM} target="_blank" title="Instagram" rel="noreferrer">
            <i className="fab fa-instagram" />
          </a>
        )}
      </div>
    </footer>
  );
};

export default Footer;
