// src/components/Header.tsx
import { useEffect, useState } from "react";
import '../assets/style.css';

import { useData } from "../../hooks/useData";
import ModalContact from "./ModalContact";
import ModalAbout from "./ModalAbout";
import ModalBlog from "./ModalBlog";


const Header = () => {
  const { website_config } = useData();

  // Modal states
  const [showContact, setShowContact] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showBlog, setShowBlog] = useState(false);
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  

  // Load toast.js like PHP did
  useEffect(() => {
    if (!website_config?.JS_PATH) return;
    const el = document.createElement("script");
    el.src = `${website_config.JS_PATH}toast.js`;
    el.async = true;
    document.head.appendChild(el);
    return () => {
      document.head.removeChild(el);
    };
  }, [website_config?.JS_PATH]);

  return (
    <>
      <header>
        <div className="logo">
          <div className="logo-icon">
            <i className="fas fa-book-open" />
          </div>
          <div className="logo-text">
            <h1>{website_config?.SITE_NAME}</h1>
            <p>{website_config?.SITE_DESC}</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          <ul>
            <li>
              <a href="/"><i className="fas fa-home" /> Home</a>
            </li>
            <li>
              <a href="#levelCards"><i className="fas fa-book" /> Resources</a>
            </li>
            <li onClick={() => setShowBlog(true)}>
                <a id="blogLink" ><i className="fas fa-blog" /> Blog</a>
            </li>
            <li onClick={() => setShowAbout(true)}>
                <a id="aboutLink" ><i className="fas fa-info-circle" /> About</a>
            </li>
            <li onClick={() => setShowContact(true)}>
                <a id="contactLink" ><i className="fas fa-envelope" /> Contact</a>
            </li>
          </ul>
        </nav>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`} />
        </button>
      </header>

      {/* Mobile Navigation */}
      <nav className={`mobile-nav ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul>
          <li>
            <a href="/" onClick={() => setIsMobileMenuOpen(false)}>
              <i className="fas fa-home" /> Home
            </a>
          </li>
          <li>
            <a href="#levelCards" onClick={() => setIsMobileMenuOpen(false)}>
              <i className="fas fa-book" /> Resources
            </a>
          </li>
          <li onClick={() => { setShowBlog(true); setIsMobileMenuOpen(false); }}>
              <a id="blogLink" ><i className="fas fa-blog" /> Blog</a>
          </li>
          <li onClick={() => { setShowAbout(true); setIsMobileMenuOpen(false); }}>
              <a id="aboutLink" ><i className="fas fa-info-circle" /> About</a>
          </li>
          <li onClick={() => { setShowContact(true); setIsMobileMenuOpen(false); }}>
              <a id="contactLink" ><i className="fas fa-envelope" /> Contact</a>
          </li>
        </ul>
      </nav>

      {showContact && <ModalContact onClose={() => setShowContact(false)} />}
      {showAbout && <ModalAbout onClose={() => setShowAbout(false)} />}
      {showBlog && <ModalBlog onClose={() => setShowBlog(false)} />}
      
    </>
  );
};

export default Header;
