// src/user/Home.tsx
import { useData } from "../hooks/useData";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";

const Home = () => {
  const { website_config } = useData();

  return (
    <>
      <Header />

      <main className="container">
        <Sidebar />

        <div className="main-resources" id="levelCards">
          <h2 className="section-title">{website_config?.RESOURCES_TITLE}</h2>
          <p className="section-subtitle">{website_config?.RESOURCE_BIO}</p>

          <div className="level-cards">
            <div
              className="level-card"
              onClick={() => (window.location.href = "/user/marketplace?level=undergraduate")}
            >
              <div className="level-icon undergraduate">
                <i className="fas fa-user-graduate" />
              </div>
              <h3>Undergraduate</h3>
              <p>Access projects, research papers, and study materials for undergraduate programs</p>
              <button className="btn">Explore Resources</button>
            </div>

            <div
              className="level-card"
              onClick={() => (window.location.href = "/user/marketplace?level=postgraduate")}
            >
              <div className="level-icon postgraduate">
                <i className="fas fa-graduation-cap" />
              </div>
              <h3>Postgraduate</h3>
              <p>Discover thesis papers, advanced research materials, and academic publications</p>
              <button className="btn">Explore Resources</button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default Home;
