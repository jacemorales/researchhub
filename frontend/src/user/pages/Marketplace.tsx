import { useState, useEffect } from "react";
import { useData } from "../../hooks/useData";

// Components
import ModalPreview from "../components/ModalPreview";
import ModalPurchase from "../../payments/ModalPurchase";
import Header from "../components/Header";

const Marketplace = () => {
  const { academic_files } = useData();
  const [resources, setResources] = useState<any[]>([]);
  const [level, setLevel] = useState("undergraduate");
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [purchaseData, setPurchaseData] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const levelParam = params.get("level") || "undergraduate";
    setLevel(levelParam);

    if (academic_files) {
      const filteredResources = academic_files
        .filter((file) => file.level === levelParam)
        .filter((file) => {
          if (selectedCategory === "all") return true;
          return file.category === selectedCategory;
        })
        .filter((file) => {
          if (searchTerm === "") return true;
          return (
            file.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (file.description || "").toLowerCase().includes(searchTerm.toLowerCase())
          );
        });
      setResources(filteredResources);
    }
  }, [academic_files, level, selectedCategory, searchTerm]);

  return (
    <>
      <Header />

    <div className="marketplace-container" id="levelCards">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="/user">Home</a>
        <span>/</span>
        <a href="#" className="active">{level.charAt(0).toUpperCase() + level.slice(1)} Resources</a>
      </div>

      {/* Marketplace Header */}
      <div className="marketplace-header">
        <h1>{level.charAt(0).toUpperCase() + level.slice(1)} Resources</h1>
        <div className="controls">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Search resources..." id="resourceSearch" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select id="resourceFilter" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="research">Research Papers</option>
            <option value="thesis">Thesis</option>
            <option value="dissertation">Dissertation</option>
            <option value="assignment">Assignment</option>
            <option value="project">Project</option>
            <option value="presentation">Presentation</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="resources-grid">
        {resources.length === 0 ? (
          <div className="no-resources">
            <i className="fas fa-folder-open"></i>
            <h3>No resources available</h3>
            <p>No {level} resources yet. Please check back later.</p>
          </div>
        ) : (
          resources.map((file) => (
            <div key={file.id} className="resource-card" data-category={file.category}>
              <div className="resource-header">
                <div className="file-icon">
                  <i className="fas fa-file"></i>
                </div>
                <div className="resource-info">
                  <h3>{file.file_name}</h3>
                  <p className="file-meta">
                    <span><i className="fas fa-tag"></i> {file.category}</span>
                    <span><i className="fas fa-file"></i> {file.file_type}</span>
                    <span><i className="fas fa-weight-hanging"></i> {file.file_size}</span>
                  </p>
                </div>
              </div>
              <div className="resource-description">
                <p>{file.description}</p>
              </div>
              <div className="resource-footer">
                <div className="price">
                  <span className="price-amount">${Number(file.price).toFixed(2)}</span>
                </div>
                <div className="actions">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => setPreviewData(file)}
                  >
                    <i className="fas fa-eye"></i> Preview
                  </button>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => setPurchaseData(file)}
                  >
                    <i className="fas fa-shopping-cart"></i> Purchase
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {previewData && (
        <ModalPreview data={previewData} onClose={() => setPreviewData(null)} />
      )}
      {purchaseData && (
        <ModalPurchase data={purchaseData} onClose={() => setPurchaseData(null)} />
      )}
    </div>
    </>
  );
};

export default Marketplace;
                                                                  