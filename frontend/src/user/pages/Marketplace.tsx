import { useState, useEffect } from "react";
import { UseConfig } from "../../hooks/UseConfig";

// Components
import ModalPreview from "../components/ModalPreview";
import ModalPurchase from "../../payments/ModalPurchase";

const Marketplace = () => {
  const { config } = UseConfig();
  const [resources, setResources] = useState<any[]>([]);
  const [level, setLevel] = useState("undergraduate");
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [purchaseData, setPurchaseData] = useState<any | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const levelParam = params.get("level") || "undergraduate";
    setLevel(levelParam);

    fetch(`${import.meta.env.VITE_API_BASE_URL}/backend/get_academic_files.php?level=${levelParam}`)
      .then((res) => res.json())
      .then((data) => setResources(data))
      .catch(() => setResources([]));
  }, []);

  return (
    <div className="marketplace-container" id="levelCards">
      {/* Header */}
      <div className="marketplace-header">
        <h1>{level.charAt(0).toUpperCase() + level.slice(1)} Resources</h1>
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
              <div className="resource-info">
                <h3>{file.file_name}</h3>
                <p>{file.description}</p>
              </div>

              <div className="resource-footer">
                <span className="price">${Number(file.price).toFixed(2)}</span>
                <div className="actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => setPreviewData(file)}
                  >
                    <i className="fas fa-eye"></i> Preview
                  </button>
                  <button
                    className="btn btn-primary"
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
  );
};

export default Marketplace;
