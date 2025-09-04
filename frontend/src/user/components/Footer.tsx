// src/components/Footer.tsx
import { useEffect } from "react";
import { UseConfig } from "../../hooks/UseConfig";

const Footer = () => {
  const { config } = UseConfig();

  // Load the project-wide script like PHP footer did
  useEffect(() => {
    if (!config?.JS_PATH) return;
    const el = document.createElement("script");
    el.src = `${config.JS_PATH}script.js`;
    el.async = true;
    document.body.appendChild(el);
    return () => {
      document.body.removeChild(el);
    };
  }, [config?.JS_PATH]);

  return (
    <footer>
      <p>{config?.FOOTER_COPYRIGHT}</p>
      <p>{config?.FOOTER_DESCRIPTION}</p>

      <div className="social-links">
        {config?.SOCIAL_FACEBOOK && (
          <a href={config.SOCIAL_FACEBOOK} target="_blank" title="Facebook" rel="noreferrer">
            <i className="fab fa-facebook" />
          </a>
        )}
        {config?.SOCIAL_TWITTER && (
          <a href={config.SOCIAL_TWITTER} target="_blank" title="Twitter" rel="noreferrer">
            <i className="fab fa-twitter" />
          </a>
        )}
        {config?.SOCIAL_LINKEDIN && (
          <a href={config.SOCIAL_LINKEDIN} target="_blank" title="LinkedIn" rel="noreferrer">
            <i className="fab fa-linkedin" />
          </a>
        )}
        {config?.SOCIAL_INSTAGRAM && (
          <a href={config.SOCIAL_INSTAGRAM} target="_blank" title="Instagram" rel="noreferrer">
            <i className="fab fa-instagram" />
          </a>
        )}
      </div>
    </footer>
  );
};

export default Footer;
