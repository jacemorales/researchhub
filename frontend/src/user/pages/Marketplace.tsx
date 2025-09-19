// Marketplace.tsx
import { useState, useEffect } from "react";
import { useData } from "../../hooks/useData";
import { UserToast } from "../../hooks/Toast";

// Components
import ModalPreview from "../components/ModalPreview";
import ModalPurchase from "../../payments/ModalPurchase";
import Header from "../components/Header";
import type {AcademicFile} from "../../hooks/contexts/DataContext";


const Marketplace = () => {
  const { academic_files, currency_code, currency_symbol, user_location } = useData();
  const [resources, setResources] = useState<AcademicFile[]>([]);
  const [level, setLevel] = useState("undergraduate");
  const [previewData, setPreviewData] = useState<AcademicFile | null>(null);
  const [purchaseData, setPurchaseData] = useState<AcademicFile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  // currency and symbol now come from context

  // ✅ Toast State
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);

  // ✅ Toast Handlers
  const showToast = (
    message: string,
    type: "success" | "error" | "warning" | "info" = "info"
  ) => {
    setToast({ message, type });
  };


  const hideToast = () => {
    setToast(null);
  };

  // Location and currency are centrally managed; no per-page fetch

  // Get price for current currency
  const getPriceForCurrency = (file: AcademicFile) => {
    if (!file.price) return Number(0).toFixed(2);
    try {
      const priceObj = typeof file.price === 'string' ? JSON.parse(file.price) : file.price;
      const price = currency_code === 'NGN' ? (priceObj.ngn || priceObj.usd || 0) : (priceObj.usd || 0);
      return Number(price).toFixed(2);
    } catch (error) {
      console.error('Error parsing price:', error);
      return Number(0).toFixed(2);
    }
  };

  // Get currency symbol
  const getCurrencySymbol = () => currency_symbol || '$';

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
            (file.description || "")
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
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
          <a href="#" className="active">
            {level.charAt(0).toUpperCase() + level.slice(1)} Resources
          </a>
        </div>

        {/* Marketplace Header */}
        <div className="marketplace-header">
          <h1>{level.charAt(0).toUpperCase() + level.slice(1)} Resources</h1>
          <div className="controls">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search resources..."
                id="resourceSearch"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              id="resourceFilter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
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
              <div
                key={file.id}
                className="resource-card"
                data-category={file.category}
              >
                <div className="resource-header">
                  <div className="file-icon">
                    <i className="fas fa-file"></i>
                  </div>
                  <div className="resource-info">
                    <h3>{file.file_name}</h3>
                    <p className="file-meta">
                      <span>
                        <i className="fas fa-tag"></i> {file.category}
                      </span>
                      <span>
                        <i className="fas fa-file"></i> {file.file_type}
                      </span>
                      <span>
                        <i className="fas fa-weight-hanging"></i> {file.file_size}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="resource-description">
                  <p>{file.description}</p>
                </div>
                <div className="resource-footer">
                  <div className="price">
                    <span className="price-amount">
                      {getCurrencySymbol()}{getPriceForCurrency(file)}
                    </span>
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

        {/* Location debug info */}
        <div className="location-debug" style={{ marginTop: '16px', fontSize: '14px' }}>
          <strong>Location Debug:</strong>
          <div>Country: {user_location?.country || 'Unknown'}</div>
          <div>City: {user_location?.city || 'Unknown'}</div>
          <div>IP: {user_location?.ip || 'Unknown'}</div>
          <div>IP Type: {user_location?.ip_type || 'unknown'} 
            {user_location?.ip_type === 'local' && <span style={{ color: '#ff6b6b' }}> (Local/Private)</span>}
            {user_location?.ip_type === 'public' && <span style={{ color: '#51cf66' }}> (Public)</span>}
          </div>
          <div>Active Currency: {currency_code} ({currency_symbol})</div>
          <div>API Status: 
            <span style={{ 
              color: user_location?.api_status === 'success' ? '#51cf66' : 
                     user_location?.api_status === 'local_ip' ? '#ffd43b' :
                     user_location?.api_status === 'error' ? '#ff6b6b' : '#868e96'
            }}>
              {user_location?.api_status || 'pending'}
            </span>
          </div>
          {user_location?.raw_response && (
            <div>
              <strong>API Response Details:</strong>
              <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '8px', marginTop: '4px', overflow: 'auto', maxHeight: '200px' }}>
                {JSON.stringify(user_location.raw_response, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modals */}
        {previewData && (
          <ModalPreview
            data={previewData}
            onClose={() => setPreviewData(null)}
          />
        )}
        {purchaseData && (
          <ModalPurchase
            data={purchaseData}
            onClose={() => setPurchaseData(null)}
            showToast={showToast} // ✅ Pass down
          />
        )}
      </div>

      {/* ✅ Render Toast */}
      {toast && (
        <UserToast
          message={toast.message}
          type={toast.type}
          duration={5000}
          onClose={hideToast}
        />
      )}
    </>
  );
};

export default Marketplace;